import { Injectable, Logger } from '@nestjs/common';
import { useDatabaseAuthState, clearAuthState } from './auth-state-db';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require('qrcode-terminal');

type MessageHandler = (data: {
  sessionId: string;
  remoteJid: string;
  message: any;
}) => void | Promise<void>;

type OutboundHandler = (data: {
  sessionId: string;
  remoteJid: string;
}) => void | Promise<void>;

type QrHandler = (data: {
  sessionId: string;
  qr: string;
}) => void | Promise<void>;

type ConnectionHandler = (data: {
  sessionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'logged_out';
}) => void | Promise<void>;

export type SessionStatus = 'connecting' | 'waiting_qr' | 'connected' | 'disconnected';

@Injectable()
export class SessionManager {
  private readonly logger = new Logger(SessionManager.name);
  private sessions = new Map<string, any>();
  private sessionStatus = new Map<string, SessionStatus>();
  private messageHandlers: MessageHandler[] = [];
  private outboundHandlers: OutboundHandler[] = [];
  private qrHandlers: QrHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  private lastQrBySession = new Map<string, string>();

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
  }

  onOutboundMessage(handler: OutboundHandler) {
    this.outboundHandlers.push(handler);
  }

  onQr(handler: QrHandler) {
    this.qrHandlers.push(handler);
  }

  onConnection(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler);
  }

  async createSession(sessionId: string, forceNew = false) {
    if (this.sessions.has(sessionId)) {
      if (!forceNew) {
        return this.sessions.get(sessionId);
      }
      // Fecha socket antigo antes de recriar
      await this.closeSessionSocket(sessionId);
      this.sessions.delete(sessionId);
    }

    // Define status inicial
    this.sessionStatus.set(sessionId, 'connecting');
    this.notifyConnectionHandlers(sessionId, 'connecting');

    const dynamicImport: (specifier: string) => Promise<any> = new Function(
      'specifier',
      'return import(specifier)',
    ) as any;

    const baileys = await dynamicImport('@whiskeysockets/baileys');
    const {
      default: makeWASocket,
      fetchLatestBaileysVersion,
      DisconnectReason,
    } = baileys as any;

    // Usa banco de dados para armazenar credenciais (persistência no Railway)
    const { state, saveCreds } = await useDatabaseAuthState(sessionId);
    this.logger.log(`🔐 Auth state carregado do banco para ${sessionId}`);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Chrome (Linux)', '', ''],
      getMessage: async () => undefined,
      // Desabilita sync de histórico para evitar problemas conhecidos
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      // Mantém conexão mais estável
      keepAliveIntervalMs: 30000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      emitOwnEvents: false,
      markOnlineOnConnect: true,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      qrTimeout: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    // Ignora sincronização de histórico (não precisamos agora)
    sock.ev.on('messaging-history.set', () => {
      this.logger.log(`Ignorando sincronização de histórico para a sessão ${sessionId}`);
    });

    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log(
          `QR Code gerado para a sessão ${sessionId}. Escaneie com o WhatsApp do celular.`,
        );

        try {
          (qrcode as any).generate(qr, { small: true });
        } catch (err: any) {
          this.logger.error(`Erro ao gerar QR Code no terminal: ${err?.message || err}`);
          console.log('QR bruto (copie e cole em um gerador de QR, se necessário):');
          console.log(qr);
        }

        this.lastQrBySession.set(sessionId, qr);
        this.sessionStatus.set(sessionId, 'waiting_qr');

        for (const handler of this.qrHandlers) {
          handler({ sessionId, qr });
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect as any)?.error?.output?.statusCode;
        this.logger.warn(
          `Conexão fechada para a sessão ${sessionId}. statusCode=${statusCode ?? 'desconhecido'}`,
        );

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          this.sessionStatus.set(sessionId, 'disconnected');
          this.notifyConnectionHandlers(sessionId, 'disconnected');
          this.logger.warn(`Tentando reconectar sessão ${sessionId} em 3s...`);
          setTimeout(() => {
            this.createSession(sessionId, true).catch((err) =>
              this.logger.error(`Erro ao reconectar sessão ${sessionId}: ${err?.message || err}`),
            );
          }, 3000);
        } else {
          this.logger.warn(`Sessão ${sessionId} deslogada. Será necessário ler um novo QR.`);
          this.sessionStatus.set(sessionId, 'disconnected');
          this.notifyConnectionHandlers(sessionId, 'logged_out');
          this.sessions.delete(sessionId);
          this.sessionStatus.delete(sessionId);
          this.lastQrBySession.delete(sessionId);
          // Limpa credenciais do banco de dados
          clearAuthState(sessionId).catch(() => undefined);
        }
      } else if (connection === 'open') {
        this.logger.log(`Sessão ${sessionId} conectada com sucesso!`);
        this.sessionStatus.set(sessionId, 'connected');
        this.lastQrBySession.delete(sessionId); // QR não é mais necessário
        this.notifyConnectionHandlers(sessionId, 'connected');
      }
    });

    sock.ev.on('messages.upsert', (payload: any) => {
      const { messages, type } = payload;
      if (type !== 'notify' || !messages) return;

      for (const msg of messages) {
        const remoteJid = msg.key?.remoteJid ?? '';

        // Ignora mensagens de status/broadcast
        if (remoteJid === 'status@broadcast') continue;
        if (remoteJid.endsWith('@broadcast')) continue;
        if (remoteJid.endsWith('@g.us')) continue; // Ignora grupos por enquanto

        // Ignora mensagens sem conteúdo real
        if (!msg.message) continue;

        // Ignora protocol messages, reactions, etc.
        if (msg.message.protocolMessage) continue;
        if (msg.message.reactionMessage) continue;
        if (msg.message.senderKeyDistributionMessage) continue;

        // Mensagens enviadas pelo próprio usuário (celular) - pausa a IA
        if (msg.key?.fromMe) {
          this.logger.debug(`Mensagem enviada manualmente para ${remoteJid}`);
          for (const handler of this.outboundHandlers) {
            handler({ sessionId, remoteJid });
          }
          continue;
        }

        this.logger.debug(`Mensagem recebida de ${remoteJid}`);

        for (const handler of this.messageHandlers) {
          handler({ sessionId, remoteJid, message: msg });
        }
      }
    });

    this.sessions.set(sessionId, sock);
    this.logger.log(`Sessão ${sessionId} criada`);
    return sock;
  }

  private async closeSessionSocket(sessionId: string) {
    const sock = this.sessions.get(sessionId);
    if (!sock) return;
    try {
      if (typeof sock.end === 'function') {
        await sock.end();
      }
    } catch {
      // ignora erros ao fechar
    }
    try {
      sock.ws?.close?.();
    } catch {
      // ignora erros ao fechar websocket
    }
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  getLastQr(sessionId: string): string | null {
    return this.lastQrBySession.get(sessionId) ?? null;
  }

  /**
   * Retorna o status atual da sessão
   */
  getSessionStatus(sessionId: string): SessionStatus | null {
    return this.sessionStatus.get(sessionId) ?? null;
  }

  /**
   * Lista todas as sessões ativas com seus status
   */
  listSessions(): Array<{ sessionId: string; status: SessionStatus }> {
    const result: Array<{ sessionId: string; status: SessionStatus }> = [];
    for (const [sessionId, status] of this.sessionStatus.entries()) {
      result.push({ sessionId, status });
    }
    return result;
  }

  /**
   * Desconecta uma sessão (logout)
   */
  async disconnectSession(sessionId: string): Promise<boolean> {
    const sock = this.sessions.get(sessionId);
    if (!sock) return false;

    try {
      await sock.logout();
    } catch {
      // ignora erros ao deslogar
    }

    await this.closeSessionSocket(sessionId);
    this.sessions.delete(sessionId);
    this.sessionStatus.delete(sessionId);
    this.lastQrBySession.delete(sessionId);
    // Limpa credenciais do banco de dados
    await clearAuthState(sessionId).catch(() => undefined);

    this.logger.log(`Sessão ${sessionId} desconectada manualmente`);
    return true;
  }

  /**
   * Notifica handlers de mudança de conexão
   */
  private notifyConnectionHandlers(
    sessionId: string,
    status: 'connecting' | 'connected' | 'disconnected' | 'logged_out',
  ) {
    for (const handler of this.connectionHandlers) {
      try {
        handler({ sessionId, status });
      } catch (err: any) {
        this.logger.error(`Erro em handler de conexão: ${err?.message || err}`);
      }
    }
  }
}
