import type { SeasonTier, Landlord, SplitRule, Property, Bill, Settlement } from '@/types';
import { computeBillingSegments } from '@/utils/billingEngine';
import { computeSplit, utilityDefaults, computeUtility } from '@/utils/splitCalculator';
import { formatDate, uid, getYearMonth, addDays, currentPeriod } from '@/utils';

export const defaultSeasonTiers: SeasonTier[] = [
  {
    id: 'tier_peak',
    name: '旺季',
    color: '#E07A5F',
    startMonth: 6, startDay: 1,
    endMonth: 8, endDay: 31,
    dailyRate: 180, monthlyRate: 4800,
  },
  {
    id: 'tier_flat',
    name: '平季',
    color: '#4A7C59',
    startMonth: 3, startDay: 1,
    endMonth: 5, endDay: 31,
    dailyRate: 140, monthlyRate: 3800,
  },
  {
    id: 'tier_flat2',
    name: '平季',
    color: '#4A7C59',
    startMonth: 9, startDay: 1,
    endMonth: 11, endDay: 30,
    dailyRate: 140, monthlyRate: 3800,
  },
  {
    id: 'tier_off',
    name: '淡季',
    color: '#6D9978',
    startMonth: 12, startDay: 1,
    endMonth: 2, endDay: 29,
    dailyRate: 100, monthlyRate: 2800,
  },
];

export const defaultLandlords: Landlord[] = [
  { id: 'l1', name: '张建国', phone: '138-0000-1234', bankAccount: '招商银行 6225 **** 1234' },
  { id: 'l2', name: '李秀英', phone: '139-0000-5678', bankAccount: '工商银行 6222 **** 5678' },
  { id: 'l3', name: '王海涛', phone: '137-0000-9012', bankAccount: '建设银行 6217 **** 9012' },
  { id: 'l4', name: '陈美玲', phone: '136-0000-3456', bankAccount: '农业银行 6228 **** 3456' },
];

export const defaultSplitRules: SplitRule[] = [
  { id: 'sr_standard', name: '标准分账', platformCut: 0.10, propertyFee: 0.05, landlordCut: 0.85 },
  { id: 'sr_vip', name: 'VIP房东分账', platformCut: 0.08, propertyFee: 0.03, landlordCut: 0.89 },
];

export const defaultProperties: Property[] = [
  { id: 'p1', name: '春风里 A-1203', code: 'CF-A-1203', type: '一居室', area: 45, landlordId: 'l1', rateTierId: 'tier_peak', splitRuleId: 'sr_standard', status: 'rented' },
  { id: 'p2', name: '春风里 B-0805', code: 'CF-B-0805', type: '两居室', area: 68, landlordId: 'l1', rateTierId: 'tier_peak', splitRuleId: 'sr_standard', status: 'rented' },
  { id: 'p3', name: '夏荷苑 C-1502', code: 'XH-C-1502', type: '两居室', area: 72, landlordId: 'l2', rateTierId: 'tier_peak', splitRuleId: 'sr_vip', status: 'rented' },
  { id: 'p4', name: '夏荷苑 D-2201', code: 'XH-D-2201', type: '三居室', area: 98, landlordId: 'l2', rateTierId: 'tier_peak', splitRuleId: 'sr_vip', status: 'rented' },
  { id: 'p5', name: '秋月阁 E-0607', code: 'QY-E-0607', type: '一居室', area: 42, landlordId: 'l3', rateTierId: 'tier_peak', splitRuleId: 'sr_standard', status: 'rented' },
  { id: 'p6', name: '秋月阁 E-0908', code: 'QY-E-0908', type: '两居室', area: 65, landlordId: 'l3', rateTierId: 'tier_peak', splitRuleId: 'sr_standard', status: 'vacant' },
  { id: 'p7', name: '冬阳里 F-1806', code: 'DY-F-1806', type: '三居室', area: 105, landlordId: 'l4', rateTierId: 'tier_peak', splitRuleId: 'sr_vip', status: 'rented' },
  { id: 'p8', name: '冬阳里 F-2003', code: 'DY-F-2003', type: '一居室', area: 48, landlordId: 'l4', rateTierId: 'tier_peak', splitRuleId: 'sr_standard', status: 'rented' },
];

const makeHistoricalBills = (): Bill[] => {
  const today = new Date();
  const bills: Bill[] = [];
  const tenants = ['刘先生', '周女士', '赵先生', '吴女士', '郑先生', '孙女士', '钱先生', '冯女士'];

  defaultProperties.filter(p => p.status === 'rented').forEach((prop, pi) => {
    for (let mo = 2; mo >= 0; mo--) {
      const d = new Date(today.getFullYear(), today.getMonth() - mo, 1);
      const start = formatDate(d);
      const endDate = new Date(today.getFullYear(), today.getMonth() - mo + 1, 0);
      const end = formatDate(endDate);

      const { segments, baseRent, totalDays } = computeBillingSegments(start, end, defaultSeasonTiers);
      const utils = utilityDefaults();
      utils.water = computeUtility({ type: 'water', previous: 80 + pi * 5 + mo * 10, current: 120 + pi * 5 + mo * 10, unitPrice: 5.5 });
      utils.electric = computeUtility({ type: 'electric', previous: 800 + pi * 30 + mo * 80, current: 1100 + pi * 30 + mo * 80, unitPrice: 0.85 });
      utils.commonArea = 120;

      const rule = defaultSplitRules.find(r => r.id === prop.splitRuleId)!;
      const totalAmount = Number((baseRent + utils.water.amount + utils.electric.amount + utils.commonArea).toFixed(2));
      const splitResult = computeSplit(baseRent, utils, rule);

      bills.push({
        id: uid(),
        billNo: `BL-${getYearMonth(start)}-${String(pi + 1).padStart(3, '0')}`,
        propertyId: prop.id,
        propertyName: prop.name,
        tenantName: tenants[pi],
        startDate: start,
        endDate: end,
        totalDays,
        segments,
        baseRent,
        utilities: utils,
        totalAmount,
        splitResult,
        status: mo === 0 ? 'confirmed' : 'paid',
        createdAt: start,
      });
    }
  });
  return bills;
};

const makeHistoricalSettlements = (bills: Bill[]): Settlement[] => {
  const result: Settlement[] = [];
  const periods = Array.from(new Set(bills.map(b => getYearMonth(b.startDate)))).sort();

  periods.forEach(period => {
    const periodBills = bills.filter(b => getYearMonth(b.startDate) === period);
    const platform: { id: string; name: string; amount: number; count: number } = { id: 'platform', name: '运营平台', amount: 0, count: 0 };
    const property: { id: string; name: string; amount: number; count: number } = { id: 'property', name: '物业服务中心', amount: 0, count: 0 };
    const byLandlord = new Map<string, { id: string; name: string; amount: number; count: number }>();

    periodBills.forEach(b => {
      platform.amount += b.splitResult.platformAmount;
      platform.count += 1;
      property.amount += b.splitResult.propertyFeeAmount;
      property.count += 1;

      const prop = defaultProperties.find(p => p.id === b.propertyId);
      if (prop) {
        const ld = defaultLandlords.find(l => l.id === prop.landlordId);
        if (ld) {
          if (!byLandlord.has(ld.id)) byLandlord.set(ld.id, { id: ld.id, name: ld.name, amount: 0, count: 0 });
          const rec = byLandlord.get(ld.id)!;
          rec.amount += b.splitResult.landlordAmount;
          rec.count += 1;
        }
      }
    });

    [
      { id: 'platform', name: '运营平台', amount: platform.amount, count: platform.count, partyType: 'platform' as const },
      { id: 'property', name: '物业服务中心', amount: property.amount, count: property.count, partyType: 'property' as const },
      ...Array.from(byLandlord.values()).map(v => ({ ...v, partyType: 'landlord' as const })),
    ].forEach((p, i) => {
      result.push({
        id: uid(),
        settlementNo: `ST-${period}-${String(i + 1).padStart(3, '0')}`,
        period,
        partyType: p.partyType,
        partyId: p.id,
        partyName: p.name,
        billCount: p.count,
        totalAmount: Number(p.amount.toFixed(2)),
        status: period < currentPeriod() ? 'paid' : 'pending',
        paidAt: period < currentPeriod() ? `${period}-28` : undefined,
      });
    });
  });

  return result;
};

export const initialBills = makeHistoricalBills();
export const initialSettlements = makeHistoricalSettlements(initialBills);
