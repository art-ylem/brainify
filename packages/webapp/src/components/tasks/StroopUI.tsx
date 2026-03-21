import { useState } from 'preact/hooks';
import type { TaskUIProps } from '../../pages/TaskPlay.js';

interface StroopItem {
  word: string;
  color: string;
}

const COLOR_LABELS: Record<string, string> = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
  purple: '🟣',
  orange: '🟠',
};

/** Stroop — name the COLOR of the text, not the word */
export function StroopUI({ data, onAnswer }: TaskUIProps) {
  const items = data.items as StroopItem[];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const item = items[currentIdx];
  const allColors = Object.keys(COLOR_LABELS);

  function handleChoice(color: string) {
    const newAnswers = [...answers, color];
    setAnswers(newAnswers);

    if (currentIdx + 1 >= items.length) {
      onAnswer(newAnswers);
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <p style={{ marginBottom: '8px', color: 'var(--tg-theme-hint-color)' }}>
        {currentIdx + 1} / {items.length}
      </p>
      <div
        style={{
          fontSize: '36px',
          fontWeight: 700,
          color: item.color,
          marginBottom: '32px',
          textTransform: 'uppercase',
        }}
      >
        {item.word}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          maxWidth: '280px',
          margin: '0 auto',
        }}
      >
        {allColors.map((color) => (
          <button
            key={color}
            class="card"
            style={{
              padding: '12px',
              fontSize: '28px',
              cursor: 'pointer',
            }}
            onClick={() => handleChoice(color)}
          >
            {COLOR_LABELS[color]}
          </button>
        ))}
      </div>
    </div>
  );
}
