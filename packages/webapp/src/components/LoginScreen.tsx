import { TelegramLoginButton } from './TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  onAuth: (data: Record<string, unknown>) => void;
  onGuest: () => void;
}

export function LoginScreen({ t, onAuth, onGuest }: Props) {
  return (
    <div class="login-screen fade-in">
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧠</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Brainify</h1>
      <p class="text-hint" style={{ fontSize: '15px', maxWidth: '280px', marginBottom: '32px' }}>
        {t('login.description')}
      </p>

      <div style={{ marginBottom: '24px', width: '100%', maxWidth: '320px' }}>
        <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
      </div>

      <button
        class="btn-primary"
        style={{ maxWidth: '320px', background: 'var(--brand-card)', color: 'var(--brand-text)' }}
        onClick={onGuest}
      >
        {t('login.try_without')}
      </button>
    </div>
  );
}
