import { useEffect, useState } from 'preact/hooks';
import { getProgress, getCognitiveProfile, type ProgressData, type CognitiveProfileData } from '../api/client.js';
import { RadarChart } from '../components/RadarChart.js';
import { PercentileBadge } from '../components/PercentileBadge.js';
import { CategoryProgress } from '../components/CategoryProgress.js';

interface Props {
  t: (key: string) => string;
  isGuest?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  memory: '🧩',
  attention: '👁️',
  logic: '🔢',
  speed: '⚡',
};

const CATEGORIES = ['memory', 'attention', 'logic', 'speed'] as const;

export function Progress({ t, isGuest }: Props) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [cognitive, setCognitive] = useState<CognitiveProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises: Promise<void>[] = [
      getProgress()
        .then(setData)
        .catch(() => {}),
    ];

    if (!isGuest) {
      promises.push(
        getCognitiveProfile()
          .then(setCognitive)
          .catch(() => {}),
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [isGuest]);

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (!data) {
    return <div class="loading">{t('common.error')}</div>;
  }

  const maxDailyScore = Math.max(...data.daily.map((d) => d.totalScore), 1);
  const categoryLabels: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    categoryLabels[cat] = t(`categories.${cat}`);
  }

  const hasCognitiveData = cognitive && cognitive.totalAttempts > 0;

  return (
    <div class="page">
      <h1 class="page-title">{t('progress.title')}</h1>

      {/* Cognitive Profile - Radar Chart */}
      {!isGuest && (
        <div class="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>{t('cognitive.title')}</h3>
          {hasCognitiveData ? (
            <>
              <RadarChart
                values={{ ...cognitive.categories }}
                labels={categoryLabels}
                size={220}
              />
              <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 700 }}>
                {cognitive.overallRating}
              </div>
              <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px' }}>
                {t('cognitive.overall')}
              </div>
              <div style={{
                marginTop: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'var(--tg-theme-secondary-bg-color)',
                fontSize: '13px',
                color: 'var(--tg-theme-text-color)',
              }}>
                {t(cognitive.recommendation)}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>
              {t('cognitive.not_enough_data')}
            </p>
          )}
        </div>
      )}

      {/* Category Ratings with Trends */}
      {!isGuest && hasCognitiveData && (
        <div class="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>{t('progress.by_category')}</h3>
          {CATEGORIES.map((cat) => (
            <CategoryProgress
              key={cat}
              icon={CATEGORY_ICONS[cat] ?? ''}
              name={t(`categories.${cat}`)}
              rating={cognitive.categories[cat]}
              trend={data.weeklyTrend?.[cat] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Percentiles */}
      {!isGuest && hasCognitiveData && (
        <div class="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>{t('cognitive.percentile')}</h3>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '12px' }}>
            {t('cognitive.percentile_text')}
          </p>
          {CATEGORIES.map((cat) => (
            <PercentileBadge
              key={cat}
              percentile={cognitive.percentiles[cat]}
              label={`${CATEGORY_ICONS[cat] ?? ''} ${t(`categories.${cat}`)}`}
            />
          ))}
        </div>
      )}

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

      {/* By category (legacy view for guests or fallback) */}
      {(isGuest || !hasCognitiveData) && (
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
      )}
    </div>
  );
}
