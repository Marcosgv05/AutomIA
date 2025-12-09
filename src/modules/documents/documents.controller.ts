import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { KnowledgeBaseService } from './knowledge-base.service';

interface CreateKnowledgeBaseDto {
  tenantId: string;
  name: string;
  description?: string;
}

interface CreateDocumentDto {
  tenantId: string;
  knowledgeBaseId: string;
  title: string;
  sourceType: string;
  content: string;
  originalFileUrl?: string;
}

interface SearchDto {
  tenantId: string;
  query: string;
  limit?: number;
}

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  // ==================== Knowledge Bases ====================

  /**
   * Lista bases de conhecimento de um tenant
   * GET /documents/knowledge-bases?tenantId=xxx
   */
  @Get('knowledge-bases')
  async listKnowledgeBases(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const knowledgeBases = await this.knowledgeBaseService.listByTenant(tenantId);
    return { knowledgeBases };
  }

  /**
   * Cria uma nova base de conhecimento
   * POST /documents/knowledge-bases
   */
  @Post('knowledge-bases')
  async createKnowledgeBase(@Body() body: CreateKnowledgeBaseDto) {
    const kb = await this.knowledgeBaseService.create(
      body.tenantId,
      body.name,
      body.description,
    );
    return { knowledgeBase: kb };
  }

  /**
   * Busca uma base de conhecimento por ID
   * GET /documents/knowledge-bases/:id
   */
  @Get('knowledge-bases/:id')
  async getKnowledgeBase(@Param('id') id: string) {
    const kb = await this.knowledgeBaseService.findById(id);
    return { knowledgeBase: kb };
  }

  /**
   * Deleta uma base de conhecimento
   * DELETE /documents/knowledge-bases/:id
   */
  @Delete('knowledge-bases/:id')
  async deleteKnowledgeBase(@Param('id') id: string) {
    await this.knowledgeBaseService.delete(id);
    return { status: 'deleted' };
  }

  // ==================== Documents ====================

  /**
   * Lista documentos de uma base de conhecimento
   * GET /documents?knowledgeBaseId=xxx
   */
  @Get()
  async listDocuments(@Query('knowledgeBaseId') knowledgeBaseId: string) {
    if (!knowledgeBaseId) {
      return { error: 'knowledgeBaseId é obrigatório' };
    }
    const documents = await this.documentsService.listDocuments(knowledgeBaseId);
    return { documents };
  }

  /**
   * Cria um novo documento (e processa em background)
   * POST /documents
   */
  @Post()
  async createDocument(@Body() body: CreateDocumentDto) {
    const document = await this.documentsService.createDocument({
      tenantId: body.tenantId,
      knowledgeBaseId: body.knowledgeBaseId,
      title: body.title,
      sourceType: body.sourceType,
      content: body.content,
      originalFileUrl: body.originalFileUrl,
    });
    return { document, message: 'Documento criado e sendo processado' };
  }

  /**
   * Deleta um documento
   * DELETE /documents/:id
   */
  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    await this.documentsService.deleteDocument(id);
    return { status: 'deleted' };
  }

  // ==================== RAG Search ====================

  /**
   * Busca chunks relevantes (RAG)
   * POST /documents/search
   */
  @Post('search')
  async search(@Body() body: SearchDto) {
    if (!body.tenantId || !body.query) {
      return { error: 'tenantId e query são obrigatórios' };
    }
    const results = await this.documentsService.searchRelevantChunks(
      body.tenantId,
      body.query,
      body.limit || 5,
    );
    return { results };
  }
}
