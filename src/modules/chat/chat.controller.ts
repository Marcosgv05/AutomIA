import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
}
