import type { BillingSegment } from '@/types';
import { formatDateShort, formatMoney } from '@/utils';

interface Props {
  segments: BillingSegment[];
  totalRent: number;
  compact?: boolean;
}

export default function SegmentBar({ segments, totalRent, compact }: Props) {
  if (segments.length === 0) {
    return <div className="h-8 rounded-md bg-gold-100 border border-dashed border-gold-300 flex items-center justify-center text-xs text-ink-700">暂无分段数据</div>;
  }

  return (
    <div className="w-full">
      <div className="h-10 md:h-12 rounded-lg overflow-hidden flex shadow-inner bg-cream-800 border border-gold-200">
        {segments.map((s, i) => {
          const pct = totalRent > 0 ? (s.amount / totalRent) * 100 : 0;
          if (pct < 1 && segments.length > 1) return null;
          return (
            <div
              key={i}
              className="relative h-full flex items-center justify-center text-white text-[11px] font-semibold whitespace-nowrap overflow-hidden"
              style={{ width: `${pct}%`, backgroundColor: s.tierColor }}
              title={`${s.tierName} · ${s.days}天 · ${formatMoney(s.amount)}`}
            >
              {pct >= 12 && !compact && (
                <span className="px-2 text-shadow">{s.tierName} · {s.days}天</span>
              )}
              {pct >= 8 && pct < 12 && !compact && (
                <span className="px-1">{s.tierName}</span>
              )}
              {pct < 8 && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {segments.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gold-200"
            >
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.tierColor }} />
              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900">{s.tierName}</span>
                  <span className="text-ink-700">{s.days} 天</span>
                </div>
                <div className="mt-0.5 text-ink-700 truncate">
                  {formatDateShort(s.startDate)} ~ {formatDateShort(s.endDate)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-ink-700">{formatMoneyPlain(s.unitPrice)}/天</div>
                <div className="text-sm font-semibold text-ink-900">{formatMoney(s.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatMoneyPlain(n: number): string {
  return n.toFixed(0);
}
