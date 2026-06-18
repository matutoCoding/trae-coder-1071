import { formatMoney, formatPercent } from '@/utils';

interface Slice {
  label: string;
  value: number;
  color: string;
  percentage?: number;
  subLabel?: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChart({ slices, size = 220, centerLabel, centerValue }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = size * 0.38;
  const stroke = size * 0.12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#F5F1E8"
            strokeWidth={stroke}
          />
          {slices.map((s, i) => {
            const pct = total > 0 ? s.value / total : 0;
            const dash = circumference * pct;
            const gap = circumference - dash;
            const el = (
              <circle
                key={i}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel && <div className="text-xs text-ink-700 uppercase tracking-wide">{centerLabel}</div>}
          {centerValue && (
            <div className="mt-1 font-serif font-bold text-2xl text-ink-900 gold-text">{centerValue}</div>
          )}
          {!centerValue && total > 0 && (
            <div className="mt-1 font-serif font-bold text-2xl text-ink-900 gold-text">{formatMoney(total)}</div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full space-y-2 min-w-0">
        {slices.map((s, i) => {
          const pct = total > 0 ? s.value / total : 0;
          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-white border border-gold-200 flex items-center gap-3"
            >
              <span className="w-4 h-4 rounded-md flex-shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink-900 text-sm">{s.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-ink-500/10 text-ink-700">
                    {s.percentage !== undefined ? formatPercent(s.percentage) : formatPercent(pct)}
                  </span>
                </div>
                {s.subLabel && <div className="mt-0.5 text-xs text-ink-700 truncate">{s.subLabel}</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-ink-900">{formatMoney(s.value)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
