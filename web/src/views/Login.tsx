import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Lock, User, Loader2, AlertCircle, Eye, EyeOff, Sparkles, Zap, Bot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Ícone do Google
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Componente de partículas flutuantes
const FloatingParticle = ({ delay, duration, size }: { delay: number; duration: number; size: number }) => (
  <div 
    className="absolute rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `float ${duration}s ease-in-out ${delay}s infinite`,
    }}
  />
);

export const Login: React.FC = () => {
  const { login, register, loginWithGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!form.name.trim()) {
          throw new Error('Nome é obrigatório');
        }
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Animação de gradiente de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-purple-600/20 animate-pulse"></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f15_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      
      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <FloatingParticle 
            key={i} 
            delay={i * 0.5} 
            duration={15 + i * 2} 
            size={100 + i * 30}
          />
        ))}
      </div>

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[128px] animate-pulse delay-1000"></div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Lado esquerdo - Hero */}
          <div className="hidden lg:block space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300 font-medium">Powered by AI</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-200 leading-tight">
                AutomIA
              </h1>
              <p className="text-2xl text-slate-300 font-light">
                Automação inteligente para seu negócio
              </p>
              <p className="text-slate-400 text-lg leading-relaxed">
                Transforme seu atendimento com IA. Respostas automáticas, agendamento inteligente e muito mais.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-indigo-500/10 backdrop-blur-sm rounded-xl border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                  <Bot className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">IA Avançada</h3>
                  <p className="text-slate-400 text-sm">Respostas naturais e contextualizadas</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-purple-500/10 backdrop-blur-sm rounded-xl border border-purple-500/20 group-hover:bg-purple-500/20 transition-all">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Automação Total</h3>
                  <p className="text-slate-400 text-sm">Atendimento 24/7 sem interrupções</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-pink-500/10 backdrop-blur-sm rounded-xl border border-pink-500/20 group-hover:bg-pink-500/20 transition-all">
                  <MessageSquare className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">WhatsApp Integrado</h3>
                  <p className="text-slate-400 text-sm">Conecte e automatize em minutos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lado direito - Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-in delay-200">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-xl shadow-indigo-500/50">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-200">AutomIA</h1>
              <p className="text-slate-400 mt-2">Automação inteligente</p>
            </div>

            {/* Card de Login com Glassmorphism */}
            <div className="relative group">
              {/* Glow effect no hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-6">
                  {isRegister ? '✨ Criar conta' : 'Bem-vindo de volta!'}
                </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Nome
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Seu nome completo"
                          className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-950 outline-none transition-all text-slate-200 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-950 outline-none transition-all text-slate-200 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-11 pr-12 py-3 bg-slate-950/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-950 outline-none transition-all text-slate-200 placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botão Submit com gradiente */}
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-600/50 disabled:to-purple-600/50 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      <span className="relative z-10">{isRegister ? 'Criando conta...' : 'Entrando...'}</span>
                    </>
                  ) : (
                    <span className="relative z-10">{isRegister ? 'Criar conta' : 'Entrar'}</span>
                  )}
                </button>

                {/* Divisor */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-slate-900/80 text-slate-500">ou continue com</span>
                  </div>
                </div>

                {/* Botão Google com efeito de vidro escuro */}
                <button
                  type="button"
                  onClick={async () => {
                    setGoogleLoading(true);
                    setError('');
                    try {
                      await loginWithGoogle();
                    } catch (err: any) {
                      setError(err.message || 'Erro ao conectar com Google');
                      setGoogleLoading(false);
                    }
                  }}
                  disabled={loading || googleLoading}
                  className="w-full py-3 bg-slate-900/70 hover:bg-slate-800/80 text-slate-100 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 border border-slate-700/50 backdrop-blur-md shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 hover:scale-[1.02]"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      Entrar com Google
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Login/Register */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="text-sm text-slate-400 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-400 hover:to-purple-400 transition-all duration-300 font-medium"
                >
                  {isRegister ? (
                    <>Já tem uma conta? <span className="text-indigo-400 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-400 hover:to-purple-400">Entrar</span></>
                  ) : (
                    <>Não tem conta? <span className="text-indigo-400 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-indigo-400 hover:to-purple-400">Criar conta</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-8 animate-fade-in delay-500">
            © 2024 AutomIA. Automação inteligente para seu negócio.
          </p>
        </div>
      </div>
      </div>

      {/* CSS para animação de float */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-40px) translateX(-10px) rotate(-5deg);
            opacity: 0.7;
          }
          75% {
            transform: translateY(-20px) translateX(10px) rotate(3deg);
            opacity: 0.5;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};
