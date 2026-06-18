import type { SeasonTier, BillingSegment } from '@/types';
import { parseDate, formatDate, daysBetween, buildSeasonalDate } from '@/utils';

interface TierWithDate {
  tier: SeasonTier;
  date: Date;
  ymd: string;
}

const getTierForDate = (year: number, month: number, day: number, tiers: SeasonTier[]): SeasonTier | null => {
  const target = month * 100 + day;
  for (const t of tiers) {
    const s = t.startMonth * 100 + t.startDay;
    const e = t.endMonth * 100 + t.endDay;
    if (s <= e) {
      if (target >= s && target <= e) return t;
    } else {
      if (target >= s || target <= e) return t;
    }
  }
  return null;
};

export const computeBillingSegments = (
  startDate: string,
  endDate: string,
  tiers: SeasonTier[],
  rateMultiplier: number = 1,
): { segments: BillingSegment[]; baseRent: number; totalDays: number } => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const totalDays = daysBetween(startDate, endDate);

  const startY = start.getFullYear();
  const endY = end.getFullYear();

  const switchPoints: TierWithDate[] = [];

  for (let y = startY; y <= endY; y++) {
    for (const t of tiers) {
      const s = buildSeasonalDate(y, t.startMonth, t.startDay);
      const e = buildSeasonalDate(y, t.endMonth, t.endDay);
      if (s >= start && s <= end) {
        switchPoints.push({ tier: t, date: s, ymd: formatDate(s) });
      }
      const dayAfterE = new Date(e);
      dayAfterE.setDate(dayAfterE.getDate() + 1);
      if (dayAfterE >= start && dayAfterE <= end) {
        const nextTier = getTierForDate(y, dayAfterE.getMonth() + 1, dayAfterE.getDate(), tiers);
        if (nextTier) {
          switchPoints.push({ tier: nextTier, date: dayAfterE, ymd: formatDate(dayAfterE) });
        }
      }
    }
  }

  const allPoints = new Map<string, TierWithDate>();
  allPoints.set(startDate, {
    tier: getTierForDate(startY, start.getMonth() + 1, start.getDate(), tiers) ?? tiers[0],
    date: start,
    ymd: startDate,
  });
  for (const p of switchPoints) allPoints.set(p.ymd, p);

  const sorted = Array.from(allPoints.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const segments: BillingSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = i < sorted.length - 1 ? sorted[i + 1] : null;
    const segStart = cur.ymd;
    const segEnd = next ? formatDate(new Date(next.date.getTime() - 86400000)) : endDate;
    const d = daysBetween(segStart, segEnd);
    if (d > 0) {
      const rawPrice = cur.tier.dailyRate;
      const adjustedPrice = Number((rawPrice * rateMultiplier).toFixed(2));
      const amount = d * adjustedPrice;
      segments.push({
        tierId: cur.tier.id,
        tierName: cur.tier.name,
        tierColor: cur.tier.color,
        startDate: segStart,
        endDate: segEnd,
        days: d,
        unitPrice: adjustedPrice,
        amount,
      });
    }
  }

  const baseRent = segments.reduce((s, x) => s + x.amount, 0);
  return { segments, baseRent, totalDays };
};
