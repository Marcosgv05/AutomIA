import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { MemoryCacheService } from '../../infra/cache/memory-cache.service';
import { GeminiService } from '../ai/llm/gemini.service';
import { MediaService } from '../ai/media/media.service';
import { DocumentsService } from '../documents/documents.service';
import { CalendarService } from '../calendar/calendar.service';
import { AgentConfigService } from './agent-config.service';

interface IncomingMessage {
  tenantId: string;
  chatId: string;
  customerName: string;
  customerPhone: string;
  messageType: 'text' | 'audio' | 'image';
  text?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
}

interface AgentResponse {
  shouldRespond: boolean;
  responseText?: string;
  actionTaken?: 'none' | 'scheduled' | 'paused' | 'resumed';
}

// Ferramentas que o agente pode usar
const AGENT_TOOLS = [
  {
    name: 'schedule_appointment',
    description: 'Agendar um compromisso no calendário. Use quando o cliente quiser marcar horário, consulta, reunião, etc.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Título do agendamento (ex: "Consulta com João")',
        },
        date: {
          type: 'string',
          description: 'Data no formato YYYY-MM-DD',
        },
        startTime: {
          type: 'string',
          description: 'Horário de início no formato HH:MM (ex: "14:00")',
        },
        endTime: {
          type: 'string',
          description: 'Horário de término no formato HH:MM (ex: "15:00")',
        },
        description: {
          type: 'string',
          description: 'Descrição adicional (opcional)',
        },
      },
      required: ['summary', 'date', 'startTime'],
    },
  },
  {
    name: 'search_knowledge',
    description: 'Buscar informações na base de conhecimento do estabelecimento. Use para responder perguntas sobre serviços, preços, horários, etc.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Pergunta ou termo para buscar',
        },
      },
      required: ['query'],
    },
  },
];

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly media: MediaService,
    private readonly documents: DocumentsService,
    private readonly calendar: CalendarService,
    private readonly cache: MemoryCacheService,
    private readonly agentConfig: AgentConfigService,
  ) {}

  /**
   * Processa uma mensagem recebida e decide como responder
   */
  async processMessage(message: IncomingMessage): Promise<AgentResponse> {
    try {
      // 1. Verifica se a IA está pausada para este chat
      const chat = await this.prisma.chat.findUnique({
        where: { id: message.chatId },
      });

      if (chat?.aiPaused) {
        this.logger.log(`IA pausada para chat ${message.chatId}`);
        return { shouldRespond: false };
      }

      // 2. Verifica se é novo contato (primeira mensagem do chat)
      const isNewContact = await this.isFirstMessageInChat(message.chatId);
      
      // 3. Verifica horário de funcionamento
      const isWithinHours = await this.agentConfig.isWithinBusinessHours(message.tenantId);
      
      if (!isWithinHours) {
        const outsideMessage = await this.agentConfig.getOutsideHoursMessage(message.tenantId);
        if (outsideMessage) {
          this.logger.log(`Fora do horário de atendimento para ${message.customerPhone}`);
          return {
            shouldRespond: true,
            responseText: outsideMessage,
            actionTaken: 'none',
          };
        }
      }

      // 4. Se é novo contato, envia boas-vindas
      if (isNewContact) {
        const welcomeMessage = await this.agentConfig.getWelcomeMessage(message.tenantId);
        if (welcomeMessage) {
          this.logger.log(`Enviando boas-vindas para novo contato: ${message.customerPhone}`);
          // Marca que já enviou boas-vindas
          await this.markWelcomeSent(message.chatId);
          return {
            shouldRespond: true,
            responseText: welcomeMessage,
            actionTaken: 'none',
          };
        }
      }

      // 2. Extrai texto da mensagem (transcreve áudio ou descreve imagem se necessário)
      let messageText = message.text || '';
      
      if (message.messageType === 'audio' && message.mediaBase64) {
        messageText = await this.media.transcribeAudio(
          message.mediaBase64,
          message.mediaMimeType || 'audio/ogg',
        );
        this.logger.log(`Áudio transcrito: "${messageText.slice(0, 50)}..."`);
      } else if (message.messageType === 'image' && message.mediaBase64) {
        messageText = await this.media.describeImage(
          message.mediaBase64,
          message.mediaMimeType || 'image/jpeg',
          'Cliente enviou esta imagem. Descreva o que você vê.',
        );
        this.logger.log(`Imagem descrita: "${messageText.slice(0, 50)}..."`);
      }

      // 3. Verifica comandos especiais
      const lowerText = messageText.toLowerCase().trim();
      
      if (lowerText.includes('atendimento finalizado') || lowerText.includes('finalizar atendimento')) {
        await this.pauseAI(message.chatId);
        return {
          shouldRespond: true,
          responseText: 'Entendido! O atendimento foi finalizado. Um atendente humano pode retomar quando necessário. Obrigado pelo contato!',
          actionTaken: 'paused',
        };
      }

      if (lowerText.includes('retomar atendimento') || lowerText.includes('retomar ia')) {
        await this.resumeAI(message.chatId);
        return {
          shouldRespond: true,
          responseText: 'A IA foi reativada! Como posso ajudar?',
          actionTaken: 'resumed',
        };
      }

      // 4. Busca histórico recente
      const recentMessages = await this.getRecentHistory(message.chatId, 10);

      // 5. Busca contexto da base de conhecimento
      const ragContext = await this.documents.searchRelevantChunks(
        message.tenantId,
        messageText,
        3,
      );

      // 6. Busca dados do tenant para personalizar
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: message.tenantId },
        select: { name: true },
      });

      // 7. Busca FAQs para incluir no prompt
      const faqsText = await this.agentConfig.getFaqsForPrompt(message.tenantId);

      // 8. Monta o prompt do sistema
      const systemPrompt = this.buildSystemPrompt(
        message.customerName,
        ragContext,
        tenant?.name,
        faqsText,
      );

      // 7. Monta histórico de mensagens
      const conversationHistory = recentMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text || '',
      }));

      // Adiciona a mensagem atual
      conversationHistory.push({
        role: 'user' as const,
        content: messageText,
      });

      // 8. Chama o Gemini com ferramentas
      const response = await this.gemini.generateContent(
        systemPrompt,
        conversationHistory,
        AGENT_TOOLS,
      );

      // 9. Processa chamadas de ferramentas
      let responseText = response.text;
      let actionTaken: 'none' | 'scheduled' = 'none';

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          if (toolCall.name === 'schedule_appointment') {
            const result = await this.handleScheduleAppointment(
              message.tenantId,
              message.chatId,
              toolCall.args,
            );
            
            if (result.success) {
              actionTaken = 'scheduled';
              // Gera resposta final confirmando o agendamento
              const confirmationMessages = [
                ...conversationHistory,
                { role: 'assistant' as const, content: `Agendamento criado com sucesso para ${result.date} às ${result.time}.` },
              ];
              
              const finalResponse = await this.gemini.chat(
                systemPrompt,
                `O agendamento foi criado com sucesso. Confirme para o cliente de forma amigável. Detalhes: ${result.summary} em ${result.date} às ${result.time}.`,
                confirmationMessages.slice(0, -1),
              );
              responseText = finalResponse;
            } else {
              responseText = `Desculpe, não consegui criar o agendamento: ${result.error}. Podemos tentar novamente?`;
            }
          } else if (toolCall.name === 'search_knowledge') {
            // Busca adicional na base de conhecimento
            const additionalContext = await this.documents.searchRelevantChunks(
              message.tenantId,
              toolCall.args.query as string,
              3,
            );
            
            // Gera resposta com o contexto adicional
            const contextText = additionalContext.map(r => r.content).join('\n');
            const enhancedResponse = await this.gemini.chat(
              systemPrompt + `\n\nInformação adicional encontrada:\n${contextText}`,
              messageText,
              conversationHistory.slice(0, -1),
            );
            responseText = enhancedResponse;
          }
        }
      }

      this.logger.log(`Resposta gerada para ${message.customerPhone}: "${responseText.slice(0, 50)}..."`);

      // Adiciona ao cache do histórico (mensagem do usuário + resposta)
      this.addToHistoryCache(message.chatId, 'user', messageText);
      this.addToHistoryCache(message.chatId, 'assistant', responseText);

      return {
        shouldRespond: true,
        responseText,
        actionTaken,
      };

    } catch (error: any) {
      this.logger.error(`Erro ao processar mensagem: ${error?.message || error}`);
      // NÃO responde quando dá erro para evitar loops
      return {
        shouldRespond: false,
        actionTaken: 'none',
      };
    }
  }

  /**
   * Pausa a IA para um chat
   */
  private async pauseAI(chatId: string) {
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { aiPaused: true },
    });
    this.logger.log(`IA pausada para chat ${chatId}`);
  }

  /**
   * Retoma a IA para um chat
   */
  private async resumeAI(chatId: string) {
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { aiPaused: false },
    });
    this.logger.log(`IA retomada para chat ${chatId}`);
  }

  /**
   * Busca histórico recente de mensagens (com cache para performance)
   * Prioriza cache, fallback para banco se necessário
   */
  private async getRecentHistory(chatId: string, limit: number) {
    const cacheKey = `chat_history:${chatId}`;
    
    // Tenta buscar do cache primeiro
    const cached = this.cache.getList<{ role: string; text: string }>(cacheKey);
    
    if (cached.length > 0) {
      this.logger.debug(`Histórico do cache: ${cached.length} mensagens`);
      return cached.slice(-limit);
    }

    // Se não tem no cache, busca do banco
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        role: true,
        text: true,
        createdAt: true,
      },
    });
    
    // Inverte para ordem cronológica (mais antigo primeiro)
    const history = messages.reverse().map(m => ({
      role: m.role,
      text: m.text || '',
    }));
    
    // Salva no cache para próximas consultas (30 min TTL)
    if (history.length > 0) {
      this.cache.set(cacheKey, history, 1800);
    }
    
    return history;
  }

  /**
   * Adiciona mensagem ao cache do histórico
   */
  addToHistoryCache(chatId: string, role: string, text: string) {
    const cacheKey = `chat_history:${chatId}`;
    this.cache.pushToList(cacheKey, { role, text }, 20, 1800);
  }

  /**
   * Limpa cache do histórico de um chat
   */
  clearHistoryCache(chatId: string) {
    const cacheKey = `chat_history:${chatId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Verifica se é a primeira mensagem do chat (novo contato)
   */
  private async isFirstMessageInChat(chatId: string): Promise<boolean> {
    // Verifica no cache se já enviamos boas-vindas
    const welcomeKey = `welcome_sent:${chatId}`;
    if (this.cache.has(welcomeKey)) {
      return false;
    }

    // Verifica no banco quantas mensagens existem
    const messageCount = await this.prisma.message.count({
      where: { chatId },
    });

    // Se só tem 1 mensagem (a atual), é novo contato
    return messageCount <= 1;
  }

  /**
   * Marca que já enviamos boas-vindas para este chat
   */
  private async markWelcomeSent(chatId: string): Promise<void> {
    const welcomeKey = `welcome_sent:${chatId}`;
    // Cache por 24 horas
    this.cache.set(welcomeKey, true, 86400);
  }

  /**
   * Monta o prompt do sistema personalizado por tenant
   */
  private buildSystemPrompt(
    customerName: string,
    ragContext: Array<{ content: string; documentTitle: string }>,
    tenantName?: string,
    faqsText?: string,
  ): string {
    const businessName = tenantName || 'nosso estabelecimento';
    
    let prompt = `Você é um assistente virtual amigável e profissional de ${businessName}.
O cliente que está falando com você se chama ${customerName || 'Cliente'}.

Suas responsabilidades:
- Representar ${businessName} de forma profissional e cordial
- Responder perguntas sobre os serviços, horários e preços
- Ajudar a agendar compromissos quando solicitado
- Ser educado, prestativo e objetivo nas respostas
- Usar as ferramentas disponíveis quando necessário

Regras importantes:
- Sempre responda em português do Brasil
- Seja conciso mas completo (máximo 3 parágrafos por resposta)
- Use emojis com moderação para deixar a conversa mais amigável
- Se não souber algo, diga que vai verificar com a equipe
- Para agendar, use a ferramenta schedule_appointment
- Para buscar informações, use search_knowledge
- Nunca invente informações que não estão na base de conhecimento
- Ao agendar, sempre confirme data e horário com o cliente antes
- IMPORTANTE: Para perguntas frequentes, use as respostas pré-definidas abaixo`;

    // Adiciona FAQs se existirem
    if (faqsText) {
      prompt += faqsText;
    }

    if (ragContext.length > 0) {
      prompt += `\n\nInformações de ${businessName} para usar nas respostas:\n`;
      for (const ctx of ragContext) {
        prompt += `\n[${ctx.documentTitle}]: ${ctx.content}`;
      }
    }

    return prompt;
  }

  /**
   * Processa agendamento
   */
  private async handleScheduleAppointment(
    tenantId: string,
    chatId: string,
    args: Record<string, any>,
  ): Promise<{
    success: boolean;
    summary?: string;
    date?: string;
    time?: string;
    error?: string;
  }> {
    try {
      // Busca o primeiro calendário disponível do tenant
      const googleAccount = await this.prisma.googleAccount.findFirst({
        where: { tenantId },
        include: { calendars: true },
      });

      if (!googleAccount || googleAccount.calendars.length === 0) {
        return {
          success: false,
          error: 'Nenhum calendário configurado',
        };
      }

      const calendar = googleAccount.calendars[0];
      const date = args.date as string;
      const startTime = args.startTime as string;
      const endTime = args.endTime || this.addOneHour(startTime);

      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      await this.calendar.createEvent({
        tenantId,
        googleCalendarId: calendar.id,
        chatId,
        summary: args.summary as string,
        description: args.description as string,
        startTime: startDateTime,
        endTime: endDateTime,
      });

      return {
        success: true,
        summary: args.summary as string,
        date,
        time: startTime,
      };

    } catch (error: any) {
      this.logger.error(`Erro ao criar agendamento: ${error?.message || error}`);
      return {
        success: false,
        error: error?.message || 'Erro desconhecido',
      };
    }
  }

  /**
   * Adiciona 1 hora a um horário
   */
  private addOneHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
