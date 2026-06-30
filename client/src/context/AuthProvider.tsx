import React, { useState, useEffect } from 'react';
import type { AuthUser } from '../services/authService';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';
import { AuthContext, type AuthContextType } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cleanAuthStorage = () => {
    tokenStorage.clear();
    setUser(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      const userId = tokenStorage.getUserId();

      if (!refreshToken || !userId) {
        cleanAuthStorage();
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authService.getMe();
        setUser(userData);
      } catch {
        try {
          const tokens = await authService.refreshTokens(refreshToken);
          tokenStorage.setAccessToken(tokens.access_token);
          tokenStorage.setRefreshToken(tokens.refresh_token);
          const userData = await authService.getMe();
          setUser(userData);
        } catch {
          cleanAuthStorage();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { user: loggedUser, access_token, refresh_token } = await authService.login(email, password);
    tokenStorage.setSession({
      accessToken: access_token,
      refreshToken: refresh_token,
      userId: loggedUser.id,
    });
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Error revoking session on server', e);
    } finally {
      cleanAuthStorage();
    }
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
