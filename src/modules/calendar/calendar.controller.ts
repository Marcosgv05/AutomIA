import { Body, Controller, Delete, Get, Param, Post, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { GoogleAuthService } from './google-auth.service';
import { CalendarService } from './calendar.service';

interface CreateEventDto {
  tenantId: string;
  googleCalendarId: string;
  chatId?: string;
  summary: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string;
  timezone?: string;
  attendeeEmail?: string;
}

@Controller('calendar')
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    private readonly googleAuth: GoogleAuthService,
    private readonly calendarService: CalendarService,
  ) {}

  // ==================== OAuth2 ====================

  /**
   * Inicia o fluxo de autorização do Google
   * GET /calendar/oauth/authorize?tenantId=xxx
   */
  @Get('oauth/authorize')
  authorize(@Query('tenantId') tenantId: string, @Res() res: Response) {
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId é obrigatório' });
    }

    if (!this.googleAuth.isConfigured()) {
      return res.status(500).json({ error: 'Credenciais do Google não configuradas' });
    }

    const authUrl = this.googleAuth.getAuthUrl(tenantId);
    return res.redirect(authUrl);
  }

  /**
   * Callback do OAuth2 do Google
   * GET /calendar/oauth/callback
   */
  @Get('oauth/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') tenantId: string,
    @Res() res: Response,
  ) {
    try {
      if (!code || !tenantId) {
        return res.status(400).json({ error: 'Código ou tenantId ausente' });
      }

      // Troca código por tokens
      const tokens = await this.googleAuth.exchangeCodeForTokens(code);

      // Obtém info do usuário
      const userInfo = await this.googleAuth.getUserInfo(tokens.access_token);

      // Salva no banco
      const account = await this.googleAuth.saveGoogleAccount(tenantId, tokens, userInfo);

      // Sincroniza calendários
      await this.calendarService.syncCalendars(tenantId, account.id);

      // Log de sucesso
      this.logger.log(`Conta Google conectada: ${userInfo.email} (tenant: ${tenantId})`);

      // Redireciona de volta para o frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}?google=success&email=${encodeURIComponent(userInfo.email)}`);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== Google Accounts ====================

  /**
   * Lista contas Google de um tenant
   * GET /calendar/accounts?tenantId=xxx
   */
  @Get('accounts')
  async listAccounts(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const accounts = await this.googleAuth.listAccounts(tenantId);
    return { accounts };
  }

  /**
   * Sincroniza calendários de uma conta
   * POST /calendar/accounts/:accountId/sync
   */
  @Post('accounts/:accountId/sync')
  async syncCalendars(
    @Param('accountId') accountId: string,
    @Query('tenantId') tenantId: string,
  ) {
    await this.calendarService.syncCalendars(tenantId, accountId);
    return { status: 'ok', message: 'Calendários sincronizados' };
  }

  // ==================== Events ====================

  /**
   * Cria um evento no calendário
   * POST /calendar/events
   */
  @Post('events')
  async createEvent(@Body() body: CreateEventDto) {
    const event = await this.calendarService.createEvent({
      tenantId: body.tenantId,
      googleCalendarId: body.googleCalendarId,
      chatId: body.chatId,
      summary: body.summary,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      timezone: body.timezone,
      attendeeEmail: body.attendeeEmail,
    });

    return { event };
  }

  /**
   * Lista agendamentos de um tenant
   * GET /calendar/appointments?tenantId=xxx
   */
  @Get('appointments')
  async listAppointments(
    @Query('tenantId') tenantId: string,
    @Query('chatId') chatId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }

    const appointments = await this.calendarService.listAppointments(tenantId, {
      chatId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { appointments };
  }

  /**
   * Cancela um agendamento
   * DELETE /calendar/appointments/:id
   */
  @Delete('appointments/:id')
  async cancelAppointment(@Param('id') id: string) {
    await this.calendarService.cancelAppointment(id);
    return { status: 'canceled' };
  }

  /**
   * Busca horários disponíveis
   * GET /calendar/slots?googleCalendarId=xxx&date=2024-12-15
   */
  @Get('slots')
  async getAvailableSlots(
    @Query('googleCalendarId') googleCalendarId: string,
    @Query('date') date: string,
  ) {
    if (!googleCalendarId || !date) {
      return { error: 'googleCalendarId e date são obrigatórios' };
    }

    const slots = await this.calendarService.getAvailableSlots(
      googleCalendarId,
      new Date(date),
    );

    return { slots };
  }

  /**
   * Busca eventos de um calendário em um período
   * GET /calendar/events?googleCalendarId=xxx&start=2024-12-01&end=2024-12-31
   */
  @Get('events')
  async getEvents(
    @Query('googleCalendarId') googleCalendarId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!googleCalendarId || !start || !end) {
      return { error: 'googleCalendarId, start e end são obrigatórios' };
    }

    const events = await this.calendarService.getEvents(
      googleCalendarId,
      new Date(start),
      new Date(end),
    );

    return { events };
  }
}
