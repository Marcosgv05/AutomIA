import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { GoogleAuthService } from './google-auth.service';

interface CreateEventInput {
  tenantId: string;
  googleCalendarId: string;
  chatId?: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  attendeeEmail?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  htmlLink: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  /**
   * Lista os calendários disponíveis de uma conta Google
   */
  async listCalendars(googleAccountId: string) {
    const accessToken = await this.googleAuth.refreshAccessToken(googleAccountId);

    const response = await fetch(`${this.baseUrl}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Erro ao listar calendários');
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Sincroniza calendários de uma conta Google para o banco
   */
  async syncCalendars(tenantId: string, googleAccountId: string) {
    const calendars = await this.listCalendars(googleAccountId);

    for (const cal of calendars) {
      // Verifica se já existe
      const existing = await this.prisma.googleCalendar.findFirst({
        where: { googleAccountId, calendarId: cal.id },
      });

      if (!existing) {
        await this.prisma.googleCalendar.create({
          data: {
            tenantId,
            googleAccountId,
            calendarId: cal.id,
            summary: cal.summary,
            timeZone: cal.timeZone,
            isDefault: cal.primary || false,
          },
        });
      }
    }

    this.logger.log(`Calendários sincronizados para conta ${googleAccountId}`);
  }

  /**
   * Cria um evento no Google Calendar (verifica disponibilidade antes)
   */
  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    // Busca o calendário e a conta associada
    const calendar = await this.prisma.googleCalendar.findUnique({
      where: { id: input.googleCalendarId },
      include: { googleAccount: true },
    });

    if (!calendar) {
      throw new Error('Calendário não encontrado');
    }

    // Verifica disponibilidade antes de criar
    const isAvailable = await this.checkAvailability(
      input.googleCalendarId,
      input.startTime,
      input.endTime,
    );

    if (!isAvailable) {
      throw new Error('Horário indisponível. Já existe um evento neste período.');
    }

    const accessToken = await this.googleAuth.refreshAccessToken(calendar.googleAccountId);
    const timezone = input.timezone || calendar.timeZone || 'America/Sao_Paulo';

    const eventBody: any = {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: input.startTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: input.endTime.toISOString(),
        timeZone: timezone,
      },
    };

    // Adiciona participante se fornecido
    if (input.attendeeEmail) {
      eventBody.attendees = [{ email: input.attendeeEmail }];
    }

    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar.calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar evento: ${error}`);
    }

    const event: CalendarEvent = await response.json();

    // Salva o agendamento no banco
    await this.prisma.appointment.create({
      data: {
        tenantId: input.tenantId,
        chatId: input.chatId,
        googleCalendarId: input.googleCalendarId,
        googleEventId: event.id,
        status: 'confirmed',
        startTime: input.startTime,
        endTime: input.endTime,
        timezone,
        payload: {
          summary: input.summary,
          description: input.description,
          htmlLink: event.htmlLink,
        },
      },
    });

    this.logger.log(`Evento criado: ${event.summary} em ${input.startTime}`);
    return event;
  }

  /**
   * Lista agendamentos de um tenant
   */
  async listAppointments(tenantId: string, options?: { chatId?: string; limit?: number }) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        chatId: options?.chatId,
      },
      orderBy: { startTime: 'asc' },
      take: options?.limit || 50,
      include: {
        googleCalendar: {
          select: { summary: true },
        },
      },
    });
  }

  /**
   * Cancela um agendamento
   */
  async cancelAppointment(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        googleCalendar: {
          include: { googleAccount: true },
        },
      },
    });

    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    // Cancela no Google Calendar
    const accessToken = await this.googleAuth.refreshAccessToken(
      appointment.googleCalendar.googleAccountId,
    );

    await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(appointment.googleCalendar.calendarId)}/events/${appointment.googleEventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // Atualiza status no banco
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'canceled' },
    });

    this.logger.log(`Agendamento ${appointmentId} cancelado`);
  }

  /**
   * Busca eventos de um calendário em um período
   */
  async getEvents(
    googleCalendarId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    source: 'google' | 'ai';
    htmlLink?: string;
  }>> {
    const calendar = await this.prisma.googleCalendar.findUnique({
      where: { id: googleCalendarId },
    });

    if (!calendar) {
      throw new Error('Calendário não encontrado');
    }

    const accessToken = await this.googleAuth.refreshAccessToken(calendar.googleAccountId);

    // Busca eventos do Google Calendar
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar.calendarId)}/events?` +
        new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error('Erro ao buscar eventos');
    }

    const data = await response.json();
    const events = (data.items || []).map((event: any) => {
      const isAllDay = !event.start.dateTime;
      return {
        id: event.id,
        title: event.summary || '(Sem título)',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        allDay: isAllDay,
        source: 'google' as const,
        htmlLink: event.htmlLink,
      };
    });

    // Busca agendamentos feitos pela IA no banco
    const aiAppointments = await this.prisma.appointment.findMany({
      where: {
        googleCalendarId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { not: 'canceled' },
      },
    });

    // Marca os eventos que foram criados pela IA
    const aiEventIds = new Set(aiAppointments.map(a => a.googleEventId));
    
    return events.map((event: { id: string; title: string; start: string; end: string; allDay: boolean; source: 'google' | 'ai'; htmlLink?: string }) => ({
      ...event,
      source: aiEventIds.has(event.id) ? 'ai' as const : 'google' as const,
    }));
  }

  /**
   * Busca horários disponíveis (simplificado)
   * Retorna slots de 1 hora no dia especificado
   */
  async getAvailableSlots(
    googleCalendarId: string,
    date: Date,
    workingHours: { start: number; end: number } = { start: 9, end: 18 },
  ) {
    const calendar = await this.prisma.googleCalendar.findUnique({
      where: { id: googleCalendarId },
    });

    if (!calendar) {
      throw new Error('Calendário não encontrado');
    }

    const accessToken = await this.googleAuth.refreshAccessToken(calendar.googleAccountId);

    // Define o intervalo do dia
    const startOfDay = new Date(date);
    startOfDay.setHours(workingHours.start, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(workingHours.end, 0, 0, 0);

    // Busca eventos do dia
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar.calendarId)}/events?` +
        new URLSearchParams({
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error('Erro ao buscar eventos');
    }

    const data = await response.json();
    const busySlots = (data.items || []).map((event: any) => ({
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
    }));

    // Gera slots disponíveis (1 hora cada)
    const availableSlots: Array<{ start: Date; end: Date }> = [];

    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Verifica se não há conflito
      const isBusy = busySlots.some(
        (busy: { start: Date; end: Date }) =>
          (slotStart >= busy.start && slotStart < busy.end) ||
          (slotEnd > busy.start && slotEnd <= busy.end),
      );

      if (!isBusy) {
        availableSlots.push({ start: slotStart, end: slotEnd });
      }
    }

    return availableSlots;
  }

  /**
   * Verifica se um horário está disponível no calendário
   */
  async checkAvailability(
    googleCalendarId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const calendar = await this.prisma.googleCalendar.findUnique({
      where: { id: googleCalendarId },
    });

    if (!calendar) {
      throw new Error('Calendário não encontrado');
    }

    const accessToken = await this.googleAuth.refreshAccessToken(calendar.googleAccountId);

    // Busca eventos no período
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar.calendarId)}/events?` +
        new URLSearchParams({
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          singleEvents: 'true',
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error('Erro ao verificar disponibilidade');
    }

    const data = await response.json();
    const events = data.items || [];

    // Se não há eventos no período, está disponível
    return events.length === 0;
  }
}
