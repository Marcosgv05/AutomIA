import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly model = 'gemini-2.5-flash-preview-05-20'; // Modelo para áudio e imagem

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  /**
   * Transcreve um áudio usando Gemini 2.5 Flash
   * O áudio deve estar em base64 ou ser uma URL acessível
   */
  async transcribeAudio(
    audioBase64: string,
    mimeType: string = 'audio/ogg',
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: audioBase64,
                    },
                  },
                  {
                    text: 'Transcreva este áudio para texto em português. Retorne apenas a transcrição, sem comentários adicionais.',
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      this.logger.log(`Áudio transcrito: "${text.slice(0, 50)}..."`);
      return text;
    } catch (error: any) {
      this.logger.error(`Erro ao transcrever áudio: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * Descreve uma imagem usando Gemini 2.5 Flash
   */
  async describeImage(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    context?: string,
  ): Promise<string> {
    try {
      const prompt = context
        ? `Analise esta imagem no contexto de: ${context}. Descreva o que você vê de forma útil para responder ao cliente.`
        : 'Descreva esta imagem de forma objetiva e útil.';

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const description = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      this.logger.log(`Imagem descrita: "${description.slice(0, 50)}..."`);
      return description;
    } catch (error: any) {
      this.logger.error(`Erro ao descrever imagem: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * Verifica se a API está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
