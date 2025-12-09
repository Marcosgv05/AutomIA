import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encontra ou cria um tenant de demonstração
   * Para uso em desenvolvimento/testes
   */
  async findOrCreateDemoTenant() {
    const demoSlug = 'demo';

    let tenant = await this.prisma.tenant.findUnique({
      where: { slug: demoSlug },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'Demo Tenant',
          slug: demoSlug,
          plan: 'trial',
        },
      });
      this.logger.log(`Tenant de demonstração criado: ${tenant.id}`);
    }

    return tenant;
  }

  /**
   * Encontra ou cria uma conta WhatsApp para o tenant demo
   */
  async findOrCreateDemoWhatsappAccount(sessionId: string) {
    const tenant = await this.findOrCreateDemoTenant();

    let account = await this.prisma.whatsappAccount.findFirst({
      where: {
        tenantId: tenant.id,
        phoneNumber: sessionId, // Usamos sessionId como identificador temporário
      },
    });

    if (!account) {
      account = await this.prisma.whatsappAccount.create({
        data: {
          tenantId: tenant.id,
          phoneNumber: sessionId,
          displayName: `WhatsApp ${sessionId}`,
          status: 'disconnected',
        },
      });
      this.logger.log(`Conta WhatsApp criada: ${account.id}`);
    }

    return { tenant, account };
  }

  /**
   * Atualiza status da conta WhatsApp
   */
  async updateWhatsappAccountStatus(
    accountId: string,
    status: 'connected' | 'disconnected' | 'error',
  ) {
    return this.prisma.whatsappAccount.update({
      where: { id: accountId },
      data: {
        status,
        lastConnectedAt: status === 'connected' ? new Date() : undefined,
      },
    });
  }

  /**
   * Busca tenant por ID
   */
  async getTenant(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  /**
   * Lista todos os tenants
   */
  async listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista todas as contas WhatsApp (para reconexão automática)
   */
  async getAllWhatsappAccounts() {
    return this.prisma.whatsappAccount.findMany({
      select: {
        id: true,
        tenantId: true,
        phoneNumber: true,
        status: true,
      },
    }).then(accounts => accounts.map(a => ({
      ...a,
      sessionId: a.phoneNumber, // phoneNumber é usado como sessionId
    })));
  }

  /**
   * Cria um novo tenant
   */
  async createTenant(name: string, slug: string, plan?: string) {
    // Verifica se slug já existe
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new Error('Slug já está em uso');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        slug,
        plan: plan || 'trial',
      },
    });
    this.logger.log(`Tenant criado: ${tenant.id} - ${tenant.name}`);
    return tenant;
  }

  /**
   * Atualiza um tenant
   */
  async updateTenant(id: string, data: { name?: string; plan?: string }) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data,
    });
    this.logger.log(`Tenant atualizado: ${tenant.id}`);
    return tenant;
  }
}
