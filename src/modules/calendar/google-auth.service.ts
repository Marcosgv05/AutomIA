import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly prisma: PrismaService) {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/calendar/oauth/callback';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('Credenciais do Google OAuth2 não configuradas!');
    }
  }

  /**
   * Gera a URL de autorização do Google OAuth2
   */
  getAuthUrl(tenantId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: tenantId, // Passa o tenantId como state para recuperar depois
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Troca o código de autorização por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao trocar código por tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Obtém informações do usuário Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Erro ao obter informações do usuário Google');
    }

    return response.json();
  }

  /**
   * Salva ou atualiza a conta Google no banco
   */
  async saveGoogleAccount(
    tenantId: string,
    tokens: GoogleTokens,
    userInfo: GoogleUserInfo,
  ) {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Verifica se já existe conta com esse email para o tenant
    const existing = await this.prisma.googleAccount.findFirst({
      where: { tenantId, email: userInfo.email },
    });

    if (existing) {
      // Atualiza tokens
      return this.prisma.googleAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken,
          tokenExpiresAt: expiresAt,
          scopes: tokens.scope.split(' '),
        },
      });
    }

    // Cria nova conta
    return this.prisma.googleAccount.create({
      data: {
        tenantId,
        googleUserId: userInfo.id,
        email: userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scope.split(' '),
      },
    });
  }

  /**
   * Renova o access token usando o refresh token
   */
  async refreshAccessToken(googleAccountId: string): Promise<string> {
    const account = await this.prisma.googleAccount.findUnique({
      where: { id: googleAccountId },
    });

    if (!account) {
      throw new Error('Conta Google não encontrada');
    }

    // Verifica se o token ainda é válido
    if (account.tokenExpiresAt > new Date()) {
      return account.accessToken;
    }

    // Renova o token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao renovar token do Google');
    }

    const tokens = await response.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Atualiza no banco
    await this.prisma.googleAccount.update({
      where: { id: googleAccountId },
      data: {
        accessToken: tokens.access_token,
        tokenExpiresAt: expiresAt,
      },
    });

    this.logger.log(`Token renovado para conta ${account.email}`);
    return tokens.access_token;
  }

  /**
   * Lista contas Google de um tenant
   */
  async listAccounts(tenantId: string) {
    return this.prisma.googleAccount.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        tokenExpiresAt: true,
        createdAt: true,
        calendars: {
          select: { id: true, calendarId: true, summary: true, isDefault: true },
        },
      },
    });
  }

  /**
   * Verifica se as credenciais estão configuradas
   */
  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }
}
