import type { AttemptResult } from '../api/client.js';
import { ShareButton } from '../components/ShareButton.js';

interface Props {
  t: (key: string) => string;
  result: AttemptResult;
  onRetry: () => void;
  onBack: () => void;
}

export function TaskResult({ t, result, onRetry, onBack }: Props) {
  const emoji = result.isCorrect ? '🎉' : '💪';
  const seconds = (result.timeMs / 1000).toFixed(1);

  return (
    <div class="page" style={{ textAlign: 'center', paddingTop: '40px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{emoji}</div>

      <div class="card" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>{t('common.score')}</span>
          <span style={{ fontWeight: 700, fontSize: '20px' }}>{result.score}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('common.time')}</span>
          <span style={{ fontWeight: 700, fontSize: '20px' }}>{seconds}s</span>
        </div>
        {result.details && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--tg-theme-hint-color)' }}>
            {Object.entries(result.details).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>{key}</span>
                <span>{String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', maxWidth: '300px', margin: '0 auto', flexWrap: 'wrap' }}>
        <button
          class="btn-primary"
          style={{ flex: 1 }}
          onClick={onRetry}
        >
          {t('common.retry')}
        </button>
        <button
          class="btn-primary"
          style={{ flex: 1, background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
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
