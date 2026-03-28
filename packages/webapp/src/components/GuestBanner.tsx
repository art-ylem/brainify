import { TelegramLoginButton } from './TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  onAuth: (data: Record<string, unknown>) => void;
}

export function GuestBanner({ t, onAuth }: Props) {
  return (
    <div style={{
      background: 'var(--tg-theme-secondary-bg-color)',
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '180px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('guest.banner_title')}</div>
        <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
          {t('guest.banner_subtitle')}
        </div>
      </div>
      <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
    </div>
  );
}
