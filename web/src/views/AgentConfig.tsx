import React, { useEffect, useState } from 'react';
import { Save, Sparkles, Clock, Loader2, CheckCircle, MessageCircle, Plus, Trash2, HelpCircle } from 'lucide-react';
import { tenantApi, agentApi, AgentSettings, FaqItem } from '../services/api';

const VOICE_TONES = [
  { value: 'professional', label: 'Profissional e Formal' },
  { value: 'friendly', label: 'Amigável e Casual' },
  { value: 'empathetic', label: 'Empático e Prestativo' },
  { value: 'direct', label: 'Direto e Objetivo' },
];

const DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

interface Props {
  onNavigate?: (view: string) => void;
}

export const AgentConfig: React.FC<Props> = ({ onNavigate }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carrega tenant
  useEffect(() => {
    tenantApi.getDemoTenant().then(({ data }) => {
      setTenantId(data.tenant.id);
    });
  }, []);

  // Carrega configurações
  useEffect(() => {
    if (!tenantId) return;
    
    agentApi.getConfig(tenantId).then(({ data }) => {
      setSettings(data.settings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tenantId]);

  const updateField = <K extends keyof AgentSettings>(field: K, value: AgentSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setHasChanges(true);
    setSaved(false);
  };

  const updateSchedule = (dayKey: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      businessHours: {
        ...settings.businessHours,
        schedule: {
          ...settings.businessHours.schedule,
          [dayKey]: {
            ...settings.businessHours.schedule[dayKey],
            [field]: value,
          },
        },
      },
    });
    setHasChanges(true);
    setSaved(false);
  };

  const addFaq = () => {
    if (!settings) return;
    const newFaq: FaqItem = {
      id: Date.now().toString(),
      question: '',
      answer: '',
      keywords: [],
    };
    setSettings({
      ...settings,
      faqs: [...(settings.faqs || []), newFaq],
    });
    setHasChanges(true);
    setSaved(false);
  };

  const updateFaq = (id: string, field: keyof FaqItem, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      faqs: settings.faqs.map(faq =>
        faq.id === id ? { ...faq, [field]: value } : faq
      ),
    });
    setHasChanges(true);
    setSaved(false);
  };

  const removeFaq = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      faqs: settings.faqs.filter(faq => faq.id !== id),
    });
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!tenantId || !settings) return;
    
    setSaving(true);
    try {
      await agentApi.updateConfig(tenantId, settings);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Configuração do Agente</h1>
          <p className="text-zinc-500 text-sm">Defina como sua IA deve se comportar e responder.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${
            saved 
              ? 'bg-emerald-600 text-white' 
              : hasChanges 
                ? 'bg-primary hover:bg-primaryHover text-white' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Personalidade */}
          <div className="bg-surface border border-white/5 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold text-zinc-200">Personalidade & Instruções</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Nome do Agente</label>
                <input
                  type="text"
                  value={settings?.agentName || ''}
                  onChange={(e) => updateField('agentName', e.target.value)}
                  placeholder="Ex: Assistente Virtual"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Tom de Voz</label>
                <select 
                  value={settings?.voiceTone || 'friendly'}
                  onChange={(e) => updateField('voiceTone', e.target.value as AgentSettings['voiceTone'])}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  {VOICE_TONES.map(tone => (
                    <option key={tone.value} value={tone.value}>{tone.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">
                  Prompt do Sistema (Instruções Principais)
                </label>
                <p className="text-xs text-zinc-600 mb-2">
                  Descreva exatamente o que a IA deve fazer, o que não deve fazer e como lidar com exceções.
                </p>
                <textarea
                  rows={8}
                  value={settings?.systemPrompt || ''}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
                  placeholder="Descreva as instruções para o agente..."
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all resize-none text-sm leading-relaxed font-mono"
                />
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-surface border border-white/5 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-semibold text-zinc-200">Respostas Rápidas (FAQ)</h3>
              </div>
              <button
                onClick={addFaq}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Adicionar
              </button>
            </div>

            <p className="text-xs text-zinc-600 mb-4">
              Configure respostas pré-definidas para perguntas frequentes.
            </p>

            <div className="space-y-4">
              {(settings?.faqs || []).map((faq, index) => (
                <div key={faq.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-zinc-600">#{index + 1}</span>
                    <button
                      onClick={() => removeFaq(faq.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Pergunta</label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                        placeholder="Ex: Qual o horário de funcionamento?"
                        className="w-full px-3 py-1.5 rounded text-sm bg-zinc-800 border border-zinc-700 text-zinc-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Resposta</label>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                        placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h."
                        className="w-full px-3 py-1.5 rounded text-sm resize-none bg-zinc-800 border border-zinc-700 text-zinc-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">
                        Palavras-chave (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        value={faq.keywords.join(', ')}
                        onChange={(e) => updateFaq(faq.id, 'keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                        placeholder="horário, funcionamento, abre, fecha"
                        className="w-full px-3 py-1.5 rounded text-sm bg-zinc-800 border border-zinc-700 text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(!settings?.faqs || settings.faqs.length === 0) && (
                <div className="text-center py-6 text-zinc-600">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma resposta rápida configurada</p>
                  <p className="text-xs">Clique em "Adicionar" para criar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Horário */}
          <div className="bg-surface border border-white/5 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 text-zinc-300">
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold">Horário de Atendimento</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Habilitar horário comercial</span>
                <button 
                  onClick={() => updateField('businessHours', { 
                    ...settings!.businessHours, 
                    enabled: !settings?.businessHours.enabled 
                  })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    settings?.businessHours.enabled ? 'bg-primary' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                    settings?.businessHours.enabled ? 'left-6' : 'left-1'
                  }`}></div>
                </button>
              </div>

              <div className={`border-t border-zinc-800 pt-4 space-y-3 ${
                !settings?.businessHours.enabled ? 'opacity-50 pointer-events-none' : ''
              }`}>
                {DAYS.map(day => {
                  const schedule = settings?.businessHours.schedule[day.key];
                  return (
                    <div key={day.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={schedule?.enabled ?? false}
                          onChange={(e) => updateSchedule(day.key, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-zinc-700 bg-zinc-800"
                        />
                        <span className={`font-medium w-8 ${schedule?.enabled ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {day.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={schedule?.start || '09:00'} 
                          onChange={(e) => updateSchedule(day.key, 'start', e.target.value)}
                          disabled={!schedule?.enabled}
                          className="rounded px-2 py-1 text-xs disabled:opacity-50 bg-zinc-800 border border-zinc-700 text-zinc-300"
                        />
                        <span className="text-zinc-600">-</span>
                        <input 
                          type="time" 
                          value={schedule?.end || '18:00'} 
                          onChange={(e) => updateSchedule(day.key, 'end', e.target.value)}
                          disabled={!schedule?.enabled}
                          className="rounded px-2 py-1 text-xs disabled:opacity-50 bg-zinc-800 border border-zinc-700 text-zinc-300"
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-zinc-800">
                  <label className="block text-xs font-medium mb-1 text-zinc-500">
                    Mensagem fora do horário
                  </label>
                  <textarea
                    rows={2}
                    value={settings?.businessHours.outsideHoursMessage || ''}
                    onChange={(e) => updateField('businessHours', {
                      ...settings!.businessHours,
                      outsideHoursMessage: e.target.value,
                    })}
                    placeholder="Mensagem enviada fora do horário..."
                    className="w-full px-3 py-2 rounded-lg text-xs resize-none bg-zinc-800 border border-zinc-700 text-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Boas-vindas */}
          <div className="bg-surface border border-white/5 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-zinc-300">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold">Boas-vindas</h3>
              </div>
              <button 
                onClick={() => updateField('welcomeMessage', { 
                  ...settings!.welcomeMessage, 
                  enabled: !settings?.welcomeMessage?.enabled 
                })}
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  settings?.welcomeMessage?.enabled ? 'bg-primary' : 'bg-zinc-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                  settings?.welcomeMessage?.enabled ? 'left-6' : 'left-1'
                }`}></div>
              </button>
            </div>

            <p className="text-xs text-zinc-600 mb-3">
              Mensagem enviada automaticamente para novos contatos.
            </p>

            <textarea
              rows={3}
              value={settings?.welcomeMessage?.message || ''}
              onChange={(e) => updateField('welcomeMessage', {
                ...settings!.welcomeMessage,
                message: e.target.value,
              })}
              disabled={!settings?.welcomeMessage?.enabled}
              placeholder="Olá! 👋 Seja bem-vindo(a)!"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 resize-none disabled:opacity-50"
            />
          </div>

          {/* Teste */}
          <div className="bg-zinc-900/50 border border-primary/20 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-white">Teste seu Agente</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Use o Live Chat para simular conversas e ver como o agente responde.
            </p>
            <button 
              onClick={() => onNavigate?.('liveChat')}
              className="w-full py-2 bg-primary hover:bg-primaryHover rounded-lg text-sm font-medium transition-colors text-white"
            >
              Ir para o Live Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
