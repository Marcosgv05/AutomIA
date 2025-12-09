import { Body, Controller, Get, Post, Headers, UnauthorizedException, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, UserPayload } from './auth.service';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

interface GoogleTokenDto {
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login
   * POST /auth/login
   */
  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body.email, body.password);
    return result;
  }

  /**
   * Registro
   * POST /auth/register
   */
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body.name, body.email, body.password);
    return result;
  }

  /**
   * Verifica sessão atual
   * GET /auth/me
   */
  @Get('me')
  async me(@Headers('authorization') authHeader: string): Promise<{ user: UserPayload }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await this.authService.verifyToken(token);
    return { user };
  }

  /**
   * Logout (invalida token)
   * POST /auth/logout
   */
  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      await this.authService.logout(token);
    }
    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * Retorna URL para login com Google
   * GET /auth/google/url
   */
  @Get('google/url')
  getGoogleAuthUrl() {
    const url = this.authService.getGoogleAuthUrl();
    return { url };
  }

  /**
   * Callback do Google OAuth - Redireciona para o frontend
   * GET /auth/google/callback
   */
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Redireciona para o frontend com o código ou erro
    // O frontend está na mesma origem do popup, então pode processar e fechar
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (error) params.set('error', error);
    
    const redirectUrl = `${frontendUrl}/auth/google/callback?${params.toString()}`;
    return res.redirect(redirectUrl);
  }

  /**
   * Troca código do Google por token (para popup)
   * POST /auth/google/token
   */
  @Post('google/token')
  async googleToken(@Body() body: GoogleTokenDto) {
    const result = await this.authService.loginWithGoogle(body.code);
    return result;
  }
}
