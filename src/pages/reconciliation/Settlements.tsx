import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/utils';
import { SettlementStatusBadge, PartyBadge } from '@/components/StatusBadge';
import { Wallet, Search, FileDown, ChevronDown, ChevronUp } from 'lucide-react';

export default function Settlements() {
  const { settlements, approveSettlement, markSettlementPaid } = useAppStore();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { bills, properties, landlords } = useAppStore();

  const list = useMemo(() => {
    let arr = [...settlements].sort((a, b) => (b.period + b.settlementNo).localeCompare(a.period + a.settlementNo));
    if (statusFilter !== 'all') arr = arr.filter(s => s.status === statusFilter);
    if (q) arr = arr.filter(s => s.settlementNo.includes(q) || s.partyName.includes(q) || s.period.includes(q));
    return arr;
  }, [settlements, statusFilter, q]);

  const totals = useMemo(() => ({
    pending: list.filter(s => s.status === 'pending').reduce((a, x) => a + x.totalAmount, 0),
    approved: list.filter(s => s.status === 'approved').reduce((a, x) => a + x.totalAmount, 0),
    paid: list.filter(s => s.status === 'paid').reduce((a, x) => a + x.totalAmount, 0),
  }), [list]);

  const relatedBills = (s: any) => {
    return bills.filter(b => {
      const prop = properties.find(p => p.id === b.propertyId);
      if (!prop) return false;
      if (b.startDate.slice(0, 7) !== s.period) return false;
      if (s.partyType === 'platform' || s.partyType === 'property') return true;
      const ld = landlords.find(l => l.id === prop.landlordId);
      return ld && ld.name === s.partyName;
    }).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="结算单管理"
        description="全量结算单管理中心，支持多维度查询、状态追踪与打款确认。"
        actions={
          <button className="h-10 px-4 rounded-lg border border-gold-300 text-ink-800 text-sm hover:bg-cream-800 inline-flex items-center gap-2">
            <FileDown size={14} /> 导出打款清单
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索单号 / 收款方 / 账期..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </div>
          <div className="flex p-1 rounded-lg bg-white border border-gold-300">
            {[
              { k: 'all', label: '全部' },
              { k: 'pending', label: '待审批' },
              { k: 'approved', label: '已审批' },
              { k: 'paid', label: '已打款' },
            ].map(x => (
              <button
                key={x.k}
                onClick={() => setStatusFilter(x.k as any)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition ${
                  statusFilter === x.k ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
                }`}
              >{x.label}</button>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SettleSummaryCard label="待审批" value={formatMoney(totals.pending)} count={list.filter(s => s.status === 'pending').length} color="coral" />
        <SettleSummaryCard label="已审批待打款" value={formatMoney(totals.approved)} count={list.filter(s => s.status === 'approved').length} color="gold" />
        <SettleSummaryCard label="已完成打款" value={formatMoney(totals.paid)} count={list.filter(s => s.status === 'paid').length} color="ink" />
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-zebra text-sm">
            <thead>
              <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                <th className="px-5 py-3"></th>
                <th className="px-5 py-3 text-left font-semibold">结算单号</th>
                <th className="px-5 py-3 text-left font-semibold">账期</th>
                <th className="px-5 py-3 text-left font-semibold">收款方</th>
                <th className="px-5 py-3 text-left font-semibold">类型</th>
                <th className="px-5 py-3 text-center font-semibold">账单数</th>
                <th className="px-5 py-3 text-right font-semibold">金额</th>
                <th className="px-5 py-3 text-center font-semibold">状态</th>
                <th className="px-5 py-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <>
                  <tr key={s.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                    <td className="px-2 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className="w-7 h-7 rounded-md hover:bg-cream-800 text-ink-700 inline-flex items-center justify-center"
                      >
                        {expandedId === s.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-700">{s.settlementNo}</td>
                    <td className="px-5 py-3 font-semibold text-ink-800">{s.period}</td>
                    <td className="px-5 py-3">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 text-xs font-bold">
                          {s.partyName.slice(0, 1)}
                        </div>
                        <span className="font-medium text-ink-900">{s.partyName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><PartyBadge type={s.partyType} /></td>
                    <td className="px-5 py-3 text-center font-semibold">{s.billCount}</td>
                    <td className="px-5 py-3 text-right font-serif font-bold text-ink-900 text-lg">{formatMoney(s.totalAmount)}</td>
                    <td className="px-5 py-3 text-center"><SettlementStatusBadge status={s.status} /></td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      {s.status === 'pending' && (
                        <button
                          onClick={() => approveSettlement(s.id)}
                          className="h-8 px-3 rounded-md bg-gold-400/30 text-ink-900 text-xs font-semibold hover:bg-gold-400/50"
                        >审批</button>
                      )}
                      {s.status === 'approved' && (
                        <button
                          onClick={() => markSettlementPaid(s.id)}
                          className="h-8 px-3 rounded-md bg-ink-900 text-cream-900 text-xs font-semibold hover:bg-ink-800"
                        >标记打款</button>
                      )}
                      {s.status === 'paid' && (
                        <span className="text-xs text-ink-700">{s.paidAt}</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr key={`${s.id}-expand`} className="bg-cream-800/40">
                      <td colSpan={9} className="px-8 py-4">
                        <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">关联账单明细（前 5 笔）</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {relatedBills(s).map(b => (
                            <div key={b.id} className="p-3 rounded-lg bg-white border border-gold-200">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-ink-700">{b.billNo}</span>
                                <span className="text-[11px] text-ink-700">{b.startDate.slice(5)}~{b.endDate.slice(5)}</span>
                              </div>
                              <div className="mt-1.5 text-sm font-semibold text-ink-900">{b.propertyName}</div>
                              <div className="mt-1.5 flex items-center justify-between text-xs">
                                <span className="text-ink-700">{b.tenantName}</span>
                                <span className="font-semibold text-ink-900">{formatMoney(b.totalAmount)}</span>
                              </div>
                            </div>
                          ))}
                          {relatedBills(s).length === 0 && (
                            <div className="col-span-full text-xs text-ink-700 py-4 text-center bg-white/60 rounded-lg border border-dashed border-gold-300">
                              暂无关联账单
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-ink-700 text-sm">
                    <Wallet size={36} className="mx-auto mb-3 opacity-50 text-ink-600" />
                    暂无结算单数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettleSummaryCard({ label, value, count, color }: { label: string; value: string; count: number; color: 'coral' | 'gold' | 'ink' }) {
  const colorMap = {
    coral: 'from-coral-500/90 to-coral-400 text-ink-900',
    gold: 'from-gold-500 to-gold-300 text-ink-900',
    ink: 'from-ink-900 to-ink-700 text-cream-900',
  };
  return (
    <div className={`p-5 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-card relative overflow-hidden`}>
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10 bg-current" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide opacity-85">{label}</div>
          <div className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/25">{count} 笔</div>
        </div>
        <div className="mt-3 font-serif font-bold text-2xl gold-text">{value}</div>
      </div>
    </div>
  );
}
