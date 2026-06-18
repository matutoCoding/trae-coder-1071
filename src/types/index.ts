export interface SeasonTier {
  id: string;
  name: string;
  color: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  dailyRate: number;
  monthlyRate: number;
}

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  bankAccount: string;
}

export interface SplitRule {
  id: string;
  name: string;
  platformCut: number;
  propertyFee: number;
  landlordCut: number;
}

export interface Property {
  id: string;
  name: string;
  code: string;
  type: string;
  area: number;
  landlordId: string;
  rateTierId: string;
  splitRuleId: string;
  status: 'vacant' | 'rented';
}

export interface BillingSegment {
  tierId: string;
  tierName: string;
  tierColor: string;
  startDate: string;
  endDate: string;
  days: number;
  unitPrice: number;
  amount: number;
}

export interface UtilityReading {
  type: 'water' | 'electric';
  previous: number;
  current: number;
  unitPrice: number;
  usage: number;
  amount: number;
}

export interface SplitResult {
  ruleId: string;
  ruleName: string;
  totalBase: number;
  platformAmount: number;
  propertyFeeAmount: number;
  landlordAmount: number;
  utilitiesPassThrough: number;
}

export interface Bill {
  id: string;
  billNo: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  segments: BillingSegment[];
  baseRent: number;
  utilities: {
    water: UtilityReading;
    electric: UtilityReading;
    commonArea: number;
  };
  totalAmount: number;
  splitResult: SplitResult;
  status: 'draft' | 'generated' | 'confirmed' | 'paid';
  createdAt: string;
}

export type PartyType = 'platform' | 'landlord' | 'property';

export interface Settlement {
  id: string;
  settlementNo: string;
  period: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  billCount: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'paid';
  paidAt?: string;
  payoutBatchId?: string;
}

export interface GenerateBillParams {
  propertyId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  water?: { previous: number; current: number; unitPrice: number };
  electric?: { previous: number; current: number; unitPrice: number };
  commonArea?: number;
}

export interface PayoutBatch {
  id: string;
  batchNo: string;
  period: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  bankAccount?: string;
  settlementIds: string[];
  totalAmount: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
}

export interface PeriodLock {
  period: string;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: string;
}

export interface ReconciliationDiff {
  partyType: PartyType;
  partyId: string;
  partyName: string;
  existingAmount: number;
  newAmount: number;
  diffAmount: number;
  existingBillCount: number;
  newBillCount: number;
  diffBillCount: number;
}

export interface ReconciliationResult {
  newSettlements: Settlement[];
  diffs: ReconciliationDiff[];
  hasDiff: boolean;
}

export type ReconActionType = 'generate' | 'diff_detected' | 'regenerate' | 'lock' | 'unlock' | 'batch_payout';

export interface ReconHistoryEntry {
  id: string;
  period: string;
  action: ReconActionType;
  actionLabel: string;
  timestamp: string;
  operator: string;
  operatorRole: string;
  billCount: number;
  totalAmount: number;
  diffSummary?: string;
  diffCount?: number;
}
