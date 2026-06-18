import React from 'react';

type BillStatus = 'draft' | 'generated' | 'confirmed' | 'paid';
type SettlementStatus = 'pending' | 'approved' | 'paid';
type PropertyStatus = 'vacant' | 'rented';

const billMap: Record<BillStatus, { label: string; className: string; dot: string }> = {
  draft: { label: '草稿', className: 'bg-gold-100 text-ink-700 border-gold-300', dot: 'bg-ink-500' },
  generated: { label: '已生成', className: 'bg-gold-100 text-gold-500 border-gold-400', dot: 'bg-gold-500' },
  confirmed: { label: '已确认', className: 'bg-ink-500/10 text-ink-700 border-ink-500/30', dot: 'bg-ink-600' },
  paid: { label: '已收款', className: 'bg-ink-500/15 text-ink-800 border-ink-500/40', dot: 'bg-ink-500' },
};

const settleMap: Record<SettlementStatus, { label: string; className: string; dot: string }> = {
  pending: { label: '待审批', className: 'bg-coral-500/10 text-coral-500 border-coral-500/30', dot: 'bg-coral-500' },
  approved: { label: '已审批', className: 'bg-gold-100 text-gold-500 border-gold-400', dot: 'bg-gold-500' },
  paid: { label: '已打款', className: 'bg-ink-500/15 text-ink-800 border-ink-500/40', dot: 'bg-ink-500' },
};

const propMap: Record<PropertyStatus, { label: string; className: string; dot: string }> = {
  vacant: { label: '空置', className: 'bg-coral-500/10 text-coral-500 border-coral-500/30', dot: 'bg-coral-500' },
  rented: { label: '在租', className: 'bg-ink-500/15 text-ink-800 border-ink-500/40', dot: 'bg-ink-500' },
};

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const m = billMap[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${m.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const m = settleMap[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${m.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const m = propMap[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${m.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function PartyBadge({ type }: { type: 'platform' | 'landlord' | 'property' }) {
  const map = {
    platform: { label: '运营平台', className: 'bg-ink-900 text-gold-300' },
    landlord: { label: '房东', className: 'bg-gold-400 text-ink-900' },
    property: { label: '物业', className: 'bg-ink-600 text-cream-900' },
  };
  const m = map[type];
  return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${m.className}`}>{m.label}</span>;
}
