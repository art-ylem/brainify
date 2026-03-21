import { useState, useEffect } from 'preact/hooks';
import type { TaskUIProps } from '../../pages/TaskPlay.js';

/** Sequence Memory — show sequence, then reproduce it */
export function SequenceMemoryUI({ data, onAnswer, t }: TaskUIProps) {
  const sequence = data.sequence as number[];
  const displayTimeMs = (data.displayTimeMs as number) ?? 3000;
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [highlighted, setHighlighted] = useState(-1);
  const [userInput, setUserInput] = useState<number[]>([]);

  // Show sequence one by one
  useEffect(() => {
    let idx = 0;
    const intervalMs = displayTimeMs / (sequence.length + 1);
    const timer = setInterval(() => {
      if (idx < sequence.length) {
        setHighlighted(sequence[idx]);
        idx++;
      } else {
        clearInterval(timer);
        setHighlighted(-1);
        setPhase('input');
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [sequence, displayTimeMs]);

  // Build a grid of buttons 1-9
  const buttons = Array.from({ length: 9 }, (_, i) => i + 1);

  function handleTap(num: number) {
    const newInput = [...userInput, num];
    setUserInput(newInput);
    if (newInput.length >= sequence.length) {
      onAnswer(newInput);
    }
  }

  if (phase === 'show') {
    return (
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <p style={{ marginBottom: '24px', color: 'var(--tg-theme-hint-color)' }}>
          {t('tasks.sequence_memory.description')}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            maxWidth: '240px',
            margin: '0 auto',
          }}
        >
          {buttons.map((num) => (
            <div
              key={num}
              class="card"
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                background:
                  highlighted === num
                    ? 'var(--tg-theme-button-color)'
                    : undefined,
                color:
                  highlighted === num
                    ? 'var(--tg-theme-button-text-color)'
                    : undefined,
                transition: 'background 0.2s',
              }}
            >
              {num}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <p style={{ marginBottom: '8px' }}>
        {userInput.length} / {sequence.length}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          maxWidth: '240px',
          margin: '0 auto',
        }}
      >
        {buttons.map((num) => (
          <button
            key={num}
            class="card"
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => handleTap(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
