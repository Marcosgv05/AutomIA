import React, { useEffect, useState } from 'react';
import { 
  Save, Sparkles, Clock, Loader2, CheckCircle, MessageCircle, Plus, Trash2, HelpCircle,
  User, Target, ShieldCheck, MessageSquare, ClipboardList, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { tenantApi, agentApi, AgentSettings, FaqItem, StandardMessage, DataField, Objection } from '../services/api';

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

const EMOJI_LEVELS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'minimal', label: 'Mínimo (1-2)' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'frequent', label: 'Frequente' },
];

const CONFIG_BLOCKS = [
  { 
    id: 'identity', 
    label: 'Identidade do Agente', 
    icon: User, 
    color: 'text-blue-400',
    description: 'Nome, cargo, empresa e tom de voz'
  },
  { 
    id: 'objective', 
    label: 'Objetivo', 
    icon: Target, 
    color: 'text-green-400',
    description: 'Tipo de reunião, duração e meta'
  },
  { 
    id: 'behaviorRules', 
    label: 'Regras de Comportamento', 
    icon: ShieldCheck, 
    color: 'text-purple-400',
    description: 'Limites, restrições e emojis'
  },
  { 
    id: 'standardMessages', 
    label: 'Mensagens Padrão', 
    icon: MessageSquare, 
    color: 'text-amber-400',
    description: 'Saudações e respostas automáticas'
  },
  { 
    id: 'dataCollection', 
    label: 'Dados a Coletar', 
    icon: ClipboardList, 
    color: 'text-cyan-400',
    description: 'Campos obrigatórios do cliente'
  },
  { 
    id: 'objectionHandling', 
    label: 'Tratamento de Objeções', 
    icon: AlertTriangle, 
    color: 'text-orange-400',
    description: 'Respostas para objeções comuns'
  },
];

type TabType = 'basic' | 'blocks';

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
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>([]);

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

  // Toggle bloco habilitado
  const toggleBlock = (blockId: string, enabled: boolean) => {
    if (!settings) return;
    const blockKey = blockId as keyof AgentSettings;
    const currentBlock = settings[blockKey] as any;
    setSettings({
      ...settings,
      [blockKey]: { ...currentBlock, enabled },
    });
    setHasChanges(true);
    setSaved(false);
  };

  // Toggle expansão do bloco
  const toggleExpand = (blockId: string) => {
    setExpandedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId) 
        : [...prev, blockId]
    );
  };

  // Atualizar campo de bloco
  const updateBlockField = (blockId: string, field: string, value: any) => {
    if (!settings) return;
    const blockKey = blockId as keyof AgentSettings;
    const currentBlock = settings[blockKey] as any;
    setSettings({
      ...settings,
      [blockKey]: { ...currentBlock, [field]: value },
    });
    setHasChanges(true);
    setSaved(false);
  };

  // Adicionar item a lista de bloco
  const addBlockItem = (blockId: string, listField: string, newItem: any) => {
    if (!settings) return;
    const blockKey = blockId as keyof AgentSettings;
    const currentBlock = settings[blockKey] as any;
    setSettings({
      ...settings,
      [blockKey]: { 
        ...currentBlock, 
        [listField]: [...(currentBlock[listField] || []), newItem] 
      },
    });
    setHasChanges(true);
    setSaved(false);
  };

  // Atualizar item de lista
  const updateBlockListItem = (blockId: string, listField: string, itemId: string, field: string, value: any) => {
    if (!settings) return;
    const blockKey = blockId as keyof AgentSettings;
    const currentBlock = settings[blockKey] as any;
    setSettings({
      ...settings,
      [blockKey]: {
        ...currentBlock,
        [listField]: currentBlock[listField].map((item: any) =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      },
    });
    setHasChanges(true);
    setSaved(false);
  };

  // Remover item de lista
  const removeBlockListItem = (blockId: string, listField: string, itemId: string) => {
    if (!settings) return;
    const blockKey = blockId as keyof AgentSettings;
    const currentBlock = settings[blockKey] as any;
    setSettings({
      ...settings,
      [blockKey]: {
        ...currentBlock,
        [listField]: currentBlock[listField].filter((item: any) => item.id !== itemId),
      },
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'basic'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Configurações Básicas
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'blocks'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Plus size={16} />
          Blocos de Configuração
        </button>
      </div>

      {/* Tab: Blocos de Configuração */}
      {activeTab === 'blocks' && (
        <div className="space-y-4">
          <p className="text-zinc-500 text-sm">
            Ative os blocos que deseja usar. Cada bloco adiciona campos específicos para personalizar o comportamento da IA.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONFIG_BLOCKS.map((block) => {
              const Icon = block.icon;
              const blockData = settings?.[block.id as keyof AgentSettings] as any;
              const isEnabled = blockData?.enabled || false;
              const isExpanded = expandedBlocks.includes(block.id);

              return (
                <div
                  key={block.id}
                  className={`bg-surface border rounded-lg overflow-hidden transition-all ${
                    isEnabled ? 'border-primary/30' : 'border-white/5'
                  }`}
                >
                  {/* Header do bloco */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-zinc-800'}`}>
                        <Icon className={`w-5 h-5 ${isEnabled ? block.color : 'text-zinc-500'}`} />
                      </div>
                      <div>
                        <h4 className={`font-medium ${isEnabled ? 'text-white' : 'text-zinc-400'}`}>
                          {block.label}
                        </h4>
                        <p className="text-xs text-zinc-600">{block.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle habilitar */}
                      <button
                        onClick={() => toggleBlock(block.id, !isEnabled)}
                        className={`w-11 h-6 rounded-full relative transition-colors ${
                          isEnabled ? 'bg-primary' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          isEnabled ? 'left-6' : 'left-1'
                        }`}></div>
                      </button>

                      {/* Botão expandir */}
                      {isEnabled && (
                        <button
                          onClick={() => toggleExpand(block.id)}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo expandido */}
                  {isEnabled && isExpanded && (
                    <div className="border-t border-white/5 p-4 space-y-4 bg-zinc-900/30">
                      {/* Identidade */}
                      {block.id === 'identity' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">Nome do Agente</label>
                              <input
                                type="text"
                                value={blockData?.name || ''}
                                onChange={(e) => updateBlockField('identity', 'name', e.target.value)}
                                placeholder="Ex: Leandro"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">Cargo</label>
                              <input
                                type="text"
                                value={blockData?.role || ''}
                                onChange={(e) => updateBlockField('identity', 'role', e.target.value)}
                                placeholder="Ex: consultor"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Empresa</label>
                            <input
                              type="text"
                              value={blockData?.company || ''}
                              onChange={(e) => updateBlockField('identity', 'company', e.target.value)}
                              placeholder="Ex: Avanço Contabilidade"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                              Nível de Informalidade ({blockData?.informalityLevel || 5}/10)
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={blockData?.informalityLevel || 5}
                              onChange={(e) => updateBlockField('identity', 'informalityLevel', parseInt(e.target.value))}
                              className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-xs text-zinc-600">
                              <span>Formal</span>
                              <span>Informal</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Objetivo */}
                      {block.id === 'objective' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo de Objetivo</label>
                            <input
                              type="text"
                              value={blockData?.type || ''}
                              onChange={(e) => updateBlockField('objective', 'type', e.target.value)}
                              placeholder="Ex: agendar reunião"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Duração da Reunião (min)</label>
                            <input
                              type="number"
                              value={blockData?.meetingDuration || 60}
                              onChange={(e) => updateBlockField('objective', 'meetingDuration', parseInt(e.target.value))}
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Descrição do Objetivo</label>
                            <textarea
                              rows={2}
                              value={blockData?.description || ''}
                              onChange={(e) => updateBlockField('objective', 'description', e.target.value)}
                              placeholder="Ex: diagnóstico fiscal gratuito ou apresentação de serviços"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white resize-none"
                            />
                          </div>
                        </>
                      )}

                      {/* Regras de Comportamento */}
                      {block.id === 'behaviorRules' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">Limite de Caracteres</label>
                              <input
                                type="number"
                                value={blockData?.maxMessageLength || 300}
                                onChange={(e) => updateBlockField('behaviorRules', 'maxMessageLength', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">Uso de Emojis</label>
                              <select
                                value={blockData?.emojiLevel || 'minimal'}
                                onChange={(e) => updateBlockField('behaviorRules', 'emojiLevel', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              >
                                {EMOJI_LEVELS.map(lvl => (
                                  <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                              Restrições (uma por linha)
                            </label>
                            <textarea
                              rows={3}
                              value={(blockData?.restrictions || []).join('\n')}
                              onChange={(e) => updateBlockField('behaviorRules', 'restrictions', 
                                e.target.value.split('\n').filter(Boolean)
                              )}
                              placeholder="Ex:&#10;Não falar preços&#10;Não enviar orçamento sem reunião"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white resize-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                              Nunca Mencionar (separado por vírgula)
                            </label>
                            <input
                              type="text"
                              value={(blockData?.neverMention || []).join(', ')}
                              onChange={(e) => updateBlockField('behaviorRules', 'neverMention', 
                                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                              )}
                              placeholder="Ex: IA, bot, ferramenta, automatizado"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                            />
                          </div>
                        </>
                      )}

                      {/* Mensagens Padrão */}
                      {block.id === 'standardMessages' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Mensagens configuradas</span>
                            <button
                              onClick={() => addBlockItem('standardMessages', 'messages', {
                                id: Date.now().toString(),
                                name: '',
                                trigger: '',
                                triggerKeywords: [],
                                message: '',
                              })}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded"
                            >
                              <Plus size={12} /> Adicionar
                            </button>
                          </div>
                          {(blockData?.messages || []).map((msg: StandardMessage, idx: number) => (
                            <div key={msg.id} className="p-3 bg-zinc-800 rounded-lg space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs text-zinc-600">#{idx + 1}</span>
                                <button
                                  onClick={() => removeBlockListItem('standardMessages', 'messages', msg.id)}
                                  className="text-zinc-600 hover:text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={msg.name}
                                onChange={(e) => updateBlockListItem('standardMessages', 'messages', msg.id, 'name', e.target.value)}
                                placeholder="Nome (ex: Saudação diagnóstico)"
                                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white"
                              />
                              <input
                                type="text"
                                value={(msg.triggerKeywords || []).join(', ')}
                                onChange={(e) => updateBlockListItem('standardMessages', 'messages', msg.id, 'triggerKeywords', 
                                  e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                )}
                                placeholder="Palavras-chave (ex: diagnóstico, análise)"
                                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white"
                              />
                              <textarea
                                rows={2}
                                value={msg.message}
                                onChange={(e) => updateBlockListItem('standardMessages', 'messages', msg.id, 'message', e.target.value)}
                                placeholder="Mensagem..."
                                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white resize-none"
                              />
                            </div>
                          ))}
                        </>
                      )}

                      {/* Dados a Coletar */}
                      {block.id === 'dataCollection' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">Código do País</label>
                              <input
                                type="text"
                                value={blockData?.defaultPhoneCountry || '+55'}
                                onChange={(e) => updateBlockField('dataCollection', 'defaultPhoneCountry', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-500 mb-1">DDD Padrão</label>
                              <input
                                type="text"
                                value={blockData?.defaultPhoneDDD || ''}
                                onChange={(e) => updateBlockField('dataCollection', 'defaultPhoneDDD', e.target.value)}
                                placeholder="Ex: 85"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Campos a coletar</span>
                            <button
                              onClick={() => addBlockItem('dataCollection', 'fields', {
                                id: Date.now().toString(),
                                name: '',
                                label: '',
                                required: true,
                              })}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                            >
                              <Plus size={12} /> Adicionar
                            </button>
                          </div>
                          {(blockData?.fields || []).map((field: DataField, idx: number) => (
                            <div key={field.id} className="flex items-center gap-2 p-2 bg-zinc-800 rounded">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateBlockListItem('dataCollection', 'fields', field.id, 'label', e.target.value)}
                                placeholder="Ex: Nome completo"
                                className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white"
                              />
                              <label className="flex items-center gap-1 text-xs text-zinc-400">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateBlockListItem('dataCollection', 'fields', field.id, 'required', e.target.checked)}
                                  className="rounded"
                                />
                                Obrigatório
                              </label>
                              <button
                                onClick={() => removeBlockListItem('dataCollection', 'fields', field.id)}
                                className="text-zinc-600 hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Tratamento de Objeções */}
                      {block.id === 'objectionHandling' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Objeções configuradas</span>
                            <button
                              onClick={() => addBlockItem('objectionHandling', 'objections', {
                                id: Date.now().toString(),
                                trigger: '',
                                keywords: [],
                                response: '',
                              })}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded"
                            >
                              <Plus size={12} /> Adicionar
                            </button>
                          </div>
                          {(blockData?.objections || []).map((obj: Objection, idx: number) => (
                            <div key={obj.id} className="p-3 bg-zinc-800 rounded-lg space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs text-zinc-600">#{idx + 1}</span>
                                <button
                                  onClick={() => removeBlockListItem('objectionHandling', 'objections', obj.id)}
                                  className="text-zinc-600 hover:text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={obj.trigger}
                                onChange={(e) => updateBlockListItem('objectionHandling', 'objections', obj.id, 'trigger', e.target.value)}
                                placeholder="Objeção (ex: Quer só orçamento)"
                                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white"
                              />
                              <input
                                type="text"
                                value={(obj.keywords || []).join(', ')}
                                onChange={(e) => updateBlockListItem('objectionHandling', 'objections', obj.id, 'keywords', 
                                  e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                )}
                                placeholder="Palavras-chave (ex: orçamento, preço, valor)"
                                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white"
                              />
                              <textarea
                                rows={2}
                                value={obj.response}
                                onChange={(e) => updateBlockListItem('objectionHandling', 'objections', obj.id, 'response', e.target.value)}
                                placeholder="Resposta padrão para esta objeção..."
                                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white resize-none"
                              />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Configurações Básicas */}
      {activeTab === 'basic' && (
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
      )}
    </div>
  );
};
