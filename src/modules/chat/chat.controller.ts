import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Lista chats de um tenant ou whatsappAccount
   * GET /chats?tenantId=xxx ou GET /chats?whatsappAccountId=xxx
   */
  @Get()
  async listChats(
    @Query('tenantId') tenantId?: string,
    @Query('whatsappAccountId') whatsappAccountId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId && !whatsappAccountId) {
      return { error: 'tenantId ou whatsappAccountId é obrigatório' };
    }
    const chats = await this.chatService.listChats(
      tenantId,
      whatsappAccountId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { chats };
  }

  /**
   * Lista mensagens de um chat
   * GET /chats/:chatId/messages
   */
  @Get(':chatId/messages')
  async listMessages(
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.chatService.listMessages(
      chatId,
      limit ? parseInt(limit, 10) : 100,
    );
    return { messages };
  }

  /**
   * Detalhes de um chat
   * GET /chats/:chatId
   */
  @Get(':chatId')
  async getChat(@Param('chatId') chatId: string) {
    const chat = await this.chatService.getChat(chatId);
    return { chat };
  }

  /**
   * Atualiza configurações de um chat (ex: pausar IA)
   * PATCH /chats/:chatId
   */
  @Patch(':chatId')
  async updateChat(
    @Param('chatId') chatId: string,
    @Body() body: { aiPaused?: boolean },
  ) {
    if (body.aiPaused !== undefined) {
      const chat = await this.chatService.updateAiPaused(chatId, body.aiPaused);
      return { chat };
    }
    return { error: 'Nenhum campo para atualizar' };
  }

  // ========== BLACKLIST ==========

  /**
   * Lista números na blacklist de um tenant
   * GET /chats/blacklist?tenantId=xxx
   */
  @Get('blacklist')
  async listBlacklist(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const blacklist = await this.chatService.listBlacklist(tenantId);
    return { blacklist };
  }

  /**
   * Adiciona um número à blacklist
   * POST /chats/blacklist
   */
  @Post('blacklist')
  async addToBlacklist(
    @Body() body: { tenantId: string; phoneNumber: string; reason?: string },
  ) {
    if (!body.tenantId || !body.phoneNumber) {
      return { error: 'tenantId e phoneNumber são obrigatórios' };
    }
    const entry = await this.chatService.addToBlacklist(
      body.tenantId,
      body.phoneNumber,
      body.reason,
    );
    return { success: true, entry };
  }

  /**
   * Remove um número da blacklist
   * DELETE /chats/blacklist/:phoneNumber?tenantId=xxx
   */
  @Delete('blacklist/:phoneNumber')
  async removeFromBlacklist(
    @Param('phoneNumber') phoneNumber: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const removed = await this.chatService.removeFromBlacklist(tenantId, phoneNumber);
    return { success: removed };
  }

  /**
   * Verifica se um número está na blacklist
   * GET /chats/blacklist/check/:phoneNumber?tenantId=xxx
   */
  @Get('blacklist/check/:phoneNumber')
  async checkBlacklist(
    @Param('phoneNumber') phoneNumber: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const isBlacklisted = await this.chatService.isBlacklisted(tenantId, phoneNumber);
    return { phoneNumber, isBlacklisted };
  }
}
