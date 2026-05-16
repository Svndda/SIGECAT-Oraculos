import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '../services/authService';
import { authService } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sigecat_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authService
      .getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('sigecat_access_token');
        localStorage.removeItem('sigecat_refresh_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { user: loggedUser, access_token, refresh_token } = await authService.login(email, password);
    localStorage.setItem('sigecat_access_token', access_token);
    localStorage.setItem('sigecat_refresh_token', refresh_token);
    setUser(loggedUser);
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    localStorage.removeItem('sigecat_access_token');
    localStorage.removeItem('sigecat_refresh_token');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
