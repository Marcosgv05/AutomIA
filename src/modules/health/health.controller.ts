import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Healthcheck simples
   * GET /health
   */
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'AutomIA Backend',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Healthcheck detalhado (verifica dependências)
   * GET /health/detailed
   */
  @Get('detailed')
  async getDetailedHealth() {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Verifica banco de dados
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch (error: any) {
      checks.database = { status: 'unhealthy', error: error?.message };
    }

    // Verifica Gemini API
    const geminiConfigured = !!process.env.GEMINI_API_KEY;
    checks.gemini = {
      status: geminiConfigured ? 'configured' : 'not_configured',
    };

    // Verifica Google OAuth
    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    checks.google_oauth = {
      status: googleConfigured ? 'configured' : 'not_configured',
    };

    // Status geral
    const allHealthy = Object.values(checks).every(
      c => c.status === 'healthy' || c.status === 'configured',
    );

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'AutomIA Backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
      checks,
    };
  }
}
