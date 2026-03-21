import { useState } from 'preact/hooks';
import type { TaskUIProps } from '../../pages/TaskPlay.js';

/** Memory Pairs — flip cards and find matching pairs */
export function MemoryPairsUI({ data, onAnswer }: TaskUIProps) {
  const cards = data.cards as number[];
  const gridCols = data.gridCols as number;
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState<[number, number][]>([]);
  const [busy, setBusy] = useState(false);

  const totalPairs = cards.length / 2;

  function handleFlip(index: number) {
    if (busy || flipped.includes(index) || matched.has(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [i1, i2] = newFlipped;
      const newMoves: [number, number][] = [...moves, [i1, i2]];
      setMoves(newMoves);

      if (cards[i1] === cards[i2]) {
        const newMatched = new Set(matched);
        newMatched.add(i1);
        newMatched.add(i2);
        setMatched(newMatched);
        setFlipped([]);

        if (newMatched.size === cards.length) {
          onAnswer(newMoves);
        }
      } else {
        setBusy(true);
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 800);
      }
    }
  }

  return (
    <div>
      <p style={{ textAlign: 'center', marginBottom: '12px', color: 'var(--tg-theme-hint-color)' }}>
        {matched.size / 2} / {totalPairs}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: '6px',
          maxWidth: '320px',
          margin: '0 auto',
        }}
      >
        {cards.map((value, i) => {
          const isVisible = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              class="card"
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
                cursor: isVisible ? 'default' : 'pointer',
                background: matched.has(i)
                  ? 'var(--tg-theme-button-color)'
                  : isVisible
                    ? 'var(--tg-theme-secondary-bg-color)'
                    : undefined,
                color: matched.has(i)
                  ? 'var(--tg-theme-button-text-color)'
                  : undefined,
                transition: 'all 0.2s',
              }}
              onClick={() => handleFlip(i)}
              disabled={isVisible}
            >
              {isVisible ? value : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
