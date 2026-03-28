import { TelegramLoginButton } from './TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  onAuth: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

export function GuestLimitScreen({ t, onAuth, onBack }: Props) {
  return (
    <div class="page" style={{ textAlign: 'center', paddingTop: '48px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{t('guest.limit_title')}</h2>
      <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', marginBottom: '24px', maxWidth: '280px', margin: '0 auto 24px' }}>
        {t('guest.limit_text')}
      </p>
      <div style={{ marginBottom: '16px' }}>
        <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
      </div>
      <button
        class="btn-primary"
        style={{ maxWidth: '280px', margin: '0 auto', background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
        onClick={onBack}
      >
        {t('common.back')}
      </button>
    </div>
  );
}
