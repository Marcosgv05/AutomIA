import React, { useState, useRef, useEffect } from 'react';
import {
    LayoutGrid,
    MessageSquareText,
    SlidersHorizontal,
    QrCode,
    Calendar,
    LogOut,
    Bot,
    ShieldBan,
    ChevronDown,
    User,
    Settings,
    Menu,
    X
} from 'lucide-react';
import { View, NavItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
    currentView: View;
    onChangeView: (view: View) => void;
}

const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutGrid, inDevelopment: false },
    { id: 'chat', label: 'Atendimento', icon: MessageSquareText, inDevelopment: false },
    { id: 'connection', label: 'Dispositivos', icon: QrCode, inDevelopment: false },
    { id: 'calendar', label: 'Agenda', icon: Calendar, inDevelopment: false },
    { id: 'blacklist', label: 'Blacklist', icon: ShieldBan, inDevelopment: false },
    { id: 'config', label: 'Configurações', icon: SlidersHorizontal, inDevelopment: false },
];

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView }) => {
    const { user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* Logo */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white hidden sm:block">
                                Át<span className="text-primary">imo</span>
                            </span>
                        </div>

                        {/* Desktop Navigation - Tabs */}
                        <div className="hidden lg:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onChangeView(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                                ? 'bg-zinc-800 text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        <Icon size={16} className={isActive ? 'text-primary' : ''} />
                                        <span>{item.label}</span>
                                        {item.id === 'chat' && (
                                            <span className="bg-primary/20 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                3
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Side - User Dropdown */}
                        <div className="flex items-center gap-3">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>

                            {/* User Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-zinc-800/50 transition-all duration-200 border border-transparent hover:border-white/5"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-orange-600/80 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                        {user?.name ? getInitials(user.name) : 'US'}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-sm font-medium text-zinc-200 leading-tight">{user?.name || 'Usuário'}</p>
                                        <p className="text-xs text-zinc-500 leading-tight">{user?.tenantName || 'Minha Empresa'}</p>
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={`text-zinc-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-xl shadow-black/50 overflow-hidden animate-fade-in">
                                        {/* User Info */}
                                        <div className="p-4 border-b border-white/5">
                                            <p className="text-sm font-semibold text-white">{user?.name || 'Usuário'}</p>
                                            <p className="text-xs text-zinc-400 mt-0.5">{user?.email || 'email@exemplo.com'}</p>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2">
                                            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                                <User size={16} />
                                                Meu Perfil
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onChangeView('config');
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                            >
                                                <Settings size={16} />
                                                Configurações
                                            </button>
                                        </div>

                                        {/* Logout */}
                                        <div className="p-2 border-t border-white/5">
                                            <button
                                                onClick={logout}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <LogOut size={16} />
                                                Sair da conta
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-white/5 bg-[#050505]">
                        <div className="px-4 py-3 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onChangeView(item.id);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                                ? 'bg-zinc-800 text-white'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-primary' : ''} />
                                        <span>{item.label}</span>
                                        {item.id === 'chat' && (
                                            <span className="ml-auto bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                                                3
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </nav>

            {/* Spacer para compensar a navbar fixa */}
            <div className="h-16" />
        </>
    );
};
