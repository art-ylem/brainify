interface NavBarProps {
  t: (key: string) => string;
  active: 'catalog' | 'progress' | 'leaderboard' | 'duels' | 'profile';
  onNav: (page: string) => void;
  isGuest?: boolean;
}

export function NavBar({ t, active, onNav, isGuest }: NavBarProps) {
  return (
    <nav class="nav-bar">
      <button
        class={`nav-item ${active === 'catalog' ? 'active' : ''}`}
        onClick={() => onNav('catalog')}
      >
        <span class="nav-icon">🧠</span>
        <span>{t('common.start')}</span>
      </button>
      {!isGuest && (
        <>
          <button
            class={`nav-item ${active === 'leaderboard' ? 'active' : ''}`}
            onClick={() => onNav('leaderboard')}
          >
            <span class="nav-icon">🏆</span>
            <span>{t('leaderboard.title')}</span>
          </button>
          <button
            class={`nav-item ${active === 'duels' ? 'active' : ''}`}
            onClick={() => onNav('duels')}
          >
            <span class="nav-icon">⚔️</span>
            <span>{t('duel.challenge')}</span>
          </button>
          <button
            class={`nav-item ${active === 'progress' ? 'active' : ''}`}
            onClick={() => onNav('progress')}
          >
            <span class="nav-icon">📊</span>
            <span>{t('progress.title')}</span>
          </button>
          <button
            class={`nav-item ${active === 'profile' ? 'active' : ''}`}
            onClick={() => onNav('profile')}
          >
            <span class="nav-icon">👤</span>
            <span>{t('profile.title')}</span>
          </button>
        </>
      )}
    </nav>
  );
}
