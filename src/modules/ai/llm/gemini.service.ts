import { Injectable, Logger } from '@nestjs/common';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface GeminiResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  finishReason: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model = 'gemini-2.5-flash';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY não configurada!');
    }
  }

  /**
   * Gera uma resposta usando o Gemini com retry automático
   */
  async generateContent(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    tools?: GeminiTool[],
    maxRetries = 3,
  ): Promise<GeminiResponse> {
    // Converte mensagens para formato do Gemini
    const contents: GeminiMessage[] = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    // Adiciona ferramentas se fornecidas
    if (tools && tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ];
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          // Retry em erros 5xx ou 429 (rate limit)
          if (response.status >= 500 || response.status === 429) {
            lastError = new Error(`Gemini API error: ${response.status} - ${error}`);
            if (attempt < maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              this.logger.warn(`Retry ${attempt}/${maxRetries} após erro ${response.status}, aguardando ${delay}ms`);
              await this.sleep(delay);
              continue;
            }
          }
          throw new Error(`Gemini API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (!candidate) {
          throw new Error('Nenhuma resposta gerada pelo Gemini');
        }

        // Verifica se foi bloqueado por segurança
        if (candidate.finishReason === 'SAFETY') {
          this.logger.warn('Resposta bloqueada por filtro de segurança');
          return {
            text: 'Desculpe, não consigo responder a essa mensagem. Posso ajudar com outra coisa?',
            finishReason: 'SAFETY',
          };
        }

        // Extrai texto e chamadas de ferramenta
        let text = '';
        const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];

        for (const part of candidate.content?.parts || []) {
          if (part.text) {
            text += part.text;
          }
          if (part.functionCall) {
            toolCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args || {},
            });
          }
        }

        return {
          text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          finishReason: candidate.finishReason || 'STOP',
        };
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.warn(`Retry ${attempt}/${maxRetries} após erro, aguardando ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(`Erro ao chamar Gemini após ${maxRetries} tentativas: ${lastError?.message || lastError}`);
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gera uma resposta simples (sem ferramentas)
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const messages = [...history, { role: 'user' as const, content: userMessage }];
    const response = await this.generateContent(systemPrompt, messages);
    return response.text;
  }

  /**
   * Verifica se a API está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
