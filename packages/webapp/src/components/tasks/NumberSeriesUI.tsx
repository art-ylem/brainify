import { useState } from 'preact/hooks';
import type { TaskUIProps } from '../../pages/TaskPlay.js';

/** Number Series — find the missing number */
export function NumberSeriesUI({ data, onAnswer, t }: TaskUIProps) {
  const series = data.series as (number | null)[];
  const hiddenIndex = data.hiddenIndex as number;
  const [input, setInput] = useState('');

  function handleSubmit() {
    const num = Number(input);
    if (!Number.isFinite(num)) return;
    onAnswer(num);
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <p style={{ marginBottom: '16px', color: 'var(--tg-theme-hint-color)' }}>
        {t('tasks.number_series.description')}
      </p>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '24px',
        }}
      >
        {series.map((num, i) => (
          <div
            key={i}
            class="card"
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
              background: i === hiddenIndex ? 'var(--tg-theme-button-color)' : undefined,
              color: i === hiddenIndex ? 'var(--tg-theme-button-text-color)' : undefined,
            }}
          >
            {num !== null ? num : '?'}
          </div>
        ))}
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={input}
        onInput={(e) => setInput((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="?"
        style={{
          fontSize: '24px',
          textAlign: 'center',
          width: '120px',
          padding: '8px',
          borderRadius: '8px',
          border: '2px solid var(--tg-theme-hint-color)',
          background: 'var(--tg-theme-bg-color)',
          color: 'var(--tg-theme-text-color)',
          marginBottom: '16px',
        }}
        autoFocus
      />
      <div>
        <button
          class="btn-primary"
          style={{ maxWidth: '200px', margin: '0 auto' }}
          onClick={handleSubmit}
          disabled={!input}
        >
          {t('common.ready')}
        </button>
      </div>
    </div>
  );
}
