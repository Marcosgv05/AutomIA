import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { SessionManager } from './session.manager';
import { ChatService } from '../chat/chat.service';
import { TenantService } from '../tenant/tenant.service';
import { AgentService } from '../agent/agent.service';
import { hasAuthState } from './auth-state-db';

// Cache de mapeamento sessionId -> { tenantId, whatsappAccountId }
type SessionInfo = { tenantId: string; whatsappAccountId: string };

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private sessionInfoCache = new Map<string, SessionInfo>();

  // Flag para habilitar/desabilitar respostas automáticas da IA
  private aiEnabled = true;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly chatService: ChatService,
    private readonly tenantService: TenantService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  async onModuleInit() {
    // Registra o handler de mensagens no SessionManager
    this.sessionManager.onMessage(async ({ sessionId, remoteJid, message }) => {
      await this.handleIncomingMessage(sessionId, remoteJid, message);
    });

    // Registra o handler de mensagens enviadas manualmente (fromMe)
    this.sessionManager.onOutboundMessage(async ({ sessionId, remoteJid }) => {
      await this.handleManualOutboundMessage(sessionId, remoteJid);
    });

    // Registra o handler de conexão para atualizar status no banco
    this.sessionManager.onConnection(async ({ sessionId, status }) => {
      await this.handleConnectionChange(sessionId, status);
    });

    this.logger.log('WhatsappService inicializado com handlers de mensagens e conexão');

    // Reconecta sessões existentes automaticamente
    await this.reconnectExistingSessions();
  }

  /**
   * Reconecta sessões WhatsApp que já têm credenciais salvas
   */
  private async reconnectExistingSessions() {
    try {
      // Busca todas as contas WhatsApp do banco
      const accounts = await this.tenantService.getAllWhatsappAccounts();
      
      for (const account of accounts) {
        const sessionId = account.sessionId;
        
        // Verifica se existem credenciais no banco de dados
        const hasCredentials = await hasAuthState(sessionId);
        
        if (hasCredentials) {
          // Credenciais existem no banco, tenta reconectar
          this.logger.log(`🔄 Reconectando sessão ${sessionId} (credenciais no DB)...`);
          
          // Popula cache
          this.sessionInfoCache.set(sessionId, {
            tenantId: account.tenantId,
            whatsappAccountId: account.id,
          });
          
          // Cria sessão (vai usar credenciais do banco)
          await this.sessionManager.createSession(sessionId);
          
        } else {
          // Sem credenciais no banco, sessão não pode ser reconectada automaticamente
          this.logger.debug(`Sessão ${sessionId} não tem credenciais no banco, ignorando`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Erro ao reconectar sessões: ${error?.message || error}`);
    }
  }

  async startSession(sessionId: string) {
    // Cria/recupera tenant demo e conta WhatsApp associada
    const { tenant, account } =
      await this.tenantService.findOrCreateDemoWhatsappAccount(sessionId);

    // Guarda no cache para uso rápido no handler de mensagens
    this.sessionInfoCache.set(sessionId, {
      tenantId: tenant.id,
      whatsappAccountId: account.id,
    });

    // Inicia a sessão do Baileys
    await this.sessionManager.createSession(sessionId);

    // Atualiza status para "connecting" (será "connected" quando a conexão abrir)
    await this.tenantService.updateWhatsappAccountStatus(account.id, 'disconnected');
  }

  getSessionQr(sessionId: string) {
    return this.sessionManager.getLastQr(sessionId);
  }

  /**
   * Processa mensagem recebida do WhatsApp e salva no banco
   */
  private async handleIncomingMessage(
    sessionId: string,
    remoteJid: string,
    message: any,
  ) {
    try {
      const sessionInfo = this.sessionInfoCache.get(sessionId);
      if (!sessionInfo) {
        this.logger.warn(`Sessão ${sessionId} não tem info em cache, ignorando mensagem`);
        return;
      }

      // Extrai dados da mensagem
      const customerWaId = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = message.pushName || customerWaId;

      // Determina tipo e conteúdo
      let type: 'text' | 'audio' | 'image' | 'file' = 'text';
      let text: string | undefined;
      let mediaUrl: string | undefined;

      const msgContent = message.message;
      if (msgContent?.conversation) {
        text = msgContent.conversation;
      } else if (msgContent?.extendedTextMessage?.text) {
        text = msgContent.extendedTextMessage.text;
      } else if (msgContent?.imageMessage) {
        type = 'image';
        text = msgContent.imageMessage.caption;
      } else if (msgContent?.audioMessage) {
        type = 'audio';
      } else if (msgContent?.documentMessage) {
        type = 'file';
        text = msgContent.documentMessage.fileName;
      }

      // Salva no banco
      await this.chatService.saveMessage({
        tenantId: sessionInfo.tenantId,
        whatsappAccountId: sessionInfo.whatsappAccountId,
        customerWaId,
        customerName: pushName,
        direction: 'inbound',
        role: 'user',
        type,
        text,
        mediaUrl,
        rawPayload: message,
      });

      this.logger.log(`Mensagem de ${customerWaId} salva: "${text?.slice(0, 50) || '[mídia]'}"`);

      // Processa com o Agente de IA se habilitado
      if (this.aiEnabled && sessionInfo) {
        try {
          const chat = await this.chatService.findOrCreateChat(
            sessionInfo.tenantId,
            sessionInfo.whatsappAccountId,
            customerWaId,
            pushName,
          );

          // Verifica se IA está pausada para este chat
          if (chat.aiPaused) {
            this.logger.log(`IA pausada para chat ${chat.id}, ignorando processamento`);
            return;
          }

          // Prepara dados para o agente
          const agentResponse = await this.agentService.processMessage({
            tenantId: sessionInfo.tenantId,
            chatId: chat.id,
            customerName: pushName,
            customerPhone: customerWaId,
            messageType: type as 'text' | 'audio' | 'image',
            text,
          });

          // Envia resposta se houver
          if (agentResponse.shouldRespond && agentResponse.responseText) {
            await this.sendMessage(sessionId, customerWaId, agentResponse.responseText);
            this.logger.log(`Resposta automática enviada para ${customerWaId}`);
          }
        } catch (agentError: any) {
          // Log do erro mas NÃO envia mensagem de erro ao cliente
          // para evitar loops de erro
          this.logger.error(`Erro no AgentService: ${agentError?.message || agentError}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Erro ao salvar mensagem: ${error?.message || error}`);
    }
  }

  /**
   * Envia uma mensagem de texto via WhatsApp e salva no banco
   * Divide mensagens longas e adiciona delay para parecer mais natural
   */
  async sendMessage(sessionId: string, to: string, text: string) {
    const sock = this.sessionManager.getSession(sessionId);
    if (!sock) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    // Divide mensagens longas em partes menores
    const messages = this.splitLongMessage(text);
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Envia status "digitando..." antes de cada mensagem
      await sock.sendPresenceUpdate('composing', jid);
      
      // Delay proporcional ao tamanho da mensagem (simula digitação)
      const typingDelay = Math.min(msg.length * 20, 2000); // max 2 segundos
      await this.sleep(typingDelay);
      
      // Envia a mensagem
      await sock.sendMessage(jid, { text: msg });
      
      // Para de mostrar "digitando"
      await sock.sendPresenceUpdate('paused', jid);
      
      // Delay entre mensagens múltiplas
      if (i < messages.length - 1) {
        await this.sleep(1000); // 1 segundo entre partes
      }
    }

    // Salva no banco (texto completo)
    const sessionInfo = this.sessionInfoCache.get(sessionId);
    if (sessionInfo) {
      await this.chatService.saveMessage({
        tenantId: sessionInfo.tenantId,
        whatsappAccountId: sessionInfo.whatsappAccountId,
        customerWaId: to.replace('@s.whatsapp.net', ''),
        direction: 'outbound',
        role: 'assistant',
        type: 'text',
        text,
      });
    }

    this.logger.log(`Mensagem enviada para ${to}: "${text.slice(0, 50)}..." (${messages.length} parte(s))`);
  }

  /**
   * Divide mensagem longa em partes menores
   * Tenta quebrar em pontos naturais (parágrafos, frases)
   */
  private splitLongMessage(text: string, maxLength: number = 500): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const messages: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        messages.push(remaining.trim());
        break;
      }

      // Tenta quebrar em parágrafo
      let breakPoint = remaining.lastIndexOf('\n\n', maxLength);
      
      // Se não encontrar parágrafo, tenta quebrar em ponto final
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf('. ', maxLength);
      }
      
      // Se não encontrar ponto, tenta quebrar em vírgula ou espaço
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf(', ', maxLength);
      }
      
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf(' ', maxLength);
      }
      
      // Último recurso: corta no limite
      if (breakPoint === -1) {
        breakPoint = maxLength;
      }

      const part = remaining.slice(0, breakPoint + 1).trim();
      if (part) {
        messages.push(part);
      }
      remaining = remaining.slice(breakPoint + 1).trim();
    }

    return messages;
  }

  /**
   * Helper para delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handler para mensagens enviadas manualmente pelo celular
   * Pausa a IA automaticamente para esse chat
   */
  private async handleManualOutboundMessage(sessionId: string, remoteJid: string) {
    try {
      const sessionInfo = this.sessionInfoCache.get(sessionId);
      if (!sessionInfo) return;

      const customerWaId = remoteJid.replace('@s.whatsapp.net', '');

      // Busca o chat correspondente
      const chat = await this.chatService.findOrCreateChat(
        sessionInfo.tenantId,
        sessionInfo.whatsappAccountId,
        customerWaId,
      );

      // Pausa a IA se ainda não estiver pausada
      if (!chat.aiPaused) {
        await this.chatService.updateAiPaused(chat.id, true);
        this.logger.log(`IA pausada automaticamente para chat ${chat.id} (mensagem manual detectada)`);
      }
    } catch (error: any) {
      this.logger.error(`Erro ao pausar IA por mensagem manual: ${error?.message || error}`);
    }
  }

  /**
   * Handler de mudança de conexão - atualiza status no banco
   */
  private async handleConnectionChange(
    sessionId: string,
    status: 'connecting' | 'connected' | 'disconnected' | 'logged_out',
  ) {
    try {
      const sessionInfo = this.sessionInfoCache.get(sessionId);
      if (!sessionInfo) return;

      let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
      if (status === 'connected') {
        dbStatus = 'connected';
        this.logger.log(`✅ WhatsApp conectado para a sessão ${sessionId}`);
      } else if (status === 'logged_out') {
        dbStatus = 'error';
      }

      await this.tenantService.updateWhatsappAccountStatus(
        sessionInfo.whatsappAccountId,
        dbStatus,
      );

      this.logger.log(`Status da sessão ${sessionId} atualizado para: ${status}`);
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar status da conexão: ${error?.message || error}`);
    }
  }

  /**
   * Retorna o status atual da sessão
   */
  getSessionStatus(sessionId: string) {
    return this.sessionManager.getSessionStatus(sessionId);
  }

  /**
   * Lista todas as sessões ativas
   */
  listSessions() {
    return this.sessionManager.listSessions();
  }

  /**
   * Desconecta uma sessão
   */
  async disconnectSession(sessionId: string) {
    const result = await this.sessionManager.disconnectSession(sessionId);

    // Atualiza status no banco
    const sessionInfo = this.sessionInfoCache.get(sessionId);
    if (sessionInfo) {
      await this.tenantService.updateWhatsappAccountStatus(
        sessionInfo.whatsappAccountId,
        'disconnected',
      );
      this.sessionInfoCache.delete(sessionId);
    }

    return result;
  }
}
