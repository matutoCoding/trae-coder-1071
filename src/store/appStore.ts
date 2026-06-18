import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SeasonTier, Landlord, SplitRule, Property, Bill, Settlement, GenerateBillParams, PartyType,
} from '@/types';
import {
  defaultSeasonTiers, defaultLandlords, defaultSplitRules, defaultProperties,
  initialBills, initialSettlements,
} from '@/data/mockData';
import { computeBillingSegments } from '@/utils/billingEngine';
import { computeSplit, computeUtility, utilityDefaults } from '@/utils/splitCalculator';
import { uid, getYearMonth, currentPeriod } from '@/utils';

interface AppState {
  seasonTiers: SeasonTier[];
  landlords: Landlord[];
  splitRules: SplitRule[];
  properties: Property[];
  bills: Bill[];
  settlements: Settlement[];

  upsertSeasonTier: (t: SeasonTier) => void;
  deleteSeasonTier: (id: string) => void;

  upsertProperty: (p: Property) => void;
  deleteProperty: (id: string) => void;

  upsertSplitRule: (r: SplitRule) => void;
  deleteSplitRule: (id: string) => void;

  generateBill: (params: GenerateBillParams) => Bill;
  updateBillStatus: (id: string, status: Bill['status']) => void;
  deleteBill: (id: string) => void;

  runMonthlyReconciliation: (period: string) => Settlement[];
  approveSettlement: (id: string) => void;
  markSettlementPaid: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      seasonTiers: defaultSeasonTiers,
      landlords: defaultLandlords,
      splitRules: defaultSplitRules,
      properties: defaultProperties,
      bills: initialBills,
      settlements: initialSettlements,

      upsertSeasonTier: (t) => set(s => {
        const i = s.seasonTiers.findIndex(x => x.id === t.id);
        if (i >= 0) {
          const arr = [...s.seasonTiers];
          arr[i] = t;
          return { seasonTiers: arr };
        }
        return { seasonTiers: [...s.seasonTiers, t] };
      }),
      deleteSeasonTier: (id) => set(s => ({ seasonTiers: s.seasonTiers.filter(x => x.id !== id) })),

      upsertProperty: (p) => set(s => {
        const i = s.properties.findIndex(x => x.id === p.id);
        if (i >= 0) {
          const arr = [...s.properties];
          arr[i] = p;
          return { properties: arr };
        }
        return { properties: [...s.properties, p] };
      }),
      deleteProperty: (id) => set(s => ({ properties: s.properties.filter(x => x.id !== id) })),

      upsertSplitRule: (r) => set(s => {
        const i = s.splitRules.findIndex(x => x.id === r.id);
        if (i >= 0) {
          const arr = [...s.splitRules];
          arr[i] = r;
          return { splitRules: arr };
        }
        return { splitRules: [...s.splitRules, r] };
      }),
      deleteSplitRule: (id) => set(s => ({ splitRules: s.splitRules.filter(x => x.id !== id) })),

      generateBill: (params) => {
        const s = get();
        const prop = s.properties.find(p => p.id === params.propertyId)!;
        const rule = s.splitRules.find(r => r.id === prop.splitRuleId)!;

        const { segments, baseRent, totalDays } = computeBillingSegments(
          params.startDate, params.endDate, s.seasonTiers,
        );

        const utils = utilityDefaults();
        if (params.water) utils.water = computeUtility({ type: 'water', ...params.water });
        if (params.electric) utils.electric = computeUtility({ type: 'electric', ...params.electric });
        if (params.commonArea !== undefined) utils.commonArea = params.commonArea;

        const totalAmount = Number(
          (baseRent + utils.water.amount + utils.electric.amount + utils.commonArea).toFixed(2),
        );
        const splitResult = computeSplit(baseRent, utils, rule);

        const period = getYearMonth(params.startDate);
        const seq = String(s.bills.filter(b => getYearMonth(b.startDate) === period).length + 1).padStart(3, '0');

        const bill: Bill = {
          id: uid(),
          billNo: `BL-${period}-${seq}`,
          propertyId: prop.id,
          propertyName: prop.name,
          tenantName: params.tenantName || '未填写',
          startDate: params.startDate,
          endDate: params.endDate,
          totalDays,
          segments,
          baseRent,
          utilities: utils,
          totalAmount,
          splitResult,
          status: 'generated',
          createdAt: new Date().toISOString().slice(0, 10),
        };

        set(st => ({ bills: [bill, ...st.bills] }));
        return bill;
      },

      updateBillStatus: (id, status) => set(s => ({
        bills: s.bills.map(b => b.id === id ? { ...b, status } : b),
      })),
      deleteBill: (id) => set(s => ({ bills: s.bills.filter(b => b.id !== id) })),

      runMonthlyReconciliation: (period) => {
        const s = get();
        const periodBills = s.bills.filter(b => getYearMonth(b.startDate) === period);

        const platform = { id: 'platform', name: '运营平台', amount: 0, count: 0 };
        const property = { id: 'property', name: '物业服务中心', amount: 0, count: 0 };
        const byLandlord = new Map<string, { id: string; name: string; amount: number; count: number }>();

        periodBills.forEach(b => {
          platform.amount += b.splitResult.platformAmount;
          platform.count += 1;
          property.amount += b.splitResult.propertyFeeAmount;
          property.count += 1;
          const prop = s.properties.find(p => p.id === b.propertyId);
          if (prop) {
            const ld = s.landlords.find(l => l.id === prop.landlordId);
            if (ld) {
              if (!byLandlord.has(ld.id)) byLandlord.set(ld.id, { id: ld.id, name: ld.name, amount: 0, count: 0 });
              const rec = byLandlord.get(ld.id)!;
              rec.amount += b.splitResult.landlordAmount;
              rec.count += 1;
            }
          }
        });

        const existingForPeriod = new Set(
          s.settlements.filter(x => x.period === period).map(x => `${x.partyType}_${x.partyId}`),
        );
        const newSettlements: Settlement[] = [];

        [
          { id: 'platform', name: '运营平台', amount: platform.amount, count: platform.count, partyType: 'platform' as PartyType },
          { id: 'property', name: '物业服务中心', amount: property.amount, count: property.count, partyType: 'property' as PartyType },
          ...Array.from(byLandlord.values()).map(v => ({ ...v, partyType: 'landlord' as PartyType })),
        ].forEach((p, i) => {
          const key = `${p.partyType}_${p.id}`;
          if (!existingForPeriod.has(key)) {
            newSettlements.push({
              id: uid(),
              settlementNo: `ST-${period}-${String(i + 1).padStart(3, '0')}`,
              period,
              partyType: p.partyType,
              partyId: p.id,
              partyName: p.name,
              billCount: p.count,
              totalAmount: Number(p.amount.toFixed(2)),
              status: 'pending',
            });
          }
        });

        set(st => ({ settlements: [...newSettlements, ...st.settlements] }));
        return newSettlements;
      },

      approveSettlement: (id) => set(s => ({
        settlements: s.settlements.map(x => x.id === id ? { ...x, status: 'approved' } : x),
      })),
      markSettlementPaid: (id) => set(s => ({
        settlements: s.settlements.map(x => x.id === id
          ? { ...x, status: 'paid', paidAt: new Date().toISOString().slice(0, 10) }
          : x),
      })),
    }),
    {
      name: 'long-rent-billing-store',
      partialize: (state) => ({
        seasonTiers: state.seasonTiers,
        landlords: state.landlords,
        splitRules: state.splitRules,
        properties: state.properties,
        bills: state.bills,
        settlements: state.settlements,
      }),
    },
  ),
);

export { currentPeriod };
