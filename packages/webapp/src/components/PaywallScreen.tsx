import type { AuthMode } from '../hooks/useAuthState.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  mode?: AuthMode;
  onBack: () => void;
}

export function PaywallScreen({ t, mode, onBack }: Props) {
  function handleSubscribe() {
    if (mode === 'web') {
      window.open(`https://t.me/${BOT_USERNAME}?start=subscribe`, '_blank');
    } else {
      window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/${BOT_USERNAME}?start=subscribe`);
    }
  }

  return (
    <div class="page text-center fade-in" style={{ paddingTop: '48px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💎</div>
      <h2 class="font-bold" style={{ fontSize: '22px', marginBottom: '8px' }}>{t('paywall.title')}</h2>
      <p class="text-hint" style={{ fontSize: '14px', maxWidth: '280px', margin: '0 auto 24px' }}>
        {t('paywall.text')}
      </p>
      <div class="card" style={{ maxWidth: '280px', margin: '0 auto 24px', textAlign: 'left' }}>
        <div class="text-hint" style={{ fontSize: '14px' }}>
          {t('paywall.features')}
        </div>
      </div>
      <div class="flex-col gap-sm" style={{ maxWidth: '280px', margin: '0 auto' }}>
        <button class="btn-primary" onClick={handleSubscribe}>
          {t('paywall.cta')}
        </button>
        <button
          class="btn-primary"
          style={{ background: 'var(--brand-card)', color: 'var(--brand-text)' }}
          onClick={onBack}
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
