import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infra/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';
  
  const app = await NestFactory.create(AppModule, {
    logger: isProduction 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ==================== SEGURANÇA ====================
  
  // Helmet - Headers de segurança HTTP
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false, // Desabilita em dev para HMR
    crossOriginEmbedderPolicy: false, // Necessário para QR codes externos
  }));

  // Validação global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Remove propriedades não declaradas
    forbidNonWhitelisted: true, // Rejeita propriedades extras
    transform: true,            // Transforma tipos automaticamente
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: isProduction, // Esconde detalhes em produção
  }));

  // Filtro global de exceções (sanitiza erros)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS - Restritivo em produção
  const corsOrigins = process.env.CORS_ORIGIN || (isProduction ? '' : '*');
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map(o => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400, // Cache preflight por 24h
  });

  // Limita tamanho do body (proteção contra payload grandes)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // ==================== INICIALIZAÇÃO ====================
  
  const port = process.env.PORT || 4000; // Railway sets PORT automatically
  await app.listen(port);
  
  logger.log(`🚀 AutomIA backend rodando na porta ${port}`);
  logger.log(`📊 Healthcheck: http://localhost:${port}/health`);
  logger.log(`🔧 Ambiente: ${isProduction ? 'PRODUÇÃO' : 'desenvolvimento'}`);
  logger.log(`🔒 Segurança: Helmet ativado, CORS ${corsOrigins === '*' ? 'aberto (dev)' : 'restrito'}`);
}

bootstrap();
