interface Props {
  t: (key: string) => string;
  value: number;
  onChange: (difficulty: number) => void;
  recommended?: number;
}

const LEVELS = [1, 2, 3, 4, 5] as const;

export function DifficultySelector({ t, value, onChange, recommended }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
        {t('difficulty.title')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {LEVELS.map((level) => {
          const isSelected = value === level;
          const isRecommended = recommended === level;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: isSelected ? 600 : 400,
                background: isSelected
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: isSelected
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{t(`difficulty.${level}`)}</span>
              {isRecommended && (
                <span style={{ fontSize: '13px', opacity: 0.8 }}>
                  ⭐ {t('difficulty.recommended')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
