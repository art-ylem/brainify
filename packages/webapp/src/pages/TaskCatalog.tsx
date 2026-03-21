import { useEffect, useState } from 'preact/hooks';
import { getTasks, type TaskInfo } from '../api/client.js';

const CATEGORIES = ['memory', 'attention', 'logic', 'speed'] as const;
const CATEGORY_ICONS: Record<string, string> = {
  memory: '🧩',
  attention: '👁️',
  logic: '🔢',
  speed: '⚡',
};

interface Props {
  t: (key: string) => string;
  onSelect: (taskId: number, taskType: string) => void;
}

export function TaskCatalog({ t, onSelect }: Props) {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTasks(filter ?? undefined)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div class="page">
      <h1 class="page-title">Brainify 🧠</h1>

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
      ) : (
        <div>
          {tasks.map((task) => (
            <button
              key={task.id}
              class="card"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => onSelect(task.id, task.type)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>
                  {CATEGORY_ICONS[task.category] ?? '🧠'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>
                    {t(`tasks.${task.type}.name`)}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
                    {t(`tasks.${task.type}.description`)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
