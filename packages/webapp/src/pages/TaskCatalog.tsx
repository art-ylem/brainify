import { useEffect, useState } from 'preact/hooks';
import { getTasks, type TaskInfo } from '../api/client.js';
import { DifficultySelector } from '../components/DifficultySelector.js';
import { DailyChallengeCard } from '../components/DailyChallengeCard.js';

const CATEGORIES = ['memory', 'attention', 'logic', 'speed'] as const;
const CATEGORY_ICONS: Record<string, string> = {
  memory: '🧩',
  attention: '👁️',
  logic: '🔢',
  speed: '⚡',
};

interface Props {
  t: (key: string) => string;
  onSelect: (taskId: number, taskType: string, difficulty: number, isDailyChallenge?: boolean) => void;
  onStartTraining?: () => void;
  isGuest?: boolean;
}

export function TaskCatalog({ t, onSelect, onStartTraining, isGuest }: Props) {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskInfo | null>(null);
  const [difficulty, setDifficulty] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTasks(filter ?? undefined)
      .then(setTasks)
      .catch((err) => {
        console.error('[TaskCatalog] Failed to load tasks:', err);
        setError(err.message ?? 'Failed to load tasks');
        setTasks([]);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div class="page">
      <h1 class="page-title">Brainify 🧠</h1>

      {!isGuest && (
        <DailyChallengeCard t={t} onAccept={(taskId, taskType, difficulty) => onSelect(taskId, taskType, difficulty, true)} />
      )}

      {!isGuest && onStartTraining && (
        <button
          class="card"
          style={{
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            marginBottom: '16px',
            background: 'var(--tg-theme-secondary-bg-color)',
          }}
          onClick={onStartTraining}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🎯</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>
                {t('training.title')}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
                {t('training.start')}
              </div>
            </div>
          </div>
        </button>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        <button
          class={`card ${!filter ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            background: !filter ? 'var(--tg-theme-button-color)' : undefined,
            color: !filter ? 'var(--tg-theme-button-text-color)' : undefined,
          }}
          onClick={() => setFilter(null)}
        >
          {t('common.start')}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            class={`card ${filter === cat ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              background: filter === cat ? 'var(--tg-theme-button-color)' : undefined,
              color: filter === cat ? 'var(--tg-theme-button-text-color)' : undefined,
            }}
            onClick={() => setFilter(cat)}
          >
            {CATEGORY_ICONS[cat]} {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div class="loading">{t('common.loading')}</div>
      ) : error ? (
        <div class="loading" style={{ color: 'var(--tg-theme-destructive-text-color, #e53935)' }}>
          {t('common.error')}: {error}
        </div>
      ) : (
        <div>
          {tasks.map((task) => (
            <button
              key={task.id}
              class="task-card"
              data-category={task.category}
              onClick={() => {
                setSelectedTask(task);
                setDifficulty(task.recommendedDifficulty ?? 1);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span class="task-card__icon">
                  {CATEGORY_ICONS[task.category] ?? '🧠'}
                </span>
                <div style={{ flex: 1 }}>
                  <div class="task-card__title">
                    {t(`tasks.${task.type}.name`)}
                  </div>
                  <div class="task-card__description">
                    {t(`tasks.${task.type}.description`)}
                  </div>
                </div>
                <span class="task-card__category-badge" data-category={task.category}>
                  {t(`categories.${task.category}`)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTask(null);
          }}
        >
          <div
            style={{
              background: 'var(--tg-theme-bg-color)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 16px',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>{CATEGORY_ICONS[selectedTask.category] ?? '🧠'}</span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '8px' }}>
                {t(`tasks.${selectedTask.type}.name`)}
              </h2>
            </div>
            <DifficultySelector
              t={t}
              value={difficulty}
              onChange={setDifficulty}
              recommended={selectedTask.recommendedDifficulty}
            />
            <button
              class="btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => {
                onSelect(selectedTask.id, selectedTask.type, difficulty);
                setSelectedTask(null);
              }}
            >
              {t('difficulty.start')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
