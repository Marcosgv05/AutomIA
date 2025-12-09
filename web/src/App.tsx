import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Connection } from './views/Connection';
import { KnowledgeBase } from './views/KnowledgeBase';
import { LiveChat } from './views/LiveChat';
import { Calendar } from './views/Calendar';
import { AgentConfig } from './views/AgentConfig';
import { GoogleCallback } from './views/GoogleCallback';
import { View } from './types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading, handleGoogleCallback } = useAuth();
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Verifica se há token do Google na URL (callback)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Remove token da URL
      window.history.replaceState({}, '', window.location.pathname);
      // Processa o login
      handleGoogleCallback(token);
    }
  }, [handleGoogleCallback]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Se não autenticado, mostra login
  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'connection':
        return <Connection />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'chat':
        return <LiveChat />;
      case 'calendar':
        return <Calendar />;
      case 'config':
        return <AgentConfig onNavigate={(view) => setCurrentView(view as View)} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-slate-100 text-slate-900'
    }`}>
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      <main className={`flex-1 ml-64 p-8 overflow-y-auto h-screen ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  
  // Rota do callback do Google é separada (não precisa de autenticação)
  if (location.pathname === '/auth/google/callback') {
    return <GoogleCallback />;
  }
  
  return <AppContent />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
