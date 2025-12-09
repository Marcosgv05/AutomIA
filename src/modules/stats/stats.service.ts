import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna estatísticas gerais do dashboard
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Total de conversas (chats)
    const totalChats = await this.prisma.chat.count({
      where: { tenantId },
    });

    // Chats desta semana
    const chatsThisWeek = await this.prisma.chat.count({
      where: {
        tenantId,
        createdAt: { gte: weekAgo },
      },
    });

    // Chats da semana passada
    const chatsLastWeek = await this.prisma.chat.count({
      where: {
        tenantId,
        createdAt: { gte: twoWeeksAgo, lt: weekAgo },
      },
    });

    // Total de agendamentos
    const totalAppointments = await this.prisma.appointment.count({
      where: { tenantId, status: { not: 'canceled' } },
    });

    // Agendamentos desta semana
    const appointmentsThisWeek = await this.prisma.appointment.count({
      where: {
        tenantId,
        status: { not: 'canceled' },
        createdAt: { gte: weekAgo },
      },
    });

    // Agendamentos da semana passada
    const appointmentsLastWeek = await this.prisma.appointment.count({
      where: {
        tenantId,
        status: { not: 'canceled' },
        createdAt: { gte: twoWeeksAgo, lt: weekAgo },
      },
    });

    // Mensagens totais
    const totalMessages = await this.prisma.message.count({
      where: { tenantId },
    });

    // Mensagens da IA (role = assistant)
    const aiMessages = await this.prisma.message.count({
      where: { tenantId, role: 'assistant' },
    });

    // Chats onde IA está pausada (atendimento manual)
    const manualChats = await this.prisma.chat.count({
      where: { tenantId, aiPaused: true },
    });

    // Calcula taxa de resolução IA (chats sem pausa / total)
    const aiResolutionRate = totalChats > 0 
      ? Math.round(((totalChats - manualChats) / totalChats) * 100) 
      : 0;

    // Calcula variações percentuais
    const chatsChange = this.calculateChange(chatsThisWeek, chatsLastWeek);
    const appointmentsChange = this.calculateChange(appointmentsThisWeek, appointmentsLastWeek);

    return {
      conversations: {
        total: totalChats,
        thisWeek: chatsThisWeek,
        change: chatsChange.value,
        trend: chatsChange.trend,
      },
      appointments: {
        total: totalAppointments,
        thisWeek: appointmentsThisWeek,
        change: appointmentsChange.value,
        trend: appointmentsChange.trend,
      },
      aiResolution: {
        rate: aiResolutionRate,
        totalMessages,
        aiMessages,
        manualChats,
      },
    };
  }

  /**
   * Retorna dados para o gráfico de mensagens por dia
   */
  async getMessagesChart(tenantId: string, days: number = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Busca mensagens agrupadas por dia
    const messages = await this.prisma.message.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        direction: true,
      },
    });

    // Agrupa por dia
    const chartData: Record<string, { total: number; inbound: number; outbound: number }> = {};

    // Inicializa todos os dias
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = this.formatDateKey(date);
      chartData[key] = { total: 0, inbound: 0, outbound: 0 };
    }

    // Conta mensagens por dia
    for (const msg of messages) {
      const key = this.formatDateKey(msg.createdAt);
      if (chartData[key]) {
        chartData[key].total++;
        if (msg.direction === 'inbound') {
          chartData[key].inbound++;
        } else {
          chartData[key].outbound++;
        }
      }
    }

    // Converte para array
    const data = Object.entries(chartData).map(([date, counts]) => ({
      name: this.formatDateLabel(date),
      messages: counts.total,
      inbound: counts.inbound,
      outbound: counts.outbound,
    }));

    return { data };
  }

  /**
   * Retorna últimos agendamentos
   */
  async getRecentAppointments(tenantId: string, limit: number = 5) {
    const appointments = await this.prisma.appointment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        chat: {
          select: { customerName: true, customerWaId: true },
        },
        googleCalendar: {
          select: { summary: true },
        },
      },
    });

    return {
      appointments: appointments.map(apt => ({
        id: apt.id,
        status: apt.status,
        startTime: apt.startTime,
        endTime: apt.endTime,
        summary: (apt.payload as any)?.summary || 'Agendamento',
        customerName: apt.chat?.customerName || apt.chat?.customerWaId || 'Cliente',
        calendarName: apt.googleCalendar?.summary || 'Calendário',
        createdAt: apt.createdAt,
      })),
    };
  }

  /**
   * Calcula variação percentual entre dois valores
   */
  private calculateChange(current: number, previous: number): { value: string; trend: 'up' | 'down' | 'neutral' } {
    if (previous === 0) {
      if (current === 0) {
        return { value: '0%', trend: 'neutral' };
      }
      return { value: '+100%', trend: 'up' };
    }

    const change = ((current - previous) / previous) * 100;
    const rounded = Math.round(change);

    if (rounded > 0) {
      return { value: `+${rounded}%`, trend: 'up' };
    } else if (rounded < 0) {
      return { value: `${rounded}%`, trend: 'down' };
    }
    return { value: '0%', trend: 'neutral' };
  }

  /**
   * Formata data para chave de agrupamento
   */
  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Formata data para label do gráfico
   */
  private formatDateLabel(dateKey: string): string {
    const [, month, day] = dateKey.split('-');
    return `${day}/${month}`;
  }
}
