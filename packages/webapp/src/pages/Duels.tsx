import { useEffect, useState } from 'preact/hooks';
import { getDuels, acceptDuel, type DuelInfo } from '../api/client.js';

interface Props {
  t: (key: string) => string;
  onPlayDuel: (duelId: number, sessionId: number, taskType: string, taskData: Record<string, unknown>, role: 'challenger' | 'opponent') => void;
}

export function Duels({ t, onPlayDuel }: Props) {
  const [duels, setDuels] = useState<DuelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDuels()
      .then((res) => setDuels(res.duels))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAccept(duel: DuelInfo) {
    try {
      const res = await acceptDuel(duel.id);
      onPlayDuel(res.duelId, res.sessionId, res.task.type, res.task.data, 'opponent');
    } catch {
      // error handling
    }
  }

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  const incoming = duels.filter((d) => d.role === 'opponent' && d.status === 'pending');
  const outgoing = duels.filter((d) => d.role === 'challenger' && d.status === 'pending');
  const completed = duels.filter((d) => d.status === 'completed');

  return (
    <div class="page">
      <h1 class="page-title">⚔️ {t('duel.challenge')}</h1>

      {/* Incoming challenges */}
      {incoming.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>
            📨 Входящие
          </h3>
          {incoming.map((duel) => (
            <div key={duel.id} class="card" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {duel.opponent.firstName || duel.opponent.username || '—'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
                  {duel.task?.name ?? '—'}
                </div>
              </div>
              <button
                class="btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => handleAccept(duel)}
              >
                {t('duel.accept')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Outgoing (waiting) */}
      {outgoing.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>
            📤 Исходящие
          </h3>
          {outgoing.map((duel) => (
            <div key={duel.id} class="card" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {duel.opponent.firstName || duel.opponent.username || '—'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
                  {duel.task?.name ?? '—'}
                </div>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
                {t('duel.waiting')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>
            ✅ Завершённые
          </h3>
          {completed.map((duel) => {
            const myScore = duel.role === 'challenger' ? duel.challengerScore : duel.opponentScore;
            const theirScore = duel.role === 'challenger' ? duel.opponentScore : duel.challengerScore;
            const won = (myScore ?? 0) > (theirScore ?? 0);
            const draw = myScore === theirScore;

            return (
              <div key={duel.id} class="card" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {duel.opponent.firstName || duel.opponent.username || '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
                    {duel.task?.name ?? '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: draw ? 'var(--tg-theme-hint-color)' : won ? '#4CAF50' : '#F44336' }}>
                    {draw ? '🤝' : won ? '🎉' : '😔'}
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    {myScore ?? 0} : {theirScore ?? 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {duels.length === 0 && (
        <div class="card" style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>
          Нет дуэлей
        </div>
      )}
    </div>
  );
}
