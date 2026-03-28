interface Props {
  icon: string;
  name: string;
  rating: number; // 0-100
  trend: number;  // % change (positive = up, negative = down)
}

export function CategoryProgress({ icon, name, rating, trend }: Props) {
  const barWidth = Math.max(0, Math.min(100, rating));
  const trendStr = trend > 0 ? `↑ +${trend}%` : trend < 0 ? `↓ ${trend}%` : '—';
  const trendColor = trend > 0 ? '#34c759' : trend < 0 ? '#ff3b30' : 'var(--tg-theme-hint-color)';

  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-theme-secondary-bg-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px' }}>
          {icon} {name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--tg-theme-text-color)' }}>
            {rating}
          </span>
          <span style={{ fontSize: '12px', color: trendColor, fontWeight: 600 }}>
            {trendStr}
          </span>
        </div>
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
