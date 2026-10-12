import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as loginApi } from '../api/auth';
import { getMe } from '../api/users';
import type { LoginCredentials, UserRole } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  role: UserRole | null;
  login: (credentials: LoginCredentials) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('role') as UserRole | null;
    if (token) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      setRole(storedRole);
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<UserRole> => {
    const tokens = await loginApi(credentials);
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('username', credentials.username);
    setIsAuthenticated(true);
    setUsername(credentials.username);

    const me = await getMe();
    localStorage.setItem('role', me.role);
    setRole(me.role);
    return me.role;
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
