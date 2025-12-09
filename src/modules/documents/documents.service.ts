import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateDocumentInput {
  tenantId: string;
  knowledgeBaseId: string;
  title: string;
  sourceType: string;
  content: string;
  originalFileUrl?: string;
  metadata?: any;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly prisma: PrismaService) {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  /**
   * Cria um documento, quebra em chunks e gera embeddings
   */
  async createDocument(input: CreateDocumentInput) {
    // Cria o documento
    const document = await this.prisma.document.create({
      data: {
        tenantId: input.tenantId,
        knowledgeBaseId: input.knowledgeBaseId,
        title: input.title,
        sourceType: input.sourceType,
        originalFileUrl: input.originalFileUrl,
        status: 'processing',
        metadata: input.metadata,
      },
    });

    this.logger.log(`Documento criado: ${document.id} - ${document.title}`);

    // Processa em background
    this.processDocument(document.id, input.tenantId, input.content).catch((err) =>
      this.logger.error(`Erro ao processar documento ${document.id}: ${err?.message || err}`),
    );

    return document;
  }

  /**
   * Processa documento: quebra em chunks e gera embeddings
   */
  private async processDocument(documentId: string, tenantId: string, content: string) {
    try {
      // Quebra o conteúdo em chunks
      const chunks = this.splitIntoChunks(content, 500, 50);
      this.logger.log(`Documento ${documentId}: ${chunks.length} chunks criados`);

      // Cria chunks e embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];

        // Cria o chunk
        const chunk = await this.prisma.documentChunk.create({
          data: {
            tenantId,
            documentId,
            chunkIndex: i,
            content: chunkText,
            tokenCount: this.estimateTokens(chunkText),
          },
        });

        // Gera embedding
        const embedding = await this.generateEmbedding(chunkText);

        // Salva embedding
        await this.prisma.documentEmbedding.create({
          data: {
            tenantId,
            documentId,
            chunkId: chunk.id,
            embedding: embedding.map((v) => new Decimal(v)),
            embeddingModel: 'text-embedding-004',
          },
        });
      }

      // Atualiza status do documento
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready' },
      });

      this.logger.log(`Documento ${documentId} processado com sucesso`);
    } catch (error: any) {
      this.logger.error(`Erro ao processar documento: ${error?.message || error}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'error' },
      });
      throw error;
    }
  }

  /**
   * Gera embedding usando Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
      `${this.baseUrl}/models/text-embedding-004:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
  }

  /**
   * Busca os chunks mais relevantes para uma query (RAG)
   */
  async searchRelevantChunks(
    tenantId: string,
    query: string,
    limit: number = 5,
  ): Promise<Array<{ content: string; score: number; documentTitle: string }>> {
    // Gera embedding da query
    const queryEmbedding = await this.generateEmbedding(query);

    // Busca todos os embeddings do tenant
    const embeddings = await this.prisma.documentEmbedding.findMany({
      where: { tenantId },
      include: {
        chunk: true,
        document: { select: { title: true } },
      },
    });

    // Calcula similaridade (cosine similarity)
    const results = embeddings.map((emb) => {
      const embVector = emb.embedding.map((d) => d.toNumber());
      const score = this.cosineSimilarity(queryEmbedding, embVector);
      return {
        content: emb.chunk.content,
        score,
        documentTitle: emb.document.title,
      };
    });

    // Ordena por score e retorna os top N
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Quebra texto em chunks com overlap
   */
  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if ((currentChunk + ' ' + trimmed).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Overlap: mantém parte do chunk anterior
        const words = currentChunk.split(' ');
        currentChunk = words.slice(-Math.floor(overlap / 10)).join(' ') + ' ' + trimmed;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmed;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Estima número de tokens (aproximado)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Lista documentos de uma base de conhecimento
   */
  async listDocuments(knowledgeBaseId: string) {
    return this.prisma.document.findMany({
      where: { knowledgeBaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true } },
      },
    });
  }

  /**
   * Deleta um documento e seus chunks/embeddings
   */
  async deleteDocument(documentId: string) {
    // Deleta em cascata
    await this.prisma.documentEmbedding.deleteMany({ where: { documentId } });
    await this.prisma.documentChunk.deleteMany({ where: { documentId } });
    await this.prisma.document.delete({ where: { id: documentId } });

    this.logger.log(`Documento ${documentId} deletado`);
  }
}
