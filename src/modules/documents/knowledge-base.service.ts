import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova base de conhecimento
   */
  async create(tenantId: string, name: string, description?: string) {
    const kb = await this.prisma.knowledgeBase.create({
      data: {
        tenantId,
        name,
        description,
      },
    });

    this.logger.log(`Base de conhecimento criada: ${kb.id} - ${kb.name}`);
    return kb;
  }

  /**
   * Encontra ou cria a base de conhecimento padrão do tenant
   */
  async findOrCreateDefault(tenantId: string) {
    let kb = await this.prisma.knowledgeBase.findFirst({
      where: { tenantId, name: 'Principal' },
    });

    if (!kb) {
      kb = await this.create(tenantId, 'Principal', 'Base de conhecimento principal');
    }

    return kb;
  }

  /**
   * Lista bases de conhecimento de um tenant
   */
  async listByTenant(tenantId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { documents: true } },
      },
    });
  }

  /**
   * Busca uma base de conhecimento por ID
   */
  async findById(id: string) {
    return this.prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Deleta uma base de conhecimento e todos seus documentos
   */
  async delete(id: string) {
    // Primeiro busca todos os documentos
    const documents = await this.prisma.document.findMany({
      where: { knowledgeBaseId: id },
      select: { id: true },
    });

    // Deleta embeddings e chunks de cada documento
    for (const doc of documents) {
      await this.prisma.documentEmbedding.deleteMany({ where: { documentId: doc.id } });
      await this.prisma.documentChunk.deleteMany({ where: { documentId: doc.id } });
    }

    // Deleta documentos
    await this.prisma.document.deleteMany({ where: { knowledgeBaseId: id } });

    // Deleta a base
    await this.prisma.knowledgeBase.delete({ where: { id } });

    this.logger.log(`Base de conhecimento ${id} deletada`);
  }
}
