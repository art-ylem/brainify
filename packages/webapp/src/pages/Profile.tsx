import { useEffect, useState } from 'preact/hooks';
import { getAchievements, getProgress, getMe, type Achievement, type UserProfile } from '../api/client.js';

interface Props {
  t: (key: string) => string;
}

const ACHIEVEMENT_META: Record<string, { emoji: string; nameKey: string }> = {
  first_task: { emoji: '🎯', nameKey: 'achievements.first_task' },
  streak_3: { emoji: '🔥', nameKey: 'achievements.streak_3' },
  streak_7: { emoji: '🔥', nameKey: 'achievements.streak_7' },
  streak_30: { emoji: '🏆', nameKey: 'achievements.streak_30' },
  tasks_10: { emoji: '📝', nameKey: 'achievements.tasks_10' },
  tasks_100: { emoji: '💎', nameKey: 'achievements.tasks_100' },
  duel_winner: { emoji: '⚔️', nameKey: 'achievements.duel_winner' },
};

const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_META);

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'BrainifyBot';

function openBot(command: string) {
  window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/${BOT_USERNAME}?start=${command}`);
}

const FEATURES = [
  { labelKey: 'subscription.feature_tasks_limit', freeKey: 'subscription.feature_tasks_free', premiumKey: 'subscription.feature_tasks_premium' },
  { labelKey: 'subscription.feature_duels', freeKey: 'subscription.feature_no', premiumKey: 'subscription.feature_yes' },
  { labelKey: 'subscription.feature_stats', freeKey: 'subscription.feature_no', premiumKey: 'subscription.feature_yes' },
  { labelKey: 'subscription.feature_achievements', freeKey: 'subscription.feature_no', premiumKey: 'subscription.feature_yes' },
];

export function Profile({ t }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .catch((err) => {
        console.error('[Profile] load error:', err);
        setError(t('common.error'));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div class="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return (
      <div class="page">
        <div class="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--tg-theme-destructive-text-color)' }}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  const earnedSet = new Set(achievements.map((a) => a.type));
  const status = userProfile?.subscriptionStatus ?? 'free';
  const isPremium = status === 'active' || status === 'trial';

  return (
    <div class="page">
      <h1 class="page-title">👤 {t('profile.title')}</h1>

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
            {t('profile.record')}: {streak.longest}
          </div>
        </div>
      )}

      {/* Subscription */}
      <div class="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>💎 {t('subscription.title')}</h3>

        {/* Current plan badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: isPremium
            ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.10))'
            : 'var(--tg-theme-bg-color)',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '28px' }}>{status === 'active' ? '👑' : status === 'trial' ? '⏳' : '🆓'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>
              {t('subscription.current_plan')}: {
                status === 'active' ? t('subscription.premium_plan')
                  : status === 'trial' ? t('subscription.trial_plan')
                    : t('subscription.free_plan')
              }
            </div>
            {status === 'active' && (
              <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', marginTop: '2px' }}>
                {t('subscription.premium_active')}
              </div>
            )}
            {status === 'trial' && userProfile?.trialEndsAt && (
              <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', marginTop: '2px' }}>
                {t('subscription.trial_until')}: {new Date(userProfile.trialEndsAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Feature comparison table */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
            {t('subscription.features_comparison')}
          </div>
          <div style={{
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--tg-theme-hint-color)',
            opacity: 0.9,
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 70px 70px',
              background: 'var(--tg-theme-bg-color)',
              fontWeight: 600,
              fontSize: '12px',
              textTransform: 'uppercase',
              color: 'var(--tg-theme-hint-color)',
            }}>
              <div style={{ padding: '8px 10px' }}></div>
              <div style={{ padding: '8px 4px', textAlign: 'center' }}>{t('subscription.free_plan')}</div>
              <div style={{ padding: '8px 4px', textAlign: 'center' }}>{t('subscription.premium_plan')}</div>
            </div>
            {/* Feature rows */}
            {FEATURES.map((f, i) => (
              <div
                key={f.labelKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 70px',
                  fontSize: '13px',
                  background: i % 2 === 0 ? 'var(--tg-theme-secondary-bg-color)' : 'var(--tg-theme-bg-color)',
                }}
              >
                <div style={{ padding: '8px 10px' }}>{t(f.labelKey)}</div>
                <div style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>
                  {t(f.freeKey)}
                </div>
                <div style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600 }}>
                  {t(f.premiumKey)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing & payment — only if not premium */}
        {!isPremium && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                {t('subscription.pricing_title')}
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <div style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'var(--tg-theme-bg-color)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>⭐</div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{t('subscription.pricing_stars')}</div>
                </div>
                <div style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'var(--tg-theme-bg-color)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>💳</div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{t('subscription.pricing_rub')}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                class="btn btn-primary"
                onClick={() => openBot('subscribe_stars')}
              >
                {t('subscription.subscribe_stars')}
              </button>
              <button
                class="btn btn-primary"
                style={{ background: 'var(--tg-theme-text-color)', color: 'var(--tg-theme-bg-color)', opacity: 0.85 }}
                onClick={() => openBot('subscribe')}
              >
                {t('subscription.subscribe_card')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Achievements */}
      <div class="card">
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>🏅 {t('profile.achievements')}</h3>
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
                  <div style={{ fontWeight: earned ? 600 : 400, fontSize: '14px' }}>{t(meta.nameKey)}</div>
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
