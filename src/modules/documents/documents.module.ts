import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { DocumentsController } from './documents.controller';

@Module({
  providers: [DocumentsService, KnowledgeBaseService],
  controllers: [DocumentsController],
  exports: [DocumentsService, KnowledgeBaseService],
})
export class DocumentsModule {}
