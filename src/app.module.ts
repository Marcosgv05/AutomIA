import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './infra/database/prisma.module';
import { CacheModule } from './infra/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ChatModule } from './modules/chat/chat.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AiModule } from './modules/ai/ai.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AgentModule } from './modules/agent/agent.module';
import { StatsModule } from './modules/stats/stats.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Rate Limiting - Proteção contra brute force e DDoS
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 segundo
        limit: 10,    // 10 requisições por segundo
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 segundos
        limit: 50,    // 50 requisições por 10 segundos
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minuto
        limit: 100,   // 100 requisições por minuto
      },
    ]),
    PrismaModule,
    CacheModule,
    HealthModule,
    AuthModule,
    ChatModule,
    TenantModule,
    AiModule,
    DocumentsModule,
    CalendarModule,
    AgentModule,
    WhatsappModule,
    StatsModule,
  ],
  providers: [
    // Rate Limiting global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
