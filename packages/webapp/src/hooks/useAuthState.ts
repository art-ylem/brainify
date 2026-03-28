import { useState, useCallback, useEffect } from 'preact/hooks';
import { isTelegramMiniApp } from '../lib/telegram.js';
import { getWebToken, clearWebToken } from '../lib/auth.js';
import { getMe, loginWithTelegram, type UserProfile } from '../api/client.js';

export type AuthMode = 'guest' | 'tma' | 'web';

export interface AuthState {
  mode: AuthMode;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginViaTelegram: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
}

function detectMode(): AuthMode {
  if (isTelegramMiniApp()) return 'tma';
  if (getWebToken()) return 'web';
  return 'guest';
}

export function useAuthState(): AuthState {
  const [mode, setMode] = useState<AuthMode>(detectMode);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'guest') {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMe()
      .then(setUser)
      .catch((err) => {
        console.error('[AuthState] Failed:', err);
        // If web token is invalid, fall back to guest
        if (mode === 'web') {
          clearWebToken();
          setMode('guest');
        } else {
          setError(err.message ?? 'Auth error');
        }
      })
      .finally(() => setLoading(false));
  }, [mode]);

  const loginViaTelegram = useCallback(async (data: Record<string, unknown>) => {
    const result = await loginWithTelegram(data);
    setUser(result.user);
    setMode('web');
  }, []);

  const logout = useCallback(() => {
    clearWebToken();
    setUser(null);
    setMode('guest');
  }, []);

  return { mode, user, loading, error, loginViaTelegram, logout };
}
