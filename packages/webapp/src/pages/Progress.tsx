import { useEffect, useState } from 'preact/hooks';
import { getProgress, type ProgressData } from '../api/client.js';

interface Props {
  t: (key: string) => string;
}

const CATEGORY_ICONS: Record<string, string> = {
  memory: '🧩',
  attention: '👁️',
  logic: '🔢',
  speed: '⚡',
};

export function Progress({ t }: Props) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProgress()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (!data) {
    return <div class="loading">{t('common.error')}</div>;
  }

  const maxDailyScore = Math.max(...data.daily.map((d) => d.totalScore), 1);

  return (
    <div class="page">
      <h1 class="page-title">{t('progress.title')}</h1>

      {/* Streak */}
      <div class="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '32px', fontWeight: 700 }}>
          🔥 {data.streak.current}
        </div>
        <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>
          {t('progress.streak_days')}
        </div>
      </div>

      {/* Daily chart (simple bar chart) */}
      <div class="card">
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>{t('progress.daily')}</h3>
        {data.daily.length === 0 ? (
          <p style={{ color: 'var(--tg-theme-hint-color)', textAlign: 'center' }}>—</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {data.daily.slice(-14).map((day) => (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  background: 'var(--tg-theme-button-color)',
                  borderRadius: '4px 4px 0 0',
                  height: `${Math.max((day.totalScore / maxDailyScore) * 100, 4)}%`,
                  minHeight: '4px',
                  opacity: 0.8,
                }}
                title={`${day.date}: ${day.totalScore}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* By category */}
      <div class="card" style={{ marginTop: '12px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>{t('progress.by_category')}</h3>
        {data.byCategory.length === 0 ? (
          <p style={{ color: 'var(--tg-theme-hint-color)', textAlign: 'center' }}>—</p>
        ) : (
          data.byCategory.map((cat) => (
            <div
              key={cat.category}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--tg-theme-secondary-bg-color)',
              }}
            >
              <span>
                {CATEGORY_ICONS[cat.category] ?? ''} {t(`categories.${cat.category}`)}
              </span>
              <span style={{ fontWeight: 600 }}>
                {cat.count} · avg {Math.round(cat.avgTimeMs / 1000)}s
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
