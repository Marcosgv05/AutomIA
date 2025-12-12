import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  // Cache simples de tokens (em produção, use Redis)
  private tokenCache = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(private readonly prisma: PrismaService) {}

  private getTokenExpiryDays(): number {
    const raw = process.env.TOKEN_EXPIRY_DAYS;
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  }

  private hashToken(token: string): string {
    const secret = process.env.JWT_SECRET || '';
    return crypto.createHash('sha256').update(token + secret).digest('hex');
  }

  private async createAuthSession(userId: string, token: string, expiresAt: Date) {
    const tokenHash = this.hashToken(token);

    await this.prisma.authSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    this.tokenCache.set(token, { userId, expiresAt });
  }

  /**
   * Login com email e senha
   */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        tenantMemberships: {
          include: { tenant: true },
          take: 1,
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    // Verifica senha com bcrypt (ou legado)
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    // Gera token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.getTokenExpiryDays() * 24 * 60 * 60 * 1000);

    await this.createAuthSession(user.id, token, expiresAt);

    const membership = user.tenantMemberships[0];

    this.logger.log(`Login realizado: ${user.email}`);

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: membership?.tenant.id,
        tenantName: membership?.tenant.name,
      },
    };
  }

  /**
   * Registro de novo usuário
   */
  async register(name: string, email: string, password: string) {
    // Verifica se email já existe
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new UnauthorizedException('Este email já está cadastrado');
    }

    // Cria usuário com senha hasheada
    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Cria ou busca tenant demo e associa
    const tenant = await this.findOrCreateDemoTenant();
    
    await this.prisma.tenantUser.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'admin',
      },
    });

    // Gera token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.getTokenExpiryDays() * 24 * 60 * 60 * 1000);

    await this.createAuthSession(user.id, token, expiresAt);

    this.logger.log(`Novo usuário registrado: ${user.email}`);

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: tenant.id,
        tenantName: tenant.name,
      },
    };
  }

  /**
   * Verifica e retorna dados do token
   */
  async verifyToken(token: string): Promise<UserPayload> {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
    });

    if (!session || session.revokedAt) {
      this.tokenCache.delete(token);
      throw new UnauthorizedException('Token inválido');
    }

    if (session.expiresAt < now) {
      this.tokenCache.delete(token);
      throw new UnauthorizedException('Token expirado');
    }

    await this.prisma.authSession.update({
      where: { tokenHash },
      data: { lastUsedAt: now },
    });

    this.tokenCache.set(token, { userId: session.userId, expiresAt: session.expiresAt });

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        tenantMemberships: {
          include: { tenant: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const membership = user.tenantMemberships[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: membership?.tenant.id,
      tenantName: membership?.tenant.name,
    };
  }

  /**
   * Logout - invalida token
   */
  async logout(token: string) {
    this.tokenCache.delete(token);

    const tokenHash = this.hashToken(token);
    await this.prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log('Token invalidado');
  }

  /**
   * Retorna URL para login com Google
   */
  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID não configurado');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Login com código do Google OAuth
   */
  async loginWithGoogle(code: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Google não configuradas');
    }

    // Troca código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      this.logger.error(`Erro ao obter token do Google: ${error}`);
      throw new UnauthorizedException('Erro ao autenticar com Google');
    }

    const tokenData = await tokenResponse.json();

    // Busca informações do usuário
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Erro ao obter dados do usuário');
    }

    const googleUser = await userInfoResponse.json();

    // Busca ou cria usuário no banco
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        tenantMemberships: {
          include: { tenant: true },
          take: 1,
        },
      },
    });

    if (!user) {
      // Cria novo usuário
      user = await this.prisma.user.create({
        data: {
          name: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          passwordHash: null, // Usuário Google não tem senha
        },
        include: {
          tenantMemberships: {
            include: { tenant: true },
            take: 1,
          },
        },
      });

      // Associa ao tenant demo
      const tenant = await this.findOrCreateDemoTenant();
      await this.prisma.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'admin',
        },
      });

      // Recarrega com tenant
      user = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          tenantMemberships: {
            include: { tenant: true },
            take: 1,
          },
        },
      });
    }

    // Gera token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.getTokenExpiryDays() * 24 * 60 * 60 * 1000);

    await this.createAuthSession(user!.id, token, expiresAt);

    const membership = user!.tenantMemberships[0];

    this.logger.log(`Login Google realizado: ${user!.email}`);

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        tenantId: membership?.tenant.id,
        tenantName: membership?.tenant.name,
      },
    };
  }

  /**
   * Gera hash de senha com bcrypt (seguro)
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Alto custo para dificultar brute force
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifica senha com bcrypt
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Suporta tanto bcrypt quanto SHA-256 legado para migração
    if (hash.startsWith('$2')) {
      // Hash bcrypt
      return bcrypt.compare(password, hash);
    } else {
      // Hash SHA-256 legado (para usuários antigos)
      const salt = process.env.PASSWORD_SALT || 'automia-salt-2024';
      const legacyHash = crypto.createHash('sha256').update(password + salt).digest('hex');
      return legacyHash === hash;
    }
  }

  /**
   * Gera token aleatório seguro
   */
  private generateToken(): string {
    return crypto.randomBytes(48).toString('base64url'); // 48 bytes = 384 bits
  }

  /**
   * Busca ou cria tenant demo
   */
  private async findOrCreateDemoTenant() {
    let tenant = await this.prisma.tenant.findUnique({
      where: { slug: 'demo' },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'Minha Empresa',
          slug: 'demo',
          plan: 'trial',
        },
      });
    }

    return tenant;
  }
}
