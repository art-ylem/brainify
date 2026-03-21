import { useState } from 'preact/hooks';
import { useAuth } from './hooks/useAuth.js';
import { useI18n } from './hooks/useI18n.js';
import { TaskCatalog } from './pages/TaskCatalog.js';
import { TaskPlay } from './pages/TaskPlay.js';
import { TaskResult } from './pages/TaskResult.js';
import { Progress } from './pages/Progress.js';
import { Leaderboard } from './pages/Leaderboard.js';
import { Duels } from './pages/Duels.js';
import { Profile } from './pages/Profile.js';
import { NavBar } from './components/NavBar.js';
import type { AttemptResult } from './api/client.js';

type Page = 'catalog' | 'play' | 'result' | 'progress' | 'leaderboard' | 'duels' | 'profile';

interface PlayState {
  taskId: number;
  taskType: string;
  duelSessionId?: number;
  duelTaskData?: Record<string, unknown>;
  duelId?: number;
  duelRole?: 'challenger' | 'opponent';
}

export function App() {
  const { user: _user, loading, error } = useAuth();
  const { t, locale: _locale, setLocale: _setLocale } = useI18n();
  const [page, setPage] = useState<Page>('catalog');
  const [playState, setPlayState] = useState<PlayState | null>(null);
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null);

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div class="loading">{t('common.error')}</div>;
  }

  function handleSelectTask(taskId: number, taskType: string) {
    setPlayState({ taskId, taskType });
    setPage('play');
  }

  function handleTaskComplete(result: AttemptResult) {
    setLastResult(result);
    setPage('result');
  }

  function handleBackToCatalog() {
    setPlayState(null);
    setLastResult(null);
    setPage('catalog');
  }

  function handleRetry() {
    if (playState) {
      setLastResult(null);
      setPage('play');
    }
  }

  return (
    <>
      {page === 'catalog' && (
        <TaskCatalog t={t} onSelect={handleSelectTask} />
      )}
      {page === 'play' && playState && (
        <TaskPlay
          t={t}
          taskId={playState.taskId}
          taskType={playState.taskType}
          duelSessionId={playState.duelSessionId}
          duelTaskData={playState.duelTaskData}
          duelId={playState.duelId}
          duelRole={playState.duelRole}
          onComplete={handleTaskComplete}
          onBack={handleBackToCatalog}
        />
      )}
      {page === 'result' && lastResult && (
        <TaskResult
          t={t}
          result={lastResult}
          onRetry={handleRetry}
          onBack={handleBackToCatalog}
        />
      )}
      {page === 'progress' && (
        <Progress t={t} />
      )}
      {page === 'leaderboard' && (
        <Leaderboard t={t} />
      )}
      {page === 'duels' && (
        <Duels
          t={t}
          onPlayDuel={(duelId, sessionId, taskType, taskData, role) => {
            setPlayState({
              taskId: 0,
              taskType,
              duelSessionId: sessionId,
              duelTaskData: taskData,
              duelId,
              duelRole: role,
            });
            setPage('play');
          }}
        />
      )}
      {page === 'profile' && (
        <Profile t={t} />
      )}
      <NavBar
        t={t}
        active={page === 'progress' ? 'progress' : page === 'leaderboard' ? 'leaderboard' : page === 'duels' ? 'duels' : page === 'profile' ? 'profile' : 'catalog'}
        onNav={(p) => {
          if (p === 'catalog') handleBackToCatalog();
          else setPage(p as Page);
        }}
      />
    </>
  );
}
