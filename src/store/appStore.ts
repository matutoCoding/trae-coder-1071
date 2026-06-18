import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SeasonTier, Landlord, SplitRule, Property, Bill, Settlement, GenerateBillParams, PartyType,
  ReconciliationResult, ReconHistoryEntry,
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
  reconHistory: ReconHistoryEntry[];

  upsertSeasonTier: (t: SeasonTier) => void;
  deleteSeasonTier: (id: string) => void;

  upsertProperty: (p: Property) => void;
  deleteProperty: (id: string) => void;

  upsertSplitRule: (r: SplitRule) => void;
  deleteSplitRule: (id: string) => void;

  generateBill: (params: GenerateBillParams) => Bill;
  updateBillStatus: (id: string, status: Bill['status']) => void;
  deleteBill: (id: string) => void;
  updateBillUtilities: (id: string, water: { usage: number; amount: number; unitPrice: number; previous: number; current: number }, electric: { usage: number; amount: number; unitPrice: number; previous: number; current: number }, commonArea: number) => void;
  batchUpdateBillStatus: (ids: string[], status: Bill['status']) => void;
  batchDeleteBills: (ids: string[]) => void;
  updateBillUtilitiesByPropertyPeriod: (propertyId: string, period: string, water: { usage: number; amount: number; unitPrice: number; previous: number; current: number }, electric: { usage: number; amount: number; unitPrice: number; previous: number; current: number }, commonArea: number) => number;

  runMonthlyReconciliation: (period: string, forceRegenerate?: boolean) => ReconciliationResult;
  approveSettlement: (id: string) => void;
  markSettlementPaid: (id: string) => void;
  deleteSettlementByPeriod: (period: string) => void;
  batchApproveSettlements: (ids: string[]) => void;
  batchMarkSettlementsPaid: (ids: string[]) => void;
  addReconHistory: (entry: Omit<ReconHistoryEntry, 'id' | 'timestamp'>) => void;
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
      reconHistory: [],

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

        const boundTier = s.seasonTiers.find(t => t.id === prop.rateTierId);
        const peakRefTier = s.seasonTiers.find(t => t.name === '旺季') || s.seasonTiers[0];
        const rateMultiplier = boundTier && peakRefTier
          ? Number((boundTier.dailyRate / peakRefTier.dailyRate).toFixed(4))
          : 1;

        const { segments, baseRent, totalDays } = computeBillingSegments(
          params.startDate, params.endDate, s.seasonTiers, rateMultiplier,
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

      batchUpdateBillStatus: (ids, status) => set(s => ({
        bills: s.bills.map(b => ids.includes(b.id) ? { ...b, status } : b),
      })),
      batchDeleteBills: (ids) => set(s => ({ bills: s.bills.filter(b => !ids.includes(b.id)) })),

      updateBillUtilities: (id, water, electric, commonArea) => set(s => ({
        bills: s.bills.map(b => {
          if (b.id !== id) return b;
          const newUtils = {
            water: { type: 'water' as const, ...water },
            electric: { type: 'electric' as const, ...electric },
            commonArea,
          };
          const totalAmount = Number(
            (b.baseRent + newUtils.water.amount + newUtils.electric.amount + newUtils.commonArea).toFixed(2),
          );
          const rule = s.splitRules.find(r => r.id === b.splitResult.ruleId);
          const splitResult = rule
            ? computeSplit(b.baseRent, newUtils, rule)
            : b.splitResult;
          return { ...b, utilities: newUtils, totalAmount, splitResult };
        }),
      })),

      updateBillUtilitiesByPropertyPeriod: (propertyId, period, water, electric, commonArea) => {
        let count = 0;
        set(s => ({
          bills: s.bills.map(b => {
            if (b.propertyId !== propertyId || getYearMonth(b.startDate) !== period) return b;
            count += 1;
            const newUtils = {
              water: { type: 'water' as const, ...water },
              electric: { type: 'electric' as const, ...electric },
              commonArea,
            };
            const totalAmount = Number(
              (b.baseRent + newUtils.water.amount + newUtils.electric.amount + newUtils.commonArea).toFixed(2),
            );
            const rule = s.splitRules.find(r => r.id === b.splitResult.ruleId);
            const splitResult = rule
              ? computeSplit(b.baseRent, newUtils, rule)
              : b.splitResult;
            return { ...b, utilities: newUtils, totalAmount, splitResult };
          }),
        }));
        return count;
      },

      runMonthlyReconciliation: (period, forceRegenerate) => {
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

        const newAmounts = new Map<string, { amount: number; count: number; partyType: PartyType; partyId: string; partyName: string }>();
        [
          { id: 'platform', name: '运营平台', amount: platform.amount, count: platform.count, partyType: 'platform' as PartyType },
          { id: 'property', name: '物业服务中心', amount: property.amount, count: property.count, partyType: 'property' as PartyType },
          ...Array.from(byLandlord.values()).map(v => ({ ...v, partyType: 'landlord' as PartyType })),
        ].forEach(p => {
          const key = `${p.partyType}_${p.id}`;
          newAmounts.set(key, {
            amount: Number(p.amount.toFixed(2)),
            count: p.count,
            partyType: p.partyType,
            partyId: p.id,
            partyName: p.name,
          });
        });

        const existingForPeriod = s.settlements.filter(x => x.period === period);
        const diffs: ReconciliationResult['diffs'] = [];

        const allKeys = new Set([
          ...existingForPeriod.map(x => `${x.partyType}_${x.partyId}`),
          ...newAmounts.keys(),
        ]);

        allKeys.forEach(key => {
          const existing = existingForPeriod.find(x => `${x.partyType}_${x.partyId}` === key);
          const nw = newAmounts.get(key);
          if (existing && nw) {
            const diffAmount = Number((nw.amount - existing.totalAmount).toFixed(2));
            const diffBillCount = nw.count - existing.billCount;
            if (diffAmount !== 0 || diffBillCount !== 0) {
              diffs.push({
                partyType: existing.partyType,
                partyId: existing.partyId,
                partyName: existing.partyName,
                existingAmount: existing.totalAmount,
                newAmount: nw.amount,
                diffAmount,
                existingBillCount: existing.billCount,
                newBillCount: nw.count,
                diffBillCount,
              });
            }
          } else if (existing && !nw) {
            diffs.push({
              partyType: existing.partyType,
              partyId: existing.partyId,
              partyName: existing.partyName,
              existingAmount: existing.totalAmount,
              newAmount: 0,
              diffAmount: Number((0 - existing.totalAmount).toFixed(2)),
              existingBillCount: existing.billCount,
              newBillCount: 0,
              diffBillCount: -existing.billCount,
            });
          } else if (!existing && nw) {
            diffs.push({
              partyType: nw.partyType,
              partyId: nw.partyId,
              partyName: nw.partyName,
              existingAmount: 0,
              newAmount: nw.amount,
              diffAmount: nw.amount,
              existingBillCount: 0,
              newBillCount: nw.count,
              diffBillCount: nw.count,
            });
          }
        });

        const newSettlements: Settlement[] = [];
        const existingKeys = new Set(existingForPeriod.map(x => `${x.partyType}_${x.partyId}`));

        if (forceRegenerate) {
          set(st => ({ settlements: st.settlements.filter(x => x.period !== period) }));
          Array.from(newAmounts.entries()).forEach(([key, p], i) => {
            newSettlements.push({
              id: uid(),
              settlementNo: `ST-${period}-${String(i + 1).padStart(3, '0')}`,
              period,
              partyType: p.partyType,
              partyId: p.partyId,
              partyName: p.partyName,
              billCount: p.count,
              totalAmount: p.amount,
              status: 'pending',
            });
          });
          set(st => ({ settlements: [...newSettlements, ...st.settlements] }));
        } else {
          Array.from(newAmounts.entries()).forEach(([key, p], i) => {
            if (!existingKeys.has(key)) {
              newSettlements.push({
                id: uid(),
                settlementNo: `ST-${period}-${String(i + 1).padStart(3, '0')}`,
                period,
                partyType: p.partyType,
                partyId: p.partyId,
                partyName: p.partyName,
                billCount: p.count,
                totalAmount: p.amount,
                status: 'pending',
              });
            }
          });
          set(st => ({ settlements: [...newSettlements, ...st.settlements] }));
        }

        return {
          newSettlements,
          diffs,
          hasDiff: diffs.length > 0,
        };
      },

      deleteSettlementByPeriod: (period) => set(s => ({
        settlements: s.settlements.filter(x => x.period !== period),
      })),

      approveSettlement: (id) => set(s => ({
        settlements: s.settlements.map(x => x.id === id ? { ...x, status: 'approved' } : x),
      })),
      markSettlementPaid: (id) => set(s => ({
        settlements: s.settlements.map(x => x.id === id
          ? { ...x, status: 'paid', paidAt: new Date().toISOString().slice(0, 10) }
          : x),
      })),
      batchApproveSettlements: (ids) => set(s => ({
        settlements: s.settlements.map(x => ids.includes(x.id) ? { ...x, status: 'approved' } : x),
      })),
      batchMarkSettlementsPaid: (ids) => set(s => ({
        settlements: s.settlements.map(x => ids.includes(x.id)
          ? { ...x, status: 'paid', paidAt: new Date().toISOString().slice(0, 10) }
          : x),
      })),

      addReconHistory: (entry) => set(s => ({
        reconHistory: [
          {
            ...entry,
            id: uid(),
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
          ...s.reconHistory,
        ].slice(0, 100),
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
        reconHistory: state.reconHistory,
      }),
    },
  ),
);

export { currentPeriod };
