import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { AuthTokens, AuthUser, clearSession, getRefreshToken, getUser, setSession } from './authStore';
import { logout as logoutApi } from '../api/authApi';

interface AuthContextValue {
  user: AuthUser | null;
  login: (tokens: AuthTokens, user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (tokens, nextUser) => {
        setSession(tokens, nextUser);
        setUser(nextUser);
      },
      logout: async () => {
        const refreshToken = getRefreshToken();
        try {
          if (refreshToken) await logoutApi(refreshToken);
        } catch {
          // logout should never block the user from leaving the session locally
        }
        clearSession();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
