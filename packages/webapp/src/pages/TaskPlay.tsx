import { useEffect, useState, useRef } from 'preact/hooks';
import { startTaskSession, submitAttempt, submitChallengerResult, submitOpponentResult, ApiError, type TaskSession, type AttemptResult } from '../api/client.js';
import { GuestLimitScreen } from '../components/GuestLimitScreen.js';
import { PaywallScreen } from '../components/PaywallScreen.js';
import type { AuthMode } from '../hooks/useAuthState.js';
import { SchulteUI } from '../components/tasks/SchulteUI.js';
import { SequenceMemoryUI } from '../components/tasks/SequenceMemoryUI.js';
import { ArithmeticUI } from '../components/tasks/ArithmeticUI.js';
import { StroopUI } from '../components/tasks/StroopUI.js';
import { NumberSeriesUI } from '../components/tasks/NumberSeriesUI.js';
import { MemoryPairsUI } from '../components/tasks/MemoryPairsUI.js';
import { PatternSearchUI } from '../components/tasks/PatternSearchUI.js';

interface Props {
  t: (key: string) => string;
  taskId: number;
  taskType: string;
  /** Pre-existing session for duel mode */
  duelSessionId?: number;
  duelTaskData?: Record<string, unknown>;
  duelId?: number;
  duelRole?: 'challenger' | 'opponent';
  isGuest?: boolean;
  mode?: AuthMode;
  onAuth?: (data: Record<string, unknown>) => void;
  onComplete: (result: AttemptResult) => void;
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

export interface TaskUIProps {
  data: Record<string, unknown>;
  onAnswer: (answer: unknown) => void;
  t: (key: string) => string;
}

export function TaskPlay({ t, taskId, taskType, duelSessionId, duelTaskData, duelId, duelRole, isGuest, mode, onAuth, onComplete, onBack }: Props) {
  const isDuel = duelSessionId != null && duelId != null && duelRole != null;
  const [session, setSession] = useState<TaskSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSession(null);

    if (isDuel && duelTaskData) {
      // Duel mode: use pre-existing session data
      setSession({
        sessionId: duelSessionId,
        type: taskType,
        category: '',
        difficulty: 1,
        data: duelTaskData,
        timeLimitMs: null,
      });
      startTimeRef.current = Date.now();
      setLoading(false);
    } else {
      // Normal mode: create new session
      startTaskSession(taskId)
        .then((s) => {
          setSession(s);
          startTimeRef.current = Date.now();
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 403) {
            setError('__limit__');
          } else {
            setError(err.message);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [taskId, duelSessionId, isGuest]);

  async function handleAnswer(answer: unknown) {
    if (!session || submitting) return;
    setSubmitting(true);

    const timeMs = Date.now() - startTimeRef.current;
    try {
      if (isDuel) {
        // Duel mode: submit via duel endpoint
        const submitFn = duelRole === 'challenger' ? submitChallengerResult : submitOpponentResult;
        const duelResult = await submitFn(duelId, session.sessionId, answer, timeMs);
        onComplete({
          id: 0,
          taskId,
          score: duelResult.yourScore ?? duelResult.score ?? 0,
          timeMs,
          difficulty: 1,
          isCorrect: duelResult.isCorrect,
          details: duelResult.details,
          completedAt: new Date().toISOString(),
        });
      } else {
        const result = await submitAttempt(session.sessionId, answer, timeMs);
        onComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (error) {
    if (error === '__limit__') {
      if (isGuest && onAuth) {
        return <GuestLimitScreen t={t} onAuth={onAuth} onBack={onBack} />;
      }
      return <PaywallScreen t={t} mode={mode} onBack={onBack} />;
    }
    return (
      <div class="page" style={{ textAlign: 'center', paddingTop: '40px' }}>
        <p>{t('common.error')}: {error}</p>
        <button class="btn-primary" style={{ marginTop: '16px', maxWidth: '200px', margin: '16px auto' }} onClick={onBack}>
          {t('common.back')}
        </button>
      </div>
    );
  }

  if (!session) return null;

  const TaskUI = TASK_COMPONENTS[taskType];
  if (!TaskUI) {
    return <div class="loading">Unsupported task type</div>;
  }

  return (
    <div class="page">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', fontSize: '16px', color: 'var(--tg-theme-link-color)' }}
        >
          ← {t('common.back')}
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 600 }}>
          {t(`tasks.${taskType}.name`)}
        </h2>
        <div style={{ width: '60px' }} />
      </div>
      {submitting ? (
        <div class="loading">{t('common.loading')}</div>
      ) : (
        <TaskUI data={session.data} onAnswer={handleAnswer} t={t} />
      )}
    </div>
  );
}
