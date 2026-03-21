interface Props {
  streak: number;
  label: string;
}

export function StreakBadge({ streak, label }: Props) {
  if (streak <= 0) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: '16px',
        padding: '4px 10px',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      <span>🔥</span>
      <span>{streak}</span>
      <span style={{ color: 'var(--tg-theme-hint-color)', fontWeight: 400 }}>{label}</span>
    </div>
  );
}
