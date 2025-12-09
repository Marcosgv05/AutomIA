import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Save, Sparkles, Clock, Loader2, CheckCircle, MessageCircle, Plus, Trash2, HelpCircle, Sun, Moon, Palette } from 'lucide-react';
import { tenantApi, agentApi, AgentSettings, FaqItem } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Configuração do Agente</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Defina como sua IA deve se comportar e responder.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all shadow-sm ${
            saved 
              ? 'bg-emerald-600 text-white' 
              : hasChanges 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20' 
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Salvo!' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">Personalidade & Instruções</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Nome do Agente</label>
                <input
                  type="text"
                  value={settings?.agentName || ''}
                  onChange={(e) => updateField('agentName', e.target.value)}
                  placeholder="Ex: Assistente Virtual"
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tom de Voz</label>
                <select 
                  value={settings?.voiceTone || 'friendly'}
                  onChange={(e) => updateField('voiceTone', e.target.value as AgentSettings['voiceTone'])}
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${
                    isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  {VOICE_TONES.map(tone => (
                    <option key={tone.value} value={tone.value}>{tone.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Prompt do Sistema (Instruções Principais)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Descreva exatamente o que a IA deve fazer, o que não deve fazer e como lidar com exceções.
                </p>
                <textarea
                  rows={8}
                  value={settings?.systemPrompt || ''}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
                  placeholder="Descreva as instruções para o agente..."
                  className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm leading-relaxed ${
                    isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </Card>

          {/* Respostas Rápidas / FAQ */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-semibold">Respostas Rápidas (FAQ)</h3>
              </div>
              <button
                onClick={addFaq}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Adicionar
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Configure respostas pré-definidas para perguntas frequentes. A IA usará essas respostas quando identificar as palavras-chave.
            </p>

            <div className="space-y-4">
              {(settings?.faqs || []).map((faq, index) => (
                <div key={faq.id} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
                    <button
                      onClick={() => removeFaq(faq.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pergunta</label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                        placeholder="Ex: Qual o horário de funcionamento?"
                        className={`w-full px-3 py-1.5 rounded text-sm ${isDark ? 'bg-slate-700 border border-slate-600 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Resposta</label>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                        placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h."
                        className={`w-full px-3 py-1.5 rounded text-sm resize-none ${isDark ? 'bg-slate-700 border border-slate-600 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Palavras-chave (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        value={faq.keywords.join(', ')}
                        onChange={(e) => updateFaq(faq.id, 'keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                        placeholder="horário, funcionamento, abre, fecha"
                        className={`w-full px-3 py-1.5 rounded text-sm ${isDark ? 'bg-slate-700 border border-slate-600 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'}`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(!settings?.faqs || settings.faqs.length === 0) && (
                <div className="text-center py-6 text-slate-500">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma resposta rápida configurada</p>
                  <p className="text-xs">Clique em "Adicionar" para criar</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className={`flex items-center gap-2 mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold">Horário de Atendimento</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Habilitar horário comercial</span>
                <button 
                  onClick={() => updateField('businessHours', { 
                    ...settings!.businessHours, 
                    enabled: !settings?.businessHours.enabled 
                  })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    settings?.businessHours.enabled ? 'bg-indigo-600' : isDark ? 'bg-slate-700' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                    settings?.businessHours.enabled ? 'left-6' : 'left-1'
                  }`}></div>
                </button>
              </div>

              <div className={`border-t pt-4 space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'} ${
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
                          className={`w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 ${isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`}
                        />
                        <span className={`font-medium w-8 ${schedule?.enabled ? (isDark ? 'text-slate-300' : 'text-slate-700') : 'text-slate-500'}`}>
                          {day.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={schedule?.start || '09:00'} 
                          onChange={(e) => updateSchedule(day.key, 'start', e.target.value)}
                          disabled={!schedule?.enabled}
                          className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-white border border-slate-300 text-slate-900'}`}
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                          type="time" 
                          value={schedule?.end || '18:00'} 
                          onChange={(e) => updateSchedule(day.key, 'end', e.target.value)}
                          disabled={!schedule?.enabled}
                          className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-white border border-slate-300 text-slate-900'}`}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Mensagem fora do horário */}
                <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                    className={`w-full px-3 py-2 rounded-lg text-xs resize-none ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-white border border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Mensagem de Boas-vindas */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-300">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold">Boas-vindas</h3>
              </div>
              <button 
                onClick={() => updateField('welcomeMessage', { 
                  ...settings!.welcomeMessage, 
                  enabled: !settings?.welcomeMessage?.enabled 
                })}
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  settings?.welcomeMessage?.enabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                  settings?.welcomeMessage?.enabled ? 'left-6' : 'left-1'
                }`}></div>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
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
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-300 resize-none disabled:opacity-50"
            />
          </Card>

          {/* Aparência */}
          <Card>
            <div className="flex items-center gap-2 mb-4 text-slate-300">
              <Palette className="w-5 h-5" />
              <h3 className="font-semibold">Aparência</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <span className="text-sm text-slate-300 font-medium">
                      {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                    </span>
                    <p className="text-xs text-slate-500">
                      Alterne entre tema claro e escuro
                    </p>
                  </div>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={`w-14 h-7 rounded-full relative transition-colors ${
                    theme === 'dark' ? 'bg-indigo-600' : 'bg-amber-500'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all flex items-center justify-center ${
                    theme === 'dark' ? 'left-8' : 'left-1'
                  }`}>
                    {theme === 'dark' ? (
                      <Moon className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <Sun className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-none">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">Teste seu Agente</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Use o Live Chat para simular conversas e ver como o agente responde.
            </p>
            <button 
              onClick={() => onNavigate?.('liveChat')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors text-white"
            >
              Ir para o Live Chat
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};
