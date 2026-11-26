import React, { createContext, useContext } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  sector?: string;
}

interface AuthContextType {
  user: User;
  token: string;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const publicUser: User = { id: 0, username: 'Painel público', role: 'admin', sector: 'Produção' };
const publicContext: AuthContextType = { user: publicUser, token: 'public-access', login: () => undefined, logout: () => undefined, isLoading: false };
const AuthContext = createContext<AuthContextType>(publicContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={publicContext}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
