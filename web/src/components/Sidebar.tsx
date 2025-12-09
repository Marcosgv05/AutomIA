import React from 'react';
import { LayoutDashboard, Smartphone, Database, MessageSquare, Calendar, Settings, LogOut } from 'lucide-react';
import { View, NavItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, inDevelopment: false },
  { id: 'connection', label: 'Conexão', icon: Smartphone, inDevelopment: false },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: Database, inDevelopment: false },
  { id: 'chat', label: 'Live Chat', icon: MessageSquare, inDevelopment: false },
  { id: 'calendar', label: 'Agenda', icon: Calendar, inDevelopment: false },
  { id: 'config', label: 'Configurações', icon: Settings, inDevelopment: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isDark = theme === 'dark';

  return (
    <div className={`w-64 h-screen flex flex-col fixed left-0 top-0 z-10 border-r transition-colors duration-300 ${
      isDark 
        ? 'bg-slate-900 border-slate-800' 
        : 'bg-white border-slate-200'
    }`}>
      <div className={`p-6 flex items-center gap-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <MessageSquare className="text-white w-5 h-5" />
        </div>
        <span className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>AutomIA</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className={`px-3 text-xs font-semibold uppercase tracking-wider mb-2 mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Menu Principal</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-600'
                  : isDark 
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.inDevelopment && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Em desenvolvimento" />
              )}
            </button>
          );
        })}
      </nav>

      <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className={`flex items-center gap-3 px-3 py-3 rounded-lg border mb-3 ${
          isDark 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            {user?.name ? getInitials(user.name) : 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{user?.name || 'Usuário'}</p>
            <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{user?.tenantName || 'Minha Empresa'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  );
};
