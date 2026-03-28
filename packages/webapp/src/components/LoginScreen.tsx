import { TelegramLoginButton } from './TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  onAuth: (data: Record<string, unknown>) => void;
  onGuest: () => void;
}

export function LoginScreen({ t, onAuth, onGuest }: Props) {
  return (
    <div class="page" style={{ textAlign: 'center', paddingTop: '60px' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧠</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Brainify</h1>
      <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '15px', marginBottom: '32px', maxWidth: '280px', margin: '0 auto 32px' }}>
        {t('login.description')}
      </p>

      <div style={{ marginBottom: '24px' }}>
        <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
      </div>

      <button
        class="btn-primary"
        style={{ maxWidth: '280px', margin: '0 auto', background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
        onClick={onGuest}
      >
        {t('login.try_without')}
      </button>
    </div>
  );
}
