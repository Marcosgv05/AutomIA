import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Search, MoreVertical, Send, User, Bot, Mic, Paperclip, Power, CheckCheck, MessageSquare, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { tenantApi, chatApi, whatsappApi, Chat, Message } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export const LiveChat: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeChat = chats.find(c => c.id === selectedChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Carrega dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await tenantApi.getDemoTenant();
        setTenantId(data.tenant.id);

        // Busca sessão WhatsApp ativa
        const sessionsRes = await whatsappApi.listSessions();
        if (sessionsRes.data.sessions.length > 0) {
          setSessionId(sessionsRes.data.sessions[0].sessionId);
        }

        // Busca chats do tenant
        const chatsRes = await chatApi.listChats(data.tenant.id);
        setChats(chatsRes.data.chats);

        // Seleciona o primeiro chat
        if (chatsRes.data.chats.length > 0) {
          setSelectedChatId(chatsRes.data.chats[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Carrega mensagens quando seleciona um chat
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const { data } = await chatApi.getMessages(chatId, 100);
      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId, loadMessages]);

  // Polling para atualizar mensagens
  useEffect(() => {
    if (!selectedChatId) return;

    pollRef.current = setInterval(() => {
      loadMessages(selectedChatId);
    }, 5000); // Atualiza a cada 5 segundos

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedChatId, loadMessages]);

  // Atualiza lista de chats periodicamente
  useEffect(() => {
    if (!tenantId) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await chatApi.listChats(tenantId);
        setChats(data.chats);
      } catch (err) {
        console.error('Erro ao atualizar chats:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [tenantId]);

  // Toggle AI
  const toggleAI = async () => {
    if (!activeChat) return;
    try {
      const { data } = await chatApi.toggleAiPause(activeChat.id, !activeChat.aiPaused);
      setChats(chats.map(c => c.id === activeChat.id ? { ...c, aiPaused: data.chat.aiPaused } : c));
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status da IA');
    }
  };

  // Envia mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChat || !sessionId) return;

    const chatId = activeChat.id;
    const customerWaId = activeChat.customerWaId;
    const messageText = inputValue.trim();

    try {
      setSending(true);
      setInputValue('');
      
      // Adiciona mensagem otimisticamente à lista local
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        direction: 'outbound',
        role: 'assistant',
        type: 'text',
        text: messageText,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempMessage]);
      setTimeout(scrollToBottom, 50);

      // Envia para o backend
      await chatApi.sendMessage(sessionId, customerWaId, messageText);
      
      // Pausa a IA automaticamente quando atendente responde manualmente
      if (!activeChat.aiPaused) {
        await chatApi.toggleAiPause(chatId, true);
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, aiPaused: true } : c));
      }
      
      // Recarrega mensagens após um breve delay para garantir persistência
      setTimeout(() => loadMessages(chatId), 500);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar mensagem');
      // Remove mensagem temporária se deu erro
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  // Filtra chats
  const filteredChats = chats.filter(c => 
    (c.customerName || c.customerWaId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formata hora
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Formata data relativa
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-2rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-6 animate-fade-in">
      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 z-50">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Sidebar List */}
      <Card className="w-1/3 flex flex-col h-full" noPadding>
        <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Conversas</h2>
            <span className="text-xs text-slate-500">{chats.length} chats</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente..."
              className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 transition-all ${
                isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma conversa ainda.</p>
              <p className="text-xs mt-1">Conecte o WhatsApp e envie uma mensagem.</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const lastMsg = (chat as any).messages?.[0];
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                  } ${selectedChatId === chat.id ? 'bg-indigo-500/10' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-semibold text-sm ${
                      selectedChatId === chat.id 
                        ? 'text-indigo-500' 
                        : isDark ? 'text-slate-200' : 'text-slate-900'
                    }`}>
                      {chat.customerName || chat.customerWaId}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {chat.lastMessageAt ? formatRelativeDate(chat.lastMessageAt) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-slate-500 truncate max-w-[180px]">
                      {lastMsg?.text || 'Sem mensagens'}
                    </p>
                    {chat.aiPaused && (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Manual
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden relative" noPadding>
        {activeChat ? (
          <>
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center z-10 shadow-sm ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${
                  isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-indigo-100 text-indigo-600 border-indigo-200'
                }`}>
                  {(activeChat.customerName || activeChat.customerWaId).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{activeChat.customerName || 'Cliente'}</h3>
                  <p className="text-xs text-slate-500">+{activeChat.customerWaId}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAI}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border ${
                    activeChat.aiPaused
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                  }`}
                >
                  <Power className={`w-4 h-4 ${activeChat.aiPaused ? 'text-amber-400' : 'text-indigo-400'}`} />
                  {activeChat.aiPaused ? 'IA Pausada' : 'IA Ativa'}
                </button>
                <button 
                  onClick={() => loadMessages(activeChat.id)}
                  className="text-slate-400 hover:text-slate-200 p-2 hover:bg-slate-800 rounded-lg"
                  title="Atualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {activeChat.aiPaused && (
              <div className={`text-xs py-1.5 text-center font-medium border-b ${
                isDark 
                  ? 'bg-amber-900/20 text-amber-200 border-amber-500/20' 
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                Modo manual ativo. A IA não responderá até que você a reative.
              </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhuma mensagem neste chat ainda.
                </div>
              ) : (
                messages.map((msg) => {
                  const isInbound = msg.direction === 'inbound';
                  const isAI = msg.role === 'assistant';

                  return (
                    <div key={msg.id} className={`flex w-full ${isInbound ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex max-w-[70%] gap-2 ${isInbound ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs shadow-sm mt-1 ${
                          isInbound 
                            ? isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-200 text-slate-600 border border-slate-300'
                            : isAI ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                            : isDark ? 'bg-slate-700 text-white' : 'bg-slate-600 text-white'
                        }`}>
                          {isInbound ? <User className="w-4 h-4" /> : isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        <div className={`p-3.5 rounded-2xl text-sm shadow-sm relative group ${
                          isInbound
                            ? isDark 
                              ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none' 
                              : 'bg-white text-slate-900 border border-slate-300 rounded-tl-none'
                            : isAI
                            ? isDark 
                              ? 'bg-indigo-500/10 text-slate-200 border border-indigo-500/20 rounded-tr-none'
                              : 'bg-indigo-100 text-slate-900 border border-indigo-200 rounded-tr-none'
                            : isDark 
                              ? 'bg-slate-700 text-white rounded-tr-none'
                              : 'bg-slate-600 text-white rounded-tr-none'
                        }`}>
                          <p>{msg.text || '[mídia]'}</p>
                          <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end opacity-60`}>
                            {isAI && <span className="font-semibold uppercase tracking-wider text-[9px] mr-1">IA</span>}
                            {formatTime(msg.createdAt)}
                            {!isInbound && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <button type="button" className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100'}`}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={!sessionId ? 'Conecte o WhatsApp primeiro...' : 'Digite uma mensagem...'}
                    disabled={!sessionId}
                    className={`w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 transition-all text-sm max-h-32 disabled:opacity-50 ${
                      isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-slate-100 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                {sending ? (
                  <div className="p-3">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
                ) : inputValue ? (
                  <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 transition-all transform hover:-translate-y-0.5">
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button type="button" className={`p-3 rounded-xl transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
              {!sessionId && (
                <p className="text-center text-xs text-amber-500 mt-2">
                  Vá em Conexão para conectar o WhatsApp
                </p>
              )}
            </div>
          </>
        ) : (
          <div className={`flex flex-1 flex-col items-center justify-center h-full min-h-[90vh] w-full gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <MessageSquare className="w-8 h-8 opacity-60" />
            </div>
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </Card>
    </div>
  );
};
