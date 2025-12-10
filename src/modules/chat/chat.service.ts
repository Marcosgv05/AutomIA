import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

interface SaveMessageInput {
  tenantId: string;
  whatsappAccountId: string;
  customerWaId: string;
  customerName?: string;
  direction: 'inbound' | 'outbound';
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'audio' | 'image' | 'file';
  text?: string;
  mediaUrl?: string;
  rawPayload?: any;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private resumeTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encontra ou cria um chat entre a conta WhatsApp e o cliente
   */
  async findOrCreateChat(
    tenantId: string,
    whatsappAccountId: string,
    customerWaId: string,
    customerName?: string,
  ) {
    let chat = await this.prisma.chat.findFirst({
      where: {
        tenantId,
        whatsappAccountId,
        customerWaId,
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          tenantId,
          whatsappAccountId,
          customerWaId,
          customerName: customerName || customerWaId,
        },
      });
      this.logger.log(`Chat criado: ${chat.id} para ${customerWaId}`);
    }

    return chat;
  }

  /**
   * Salva uma mensagem no banco
   */
  async saveMessage(input: SaveMessageInput) {
    const chat = await this.findOrCreateChat(
      input.tenantId,
      input.whatsappAccountId,
      input.customerWaId,
      input.customerName,
    );

    const message = await this.prisma.message.create({
      data: {
        tenantId: input.tenantId,
        chatId: chat.id,
        direction: input.direction,
        role: input.role,
        type: input.type,
        text: input.text,
        mediaUrl: input.mediaUrl,
        rawPayload: input.rawPayload,
      },
    });

    // Atualiza o updatedAt do chat
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    this.logger.debug(`Mensagem salva: ${message.id} no chat ${chat.id}`);
    return message;
  }

  /**
   * Lista chats de um tenant ou whatsappAccount
   */
  async listChats(tenantId?: string, whatsappAccountId?: string, limit = 50) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (whatsappAccountId) where.whatsappAccountId = whatsappAccountId;

    return this.prisma.chat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Atualiza o status de pausa da IA para um chat
   */
  async updateAiPaused(chatId: string, aiPaused: boolean) {
    const chat = await this.prisma.chat.update({
      where: { id: chatId },
      data: { aiPaused },
    });

    // Se pausar, programa retomada automática em 10 minutos
    if (aiPaused) {
      const existing = this.resumeTimers.get(chatId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        try {
          await this.prisma.chat.update({
            where: { id: chatId },
            data: { aiPaused: false },
          });
          this.logger.log(`IA retomada automaticamente no chat ${chatId} após 10 minutos sem intervenção manual`);
        } catch (err: any) {
          this.logger.error(`Erro ao retomar IA no chat ${chatId}: ${err?.message || err}`);
        } finally {
          this.resumeTimers.delete(chatId);
        }
      }, 10 * 60 * 1000); // 10 minutos

      this.resumeTimers.set(chatId, timer);
    } else {
      const existing = this.resumeTimers.get(chatId);
      if (existing) {
        clearTimeout(existing);
        this.resumeTimers.delete(chatId);
      }
    }

    return chat;
  }

  /**
   * Lista mensagens de um chat
   */
  async listMessages(chatId: string, limit = 100) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Busca um chat pelo ID
   */
  async getChat(chatId: string) {
    return this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        whatsappAccount: true,
      },
    });
  }

  // ========== BLACKLIST ==========

  /**
   * Verifica se um número está na blacklist
   */
  async isBlacklisted(tenantId: string, phoneNumber: string): Promise<boolean> {
    // Normaliza o número (remove caracteres não numéricos)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    const entry = await this.prisma.blacklist.findUnique({
      where: {
        tenantId_phoneNumber: {
          tenantId,
          phoneNumber: normalizedPhone,
        },
      },
    });
    
    return !!entry;
  }

  /**
   * Adiciona um número à blacklist
   */
  async addToBlacklist(tenantId: string, phoneNumber: string, reason?: string, blockedBy?: string) {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    const entry = await this.prisma.blacklist.upsert({
      where: {
        tenantId_phoneNumber: {
          tenantId,
          phoneNumber: normalizedPhone,
        },
      },
      update: {
        reason,
        blockedBy,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        phoneNumber: normalizedPhone,
        reason,
        blockedBy,
      },
    });
    
    this.logger.log(`Número ${normalizedPhone} adicionado à blacklist do tenant ${tenantId}`);
    return entry;
  }

  /**
   * Remove um número da blacklist
   */
  async removeFromBlacklist(tenantId: string, phoneNumber: string) {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    try {
      await this.prisma.blacklist.delete({
        where: {
          tenantId_phoneNumber: {
            tenantId,
            phoneNumber: normalizedPhone,
          },
        },
      });
      
      this.logger.log(`Número ${normalizedPhone} removido da blacklist do tenant ${tenantId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lista todos os números na blacklist de um tenant
   */
  async listBlacklist(tenantId: string) {
    return this.prisma.blacklist.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
