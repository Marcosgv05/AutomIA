import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { AgentConfigService } from './agent-config.service';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
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
  };
  welcomeMessage: {
    enabled: boolean;
    message: string;
  };
  faqs: FaqItem[];
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
