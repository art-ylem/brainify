import { TelegramLoginButton } from './TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  onAuth: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

export function GuestLimitScreen({ t, onAuth, onBack }: Props) {
  return (
    <div class="page text-center fade-in" style={{ paddingTop: '48px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <h2 class="font-bold" style={{ fontSize: '22px', marginBottom: '8px' }}>{t('guest.limit_title')}</h2>
      <p class="text-hint" style={{ fontSize: '14px', maxWidth: '280px', margin: '0 auto 24px' }}>
        {t('guest.limit_text')}
      </p>
      <div style={{ marginBottom: '16px' }}>
        <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
      </div>
      <button
        class="btn-primary"
        style={{ maxWidth: '280px', margin: '0 auto', background: 'var(--brand-card)', color: 'var(--brand-text)' }}
        onClick={onBack}
      >
        {t('common.back')}
      </button>
    </div>
  );
}
