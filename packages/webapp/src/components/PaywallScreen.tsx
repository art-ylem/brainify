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
    <div class="page" style={{ textAlign: 'center', paddingTop: '48px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💎</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{t('paywall.title')}</h2>
      <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', marginBottom: '24px', maxWidth: '280px', margin: '0 auto 24px' }}>
        {t('paywall.text')}
      </p>
      <div class="card" style={{ maxWidth: '280px', margin: '0 auto 24px', textAlign: 'left' }}>
        <div style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>
          {t('paywall.features')}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '280px', margin: '0 auto' }}>
        <button class="btn-primary" onClick={handleSubscribe}>
          {t('paywall.cta')}
        </button>
        <button
          class="btn-primary"
          style={{ background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
          onClick={onBack}
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
