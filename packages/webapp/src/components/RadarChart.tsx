interface Props {
  values: { [key: string]: number }; // 0-100 per axis
  labels: { [key: string]: string }; // axis key → display label
  size?: number;
}

const AXES = ['memory', 'attention', 'logic', 'speed'];
const AXIS_ANGLE_OFFSET = -Math.PI / 2; // Start from top

export function RadarChart({ values, labels, size = 200 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30;

  function getPoint(axisIndex: number, value: number): [number, number] {
    const angle = AXIS_ANGLE_OFFSET + (2 * Math.PI * axisIndex) / AXES.length;
    const r = (value / 100) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  // Data polygon points
  const dataPoints = AXES.map((axis, i) => getPoint(i, values[axis] ?? 0));
  const polygonStr = dataPoints.map((p) => p.join(',')).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', margin: '0 auto' }}
    >
      {/* Grid rings */}
      {rings.map((pct) => {
        const ringPoints = AXES.map((_, i) => getPoint(i, pct));
        return (
          <polygon
            key={pct}
            points={ringPoints.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke="var(--tg-theme-hint-color)"
            stroke-width="0.5"
            opacity="0.3"
          />
        );
      })}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const [ex, ey] = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={ex}
            y2={ey}
            stroke="var(--tg-theme-hint-color)"
            stroke-width="0.5"
            opacity="0.3"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonStr}
        fill="var(--tg-theme-button-color)"
        fill-opacity="0.25"
        stroke="var(--tg-theme-button-color)"
        stroke-width="2"
      >
        <animate
          attributeName="fill-opacity"
          from="0"
          to="0.25"
          dur="0.6s"
          fill="freeze"
        />
      </polygon>

      {/* Data points */}
      {dataPoints.map(([px, py], i) => (
        <circle
          key={i}
          cx={px}
          cy={py}
          r="4"
          fill="var(--tg-theme-button-color)"
        />
      ))}

      {/* Labels */}
      {AXES.map((axis, i) => {
        const [lx, ly] = getPoint(i, 120);
        return (
          <text
            key={axis}
            x={lx}
            y={ly}
            text-anchor="middle"
            dominant-baseline="middle"
            fill="var(--tg-theme-text-color)"
            font-size="11"
            font-weight="600"
          >
            {labels[axis] ?? axis}
          </text>
        );
      })}
    </svg>
  );
}
