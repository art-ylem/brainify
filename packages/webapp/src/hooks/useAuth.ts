import { useEffect, useState } from 'preact/hooks';
import { getMe, ApiError, type UserProfile } from '../api/client.js';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => {
        console.error('[Auth] Failed:', err);
        if (err instanceof ApiError) {
          setError(`${err.status}: ${err.message}`);
        } else {
          setError(err.message ?? 'Unknown error');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, error };
}
