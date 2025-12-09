import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { SessionManager } from './session.manager';
import { WhatsappController } from './whatsapp.controller';
import { ChatModule } from '../chat/chat.module';
import { TenantModule } from '../tenant/tenant.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [ChatModule, TenantModule, forwardRef(() => AgentModule)],
  providers: [WhatsappService, SessionManager],
  controllers: [WhatsappController],
  exports: [WhatsappService, SessionManager],
})
export class WhatsappModule {}
