import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  api_key?: string;
  sector?: string;
  gemini_api_key?: string;
  sales_message_template?: string;
  can_use_ai_search?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PUBLIC_HEADERS = { Authorization: 'Bearer public-access' };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { headers: PUBLIC_HEADERS, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar o painel público');
        setUser(await response.json());
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Erro ao inicializar painel público:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  // A API opera em modo público. Estes métodos permanecem apenas para compatibilidade
  // com componentes legados e não criam nem removem sessões.
  const login = (_newToken: string, newUser: User) => setUser(newUser);
  const logout = () => undefined;

  return (
    <AuthContext.Provider value={{ user, token: 'public-access', login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
