import React from 'react';
import { 
  LayoutGrid, 
  MessageSquareText, 
  DatabaseZap, 
  SlidersHorizontal, 
  QrCode,
  Calendar,
  LogOut,
  Command
} from 'lucide-react';
import { View, NavItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutGrid, inDevelopment: false },
  { id: 'chat', label: 'Atendimento', icon: MessageSquareText, inDevelopment: false },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: DatabaseZap, inDevelopment: false },
  { id: 'connection', label: 'Dispositivos', icon: QrCode, inDevelopment: false },
  { id: 'calendar', label: 'Agenda', icon: Calendar, inDevelopment: false },
  { id: 'config', label: 'Configuração do Agente', icon: SlidersHorizontal, inDevelopment: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="w-16 lg:w-64 bg-[#050505] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300">
      {/* Brand */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
        <div className="text-primary flex items-center justify-center bg-primary/10 p-2 rounded-lg">
          <Command size={20} />
        </div>
        <span className="hidden lg:block ml-3 text-lg font-bold tracking-tight text-white">
          AUTOM<span className="text-primary">IA</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 space-y-1">
        <div className="hidden lg:block px-4 mb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
          Plataforma
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center px-3 lg:px-4 py-2.5 rounded-md transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-zinc-900 text-white' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"></div>
              )}
              
              <Icon size={18} className={`lg:mr-3 ${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              
              {item.id === 'chat' && (
                <div className="hidden lg:flex ml-auto bg-zinc-800 border border-zinc-700 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                  3
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center p-2 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer group">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {user?.name ? getInitials(user.name) : 'US'}
          </div>
          <div className="hidden lg:block ml-3 overflow-hidden">
            <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-zinc-500 truncate font-mono">{user?.tenantName || 'Minha Empresa'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="hidden lg:flex w-full mt-2 items-center text-zinc-600 hover:text-red-400 text-xs px-2 py-1 transition-colors"
        >
          <LogOut size={14} className="mr-2" />
          Desconectar
        </button>
      </div>
    </div>
  );
};
