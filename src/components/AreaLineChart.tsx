interface Props {
  data: { label: string; value: number; value2?: number }[];
  height?: number;
  series1Label?: string;
  series2Label?: string;
  series1Color?: string;
  series2Color?: string;
}

export default function AreaLineChart({
  data, height = 220,
  series1Label = '总收入',
  series2Label = '房东净收入',
  series1Color = '#0F3D2E',
  series2Color = '#C8A96B',
}: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-ink-700 bg-cream-800/40 rounded-lg border border-dashed border-gold-300">
        暂无数据
      </div>
    );
  }

  const w = 600;
  const h = height;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const iw = w - padding.left - padding.right;
  const ih = h - padding.top - padding.bottom;
  const max = Math.max(
    ...data.map(d => Math.max(d.value, d.value2 || 0)),
    1,
  ) * 1.15;

  const stepX = data.length > 1 ? iw / (data.length - 1) : 0;
  const scaleY = max > 0 ? ih / max : 1;

  const pt1 = data.map((d, i) => ({
    x: padding.left + stepX * i,
    y: padding.top + ih - d.value * scaleY,
  }));
  const pt2 = data.map((d, i) => ({
    x: padding.left + stepX * i,
    y: padding.top + ih - (d.value2 || 0) * scaleY,
  }));

  const pathFor = (pts: { x: number; y: number }[], smooth = true) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    if (!smooth) {
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
      return d;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const areaFor = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const line = pathFor(pts);
    const baseY = padding.top + ih;
    return `${line} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;
  };

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (max / yTicks) * i;
    const y = padding.top + ih - v * scaleY;
    return { v, y };
  });

  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toFixed(0);

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: series1Color }} />
          {series1Label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: series2Color }} />
          {series2Label}
        </span>
      </div>
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-auto" style={{ height }}>
          <defs>
            <linearGradient id="areaG1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series1Color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={series1Color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaG2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series2Color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={series2Color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padding.left} x2={w - padding.right} y1={t.y} y2={t.y}
                stroke="#E8E0CD" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={t.y + 3} textAnchor="end"
                fontSize="10" fill="#6D9978">¥{fmt(t.v)}</text>
            </g>
          ))}

          <path d={areaFor(pt1)} fill="url(#areaG1)" />
          <path d={pathFor(pt1)} fill="none" stroke={series1Color} strokeWidth="2" />

          {pt2.length > 0 && (
            <>
              <path d={areaFor(pt2)} fill="url(#areaG2)" />
              <path d={pathFor(pt2)} fill="none" stroke={series2Color} strokeWidth="2" />
            </>
          )}

          {pt1.map((p, i) => (
            <circle key={`d1-${i}`} cx={p.x} cy={p.y} r="3"
              fill="#fff" stroke={series1Color} strokeWidth="1.5" />
          ))}

          {data.map((d, i) => {
            const x = padding.left + stepX * i;
            return (
              <text key={`lx-${i}`} x={x} y={h - 10} textAnchor="middle"
                fontSize="10" fill="#4A7C59">{d.label}</text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
