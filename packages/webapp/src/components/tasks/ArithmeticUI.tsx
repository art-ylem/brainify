import { useState } from 'preact/hooks';
import type { TaskUIProps } from '../../pages/TaskPlay.js';

interface Problem {
  expression: string;
}

/** Arithmetic — solve problems one by one */
export function ArithmeticUI({ data, onAnswer, t }: TaskUIProps) {
  const problems = data.problems as Problem[];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<number[]>([]);

  const problem = problems[currentIdx];

  function handleSubmit() {
    const num = Number(input);
    if (!Number.isFinite(num)) return;

    const newAnswers = [...answers, num];
    setAnswers(newAnswers);

    if (currentIdx + 1 >= problems.length) {
      onAnswer(newAnswers);
    } else {
      setCurrentIdx(currentIdx + 1);
      setInput('');
    }
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <p style={{ marginBottom: '8px', color: 'var(--tg-theme-hint-color)' }}>
        {currentIdx + 1} / {problems.length}
      </p>
      <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '24px' }}>
        {problem.expression} = ?
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={input}
        onInput={(e) => setInput((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
          {currentIdx + 1 < problems.length ? t('common.next') : t('common.ready')}
        </button>
      </div>
    </div>
  );
}
