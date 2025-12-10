import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { AgentConfigService } from './agent-config.service';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

// Bloco: Identidade do Agente
export interface AgentIdentity {
  enabled: boolean;
  name: string;           // Nome do agente (ex: Leandro)
  role: string;           // Cargo (ex: consultor)
  company: string;        // Empresa (ex: Avanço Contabilidade)
  voiceTone: 'professional' | 'friendly' | 'empathetic' | 'direct';
  informalityLevel: number; // 1-10
}

// Bloco: Objetivo do Agente
export interface AgentObjective {
  enabled: boolean;
  type: string;           // Ex: "agendar reunião"
  meetingDuration: number; // Em minutos
  description: string;    // Descrição do objetivo
}

// Bloco: Regras de Comportamento
export interface BehaviorRules {
  enabled: boolean;
  maxMessageLength: number;        // Limite de caracteres
  useEmojis: boolean;
  emojiLevel: 'none' | 'minimal' | 'moderate' | 'frequent';
  restrictions: string[];          // Lista de restrições (ex: "não falar preços")
  neverMention: string[];          // Nunca mencionar (ex: "IA", "bot")
}

// Bloco: Mensagens Padrão
export interface StandardMessage {
  id: string;
  name: string;           // Nome interno
  trigger: string;        // Quando usar (ex: "primeira mensagem", "contém palavra X")
  triggerKeywords: string[];
  message: string;
}

export interface StandardMessages {
  enabled: boolean;
  messages: StandardMessage[];
}

// Bloco: Dados a Coletar
export interface DataField {
  id: string;
  name: string;           // Ex: "nome", "cnpj", "email"
  label: string;          // Ex: "Nome completo"
  required: boolean;
  format?: string;        // Ex: "telefone", "email", "cnpj"
}

export interface DataCollection {
  enabled: boolean;
  fields: DataField[];
  defaultPhoneCountry: string;  // Ex: "+55"
  defaultPhoneDDD: string;      // Ex: "85"
}

// Bloco: Tratamento de Objeções
export interface Objection {
  id: string;
  trigger: string;        // Ex: "quer só orçamento"
  keywords: string[];
  response: string;
}

export interface ObjectionHandling {
  enabled: boolean;
  objections: Objection[];
}

export interface AgentSettings {
  agentName: string;
  voiceTone: 'professional' | 'friendly' | 'empathetic' | 'direct';
  systemPrompt: string;
  businessHours: {
    enabled: boolean;
    schedule: {
      [key: string]: { start: string; end: string; enabled: boolean };
    };
    outsideHoursMessage: string;
    timezone: string;
    minAdvanceMinutes: number;  // Antecedência mínima para agendamentos
  };
  welcomeMessage: {
    enabled: boolean;
    message: string;
  };
  faqs: FaqItem[];
  
  // Novos blocos de configuração modular
  identity?: AgentIdentity;
  objective?: AgentObjective;
  behaviorRules?: BehaviorRules;
  standardMessages?: StandardMessages;
  dataCollection?: DataCollection;
  objectionHandling?: ObjectionHandling;
}

interface UpdateAgentSettingsDto {
  tenantId: string;
  settings: Partial<AgentSettings>;
}

@Controller('agent/config')
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  /**
   * Retorna as configurações do agente
   * GET /agent/config?tenantId=xxx
   */
  @Get()
  async getConfig(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const settings = await this.agentConfigService.getSettings(tenantId);
    return { settings };
  }

  /**
   * Atualiza as configurações do agente
   * PATCH /agent/config
   */
  @Patch()
  async updateConfig(@Body() body: UpdateAgentSettingsDto) {
    if (!body.tenantId) {
      return { error: 'tenantId é obrigatório' };
    }
    const settings = await this.agentConfigService.updateSettings(body.tenantId, body.settings);
    return { settings, message: 'Configurações salvas com sucesso' };
  }
}
