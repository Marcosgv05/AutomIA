import React, { useEffect, useState, useRef } from 'react';
import { 
  Save, Sparkles, Clock, Loader2, CheckCircle, MessageCircle, Plus, Trash2,
  User, Target, ShieldCheck, MessageSquare, ClipboardList, AlertTriangle, ChevronDown, ChevronUp,
  FileText, UploadCloud, Search, BookOpen
} from 'lucide-react';
import { tenantApi, agentApi, knowledgeApi, AgentSettings, StandardMessage, DataField, Objection, Document, KnowledgeBase } from '../services/api';

const DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

const VOICE_TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'empathetic', label: 'Empático' },
  { value: 'direct', label: 'Direto' },
];

const EMOJI_LEVELS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'minimal', label: 'Mínimo' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'frequent', label: 'Frequente' },
];

const CONFIG_BLOCKS = [
  { 
    id: 'identity', 
    label: 'Identidade', 
    icon: User, 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Nome, cargo e tom de voz do agente'
  },
  { 
    id: 'objective', 
    label: 'Objetivo', 
    icon: Target, 
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    description: 'Meta e tipo de conversão'
  },
  { 
    id: 'behaviorRules', 
    label: 'Regras', 
    icon: ShieldCheck, 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'Limites e restrições'
  },
  { 
    id: 'standardMessages', 
    label: 'Mensagens', 
    icon: MessageSquare, 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Respostas automáticas'
  },
  { 
    id: 'dataCollection', 
    label: 'Coleta de Dados', 
    icon: ClipboardList, 
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'Informações do cliente'
  },
  { 
    id: 'objectionHandling', 
    label: 'Objeções', 
    icon: AlertTriangle, 
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    description: 'Tratamento de recusas'
  },
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
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>([]);
  
  // Base de Conhecimento
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ content: string; score: number; documentTitle: string }>>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Carrega Base de Conhecimento
  useEffect(() => {
    if (!tenantId) return;
    
    const loadKB = async () => {
      try {
        const { data } = await knowledgeApi.listKnowledgeBases(tenantId);
        if (data.knowledgeBases.length > 0) {
          setKnowledgeBase(data.knowledgeBases[0]);
          const docsResponse = await knowledgeApi.listDocuments(data.knowledgeBases[0].id);
          setDocuments(docsResponse.data.documents);
        }
      } catch (err) {
        console.error('Erro ao carregar base de conhecimento:', err);
      }
    };
    loadKB();
  }, [tenantId]);

  // Funções da Base de Conhecimento
  const createKnowledgeBase = async () => {
    if (!tenantId) return;
    try {
      const { data } = await knowledgeApi.createKnowledgeBase(tenantId, 'Principal', 'Base de conhecimento do agente');
      setKnowledgeBase(data.knowledgeBase);
    } catch (err) {
      console.error('Erro ao criar base:', err);
    }
  };

  const addDocument = async () => {
    if (!tenantId || !knowledgeBase || !newDocTitle.trim() || !newDocContent.trim()) return;
    try {
      setUploadingDoc(true);
      const { data } = await knowledgeApi.createDocument({
        tenantId,
        knowledgeBaseId: knowledgeBase.id,
        title: newDocTitle,
        sourceType: 'txt',
        content: newDocContent,
      });
      setDocuments([data.document, ...documents]);
      setShowAddDoc(false);
      setNewDocTitle('');
      setNewDocContent('');
    } catch (err) {
      console.error('Erro ao adicionar documento:', err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Excluir este documento?')) return;
    try {
      await knowledgeApi.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const searchKnowledge = async () => {
    if (!tenantId || !searchQuery.trim()) return;
    try {
      setSearching(true);
      const { data } = await knowledgeApi.search(tenantId, searchQuery, 5);
      setSearchResults(data.results);
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewDocTitle(file.name);
      setNewDocContent(event.target?.result as string);
      setShowAddDoc(true);
    };
    reader.readAsText(file);
  };

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
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt do Sistema */}
          <div className="bg-surface border border-white/5 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold text-zinc-200">Prompt do Sistema</h3>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              Instrução base para o agente. Os blocos ativados abaixo serão adicionados automaticamente.
            </p>
            <textarea
              rows={6}
              value={settings?.systemPrompt || ''}
              onChange={(e) => updateField('systemPrompt', e.target.value)}
              placeholder="Ex: Você é um assistente virtual da empresa X. Seu objetivo é..."
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Blocos de Configuração */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-300">Blocos de Configuração</h3>
              <span className="text-xs text-zinc-600">Ative para adicionar ao prompt</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONFIG_BLOCKS.map((block) => {
                const Icon = block.icon;
                const blockData = settings?.[block.id as keyof AgentSettings] as any;
                const isEnabled = blockData?.enabled || false;
                const isExpanded = expandedBlocks.includes(block.id);

                return (
                  <div
                    key={block.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isEnabled ? `${block.color} border` : 'bg-surface border-white/5'
                    }`}
                  >
                    {/* Header */}
                    <div 
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => isEnabled && toggleExpand(block.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isEnabled ? '' : 'text-zinc-500'}`} />
                        <div>
                          <span className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-zinc-400'}`}>
                            {block.label}
                          </span>
                          {!isEnabled && (
                            <p className="text-xs text-zinc-600">{block.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleBlock(block.id, !isEnabled); }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            isEnabled ? 'bg-white/20' : 'bg-zinc-700'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                            isEnabled ? 'left-5' : 'left-0.5'
                          }`}></div>
                        </button>
                        {isEnabled && (
                          <button className="text-white/60 hover:text-white">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo Expandido */}
                    {isEnabled && isExpanded && (
                      <div className="border-t border-white/10 p-3 space-y-3 bg-black/20">
                        {/* Identidade */}
                        {block.id === 'identity' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={blockData?.name || ''}
                                onChange={(e) => updateBlockField('identity', 'name', e.target.value)}
                                placeholder="Nome do agente"
                                className="px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              />
                              <input
                                type="text"
                                value={blockData?.role || ''}
                                onChange={(e) => updateBlockField('identity', 'role', e.target.value)}
                                placeholder="Cargo"
                                className="px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              />
                            </div>
                            <input
                              type="text"
                              value={blockData?.company || ''}
                              onChange={(e) => updateBlockField('identity', 'company', e.target.value)}
                              placeholder="Empresa"
                              className="w-full px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={blockData?.voiceTone || 'friendly'}
                                onChange={(e) => updateBlockField('identity', 'voiceTone', e.target.value)}
                                className="flex-1 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              >
                                {VOICE_TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <span>Formal</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={blockData?.informalityLevel || 5}
                                  onChange={(e) => updateBlockField('identity', 'informalityLevel', parseInt(e.target.value))}
                                  className="w-16 accent-blue-400"
                                />
                                <span>Casual</span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Objetivo */}
                        {block.id === 'objective' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={blockData?.type || ''}
                                onChange={(e) => updateBlockField('objective', 'type', e.target.value)}
                                placeholder="Tipo (ex: agendar reunião)"
                                className="px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={blockData?.meetingDuration || 60}
                                  onChange={(e) => updateBlockField('objective', 'meetingDuration', parseInt(e.target.value))}
                                  className="w-16 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                                />
                                <span className="text-xs text-zinc-500">min</span>
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              value={blockData?.description || ''}
                              onChange={(e) => updateBlockField('objective', 'description', e.target.value)}
                              placeholder="Descrição do objetivo..."
                              className="w-full px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white resize-none"
                            />
                          </>
                        )}

                        {/* Regras */}
                        {block.id === 'behaviorRules' && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={blockData?.maxMessageLength || 300}
                                  onChange={(e) => updateBlockField('behaviorRules', 'maxMessageLength', parseInt(e.target.value))}
                                  className="w-16 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                                />
                                <span className="text-xs text-zinc-500">chars</span>
                              </div>
                              <select
                                value={blockData?.emojiLevel || 'minimal'}
                                onChange={(e) => updateBlockField('behaviorRules', 'emojiLevel', e.target.value)}
                                className="flex-1 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              >
                                {EMOJI_LEVELS.map(l => <option key={l.value} value={l.value}>Emojis: {l.label}</option>)}
                              </select>
                            </div>
                            <textarea
                              rows={2}
                              value={(blockData?.restrictions || []).join('\n')}
                              onChange={(e) => updateBlockField('behaviorRules', 'restrictions', e.target.value.split('\n').filter(Boolean))}
                              placeholder="Restrições (uma por linha)"
                              className="w-full px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white resize-none font-mono"
                            />
                            <input
                              type="text"
                              value={(blockData?.neverMention || []).join(', ')}
                              onChange={(e) => updateBlockField('behaviorRules', 'neverMention', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="Nunca mencionar: IA, bot, automatizado"
                              className="w-full px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                            />
                          </>
                        )}

                        {/* Mensagens */}
                        {block.id === 'standardMessages' && (
                          <>
                            <div className="flex justify-end">
                              <button
                                onClick={() => addBlockItem('standardMessages', 'messages', {
                                  id: Date.now().toString(), name: '', trigger: '', triggerKeywords: [], message: '',
                                })}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 rounded"
                              >
                                <Plus size={10} /> Adicionar
                              </button>
                            </div>
                            {(blockData?.messages || []).map((msg: StandardMessage) => (
                              <div key={msg.id} className="p-2 bg-zinc-800/50 rounded space-y-1">
                                <div className="flex justify-between">
                                  <input
                                    type="text"
                                    value={msg.name}
                                    onChange={(e) => updateBlockListItem('standardMessages', 'messages', msg.id, 'name', e.target.value)}
                                    placeholder="Nome"
                                    className="flex-1 px-1 py-0.5 bg-transparent border-b border-zinc-600 text-xs text-white"
                                  />
                                  <button onClick={() => removeBlockListItem('standardMessages', 'messages', msg.id)} className="text-zinc-600 hover:text-red-400 ml-2">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={(msg.triggerKeywords || []).join(', ')}
                                  onChange={(e) => updateBlockListItem('standardMessages', 'messages', msg.id, 'triggerKeywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                  placeholder="Palavras-chave"
                                  className="w-full px-1 py-0.5 bg-transparent border-b border-zinc-600 text-xs text-zinc-400"
                                />
                                <textarea
                                  rows={1}
                                  value={msg.message}
                                  onChange={(e) => updateBlockListItem('standardMessages', 'messages', msg.id, 'message', e.target.value)}
                                  placeholder="Mensagem..."
                                  className="w-full px-1 py-0.5 bg-transparent text-xs text-white resize-none"
                                />
                              </div>
                            ))}
                          </>
                        )}

                        {/* Coleta de Dados */}
                        {block.id === 'dataCollection' && (
                          <>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={blockData?.defaultPhoneCountry || '+55'}
                                onChange={(e) => updateBlockField('dataCollection', 'defaultPhoneCountry', e.target.value)}
                                placeholder="País"
                                className="w-16 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              />
                              <input
                                type="text"
                                value={blockData?.defaultPhoneDDD || ''}
                                onChange={(e) => updateBlockField('dataCollection', 'defaultPhoneDDD', e.target.value)}
                                placeholder="DDD"
                                className="w-14 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                              />
                              <button
                                onClick={() => addBlockItem('dataCollection', 'fields', { id: Date.now().toString(), name: '', label: '', required: true })}
                                className="ml-auto flex items-center gap-1 px-2 py-1 text-xs bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-200 rounded"
                              >
                                <Plus size={10} /> Campo
                              </button>
                            </div>
                            {(blockData?.fields || []).map((field: DataField) => (
                              <div key={field.id} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateBlockListItem('dataCollection', 'fields', field.id, 'label', e.target.value)}
                                  placeholder="Campo"
                                  className="flex-1 px-2 py-1 bg-zinc-800/80 border border-zinc-700 rounded text-xs text-white"
                                />
                                <label className="flex items-center gap-1 text-xs text-zinc-500">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateBlockListItem('dataCollection', 'fields', field.id, 'required', e.target.checked)}
                                  />
                                  Obrig.
                                </label>
                                <button onClick={() => removeBlockListItem('dataCollection', 'fields', field.id)} className="text-zinc-600 hover:text-red-400">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Objeções */}
                        {block.id === 'objectionHandling' && (
                          <>
                            <div className="flex justify-end">
                              <button
                                onClick={() => addBlockItem('objectionHandling', 'objections', { id: Date.now().toString(), trigger: '', keywords: [], response: '' })}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500/30 hover:bg-orange-500/50 text-orange-200 rounded"
                              >
                                <Plus size={10} /> Adicionar
                              </button>
                            </div>
                            {(blockData?.objections || []).map((obj: Objection) => (
                              <div key={obj.id} className="p-2 bg-zinc-800/50 rounded space-y-1">
                                <div className="flex justify-between">
                                  <input
                                    type="text"
                                    value={obj.trigger}
                                    onChange={(e) => updateBlockListItem('objectionHandling', 'objections', obj.id, 'trigger', e.target.value)}
                                    placeholder="Objeção"
                                    className="flex-1 px-1 py-0.5 bg-transparent border-b border-zinc-600 text-xs text-white"
                                  />
                                  <button onClick={() => removeBlockListItem('objectionHandling', 'objections', obj.id)} className="text-zinc-600 hover:text-red-400 ml-2">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={(obj.keywords || []).join(', ')}
                                  onChange={(e) => updateBlockListItem('objectionHandling', 'objections', obj.id, 'keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                  placeholder="Palavras-chave"
                                  className="w-full px-1 py-0.5 bg-transparent border-b border-zinc-600 text-xs text-zinc-400"
                                />
                                <textarea
                                  rows={1}
                                  value={obj.response}
                                  onChange={(e) => updateBlockListItem('objectionHandling', 'objections', obj.id, 'response', e.target.value)}
                                  placeholder="Resposta..."
                                  className="w-full px-1 py-0.5 bg-transparent text-xs text-white resize-none"
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Horário de Atendimento */}
          <div className="bg-surface border border-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-zinc-300">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Horário de Atendimento</span>
              </div>
              <button 
                onClick={() => updateField('businessHours', { ...settings!.businessHours, enabled: !settings?.businessHours.enabled })}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings?.businessHours.enabled ? 'bg-primary' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings?.businessHours.enabled ? 'left-5' : 'left-0.5'}`}></div>
              </button>
            </div>

            <div className={`space-y-2 ${!settings?.businessHours.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
              {DAYS.map(day => {
                const schedule = settings?.businessHours.schedule[day.key];
                return (
                  <div key={day.key} className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={schedule?.enabled ?? false}
                        onChange={(e) => updateSchedule(day.key, 'enabled', e.target.checked)}
                        className="w-3 h-3 rounded text-primary"
                      />
                      <span className={schedule?.enabled ? 'text-zinc-300' : 'text-zinc-600'}>{day.label}</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="time" 
                        value={schedule?.start || '09:00'} 
                        onChange={(e) => updateSchedule(day.key, 'start', e.target.value)}
                        disabled={!schedule?.enabled}
                        className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-400 disabled:opacity-40"
                      />
                      <span className="text-zinc-600">-</span>
                      <input 
                        type="time" 
                        value={schedule?.end || '18:00'} 
                        onChange={(e) => updateSchedule(day.key, 'end', e.target.value)}
                        disabled={!schedule?.enabled}
                        className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-400 disabled:opacity-40"
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-zinc-800">
                <textarea
                  rows={2}
                  value={settings?.businessHours.outsideHoursMessage || ''}
                  onChange={(e) => updateField('businessHours', { ...settings!.businessHours, outsideHoursMessage: e.target.value })}
                  placeholder="Mensagem fora do horário..."
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Boas-vindas */}
          <div className="bg-surface border border-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-zinc-300">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Boas-vindas</span>
              </div>
              <button 
                onClick={() => updateField('welcomeMessage', { ...settings!.welcomeMessage, enabled: !settings?.welcomeMessage?.enabled })}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings?.welcomeMessage?.enabled ? 'bg-primary' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings?.welcomeMessage?.enabled ? 'left-5' : 'left-0.5'}`}></div>
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mb-2">Enviada automaticamente para novos contatos</p>
            <textarea
              rows={2}
              value={settings?.welcomeMessage?.message || ''}
              onChange={(e) => updateField('welcomeMessage', { ...settings!.welcomeMessage, message: e.target.value })}
              disabled={!settings?.welcomeMessage?.enabled}
              placeholder="Olá! 👋 Seja bem-vindo(a)!"
              className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400 resize-none disabled:opacity-40"
            />
          </div>

          {/* Teste */}
          <div className="bg-zinc-900/50 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white">Teste seu Agente</span>
            </div>
            <p className="text-[10px] text-zinc-500 mb-3">
              Use o Live Chat para simular conversas.
            </p>
            <button 
              onClick={() => onNavigate?.('liveChat')}
              className="w-full py-1.5 bg-primary hover:bg-primaryHover rounded text-xs font-medium text-white"
            >
              Ir para o Live Chat
            </button>
          </div>
        </div>
      </div>

      {/* Base de Conhecimento */}
      <div className="bg-surface border border-white/5 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-zinc-200">Base de Conhecimento</h3>
              <p className="text-xs text-zinc-600">Documentos que a IA usa para responder</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!knowledgeBase ? (
              <button
                onClick={createKnowledgeBase}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                <Plus size={14} /> Criar Base
              </button>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
                >
                  <UploadCloud size={14} /> Upload
                </button>
                <button
                  onClick={() => setShowAddDoc(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  <Plus size={14} /> Documento
                </button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Busca */}
        {knowledgeBase && (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchKnowledge()}
                placeholder="Testar busca: digite uma pergunta..."
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder-zinc-600"
              />
              <button
                onClick={searchKnowledge}
                disabled={searching}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <div key={idx} className="p-2 bg-zinc-800/50 rounded border border-zinc-700 text-xs">
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span className="text-indigo-400">{result.documentTitle}</span>
                      <span>{(result.score * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-zinc-400 line-clamp-2">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Documentos */}
        <div className="space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{knowledgeBase ? 'Nenhum documento ainda' : 'Crie uma base para começar'}</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <div>
                    <span className="text-sm text-zinc-300">{doc.title}</span>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                      <span>{doc.sourceType.toUpperCase()}</span>
                      <span>•</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span className={doc.status === 'ready' ? 'text-green-400' : doc.status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                        {doc.status === 'ready' ? '✓ Pronto' : doc.status === 'error' ? '✕ Erro' : '⏳ Processando'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Adicionar Documento */}
      {showAddDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg mx-4 border border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-4">Adicionar Documento</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Título</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Ex: FAQ, Serviços, Políticas..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Conteúdo</label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="Cole aqui o conteúdo do documento..."
                  rows={8}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white resize-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddDoc(false); setNewDocTitle(''); setNewDocContent(''); }}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={addDocument}
                disabled={uploadingDoc || !newDocTitle.trim() || !newDocContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg"
              >
                {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
