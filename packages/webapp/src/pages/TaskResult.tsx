import type { AttemptResult } from '../api/client.js';
import { ShareButton } from '../components/ShareButton.js';
import { TelegramLoginButton } from '../components/TelegramLoginButton.js';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

interface Props {
  t: (key: string) => string;
  result: AttemptResult;
  onRetry: () => void;
  onBack: () => void;
  isGuest?: boolean;
  onAuth?: (data: Record<string, unknown>) => void;
}

export function TaskResult({ t, result, onRetry, onBack, isGuest, onAuth }: Props) {
  const emoji = result.isCorrect ? '🎉' : '💪';
  const seconds = (result.timeMs / 1000).toFixed(1);

  return (
    <div class="page text-center fade-in" style={{ paddingTop: '40px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{emoji}</div>

      <div class="card slide-up" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>
        {result.difficulty > 0 && (
          <div class="flex" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>{t('difficulty.title')}</span>
            <span class="font-bold">{t(`difficulty.${result.difficulty}`)}</span>
          </div>
        )}
        <div class="flex" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>{t('common.score')}</span>
          <span style={{ fontWeight: 700, fontSize: '20px' }}>{result.score}</span>
        </div>
        <div class="flex" style={{ justifyContent: 'space-between' }}>
          <span>{t('common.time')}</span>
          <span style={{ fontWeight: 700, fontSize: '20px' }}>{seconds}s</span>
        </div>
        {result.details && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--brand-border)' }}>
            {Object.entries(result.details).map(([key, val]) => (
              <div key={key} class="flex" style={{ justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                <span class="text-hint">{key}</span>
                <span>{String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isGuest && onAuth && (
        <div class="card" style={{ maxWidth: '300px', margin: '0 auto 16px', textAlign: 'center' }}>
          <p class="text-hint" style={{ fontSize: '13px', marginBottom: '8px' }}>
            {t('guest.result_cta')}
          </p>
          <TelegramLoginButton botName={BOT_USERNAME} onAuth={onAuth} />
        </div>
      )}

      <div class="flex gap-sm" style={{ maxWidth: '300px', margin: '0 auto', flexWrap: 'wrap' }}>
        <button
          class="btn-primary"
          style={{ flex: 1 }}
          onClick={onRetry}
        >
          {t('common.retry')}
        </button>
        <button
          class="btn-primary"
          style={{ flex: 1, background: 'var(--brand-card)', color: 'var(--brand-text)' }}
          onClick={onBack}
        >
          {t('common.back')}
        </button>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <ShareButton t={t} score={result.score} />
        </div>
      </div>
    </div>
  );
}
