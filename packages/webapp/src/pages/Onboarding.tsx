import { useState, useRef } from 'preact/hooks';
import { submitAttempt, startOnboarding as startOnboardingApi, completeOnboarding as completeOnboardingApi, type AttemptResult } from '../api/client.js';
import { RadarChart } from '../components/RadarChart.js';
import type { TaskUIProps } from './TaskPlay.js';

import { SchulteUI } from '../components/tasks/SchulteUI.js';
import { SequenceMemoryUI } from '../components/tasks/SequenceMemoryUI.js';
import { ArithmeticUI } from '../components/tasks/ArithmeticUI.js';
import { StroopUI } from '../components/tasks/StroopUI.js';
import { NumberSeriesUI } from '../components/tasks/NumberSeriesUI.js';
import { MemoryPairsUI } from '../components/tasks/MemoryPairsUI.js';
import { PatternSearchUI } from '../components/tasks/PatternSearchUI.js';

interface OnboardingResult {
  categories: { memory: number; attention: number; logic: number; speed: number };
  overallRating: number;
  recommendation: string;
}

interface OnboardingSession {
  sessionId: number;
  taskId: number;
  type: string;
  category: string;
  difficulty: number;
  data: Record<string, unknown>;
  timeLimitMs: number | null;
}

interface Props {
  t: (key: string) => string;
  onComplete: () => void;
  onSkip: () => void;
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

type Phase = 'intro' | 'loading' | 'playing' | 'result' | 'error';

export function Onboarding({ t, onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(0);

  async function handleStart() {
    setPhase('loading');
    try {
      const data = await startOnboardingApi();
      setSessions(data.sessions);
      setPhase('playing');
      startTimeRef.current = Date.now();
    } catch {
      setError('Failed to start onboarding');
      setPhase('error');
    }
  }

  const handleAnswer = async (answer: unknown) => {
    if (submitting || sessions.length === 0) return;
    setSubmitting(true);

    const session = sessions[currentIndex];
    const timeMs = Date.now() - startTimeRef.current;

    try {
      const result = await submitAttempt(session.sessionId, answer, timeMs);
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex + 1 < sessions.length) {
        setCurrentIndex(currentIndex + 1);
        startTimeRef.current = Date.now();
      } else {
        await handleComplete();
      }
    } catch {
      setError('Error submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  async function handleComplete() {
    try {
      const data = await completeOnboardingApi();
      setOnboardingResult(data);
    } catch {
      // Even if this fails, proceed to result screen
    }
    setPhase('result');
  }

  if (phase === 'intro') {
    return (
      <div class="page text-center fade-in" style={{ paddingTop: '60px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧠</div>
        <h1 class="font-bold" style={{ fontSize: '24px', marginBottom: '8px' }}>
          {t('onboarding.title')}
        </h1>
        <p class="text-hint" style={{ fontSize: '15px', maxWidth: '280px', margin: '0 auto 32px' }}>
          {t('onboarding.description')}
        </p>
        <button class="btn-primary" style={{ maxWidth: '280px', margin: '0 auto 12px' }} onClick={handleStart}>
          {t('onboarding.start')}
        </button>
        <button
          class="btn-primary"
          style={{ maxWidth: '280px', margin: '0 auto', background: 'var(--brand-card)', color: 'var(--brand-text)' }}
          onClick={onSkip}
        >
          {t('onboarding.skip')}
        </button>
      </div>
    );
  }

  if (phase === 'loading') {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (phase === 'error') {
    return (
      <div class="page text-center" style={{ paddingTop: '60px' }}>
        <p>{error || t('common.error')}</p>
        <button class="btn-primary" style={{ marginTop: '16px', maxWidth: '280px' }} onClick={onSkip}>
          {t('onboarding.skip')}
        </button>
      </div>
    );
  }

  if (phase === 'result') {
    const categoryLabels: Record<string, string> = {};
    const categoryScores: Record<string, number> = {};
    for (const cat of ['memory', 'attention', 'logic', 'speed']) {
      categoryLabels[cat] = t(`categories.${cat}`);
      categoryScores[cat] = onboardingResult?.categories[cat as keyof typeof onboardingResult.categories] ?? 0;
    }

    return (
      <div class="page text-center fade-in" style={{ paddingTop: '32px' }}>
        <h1 class="font-bold" style={{ fontSize: '22px', marginBottom: '16px' }}>
          {t('onboarding.result_title')}
        </h1>

        <div class="card" style={{ marginBottom: '16px' }}>
          <RadarChart values={categoryScores} labels={categoryLabels} size={200} />
        </div>

        {onboardingResult && (
          <>
            <div class="card" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700 }}>{onboardingResult.overallRating}</div>
              <div class="text-hint" style={{ fontSize: '13px' }}>{t('cognitive.overall')}</div>
            </div>
            <div class="card" style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px' }}>{t(onboardingResult.recommendation)}</p>
            </div>
          </>
        )}

        <div class="card" style={{ marginBottom: '16px' }}>
          {sessions.map((s, i) => (
            <div
              key={s.sessionId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < sessions.length - 1 ? '1px solid var(--brand-border)' : 'none',
              }}
            >
              <span>{CATEGORY_ICONS[s.category] ?? ''} {t(`categories.${s.category}`)}</span>
              <span class="font-bold">{results[i]?.score ?? '—'}</span>
            </div>
          ))}
        </div>

        <button class="btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={onComplete}>
          {t('onboarding.continue')}
        </button>
      </div>
    );
  }

  // Playing phase
  const currentSession = sessions[currentIndex];
  if (!currentSession) return null;

  const TaskComponent = TASK_COMPONENTS[currentSession.type];
  if (!TaskComponent) {
    return <div class="page"><p>Unknown task type: {currentSession.type}</p></div>;
  }

  return (
    <div class="page">
      <div style={{ marginBottom: '16px' }}>
        <div class="flex" style={{
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px',
        }}>
          <span class="text-hint">{currentIndex + 1} / {sessions.length}</span>
          <span>{CATEGORY_ICONS[currentSession.category] ?? ''} {t(`categories.${currentSession.category}`)}</span>
        </div>
        <div style={{
          height: '4px',
          borderRadius: '2px',
          background: 'var(--brand-card)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(currentIndex / sessions.length) * 100}%`,
            borderRadius: '2px',
            background: 'var(--brand-primary)',
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
