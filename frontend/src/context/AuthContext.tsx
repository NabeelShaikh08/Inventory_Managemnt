import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as loginApi } from '../api/auth';
import type { LoginCredentials } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUsername = localStorage.getItem('username');
    if (token) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const tokens = await loginApi(credentials);
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('username', credentials.username);
    setIsAuthenticated(true);
    setUsername(credentials.username);
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
