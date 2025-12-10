import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { AgentSettings } from './agent-config.controller';

const DEFAULT_SETTINGS: AgentSettings = {
  agentName: 'Assistente Virtual',
  voiceTone: 'friendly',
  systemPrompt: `Você é um assistente virtual útil e amigável.
Seu objetivo é agendar consultas e responder dúvidas sobre nossos serviços com base na Base de Conhecimento.
- Seja sempre educado.
- Se não souber a resposta, transfira para um humano.
- Não invente informações que não estejam nos arquivos.`,
  businessHours: {
    enabled: false,
    schedule: {
      mon: { start: '09:00', end: '18:00', enabled: true },
      tue: { start: '09:00', end: '18:00', enabled: true },
      wed: { start: '09:00', end: '18:00', enabled: true },
      thu: { start: '09:00', end: '18:00', enabled: true },
      fri: { start: '09:00', end: '18:00', enabled: true },
      sat: { start: '09:00', end: '12:00', enabled: false },
      sun: { start: '09:00', end: '12:00', enabled: false },
    },
    outsideHoursMessage: 'Olá! 👋 No momento estamos fora do horário de atendimento. Nosso horário é de segunda a sexta, das 9h às 18h. Deixe sua mensagem que retornaremos assim que possível!',
    timezone: 'America/Sao_Paulo',
    minAdvanceMinutes: 50,
  },
  welcomeMessage: {
    enabled: true,
    message: 'Olá! 👋 Seja bem-vindo(a)! Sou o assistente virtual e estou aqui para ajudar. Como posso te atender hoje?',
  },
  faqs: [],
  
  // Blocos de configuração modular
  identity: {
    enabled: false,
    name: '',
    role: '',
    company: '',
    voiceTone: 'friendly',
    informalityLevel: 5,
  },
  objective: {
    enabled: false,
    type: 'agendar reunião',
    meetingDuration: 60,
    description: '',
  },
  behaviorRules: {
    enabled: false,
    maxMessageLength: 300,
    useEmojis: true,
    emojiLevel: 'minimal',
    restrictions: [],
    neverMention: [],
  },
  standardMessages: {
    enabled: false,
    messages: [],
  },
  dataCollection: {
    enabled: false,
    fields: [],
    defaultPhoneCountry: '+55',
    defaultPhoneDDD: '',
  },
  objectionHandling: {
    enabled: false,
    objections: [],
  },
};

@Injectable()
export class AgentConfigService {
  private readonly logger = new Logger(AgentConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna as configurações do agente para um tenant
   */
  async getSettings(tenantId: string): Promise<AgentSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, name: true },
    });

    if (!tenant) {
      throw new Error('Tenant não encontrado');
    }

    // Mescla configurações salvas com padrões
    const savedSettings = (tenant.settings as Partial<AgentSettings>) || {};
    
    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
      // Usa nome do tenant como padrão se não tiver nome do agente
      agentName: savedSettings.agentName || `Assistente ${tenant.name}`,
      businessHours: {
        ...DEFAULT_SETTINGS.businessHours,
        ...savedSettings.businessHours,
        schedule: {
          ...DEFAULT_SETTINGS.businessHours.schedule,
          ...(savedSettings.businessHours?.schedule || {}),
        },
      },
      welcomeMessage: {
        ...DEFAULT_SETTINGS.welcomeMessage,
        ...(savedSettings.welcomeMessage || {}),
      },
      faqs: savedSettings.faqs || DEFAULT_SETTINGS.faqs,
      // Blocos modulares
      identity: { ...DEFAULT_SETTINGS.identity!, ...(savedSettings.identity || {}) },
      objective: { ...DEFAULT_SETTINGS.objective!, ...(savedSettings.objective || {}) },
      behaviorRules: { ...DEFAULT_SETTINGS.behaviorRules!, ...(savedSettings.behaviorRules || {}) },
      standardMessages: { ...DEFAULT_SETTINGS.standardMessages!, ...(savedSettings.standardMessages || {}) },
      dataCollection: { ...DEFAULT_SETTINGS.dataCollection!, ...(savedSettings.dataCollection || {}) },
      objectionHandling: { ...DEFAULT_SETTINGS.objectionHandling!, ...(savedSettings.objectionHandling || {}) },
    };
  }

  /**
   * Atualiza as configurações do agente
   */
  async updateSettings(tenantId: string, updates: Partial<AgentSettings>): Promise<AgentSettings> {
    // Busca configurações atuais
    const currentSettings = await this.getSettings(tenantId);

    // Mescla com atualizações
    const newSettings: AgentSettings = {
      ...currentSettings,
      ...updates,
      businessHours: updates.businessHours
        ? {
            ...currentSettings.businessHours,
            ...updates.businessHours,
            schedule: {
              ...currentSettings.businessHours.schedule,
              ...(updates.businessHours.schedule || {}),
            },
          }
        : currentSettings.businessHours,
      welcomeMessage: updates.welcomeMessage
        ? {
            ...currentSettings.welcomeMessage,
            ...updates.welcomeMessage,
          }
        : currentSettings.welcomeMessage,
      faqs: updates.faqs ?? currentSettings.faqs,
    };

    // Salva no banco
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: newSettings as any },
    });

    this.logger.log(`Configurações do agente atualizadas para tenant ${tenantId}`);
    return newSettings;
  }

  /**
   * Verifica se está dentro do horário de atendimento
   */
  async isWithinBusinessHours(tenantId: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);

    if (!settings.businessHours.enabled) {
      return true; // Se não está habilitado, sempre atende
    }

    const now = new Date();
    const dayMap: Record<number, string> = {
      0: 'sun',
      1: 'mon',
      2: 'tue',
      3: 'wed',
      4: 'thu',
      5: 'fri',
      6: 'sat',
    };

    const dayKey = dayMap[now.getDay()];
    const daySchedule = settings.businessHours.schedule[dayKey];

    if (!daySchedule?.enabled) {
      return false;
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
  }

  /**
   * Retorna a mensagem de fora do horário
   */
  async getOutsideHoursMessage(tenantId: string): Promise<string | null> {
    const settings = await this.getSettings(tenantId);
    
    if (!settings.businessHours.enabled) {
      return null;
    }

    return settings.businessHours.outsideHoursMessage;
  }

  /**
   * Retorna a mensagem de boas-vindas se habilitada
   */
  async getWelcomeMessage(tenantId: string): Promise<string | null> {
    const settings = await this.getSettings(tenantId);
    
    if (!settings.welcomeMessage.enabled) {
      return null;
    }

    return settings.welcomeMessage.message;
  }

  /**
   * Busca FAQ que corresponde à pergunta do usuário
   */
  async findMatchingFaq(tenantId: string, userMessage: string): Promise<{ question: string; answer: string } | null> {
    const settings = await this.getSettings(tenantId);
    const lowerMessage = userMessage.toLowerCase();

    for (const faq of settings.faqs) {
      // Verifica se alguma keyword está na mensagem
      const hasKeyword = faq.keywords.some(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        return {
          question: faq.question,
          answer: faq.answer,
        };
      }
    }

    return null;
  }

  /**
   * Retorna todas as FAQs formatadas para incluir no prompt
   */
  async getFaqsForPrompt(tenantId: string): Promise<string> {
    const settings = await this.getSettings(tenantId);
    
    if (settings.faqs.length === 0) {
      return '';
    }

    const faqText = settings.faqs
      .map(faq => `P: ${faq.question}\nR: ${faq.answer}`)
      .join('\n\n');

    return `\n\nRespostas rápidas para perguntas frequentes:\n${faqText}`;
  }
}
