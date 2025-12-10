import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { SessionManager } from './session.manager';
import { ChatService } from '../chat/chat.service';
import { TenantService } from '../tenant/tenant.service';
import { AgentService } from '../agent/agent.service';
import { MediaService } from '../ai/media/media.service';
import { hasAuthState } from './auth-state-db';

// Cache de mapeamento sessionId -> { tenantId, whatsappAccountId }
type SessionInfo = { tenantId: string; whatsappAccountId: string };

// Cache para batching de mensagens
type PendingMessage = {
  sessionId: string;
  remoteJid: string;
  message: any;
  timestamp: number;
};

// Configurações de batching
const BATCH_DELAY_MS = 10000; // 10 segundos para agrupar mensagens
const AI_REACTIVATION_MS = 10 * 60 * 1000; // 10 minutos para reativar IA

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private sessionInfoCache = new Map<string, SessionInfo>();

  // Batching de mensagens: aguarda um tempo antes de processar
  private pendingMessages = new Map<string, PendingMessage[]>(); // chatKey -> messages
  private batchTimers = new Map<string, NodeJS.Timeout>(); // chatKey -> timer
  
  // Timers para reativação automática da IA
  private aiReactivationTimers = new Map<string, NodeJS.Timeout>(); // chatId -> timer

  // Flag para habilitar/desabilitar respostas automáticas da IA
  private aiEnabled = true;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly chatService: ChatService,
    private readonly tenantService: TenantService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly mediaService: MediaService,
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

    // Reconecta sessões existentes em background (não bloqueia startup)
    // Delay de 5 segundos para garantir que tudo está pronto
    setTimeout(() => {
      this.reconnectExistingSessions().catch(err => {
        this.logger.error(`Erro ao reconectar sessões em background: ${err?.message}`);
      });
    }, 5000);
  }

  /**
   * Reconecta sessões WhatsApp que já têm credenciais salvas
   * Reconecta uma de cada vez com delay para não sobrecarregar
   */
  private async reconnectExistingSessions() {
    try {
      // Busca todas as contas WhatsApp do banco
      const accounts = await this.tenantService.getAllWhatsappAccounts();
      
      this.logger.log(`📱 Encontradas ${accounts.length} contas para verificar reconexão`);
      
      // Reconecta uma de cada vez com delay
      for (const account of accounts) {
        try {
          const sessionId = account.sessionId;
          
          // Verifica se existem credenciais no banco de dados
          const hasCredentials = await hasAuthState(sessionId);
          
          if (hasCredentials) {
            this.logger.log(`🔄 Reconectando sessão ${sessionId}...`);
            
            // Popula cache
            this.sessionInfoCache.set(sessionId, {
              tenantId: account.tenantId,
              whatsappAccountId: account.id,
            });
            
            // Cria sessão (vai usar credenciais do banco)
            await this.sessionManager.createSession(sessionId);
            
            // Delay entre reconexões para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } else {
            this.logger.debug(`Sessão ${sessionId} sem credenciais, ignorando`);
          }
        } catch (sessionError: any) {
          // Erro em uma sessão não deve parar as outras
          this.logger.error(`Erro ao reconectar sessão ${account.sessionId}: ${sessionError?.message}`);
        }
      }
      
      this.logger.log('✅ Processo de reconexão de sessões concluído');
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
        // Tenta analisar a imagem usando Gemini
        const caption = msgContent.imageMessage.caption || '';
        const imageDescription = await this.analyzeImageMessage(sessionId, message, caption);
        text = imageDescription || caption;
      } else if (msgContent?.audioMessage) {
        type = 'audio';
        // Tenta transcrever o áudio usando Gemini
        text = await this.transcribeAudioMessage(sessionId, message);
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

      // Processa com o Agente de IA se habilitado (usando batching)
      if (this.aiEnabled && sessionInfo && text) {
        const chatKey = `${sessionId}:${customerWaId}`;
        
        // Adiciona mensagem ao batch
        const pendingMsg: PendingMessage = {
          sessionId,
          remoteJid,
          message: { text, type, pushName, customerWaId },
          timestamp: Date.now(),
        };
        
        const existing = this.pendingMessages.get(chatKey) || [];
        existing.push(pendingMsg);
        this.pendingMessages.set(chatKey, existing);
        
        // Cancela timer anterior se existir
        const existingTimer = this.batchTimers.get(chatKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Agenda processamento do batch
        this.logger.debug(`Batching: ${existing.length} mensagem(s) de ${customerWaId}, aguardando ${BATCH_DELAY_MS / 1000}s...`);
        const timer = setTimeout(() => {
          this.processBatchedMessages(chatKey, sessionInfo, pushName);
        }, BATCH_DELAY_MS);
        
        this.batchTimers.set(chatKey, timer);
      }
    } catch (error: any) {
      this.logger.error(`Erro ao salvar mensagem: ${error?.message || error}`);
    }
  }

  /**
   * Processa mensagens em batch após o delay
   */
  private async processBatchedMessages(chatKey: string, sessionInfo: SessionInfo, pushName: string) {
    const messages = this.pendingMessages.get(chatKey);
    if (!messages || messages.length === 0) return;

    // Limpa as mensagens pendentes e o timer
    this.pendingMessages.delete(chatKey);
    this.batchTimers.delete(chatKey);

    const [sessionId, customerWaId] = chatKey.split(':');
    
    // Combina todos os textos em um só
    const combinedText = messages.map(m => m.message.text).join('\n');
    const type = messages[messages.length - 1].message.type; // Usa o tipo da última mensagem

    this.logger.log(`Processando batch de ${messages.length} mensagem(s) de ${customerWaId}`);

    await this.processMessageWithAgent(sessionInfo, sessionId, customerWaId, pushName, type, combinedText);
  }

  /**
   * Processa uma mensagem com o agente de IA
   */
  private async processMessageWithAgent(
    sessionInfo: SessionInfo,
    sessionId: string,
    customerWaId: string,
    pushName: string,
    type: 'text' | 'audio' | 'image' | 'file',
    text?: string,
  ) {
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

      // Verifica se o número está na blacklist
      const isBlacklisted = await this.chatService.isBlacklisted(sessionInfo.tenantId, customerWaId);
      if (isBlacklisted) {
        this.logger.log(`🚫 Número ${customerWaId} está na blacklist, ignorando processamento`);
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
      this.logger.error(`Erro no AgentService: ${agentError?.message || agentError}`);
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
   * Transcreve uma mensagem de áudio usando Gemini
   */
  private async transcribeAudioMessage(sessionId: string, message: any): Promise<string | undefined> {
    try {
      const sock = this.sessionManager.getSession(sessionId);
      if (!sock) {
        this.logger.warn(`Sessão ${sessionId} não encontrada para download de áudio`);
        return undefined;
      }

      // Import dinâmico do Baileys para download de mídia
      const dynamicImport: (specifier: string) => Promise<any> = new Function(
        'specifier',
        'return import(specifier)',
      ) as any;
      const baileys = await dynamicImport('@whiskeysockets/baileys');
      const { downloadMediaMessage } = baileys;

      // Faz download do áudio
      this.logger.log('Iniciando download do áudio para transcrição...');
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: undefined,
          reuploadRequest: sock.updateMediaMessage,
        },
      );

      if (!buffer) {
        this.logger.warn('Não foi possível baixar o áudio');
        return undefined;
      }

      // Converte para base64
      const audioBase64 = buffer.toString('base64');
      
      // Determina o mimeType (geralmente ogg/opus no WhatsApp)
      const audioInfo = message.message?.audioMessage;
      const mimeType = audioInfo?.mimetype || 'audio/ogg; codecs=opus';

      this.logger.log(`Áudio baixado (${buffer.length} bytes), transcrevendo com Gemini...`);

      // Transcreve usando o MediaService (Gemini)
      const transcription = await this.mediaService.transcribeAudio(audioBase64, mimeType);

      if (transcription) {
        this.logger.log(`🎤 Áudio transcrito: "${transcription.slice(0, 100)}..."`);
        return `[Áudio transcrito]: ${transcription}`;
      }

      return undefined;
    } catch (error: any) {
      this.logger.error(`Erro ao transcrever áudio: ${error?.message || error}`);
      return '[Áudio não transcrito]';
    }
  }

  /**
   * Analisa uma imagem usando Gemini 2.5 Flash
   */
  private async analyzeImageMessage(sessionId: string, message: any, caption?: string): Promise<string | undefined> {
    try {
      const sock = this.sessionManager.getSession(sessionId);
      if (!sock) {
        this.logger.warn(`Sessão ${sessionId} não encontrada para download de imagem`);
        return undefined;
      }

      // Import dinâmico do Baileys para download de mídia
      const dynamicImport: (specifier: string) => Promise<any> = new Function(
        'specifier',
        'return import(specifier)',
      ) as any;
      const baileys = await dynamicImport('@whiskeysockets/baileys');
      const { downloadMediaMessage } = baileys;

      // Faz download da imagem
      this.logger.log('Iniciando download da imagem para análise...');
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: undefined,
          reuploadRequest: sock.updateMediaMessage,
        },
      );

      if (!buffer) {
        this.logger.warn('Não foi possível baixar a imagem');
        return undefined;
      }

      // Converte para base64
      const imageBase64 = buffer.toString('base64');
      
      // Determina o mimeType
      const imageInfo = message.message?.imageMessage;
      const mimeType = imageInfo?.mimetype || 'image/jpeg';

      this.logger.log(`Imagem baixada (${buffer.length} bytes), analisando com Gemini...`);

      // Analisa usando o MediaService (Gemini)
      const context = caption ? `O usuário enviou esta imagem com a legenda: "${caption}"` : undefined;
      const description = await this.mediaService.describeImage(imageBase64, mimeType, context);

      if (description) {
        this.logger.log(`🖼️ Imagem analisada: "${description.slice(0, 100)}..."`);
        if (caption) {
          return `[Imagem com legenda "${caption}"]: ${description}`;
        }
        return `[Imagem analisada]: ${description}`;
      }

      return caption || undefined;
    } catch (error: any) {
      this.logger.error(`Erro ao analisar imagem: ${error?.message || error}`);
      return caption ? `[Imagem com legenda]: ${caption}` : '[Imagem não analisada]';
    }
  }

  /**
   * Handler para mensagens enviadas manualmente pelo celular
   * Pausa a IA automaticamente para esse chat e agenda reativação
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

      // Cancela timer de reativação anterior se existir
      const existingTimer = this.aiReactivationTimers.get(chat.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Agenda reativação automática da IA após 10 minutos
      const reactivationTimer = setTimeout(async () => {
        try {
          await this.chatService.updateAiPaused(chat.id, false);
          this.logger.log(`🤖 IA reativada automaticamente para chat ${chat.id} (10 min sem mensagem manual)`);
          this.aiReactivationTimers.delete(chat.id);
        } catch (err: any) {
          this.logger.error(`Erro ao reativar IA: ${err?.message || err}`);
        }
      }, AI_REACTIVATION_MS);

      this.aiReactivationTimers.set(chat.id, reactivationTimer);
      this.logger.debug(`Timer de reativação de IA agendado para ${AI_REACTIVATION_MS / 60000} min`);
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
