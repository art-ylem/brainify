import type { TaskUIProps } from '../../pages/TaskPlay.js';

/** Pattern Search — choose the option that continues the pattern */
export function PatternSearchUI({ data, onAnswer, t }: TaskUIProps) {
  const sequence = data.sequence as number[];
  const options = data.options as number[];

  function handleChoice(index: number) {
    onAnswer(index);
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <p style={{ marginBottom: '16px', color: 'var(--tg-theme-hint-color)' }}>
        {t('tasks.pattern_search.description')}
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
        {sequence.map((num, i) => (
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
            }}
          >
            {num}
          </div>
        ))}
        <div
          class="card"
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700,
            background: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          ?
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          maxWidth: '280px',
          margin: '0 auto',
        }}
      >
        {options.map((opt, i) => (
          <button
            key={i}
            class="card"
            style={{
              padding: '16px',
              fontSize: '20px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => handleChoice(i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
