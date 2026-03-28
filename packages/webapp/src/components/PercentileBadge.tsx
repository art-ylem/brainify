interface Props {
  percentile: number; // 0-100
  label: string;
}

export function PercentileBadge({ percentile, label }: Props) {
  const barWidth = Math.max(0, Math.min(100, percentile));

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
        fontSize: '13px',
      }}>
        <span style={{ color: 'var(--tg-theme-text-color)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--tg-theme-button-color)' }}>
          {percentile}%
        </span>
      </div>
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: 'var(--tg-theme-secondary-bg-color)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${barWidth}%`,
          borderRadius: '3px',
          background: 'var(--tg-theme-button-color)',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}
