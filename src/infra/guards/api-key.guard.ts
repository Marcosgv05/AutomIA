import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard de API Key para proteção básica de endpoints
 * 
 * Para usar em um controller:
 * @UseGuards(ApiKeyGuard)
 * 
 * A API Key deve ser enviada no header: X-API-Key
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.API_KEY || '';
  }

  canActivate(context: ExecutionContext): boolean {
    // Se não há API_KEY configurada, permite acesso (modo desenvolvimento)
    if (!this.apiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-api-key'] as string;

    if (!providedKey) {
      this.logger.warn(`Acesso negado: API Key não fornecida - ${request.method} ${request.url}`);
      throw new UnauthorizedException('API Key não fornecida');
    }

    if (providedKey !== this.apiKey) {
      this.logger.warn(`Acesso negado: API Key inválida - ${request.method} ${request.url}`);
      throw new UnauthorizedException('API Key inválida');
    }

    return true;
  }
}
