import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Connection } from './views/Connection';
import { LiveChat } from './views/LiveChat';
import { Calendar } from './views/Calendar';
import { AgentConfig } from './views/AgentConfig';
import { Blacklist } from './views/Blacklist';
import { GoogleCallback } from './views/GoogleCallback';
import { View } from './types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading, handleGoogleCallback } = useAuth();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
      case 'chat':
        return <LiveChat />;
      case 'calendar':
        return <Calendar />;
      case 'blacklist':
        return <Blacklist />;
      case 'config':
        return <AgentConfig onNavigate={(view) => setCurrentView(view as View)} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 font-sans selection:bg-primary/30 flex">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      {/* Main Content Area - Adjusted margin for sidebar */}
      <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-screen overflow-x-hidden transition-all duration-300">
        {renderView()}
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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
