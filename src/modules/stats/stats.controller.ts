import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * Retorna estatísticas gerais do dashboard
   * GET /stats/dashboard?tenantId=xxx
   */
  @Get('dashboard')
  async getDashboardStats(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    return this.statsService.getDashboardStats(tenantId);
  }

  /**
   * Retorna dados para o gráfico de mensagens
   * GET /stats/messages-chart?tenantId=xxx&days=7
   */
  @Get('messages-chart')
  async getMessagesChart(
    @Query('tenantId') tenantId: string,
    @Query('days') days?: string,
  ) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    return this.statsService.getMessagesChart(tenantId, parseInt(days || '7', 10));
  }

  /**
   * Retorna últimos agendamentos
   * GET /stats/recent-appointments?tenantId=xxx&limit=5
   */
  @Get('recent-appointments')
  async getRecentAppointments(
    @Query('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    return this.statsService.getRecentAppointments(tenantId, parseInt(limit || '5', 10));
  }
}
