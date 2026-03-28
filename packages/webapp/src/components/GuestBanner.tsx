import { TelegramLoginButton } from './TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  onAuth: (data: Record<string, unknown>) => void;
}

export function GuestBanner({ t, onAuth }: Props) {
  return (
    <div class="card flex gap-sm" style={{
      alignItems: 'center',
      flexWrap: 'wrap',
      padding: '12px 16px',
    }}>
      <div style={{ flex: 1, minWidth: '180px' }}>
        <div class="font-bold" style={{ fontSize: '14px' }}>{t('guest.banner_title')}</div>
        <div class="text-hint" style={{ fontSize: '12px', marginTop: '2px' }}>
          {t('guest.banner_subtitle')}
        </div>
      </div>
      <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
    </div>
  );
}
