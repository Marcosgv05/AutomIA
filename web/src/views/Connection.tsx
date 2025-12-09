import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { RefreshCw, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { whatsappApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting_qr' | 'connected';

export const Connection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionId, setSessionId] = useState('minha-empresa');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollQr = async (attempt = 0) => {
    try {
      const res = await whatsappApi.getSessionQr(sessionId);
      const qr = res.data?.qr;
      if (qr) {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qr)}`;
        setQrUrl(url);
        setStatus('waiting_qr');
        // Continue polling em caso de reconexão
        pollRef.current = setTimeout(() => pollQr(0), 5000);
        return;
      }
    } catch {
      // ignora
    }

    if (attempt < 20) {
      pollRef.current = setTimeout(() => pollQr(attempt + 1), 1500);
    } else {
      setError('Não foi possível obter o QR Code. Tente novamente.');
      setStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    if (!sessionId.trim()) {
      setError('Informe um ID de sessão.');
      return;
    }

    // Verifica se já está conectado para evitar gerar novo QR
    try {
      const current = await whatsappApi.getSessionStatus(sessionId);
      if (current.data?.status === 'connected') {
        setStatus('connected');
        setQrUrl(null);
        return;
      }
    } catch {
      // segue fluxo normal
    }

    setStatus('connecting');
    setError(null);
    setQrUrl(null);
    stopPolling();

    try {
      await whatsappApi.startSession(sessionId);
      pollQr();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao iniciar sessão');
      setStatus('disconnected');
    }
  };

  const handleDisconnect = async () => {
    stopPolling();
    try {
      await whatsappApi.disconnectSession(sessionId);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
    setStatus('disconnected');
    setQrUrl(null);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Busca status atual periodicamente para manter o front sincronizado
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await whatsappApi.getSessionStatus(sessionId);
        const backendStatus = res.data?.status;
        
        // Normaliza status - 'not_found' e outros viram 'disconnected'
        if (backendStatus === 'connected') {
          setStatus('connected');
          setQrUrl(null);
        } else if (backendStatus === 'connecting' || backendStatus === 'waiting_qr') {
          setStatus(backendStatus as ConnectionStatus);
        } else {
          // 'disconnected', 'not_found', 'logged_out', etc → trata como desconectado
          setStatus('disconnected');
        }
      } catch {
        // ignora erros de rede
      }
    };

    fetchStatus();
    if (statusPollRef.current) clearInterval(statusPollRef.current);
    statusPollRef.current = setInterval(fetchStatus, 5000);

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [sessionId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Conexão WhatsApp</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Conecte o WhatsApp da sua empresa para ativar o atendimento com IA.</p>
        </div>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium border ${
          status === 'connected'
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            : status === 'waiting_qr'
            ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
            : status === 'connecting'
            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            : isDark 
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-slate-100 text-slate-600 border-slate-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-emerald-500' :
            status === 'waiting_qr' ? 'bg-yellow-500 animate-pulse' :
            status === 'connecting' ? 'bg-blue-500 animate-pulse' :
            isDark ? 'bg-slate-500' : 'bg-slate-400'
          }`} />
          {status === 'connected' ? 'Conectado' :
           status === 'waiting_qr' ? 'Aguardando leitura do QR...' :
           status === 'connecting' ? 'Iniciando...' :
           'Desconectado'}
        </div>
      </div>

      <Card className="flex flex-col items-center justify-center py-12 min-h-[480px]">
        {status === 'connected' ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Tudo pronto!</h2>
            <p className={`max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Sua sessão <strong>{sessionId}</strong> está conectada e pronta para receber mensagens.
            </p>
            <button
              onClick={handleDisconnect}
              className="mt-6 px-6 py-2 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 font-medium transition-colors"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="text-center md:text-left space-y-6 max-w-sm">
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  ID da Sessão (nome único para esta conta)
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="ex: minha-empresa"
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-700 text-slate-200' 
                      : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                  disabled={status !== 'disconnected'}
                />
              </div>

              <div className={`space-y-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-100 border-indigo-200 text-indigo-700'}`}>1</span>
                  <span>Clique em <strong className="text-indigo-500">"Conectar"</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-100 border-indigo-200 text-indigo-700'}`}>2</span>
                  <span>Abra o WhatsApp no celular</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-100 border-indigo-200 text-indigo-700'}`}>3</span>
                  <span>Vá em <strong className="text-indigo-500">Aparelhos conectados</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-100 border-indigo-200 text-indigo-700'}`}>4</span>
                  <span>Escaneie o QR Code que aparecer</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className={`w-64 h-64 rounded-xl flex items-center justify-center relative overflow-hidden border-4 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-slate-100 border-slate-300'
              }`}>
                {status === 'connecting' && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 ${isDark ? 'bg-slate-900/90' : 'bg-white/90'}`}>
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Iniciando sessão...</span>
                  </div>
                )}
                {status === 'waiting_qr' && qrUrl ? (
                  <img src={qrUrl} alt="QR Code WhatsApp" className="w-56 h-56 rounded" />
                ) : status === 'disconnected' ? (
                  <div className={`w-56 h-56 rounded flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>QR aparecerá aqui</span>
                  </div>
                ) : null}
              </div>

              {status === 'disconnected' && (
                <button
                  onClick={handleConnect}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 font-medium transition-colors"
                >
                  Conectar
                </button>
              )}

              {status === 'waiting_qr' && (
                <button
                  onClick={handleConnect}
                  className="text-sm text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar novo QR
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </Card>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-blue-300">Nota Importante</h4>
          <p className="text-sm text-blue-400/80 mt-1">
            Mantenha seu celular conectado à internet para que a automação funcione corretamente.
            O WhatsApp Web depende da conexão do seu dispositivo móvel.
          </p>
        </div>
      </div>
    </div>
  );
};
