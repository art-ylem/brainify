import type { AuthMode } from '../hooks/useAuthState.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  status: string;
  trialEndsAt?: string | null;
  mode?: AuthMode;
}

export function SubscriptionBanner({ t, status, trialEndsAt, mode }: Props) {
  if (status === 'active') return null;

  function handleSubscribe() {
    if (mode === 'web') {
      window.open(`https://t.me/${BOT_USERNAME}?start=subscribe`, '_blank');
    } else {
      window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/${BOT_USERNAME}?start=subscribe`);
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.08))',
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span style={{ fontSize: '24px' }}>{status === 'trial' ? '⏳' : '🆓'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>
          {status === 'trial' && trialEndsAt
            ? `${t('subscription.trial_plan')} — ${new Date(trialEndsAt).toLocaleDateString()}`
            : t('subscription.upgrade_cta')}
        </div>
      </div>
      <button
        class="btn-primary"
        style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
        onClick={handleSubscribe}
      >
        💎 Premium
      </button>
    </div>
  );
}
