import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TenantService } from './tenant.service';

interface CreateTenantDto {
  name: string;
  slug: string;
  plan?: string;
}

interface UpdateTenantDto {
  name?: string;
  plan?: string;
}

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Lista todos os tenants
   * GET /tenants
   */
  @Get()
  async listTenants() {
    const tenants = await this.tenantService.listTenants();
    return { tenants };
  }

  /**
   * Retorna ou cria o tenant demo
   * GET /tenants/demo
   */
  @Get('demo')
  async getDemoTenant() {
    const tenant = await this.tenantService.findOrCreateDemoTenant();
    return { tenant };
  }

  /**
   * Busca tenant por ID
   * GET /tenants/:id
   */
  @Get(':id')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.tenantService.getTenant(id);
    if (!tenant) {
      return { error: 'Tenant não encontrado' };
    }
    return { tenant };
  }

  /**
   * Cria um novo tenant
   * POST /tenants
   */
  @Post()
  async createTenant(@Body() body: CreateTenantDto) {
    const tenant = await this.tenantService.createTenant(body.name, body.slug, body.plan);
    return { tenant };
  }

  /**
   * Atualiza um tenant
   * PATCH /tenants/:id
   */
  @Patch(':id')
  async updateTenant(@Param('id') id: string, @Body() body: UpdateTenantDto) {
    const tenant = await this.tenantService.updateTenant(id, body);
    return { tenant };
  }
}
