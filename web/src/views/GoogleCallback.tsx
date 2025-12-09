import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

export const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError(errorParam);
        // Notifica janela pai e fecha
        if (window.opener) {
          window.opener.postMessage({ type: 'google-auth-error', error: errorParam }, '*');
        }
        localStorage.setItem('google_auth_result', JSON.stringify({ error: errorParam }));
        setTimeout(() => window.close(), 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('Código de autorização não encontrado');
        setTimeout(() => window.close(), 2000);
        return;
      }

      try {
        // Troca o código por token
        const { data } = await authApi.loginWithGoogle(code);
        
        // Salva no localStorage do frontend (mesma origem!)
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('google_auth_result', JSON.stringify({ success: true, user: data.user }));
        
        // Notifica janela pai
        if (window.opener) {
          window.opener.postMessage({ type: 'google-auth-success', user: data.user }, '*');
        }
        
        setStatus('success');
        
        // Fecha popup após sucesso
        setTimeout(() => {
          window.close();
          // Fallback: redireciona se não conseguir fechar
          if (!window.closed) {
            window.location.href = '/';
          }
        }, 1500);
      } catch (err: any) {
        console.error('Erro no login Google:', err);
        setStatus('error');
        setError(err.response?.data?.message || err.message || 'Erro ao autenticar');
        localStorage.setItem('google_auth_result', JSON.stringify({ error: 'Erro ao autenticar' }));
        setTimeout(() => window.close(), 3000);
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center max-w-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Autenticando...</h2>
            <p className="text-slate-400">Aguarde enquanto finalizamos seu login</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Login realizado!</h2>
            <p className="text-slate-400">Esta janela fechará automaticamente...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Erro no login</h2>
            <p className="text-red-400">{error}</p>
            <p className="text-slate-400 mt-2 text-sm">Esta janela fechará automaticamente...</p>
          </>
        )}
      </div>
    </div>
  );
};
