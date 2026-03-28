import { useEffect, useState } from 'preact/hooks';
import { getDailyChallenge, type DailyChallengeData } from '../api/client.js';

interface Props {
  t: (key: string) => string;
  onAccept: (taskId: number, taskType: string, difficulty: number) => void;
}

export function DailyChallengeCard({ t, onAccept }: Props) {
  const [challenge, setChallenge] = useState<DailyChallengeData | null>(null);

  useEffect(() => {
    getDailyChallenge()
      .then(setChallenge)
      .catch(() => {});
  }, []);

  if (!challenge) return null;

  return (
    <div
      class="card"
      style={{
        background: 'linear-gradient(135deg, var(--tg-theme-button-color), var(--tg-theme-link-color, #2481cc))',
        color: 'var(--tg-theme-button-text-color)',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            🏆 {t('challenge.daily_title')}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
            {t(`tasks.${challenge.taskType}.name`)} · {t(`difficulty.${challenge.difficulty}`)} · ×{challenge.bonusMultiplier}
          </div>
        </div>
        {challenge.completed ? (
          <span style={{ fontSize: '14px', fontWeight: 600 }}>✅ {t('challenge.completed')}</span>
        ) : (
          <button
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'inherit',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}
            onClick={() => onAccept(challenge.taskId, challenge.taskType, challenge.difficulty)}
          >
            {t('challenge.accept')}
          </button>
        )}
      </div>
    </div>
  );
}
