import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SeasonTier, Landlord, SplitRule, Property, Bill, Settlement, GenerateBillParams, PartyType,
  ReconciliationResult, ReconHistoryEntry, PayoutBatch, PeriodLock, AppUser,
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
  payoutBatches: PayoutBatch[];
  periodLocks: PeriodLock[];
  currentUser: AppUser;

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
  addReconHistory: (entry: Omit<ReconHistoryEntry, 'id' | 'timestamp' | 'operator' | 'operatorRole'>) => void;

  isPeriodLocked: (period: string) => boolean;
  getPeriodLock: (period: string) => PeriodLock | undefined;
  lockPeriod: (period: string) => { success: boolean; message?: string };
  unlockPeriod: (period: string, reason: string) => { success: boolean; message?: string };

  createPayoutBatch: (params: { period: string; partyType: PartyType; partyId: string; partyName: string; bankAccount?: string; settlementIds: string[]; totalAmount: number }) => { success: boolean; message?: string; batch?: PayoutBatch };
  markPayoutBatchPaid: (batchId: string) => { success: boolean; message?: string };
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
      payoutBatches: [],
      periodLocks: [],
      currentUser: { id: 'u001', name: '张财务', role: '财务主管' },

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
        const period = getYearMonth(params.startDate);
        if (get().isPeriodLocked(period)) {
          throw new Error(`[${period}] 账期已锁定，无法新增账单。如需操作请先解锁。`);
        }
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
      deleteBill: (id) => {
        const s = get();
        const bill = s.bills.find(b => b.id === id);
        if (bill) {
          const period = getYearMonth(bill.startDate);
          if (s.isPeriodLocked(period)) {
            throw new Error(`[${period}] 账期已锁定，无法删除账单。如需操作请先解锁。`);
          }
        }
        set(st => ({ bills: st.bills.filter(b => b.id !== id) }));
      },

      batchUpdateBillStatus: (ids, status) => set(s => ({
        bills: s.bills.map(b => ids.includes(b.id) ? { ...b, status } : b),
      })),
      batchDeleteBills: (ids) => {
        const s = get();
        const lockedPeriods = new Set<string>();
        ids.forEach(id => {
          const bill = s.bills.find(b => b.id === id);
          if (bill) {
            const period = getYearMonth(bill.startDate);
            if (s.isPeriodLocked(period)) lockedPeriods.add(period);
          }
        });
        if (lockedPeriods.size > 0) {
          throw new Error(`[${Array.from(lockedPeriods).join(', ')}] 账期已锁定，无法删除账单。如需操作请先解锁。`);
        }
        set(st => ({ bills: st.bills.filter(b => !ids.includes(b.id)) }));
      },

      updateBillUtilities: (id, water, electric, commonArea) => {
        const s = get();
        const bill = s.bills.find(b => b.id === id);
        if (bill) {
          const period = getYearMonth(bill.startDate);
          if (s.isPeriodLocked(period)) {
            throw new Error(`[${period}] 账期已锁定，无法更新水电金额。如需操作请先解锁。`);
          }
        }
        set(st => ({
          bills: st.bills.map(b => {
            if (b.id !== id) return b;
            const newUtils = {
              water: { type: 'water' as const, ...water },
              electric: { type: 'electric' as const, ...electric },
              commonArea,
            };
            const totalAmount = Number(
              (b.baseRent + newUtils.water.amount + newUtils.electric.amount + newUtils.commonArea).toFixed(2),
            );
            const rule = st.splitRules.find(r => r.id === b.splitResult.ruleId);
            const splitResult = rule
              ? computeSplit(b.baseRent, newUtils, rule)
              : b.splitResult;
            return { ...b, utilities: newUtils, totalAmount, splitResult };
          }),
        }));
      },

      updateBillUtilitiesByPropertyPeriod: (propertyId, period, water, electric, commonArea) => {
        if (get().isPeriodLocked(period)) {
          throw new Error(`[${period}] 账期已锁定，无法更新水电金额。如需操作请先解锁。`);
        }
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
        if (forceRegenerate && get().isPeriodLocked(period)) {
          throw new Error(`[${period}] 账期已锁定，无法重新生成结算单。如需操作请先解锁。`);
        }
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

      deleteSettlementByPeriod: (period) => {
        if (get().isPeriodLocked(period)) {
          throw new Error(`[${period}] 账期已锁定，无法删除结算单。如需操作请先解锁。`);
        }
        set(s => ({ settlements: s.settlements.filter(x => x.period !== period) }));
      },

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
            operator: s.currentUser.name,
            operatorRole: s.currentUser.role,
          },
          ...s.reconHistory,
        ].slice(0, 100),
      })),

      isPeriodLocked: (period) => {
        const lock = get().periodLocks.find(l => l.period === period);
        return !!lock?.locked;
      },
      getPeriodLock: (period) => get().periodLocks.find(l => l.period === period),
      lockPeriod: (period) => {
        const s = get();
        const existing = s.periodLocks.find(l => l.period === period);
        if (existing?.locked) return { success: false, message: '该账期已锁定' };
        const newLock: PeriodLock = {
          period,
          locked: true,
          lockedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          lockedBy: s.currentUser.name,
        };
        set(st => ({
          periodLocks: existing
            ? st.periodLocks.map(l => l.period === period ? newLock : l)
            : [...st.periodLocks, newLock],
        }));
        const bills = s.bills.filter(b => getYearMonth(b.startDate) === period);
        s.addReconHistory({
          period,
          action: 'lock',
          actionLabel: '锁定账期',
          billCount: bills.length,
          totalAmount: bills.reduce((sum, b) => sum + b.totalAmount, 0),
        });
        return { success: true };
      },
      unlockPeriod: (period, reason) => {
        const s = get();
        const existing = s.periodLocks.find(l => l.period === period);
        if (!existing?.locked) return { success: false, message: '该账期未锁定' };
        const updated: PeriodLock = {
          ...existing,
          locked: false,
          unlockedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          unlockedBy: s.currentUser.name,
          unlockReason: reason,
        };
        set(st => ({
          periodLocks: st.periodLocks.map(l => l.period === period ? updated : l),
        }));
        const bills = s.bills.filter(b => getYearMonth(b.startDate) === period);
        s.addReconHistory({
          period,
          action: 'unlock',
          actionLabel: '解锁账期',
          billCount: bills.length,
          totalAmount: bills.reduce((sum, b) => sum + b.totalAmount, 0),
          diffSummary: reason,
        });
        return { success: true };
      },

      createPayoutBatch: (params) => {
        const { period, partyType, partyId, partyName, bankAccount, settlementIds, totalAmount } = params;
        const s = get();
        const selected = s.settlements.filter(x =>
          settlementIds.includes(x.id) &&
          x.status === 'approved' &&
          x.period === period &&
          x.partyType === partyType &&
          x.partyId === partyId &&
          !x.payoutBatchId
        );
        if (selected.length === 0) return { success: false, message: '没有可打款的已审批结算单' };

        const now = new Date().toISOString().slice(0, 10);
        const seq = String(s.payoutBatches.filter(b => b.period === period).length + 1).padStart(3, '0');
        const batch: PayoutBatch = {
          id: uid(),
          batchNo: `PAY-${period}-${seq}`,
          period,
          partyType,
          partyId,
          partyName,
          bankAccount,
          settlementIds: selected.map(x => x.id),
          totalAmount: Number(totalAmount.toFixed(2)),
          status: 'pending',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        };
        set(st => ({
          payoutBatches: [batch, ...st.payoutBatches],
          settlements: st.settlements.map(x =>
            selected.some(s2 => s2.id === x.id)
              ? { ...x, payoutBatchId: batch.id }
              : x
          ),
        }));
        const bills = s.bills.filter(b => getYearMonth(b.startDate) === period);
        s.addReconHistory({
          period,
          action: 'batch_payout',
          actionLabel: `生成打款批次 ${partyName}`,
          billCount: bills.length,
          totalAmount: batch.totalAmount,
        });
        return { success: true, batch };
      },
      markPayoutBatchPaid: (batchId) => {
        const s = get();
        const batch = s.payoutBatches.find(b => b.id === batchId);
        if (!batch) return { success: false, message: '打款批次不存在' };
        if (batch.status === 'paid') return { success: false, message: '该批次已打款' };
        const now = new Date().toISOString().slice(0, 10);
        set(st => ({
          payoutBatches: st.payoutBatches.map(b =>
            b.id === batchId ? { ...b, status: 'paid', paidAt: new Date().toISOString().slice(0, 19).replace('T', ' ') } : b
          ),
          settlements: st.settlements.map(x =>
            batch.settlementIds.includes(x.id)
              ? { ...x, status: 'paid', paidAt: now }
              : x
          ),
        }));
        return { success: true };
      },
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
        payoutBatches: state.payoutBatches,
        periodLocks: state.periodLocks,
        currentUser: state.currentUser,
      }),
    },
  ),
);

export { currentPeriod };
