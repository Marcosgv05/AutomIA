import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthUser } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  handleGoogleCallback: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');

      if (token && savedUser) {
        try {
          // Verifica se token ainda é válido
          const { data } = await authApi.me();
          setUser(data.user);
        } catch {
          // Token inválido, limpa storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    // Escuta evento de logout forçado
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await authApi.register(name, email, password);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const loginWithGoogle = async () => {
    const { data } = await authApi.getGoogleAuthUrl();
    
    // Limpa resultado anterior
    localStorage.removeItem('google_auth_result');
    
    // Abre popup centralizado
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      data.url,
      'google-login',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    // Verifica localStorage periodicamente
    // O popup do frontend (GoogleCallback) salva o resultado no localStorage
    const checkInterval = setInterval(() => {
      const resultStr = localStorage.getItem('google_auth_result');
      if (resultStr) {
        clearInterval(checkInterval);
        localStorage.removeItem('google_auth_result');
        
        try {
          const result = JSON.parse(resultStr);
          if (result.success && result.user) {
            // Login já foi feito pelo GoogleCallback, só atualiza o estado
            setUser(result.user);
          } else if (result.error) {
            console.error('Erro no login Google:', result.error);
          }
        } catch (e) {
          console.error('Erro ao processar resultado do Google:', e);
        }
      }
    }, 300);

    // Timeout de segurança - 2 minutos
    setTimeout(() => {
      clearInterval(checkInterval);
      localStorage.removeItem('google_auth_result');
    }, 120000);
  };

  const handleGoogleCallback = (token: string) => {
    localStorage.setItem('auth_token', token);
    // Busca dados do usuário com o novo token
    authApi.me().then(({ data }) => {
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setUser(data.user);
    }).catch(() => {
      localStorage.removeItem('auth_token');
    });
  };

  const logout = () => {
    authApi.logout().catch(() => {}); // Ignora erro se já deslogado
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        handleGoogleCallback,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
