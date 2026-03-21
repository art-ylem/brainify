import { useState } from 'preact/hooks';
import type { TaskUIProps } from '../../pages/TaskPlay.js';

/** Schulte table — tap numbers in ascending order */
export function SchulteUI({ data, onAnswer }: TaskUIProps) {
  const grid = data.grid as number[];
  const size = data.size as number;
  const [nextNumber, setNextNumber] = useState(1);
  const [taps, setTaps] = useState<Set<number>>(new Set());
  const [values, setValues] = useState<number[]>([]);
  const total = size * size;

  function handleTap(value: number, index: number) {
    if (value !== nextNumber) return;
    const newTaps = new Set(taps);
    newTaps.add(index);
    setTaps(newTaps);
    const newValues = [...values, value];
    setValues(newValues);
    if (nextNumber === total) {
      onAnswer(newValues);
    } else {
      setNextNumber(nextNumber + 1);
    }
  }

  return (
    <div>
      <p style={{ textAlign: 'center', marginBottom: '12px', color: 'var(--tg-theme-hint-color)' }}>
        {nextNumber} / {total}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: '6px',
          maxWidth: '320px',
          margin: '0 auto',
        }}
      >
        {grid.map((value, i) => (
          <button
            key={i}
            class="card"
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: size > 4 ? '18px' : '22px',
              fontWeight: 700,
              opacity: taps.has(i) ? 0.3 : 1,
              cursor: taps.has(i) ? 'default' : 'pointer',
            }}
            onClick={() => handleTap(value, i)}
            disabled={taps.has(i)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
