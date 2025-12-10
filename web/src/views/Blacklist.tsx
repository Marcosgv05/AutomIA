import React, { useState, useEffect } from 'react';
import { 
  ShieldBan, 
  Plus, 
  Trash2, 
  Phone, 
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { blacklistApi, BlacklistEntry } from '../services/api';

export const Blacklist: React.FC = () => {
  const { user } = useAuth();
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal de adicionar
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Busca
  const [searchTerm, setSearchTerm] = useState('');
  
  // Feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tenantId = user?.tenantId || '';

  // Carregar blacklist
  useEffect(() => {
    if (tenantId) {
      loadBlacklist();
    }
  }, [tenantId]);

  const loadBlacklist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await blacklistApi.list(tenantId);
      setBlacklist(response.data.blacklist || []);
    } catch (err: any) {
      setError('Erro ao carregar blacklist');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    try {
      setIsAdding(true);
      await blacklistApi.add(tenantId, newPhone.trim(), newReason.trim() || undefined);
      setNewPhone('');
      setNewReason('');
      setShowAddModal(false);
      setSuccessMessage('Número adicionado à blacklist');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadBlacklist();
    } catch (err: any) {
      setError('Erro ao adicionar número');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (phoneNumber: string) => {
    if (!confirm(`Remover ${phoneNumber} da blacklist?`)) return;

    try {
      await blacklistApi.remove(tenantId, phoneNumber);
      setSuccessMessage('Número removido da blacklist');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadBlacklist();
    } catch (err: any) {
      setError('Erro ao remover número');
    }
  };

  const formatPhone = (phone: string) => {
    // Formata número brasileiro: +55 (11) 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  const filteredBlacklist = blacklist.filter(entry => 
    entry.phoneNumber.includes(searchTerm.replace(/\D/g, '')) ||
    entry.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldBan className="text-red-500" size={24} />
            </div>
            Blacklist
          </h1>
          <p className="text-zinc-500 mt-1">
            Números bloqueados não recebem respostas da IA
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-medium rounded-lg transition-colors"
        >
          <Plus size={18} />
          Adicionar Número
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">×</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar por número ou motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/5 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Lista */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredBlacklist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <ShieldBan size={48} className="mb-4 opacity-50" />
            <p>Nenhum número na blacklist</p>
            {searchTerm && <p className="text-sm mt-1">Tente outra busca</p>}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredBlacklist.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Phone className="text-red-400" size={18} />
                  </div>
                  <div>
                    <p className="text-white font-medium font-mono">
                      {formatPhone(entry.phoneNumber)}
                    </p>
                    {entry.reason && (
                      <p className="text-sm text-zinc-500 mt-0.5">
                        {entry.reason}
                      </p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">
                      Bloqueado em {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(entry.phoneNumber)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remover da blacklist"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>{filteredBlacklist.length} número(s) bloqueado(s)</span>
      </div>

      {/* Modal Adicionar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ShieldBan className="text-red-500" size={20} />
              Adicionar à Blacklist
            </h2>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Número de Telefone *
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 font-mono"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Digite apenas números (código do país + DDD + número)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Ex: Spam, Atendimento finalizado..."
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newPhone.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldBan size={18} />
                  )}
                  Bloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
