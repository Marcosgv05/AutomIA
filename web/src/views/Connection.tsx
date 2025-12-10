import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Loader2, Wifi, ShieldCheck } from 'lucide-react';
import { whatsappApi } from '../services/api';

type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting_qr' | 'connected';

export const Connection: React.FC = () => {
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
          stopPolling();
        } else if (backendStatus === 'connecting' || backendStatus === 'waiting_qr') {
          setStatus(backendStatus as ConnectionStatus);
        } else {
          // 'disconnected', 'not_found', 'logged_out', etc → trata como desconectado
          setStatus('disconnected');
          setQrUrl(null);
          stopPolling();
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
    <div className="h-full flex flex-col items-center justify-center animate-fade-in max-w-5xl mx-auto">
      
      {/* Status Header */}
      <div className="w-full max-w-md mb-8 flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gateway WhatsApp</h1>
          <p className="text-zinc-500 text-xs font-mono mt-1">PROTOCOLO: WAPI-V2 SECURE</p>
        </div>
        <div className={`flex items-center px-3 py-1 rounded border ${
          status === 'connected' 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' 
            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-500'}`}></div>
          <span className="text-xs font-bold uppercase tracking-wider">{status === 'connected' ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl items-center">
        
        {/* Instructions Column */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-mono mr-4 mt-0.5">1</div>
              <div>
                <h4 className="text-zinc-200 text-sm font-medium">Abra o WhatsApp Business</h4>
                <p className="text-zinc-500 text-xs mt-1">Certifique-se que está na versão mais recente.</p>
              </div>
            </div>
            <div className="w-px h-6 bg-zinc-800 ml-3"></div>
            <div className="flex items-start">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-mono mr-4 mt-0.5">2</div>
              <div>
                <h4 className="text-zinc-200 text-sm font-medium">Menu {'>'} Aparelhos Conectados</h4>
                <p className="text-zinc-500 text-xs mt-1">Toque em "Conectar um aparelho".</p>
              </div>
            </div>
            <div className="w-px h-6 bg-zinc-800 ml-3"></div>
            <div className="flex items-start">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-mono mr-4 mt-0.5">3</div>
              <div>
                <h4 className="text-zinc-200 text-sm font-medium">Escaneie o QR Code</h4>
                <p className="text-zinc-500 text-xs mt-1">Aponte a câmera para a tela ao lado.</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-zinc-400 mb-2">
              <ShieldCheck size={16} className="text-primary" />
              <span className="text-xs font-semibold uppercase">Segurança Ativa</span>
            </div>
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              A conexão é estabelecida através de um túnel criptografado de ponta a ponta. 
              Nenhum dado de mensagem é armazenado permanentemente nos servidores de gateway, 
              apenas metadados de sessão.
            </p>
          </div>
        </div>

        {/* QR Code Column */}
        <div className="flex justify-center">
          <div className="relative group cursor-pointer" onClick={(status === 'disconnected' || (status === 'waiting_qr' && !qrUrl)) ? handleConnect : undefined}>
            
            {/* Decorative Frame */}
            <div className="absolute -inset-4 border border-zinc-800 rounded-xl z-0"></div>
            <div className="absolute -inset-4 border border-primary/20 rounded-xl z-0 blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary -translate-x-5 -translate-y-5"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary translate-x-5 translate-y-5"></div>

            <div className="bg-white p-4 rounded-lg shadow-2xl relative z-10 w-64 h-64 flex items-center justify-center overflow-hidden">
              {status === 'connected' ? (
                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                    <Wifi size={40} className="text-white" />
                  </div>
                  <h3 className="text-zinc-900 font-bold text-lg">Sincronizado</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDisconnect(); }}
                    className="mt-4 text-xs text-red-500 hover:text-red-700 font-medium border border-red-100 bg-red-50 px-3 py-1 rounded"
                  >
                    Encerrar Sessão
                  </button>
                </div>
              ) : (
                <>
                  {status === 'waiting_qr' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent h-[10%] w-full animate-pulse z-20 pointer-events-none"></div>
                  )}
                  {status === 'connecting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
                      <RefreshCw className="text-zinc-400 animate-spin mb-2" />
                      <span className="text-xs font-mono text-zinc-500">Gerando chaves...</span>
                    </div>
                  )}
                  {status === 'waiting_qr' && qrUrl ? (
                    <img 
                      src={qrUrl} 
                      alt="QR Code" 
                      className="w-full h-full transition-all duration-700 opacity-100" 
                    />
                  ) : status === 'disconnected' || (status === 'waiting_qr' && !qrUrl) ? (
                    <div className="flex flex-col items-center justify-center cursor-pointer" onClick={handleConnect}>
                      <RefreshCw className="text-zinc-400 mb-2" size={24} />
                      <span className="text-xs font-mono text-zinc-500">Clique para conectar</span>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8 text-red-400 text-sm flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};
