import { useEffect, useState } from 'preact/hooks';
import { getAchievements, getProgress, getMe, type Achievement, type UserProfile } from '../api/client.js';

interface Props {
  t: (key: string) => string;
}

const ACHIEVEMENT_META: Record<string, { emoji: string; name: string }> = {
  first_task: { emoji: '🎯', name: 'Первое задание' },
  streak_3: { emoji: '🔥', name: '3 дня подряд' },
  streak_7: { emoji: '🔥', name: '7 дней подряд' },
  streak_30: { emoji: '🏆', name: '30 дней подряд' },
  tasks_10: { emoji: '📝', name: '10 заданий' },
  tasks_100: { emoji: '💎', name: '100 заданий' },
  duel_winner: { emoji: '⚔️', name: 'Первая победа в дуэли' },
};

const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_META);

export function Profile({ t }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAchievements(), getProgress(), getMe()])
      .then(([achData, progData, profile]) => {
        setAchievements(achData);
        setStreak({
          current: progData.streak.current,
          longest: progData.streak.longest,
        });
        setUserProfile(profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  const earnedSet = new Set(achievements.map((a) => a.type));

  return (
    <div class="page">
      <h1 class="page-title">👤 Профиль</h1>

      {/* Streak */}
      {streak && (
        <div class="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>
            🔥 {streak.current}
          </div>
          <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>
            {t('progress.streak_days')}
          </div>
          <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '12px', marginTop: '4px' }}>
            Рекорд: {streak.longest}
          </div>
        </div>
      )}

      {/* Subscription */}
      {userProfile && (
        <div class="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>💎 Подписка</h3>
          {userProfile.subscriptionStatus === 'active' && (
            <div style={{ color: 'var(--tg-theme-text-color)' }}>
              <span style={{ fontWeight: 600 }}>Premium активна</span>
            </div>
          )}
          {userProfile.subscriptionStatus === 'trial' && (
            <div>
              <div style={{ fontWeight: 600 }}>Пробный период</div>
              {userProfile.trialEndsAt && (
                <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', marginTop: '4px' }}>
                  До {new Date(userProfile.trialEndsAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
          {userProfile.subscriptionStatus === 'free' && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>Бесплатный тариф</div>
              <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', marginBottom: '12px' }}>
                3 задания в день. Оформите Premium для полного доступа.
              </div>
              <button
                class="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/${import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot'}?start=subscribe`);
                }}
              >
                Оформить Premium
              </button>
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      <div class="card">
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>🏅 Достижения</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ALL_ACHIEVEMENTS.map((type) => {
            const meta = ACHIEVEMENT_META[type];
            const earned = earnedSet.has(type);
            return (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px',
                  borderRadius: '8px',
                  background: earned ? 'var(--tg-theme-secondary-bg-color)' : 'transparent',
                  opacity: earned ? 1 : 0.4,
                }}
              >
                <span style={{ fontSize: '24px' }}>{meta.emoji}</span>
                <div>
                  <div style={{ fontWeight: earned ? 600 : 400, fontSize: '14px' }}>{meta.name}</div>
                  {earned && (
                    <div style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
                      {new Date(achievements.find((a) => a.type === type)!.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {earned && <span style={{ marginLeft: 'auto', fontSize: '16px' }}>✅</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
