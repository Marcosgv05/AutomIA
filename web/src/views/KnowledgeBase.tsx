import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle2, Loader2, Plus, Search, AlertCircle, FolderOpen } from 'lucide-react';
import { tenantApi, knowledgeApi, Document, KnowledgeBase as KBType } from '../services/api';

export const KnowledgeBase: React.FC = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KBType[]>([]);
  const [selectedKB, setSelectedKB] = useState<KBType | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de adicionar documento
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [uploading, setUploading] = useState(false);

  // Busca RAG
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ content: string; score: number; documentTitle: string }>>([]);
  const [searching, setSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega tenant e bases de conhecimento
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await tenantApi.getDemoTenant();
        setTenantId(data.tenant.id);

        const kbResponse = await knowledgeApi.listKnowledgeBases(data.tenant.id);
        setKnowledgeBases(kbResponse.data.knowledgeBases);

        // Se tiver bases, seleciona a primeira
        if (kbResponse.data.knowledgeBases.length > 0) {
          setSelectedKB(kbResponse.data.knowledgeBases[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Carrega documentos quando seleciona uma base
  useEffect(() => {
    if (!selectedKB) {
      setDocuments([]);
      return;
    }

    const loadDocs = async () => {
      try {
        const { data } = await knowledgeApi.listDocuments(selectedKB.id);
        setDocuments(data.documents);
      } catch (err: any) {
        console.error('Erro ao carregar documentos:', err);
      }
    };
    loadDocs();
  }, [selectedKB]);

  // Cria base de conhecimento
  const handleCreateKB = async () => {
    if (!tenantId) return;
    try {
      const { data } = await knowledgeApi.createKnowledgeBase(tenantId, 'Principal', 'Base de conhecimento principal');
      setKnowledgeBases([data.knowledgeBase, ...knowledgeBases]);
      setSelectedKB(data.knowledgeBase);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar base');
    }
  };

  // Adiciona documento
  const handleAddDocument = async () => {
    if (!tenantId || !selectedKB || !newDocTitle.trim() || !newDocContent.trim()) return;

    try {
      setUploading(true);
      const { data } = await knowledgeApi.createDocument({
        tenantId,
        knowledgeBaseId: selectedKB.id,
        title: newDocTitle,
        sourceType: 'txt',
        content: newDocContent,
      });
      setDocuments([data.document, ...documents]);
      setShowAddModal(false);
      setNewDocTitle('');
      setNewDocContent('');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar documento');
    } finally {
      setUploading(false);
    }
  };

  // Deleta documento
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      await knowledgeApi.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir documento');
    }
  };

  // Busca RAG
  const handleSearch = async () => {
    if (!tenantId || !searchQuery.trim()) return;
    try {
      setSearching(true);
      const { data } = await knowledgeApi.search(tenantId, searchQuery, 5);
      setSearchResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Erro na busca');
    } finally {
      setSearching(false);
    }
  };

  // Upload de arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId || !selectedKB) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setNewDocTitle(file.name);
      setNewDocContent(content);
      setShowAddModal(true);
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-2xl font-bold ${true ? 'text-slate-100' : 'text-slate-900'}`}>Base de Conhecimento</h1>
          <p className={`mt-1 ${true ? 'text-slate-400' : 'text-slate-600'}`}>Gerencie os documentos que a IA utiliza para responder seus clientes.</p>
        </div>
        <div className="flex gap-2">
          {knowledgeBases.length === 0 && (
            <button
              onClick={handleCreateKB}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <FolderOpen className="w-5 h-5" />
              Criar Base
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!selectedKB}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Documento
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Busca RAG */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${true ? 'text-slate-200' : 'text-slate-800'}`}>Testar Busca (RAG)</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Digite uma pergunta para buscar nos documentos..."
            className={`flex-1 rounded-lg px-4 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              true ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
            }`}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Buscar
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-slate-400">Resultados:</h4>
            {searchResults.map((result, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-indigo-400">{result.documentTitle}</span>
                  <span className="text-xs text-slate-500">Score: {(result.score * 100).toFixed(1)}%</span>
                </div>
                <p className="text-sm text-slate-300">{result.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
          true 
            ? 'border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/10' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${true ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <UploadCloud className={`w-8 h-8 ${true ? 'text-slate-400' : 'text-slate-500'}`} />
        </div>
        <h3 className={`text-lg font-semibold ${true ? 'text-slate-200' : 'text-slate-700'}`}>Arraste e solte arquivos aqui</h3>
        <p className="text-slate-500 mt-1 mb-4">Suporte para TXT e MD (ou clique para selecionar)</p>
      </div>

      {/* Tabela de Documentos */}
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`border-b ${true ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <tr>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${true ? 'text-slate-400' : 'text-slate-600'}`}>Título</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${true ? 'text-slate-400' : 'text-slate-600'}`}>Tipo</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${true ? 'text-slate-400' : 'text-slate-600'}`}>Data</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${true ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${true ? 'text-slate-400' : 'text-slate-600'}`}>Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${true ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {documents.map((doc) => (
                <tr key={doc.id} className={`transition-colors ${true ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${true ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                        <FileText className={`w-5 h-5 ${true ? 'text-slate-400' : 'text-slate-500'}`} />
                      </div>
                      <span className={`font-medium ${true ? 'text-slate-300' : 'text-slate-900'}`}>{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{doc.sourceType.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    {doc.status === 'ready' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/10">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pronto
                      </span>
                    ) : doc.status === 'error' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/10">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Erro
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/10">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processando
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              {selectedKB ? 'Nenhum documento encontrado. Faça upload para começar.' : 'Crie uma base de conhecimento primeiro.'}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Documento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl p-6 w-full max-w-2xl mx-4 border border-slate-800">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Adicionar Documento</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Título</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Ex: FAQ da empresa"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Conteúdo</label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="Cole aqui o conteúdo do documento (perguntas frequentes, informações sobre serviços, etc.)"
                  rows={10}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setNewDocTitle(''); setNewDocContent(''); }}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDocument}
                disabled={uploading || !newDocTitle.trim() || !newDocContent.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
