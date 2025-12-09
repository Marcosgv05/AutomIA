import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

interface SendMessageDto {
  to: string;
  text: string;
}

@Controller('whatsapp/sessions')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * Lista todas as sessões ativas
   * GET /whatsapp/sessions
   */
  @Get()
  listSessions() {
    const sessions = this.whatsappService.listSessions();
    return { sessions };
  }

  /**
   * Inicia uma nova sessão
   * POST /whatsapp/sessions/:sessionId/start
   */
  @Post(':sessionId/start')
  async startSession(@Param('sessionId') sessionId: string) {
    await this.whatsappService.startSession(sessionId);
    return { status: 'ok', sessionId };
  }

  /**
   * Retorna o QR code da sessão
   * GET /whatsapp/sessions/:sessionId/qr
   */
  @Get(':sessionId/qr')
  async getSessionQr(@Param('sessionId') sessionId: string) {
    const qr = this.whatsappService.getSessionQr(sessionId);
    return { sessionId, qr: qr ?? null };
  }

  /**
   * Retorna o status atual da sessão
   * GET /whatsapp/sessions/:sessionId/status
   */
  @Get(':sessionId/status')
  getSessionStatus(@Param('sessionId') sessionId: string) {
    const status = this.whatsappService.getSessionStatus(sessionId);
    return { sessionId, status: status ?? 'not_found' };
  }

  /**
   * Envia uma mensagem para um número
   * POST /whatsapp/sessions/:sessionId/send
   * Body: { to: "5511999999999", text: "Olá!" }
   */
  @Post(':sessionId/send')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: SendMessageDto,
  ) {
    await this.whatsappService.sendMessage(sessionId, body.to, body.text);
    return { status: 'ok', to: body.to };
  }

  /**
   * Desconecta uma sessão (logout)
   * DELETE /whatsapp/sessions/:sessionId
   */
  @Delete(':sessionId')
  async disconnectSession(@Param('sessionId') sessionId: string) {
    const success = await this.whatsappService.disconnectSession(sessionId);
    return { status: success ? 'disconnected' : 'not_found', sessionId };
  }
}
