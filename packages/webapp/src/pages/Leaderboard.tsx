import { useEffect, useState } from 'preact/hooks';
import { getLeaderboard, type LeaderboardEntry, type LeaderboardResponse } from '../api/client.js';

interface Props {
  t: (key: string) => string;
}

type LeaderboardType = 'global' | 'friends';
type Period = 'week' | 'month' | 'all';

export function Leaderboard({ t }: Props) {
  const [type, setType] = useState<LeaderboardType>('global');
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(type, period)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, period]);

  return (
    <div class="page">
      <h1 class="page-title">{t('leaderboard.title')}</h1>

      {/* Type tabs */}
      <div class="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          class={`tab ${type === 'global' ? 'tab-active' : ''}`}
          onClick={() => setType('global')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            background: type === 'global' ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
            color: type === 'global' ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🌍 {t('leaderboard.global')}
        </button>
        <button
          class={`tab ${type === 'friends' ? 'tab-active' : ''}`}
          onClick={() => setType('friends')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            background: type === 'friends' ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
            color: type === 'friends' ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          👥 {t('leaderboard.friends')}
        </button>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', justifyContent: 'center' }}>
        {(['week', 'month', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '4px 12px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13px',
              background: period === p ? 'var(--tg-theme-button-color)' : 'transparent',
              color: period === p ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
              cursor: 'pointer',
            }}
          >
            {t(`leaderboard.${p === 'all' ? 'all_time' : p}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div class="loading">{t('common.loading')}</div>
      ) : !data || data.entries.length === 0 ? (
        <div class="card" style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>
          —
        </div>
      ) : (
        <>
          <div class="card" style={{ padding: 0 }}>
            {data.entries.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}
          </div>

          {/* Current user position if not visible */}
          {data.currentUser && !data.entries.some((e) => e.isCurrentUser) && (
            <div class="card" style={{ marginTop: '12px', padding: 0 }}>
              <div style={{ padding: '6px 12px', color: 'var(--tg-theme-hint-color)', fontSize: '12px' }}>...</div>
              <LeaderboardRow entry={data.currentUser} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid var(--tg-theme-secondary-bg-color)',
        background: entry.isCurrentUser ? 'var(--tg-theme-secondary-bg-color)' : 'transparent',
      }}
    >
      <span style={{ width: '36px', fontWeight: 700, fontSize: '14px' }}>{rankEmoji}</span>
      <span style={{ flex: 1, fontWeight: entry.isCurrentUser ? 700 : 400 }}>
        {entry.firstName || entry.username || '—'}
      </span>
      <span style={{ fontWeight: 700, color: 'var(--tg-theme-button-color)' }}>
        {entry.totalScore}
      </span>
    </div>
  );
}
