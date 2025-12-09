import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

// Padrões de dados sensíveis para sanitizar
const SENSITIVE_PATTERNS = [
  /password/gi,
  /senha/gi,
  /token/gi,
  /secret/gi,
  /api[_-]?key/gi,
  /authorization/gi,
  /credit[_-]?card/gi,
  /cpf/gi,
  /cnpj/gi,
];

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errorCode = 'INTERNAL_ERROR';

    // Rate Limiting
    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Muitas requisições. Aguarde um momento.';
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).error || errorCode;
        
        // Se for array de mensagens (validação), junta
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      // Em produção, não expõe detalhes de erros internos
      if (this.isProduction) {
        message = 'Erro interno do servidor';
      } else {
        message = exception.message;
      }
      
      // Mapeia erros comuns para códigos HTTP apropriados
      const lowerMessage = (exception.message || '').toLowerCase();
      if (lowerMessage.includes('não encontrado') || lowerMessage.includes('not found')) {
        status = HttpStatus.NOT_FOUND;
        errorCode = 'NOT_FOUND';
        message = this.isProduction ? 'Recurso não encontrado' : message;
      } else if (lowerMessage.includes('já existe') || lowerMessage.includes('already exists')) {
        status = HttpStatus.CONFLICT;
        errorCode = 'CONFLICT';
      } else if (lowerMessage.includes('não autorizado') || lowerMessage.includes('unauthorized')) {
        status = HttpStatus.UNAUTHORIZED;
        errorCode = 'UNAUTHORIZED';
        message = 'Não autorizado';
      }
    }

    // Sanitiza mensagem de erro
    message = this.sanitizeMessage(message);

    // Log estruturado do erro (sanitizado)
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: this.sanitizePath(request.url),
      method: request.method,
      statusCode: status,
      errorCode,
      message,
      userAgent: request.headers['user-agent']?.substring(0, 100),
      ip: request.ip,
      // Stack apenas em desenvolvimento
      ...(this.isProduction ? {} : { stack: exception instanceof Error ? exception.stack : undefined }),
    };

    if (status >= 500) {
      this.logger.error(JSON.stringify(errorLog));
    } else if (status >= 400) {
      this.logger.warn(JSON.stringify(errorLog));
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        // Não expõe path em produção para erros 500
        ...(this.isProduction && status >= 500 ? {} : { path: this.sanitizePath(request.url) }),
      },
    });
  }

  /**
   * Sanitiza mensagem removendo dados sensíveis
   */
  private sanitizeMessage(message: string): string {
    if (!message) return 'Erro desconhecido';
    
    let sanitized = message;
    
    // Remove dados que parecem sensíveis
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Limita tamanho
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitiza path removendo query params sensíveis
   */
  private sanitizePath(url: string): string {
    try {
      const parsed = new URL(url, 'http://localhost');
      const params = new URLSearchParams(parsed.search);
      
      // Remove params sensíveis
      ['token', 'password', 'senha', 'key', 'secret', 'code'].forEach(param => {
        if (params.has(param)) {
          params.set(param, '[REDACTED]');
        }
      });

      return `${parsed.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    } catch {
      return url.split('?')[0]; // Fallback: apenas path
    }
  }
}
