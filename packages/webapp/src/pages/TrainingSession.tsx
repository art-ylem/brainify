import { useState, useRef, useEffect } from 'preact/hooks';
import {
  startTrainingSession,
  getTrainingSummary,
  submitAttempt,
  type TrainingSessionData,
  type TrainingSummary,
  type AttemptResult,
} from '../api/client.js';
import { RadarChart } from '../components/RadarChart.js';
import type { TaskUIProps } from './TaskPlay.js';

import { SchulteUI } from '../components/tasks/SchulteUI.js';
import { SequenceMemoryUI } from '../components/tasks/SequenceMemoryUI.js';
import { ArithmeticUI } from '../components/tasks/ArithmeticUI.js';
import { StroopUI } from '../components/tasks/StroopUI.js';
import { NumberSeriesUI } from '../components/tasks/NumberSeriesUI.js';
import { MemoryPairsUI } from '../components/tasks/MemoryPairsUI.js';
import { PatternSearchUI } from '../components/tasks/PatternSearchUI.js';

interface Props {
  t: (key: string) => string;
  onBack: () => void;
}

const TASK_COMPONENTS: Record<string, (props: TaskUIProps) => preact.JSX.Element> = {
  schulte: SchulteUI,
  sequence_memory: SequenceMemoryUI,
  arithmetic: ArithmeticUI,
  stroop: StroopUI,
  number_series: NumberSeriesUI,
  memory_pairs: MemoryPairsUI,
  pattern_search: PatternSearchUI,
};

const CATEGORY_ICONS: Record<string, string> = {
  memory: '🧩',
  attention: '👁️',
  logic: '🔢',
  speed: '⚡',
};

type Phase = 'loading' | 'playing' | 'summary' | 'error';

export function TrainingSession({ t, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [training, setTraining] = useState<TrainingSessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(0);

  // Start training on mount
  useEffect(() => {
    startTrainingSession()
      .then((data) => {
        setTraining(data);
        setPhase('playing');
        startTimeRef.current = Date.now();
      })
      .catch((err) => {
        setError(err.message || 'Failed to start training');
        setPhase('error');
      });
  }, []);

  const handleAnswer = async (answer: unknown) => {
    if (!training || submitting) return;
    setSubmitting(true);

    const session = training.sessions[currentIndex];
    const timeMs = Date.now() - startTimeRef.current;

    try {
      const result = await submitAttempt(session.sessionId, answer, timeMs);
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex + 1 < training.sessions.length) {
        // Move to next task
        setCurrentIndex(currentIndex + 1);
        startTimeRef.current = Date.now();
      } else {
        // All done — fetch summary
        try {
          const sum = await getTrainingSummary(training.trainingId);
          setSummary(sum);
        } catch {
          // Build summary from local results
        }
        setPhase('summary');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting answer';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (phase === 'error') {
    return (
      <div class="page">
        <div class="card" style={{ textAlign: 'center', padding: '24px' }}>
          <p>{error || t('common.error')}</p>
          <button class="btn-primary" onClick={onBack} style={{ marginTop: '16px' }}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const categoryScores: Record<string, number> = {};
    if (training) {
      for (let i = 0; i < training.sessions.length; i++) {
        const cat = training.sessions[i].category;
        categoryScores[cat] = results[i]?.score ?? 0;
      }
    }

    const categoryLabels: Record<string, string> = {};
    for (const cat of ['memory', 'attention', 'logic', 'speed']) {
      categoryLabels[cat] = t(`categories.${cat}`);
    }

    return (
      <div class="page">
        <h1 class="page-title">{t('training.summary')}</h1>

        <div class="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
            {totalScore}
          </div>
          <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>
            {t('training.total_score')}
          </div>
        </div>

        <div class="card" style={{ marginBottom: '16px' }}>
          <RadarChart values={categoryScores} labels={categoryLabels} size={200} />
        </div>

        {training && (
          <div class="card" style={{ marginBottom: '16px' }}>
            {training.sessions.map((s, i) => (
              <div
                key={s.sessionId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: i < training.sessions.length - 1 ? '1px solid var(--tg-theme-secondary-bg-color)' : 'none',
                }}
              >
                <span>
                  {CATEGORY_ICONS[s.category] ?? ''} {t(`categories.${s.category}`)}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {results[i]?.score ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          class="btn-primary"
          onClick={onBack}
          style={{ width: '100%' }}
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  // Playing phase
  if (!training) return null;
  const currentSession = training.sessions[currentIndex];
  const TaskComponent = TASK_COMPONENTS[currentSession.type];

  if (!TaskComponent) {
    return (
      <div class="page">
        <p>Unknown task type: {currentSession.type}</p>
      </div>
    );
  }

  return (
    <div class="page">
      {/* Progress bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px',
          color: 'var(--tg-theme-hint-color)',
        }}>
          <span>{t('training.step')} {currentIndex + 1} / {training.sessions.length}</span>
          <span>{CATEGORY_ICONS[currentSession.category] ?? ''} {t(`categories.${currentSession.category}`)}</span>
        </div>
        <div style={{
          height: '4px',
          borderRadius: '2px',
          background: 'var(--tg-theme-secondary-bg-color)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${((currentIndex) / training.sessions.length) * 100}%`,
            borderRadius: '2px',
            background: 'var(--tg-theme-button-color)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {submitting ? (
        <div class="loading">{t('common.loading')}</div>
      ) : (
        <TaskComponent
          data={currentSession.data}
          onAnswer={handleAnswer}
          t={t}
        />
      )}
    </div>
  );
}
