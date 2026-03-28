import { useAuthState } from './useAuthState.js';

export function useAuth() {
  const state = useAuthState();
  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    mode: state.mode,
    loginViaTelegram: state.loginViaTelegram,
    logout: state.logout,
  };
}
