import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentConfigController } from './agent-config.controller';
import { AgentConfigService } from './agent-config.service';
import { LlmModule } from '../ai/llm/llm.module';
import { MediaModule } from '../ai/media/media.module';
import { DocumentsModule } from '../documents/documents.module';
import { CalendarModule } from '../calendar/calendar.module';
import { PrismaModule } from '../../infra/database/prisma.module';

@Module({
  imports: [LlmModule, MediaModule, DocumentsModule, CalendarModule, PrismaModule],
  controllers: [AgentConfigController],
  providers: [AgentService, AgentConfigService],
  exports: [AgentService, AgentConfigService],
})
export class AgentModule {}
