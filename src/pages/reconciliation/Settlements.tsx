import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { formatMoney, currentPeriod } from '@/utils';
import { SettlementStatusBadge, PartyBadge } from '@/components/StatusBadge';
import { Wallet, Search, FileDown, ChevronDown, ChevronUp, CheckSquare, Square, CheckCircle2, Send, Plus, Layers, CreditCard, Clock, User, AlertCircle } from 'lucide-react';

export default function Settlements() {
  const {
    settlements, approveSettlement, markSettlementPaid, batchApproveSettlements, batchMarkSettlementsPaid,
    payoutBatches, createPayoutBatch, markPayoutBatchPaid, bills, properties, landlords, isPeriodLocked, currentUser
  } = useAppStore();
  const [tab, setTab] = useState<'settlements' | 'batches'>('settlements');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchPeriod, setBatchPeriod] = useState(currentPeriod());
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

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

  const allSelected = list.length > 0 && list.every(s => selectedIds.has(s.id));
  const someSelected = list.some(s => selectedIds.has(s.id));

  const batchStats = useMemo(() => {
    const selected = list.filter(s => selectedIds.has(s.id));
    return {
      count: selected.length,
      amount: selected.reduce((s, x) => s + x.totalAmount, 0),
      canApprove: selected.some(s => s.status === 'pending'),
      canMarkPaid: selected.some(s => s.status === 'approved'),
    };
  }, [selectedIds, list]);

  const pendingGroups = useMemo(() => {
    const approved = settlements.filter(s => s.status === 'approved' && s.period === batchPeriod && !s.payoutBatchId);
    const groups: Record<string, typeof settlements> = {};
    approved.forEach(s => {
      const key = `${s.partyType}-${s.partyId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).map(([key, items]) => {
      const ld = items[0].partyType === 'landlord' ? landlords.find(l => l.id === items[0].partyId) : null;
      return {
        key,
        partyType: items[0].partyType,
        partyId: items[0].partyId,
        partyName: items[0].partyName,
        bankAccount: ld?.bankAccount,
        count: items.length,
        totalAmount: items.reduce((a, x) => a + x.totalAmount, 0),
        settlementIds: items.map(x => x.id),
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [settlements, batchPeriod, landlords]);

  const batchList = useMemo(() => {
    return [...payoutBatches].sort((a, b) => (b.period + b.batchNo).localeCompare(a.period + a.batchNo));
  }, [payoutBatches]);

  const batchTotals = useMemo(() => ({
    pending: batchList.filter(b => b.status === 'pending').reduce((a, x) => a + x.totalAmount, 0),
    paid: batchList.filter(b => b.status === 'paid').reduce((a, x) => a + x.totalAmount, 0),
  }), [batchList]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchApprove = () => {
    const ids = list.filter(s => selectedIds.has(s.id) && s.status === 'pending').map(s => s.id);
    if (ids.length === 0) return;
    if (confirm(`确认审批通过选中的 ${ids.length} 张结算单？`)) {
      batchApproveSettlements(ids);
      setSelectedIds(new Set());
    }
  };

  const handleBatchMarkPaid = () => {
    const ids = list.filter(s => selectedIds.has(s.id) && s.status === 'approved').map(s => s.id);
    if (ids.length === 0) return;
    if (confirm(`确认将选中的 ${ids.length} 张结算单标记为已打款？`)) {
      batchMarkSettlementsPaid(ids);
      setSelectedIds(new Set());
    }
  };

  const handleCreateBatch = (group: any) => {
    if (isPeriodLocked(batchPeriod)) {
      alert(`[${batchPeriod}] 账期已锁定，无法创建打款批次。如需操作请先解锁。`);
      return;
    }
    if (confirm(`确认为 ${group.partyName} 创建打款批次？\n共 ${group.count} 张结算单，合计 ${formatMoney(group.totalAmount)}`)) {
      createPayoutBatch({
        period: batchPeriod,
        partyType: group.partyType,
        partyId: group.partyId,
        partyName: group.partyName,
        bankAccount: group.bankAccount,
        settlementIds: group.settlementIds,
        totalAmount: group.totalAmount,
      });
    }
  };

  const handleMarkBatchPaid = (batchId: string) => {
    const batch = payoutBatches.find(b => b.id === batchId);
    if (!batch) return;
    if (isPeriodLocked(batch.period)) {
      alert(`[${batch.period}] 账期已锁定，无法标记打款。如需操作请先解锁。`);
      return;
    }
    if (confirm(`确认将批次 ${batch.batchNo} 标记为已打款？\n合计 ${formatMoney(batch.totalAmount)}，将同步更新 ${batch.settlementIds.length} 张结算单状态。`)) {
      markPayoutBatchPaid(batchId);
    }
  };

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

  const getBatchSettlements = (batch: any) => {
    return settlements.filter(s => batch.settlementIds.includes(s.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="结算单管理"
        description="全量结算单管理中心，支持打款批次生成与批量打款确认。"
        actions={
          <div className="flex items-center gap-2">
            <div className="text-xs text-ink-700 mr-2 flex items-center gap-1">
              <User size={14} />
              <span className="font-medium">{currentUser.name}</span>
            </div>
            <button className="h-10 px-4 rounded-lg border border-gold-300 text-ink-800 text-sm hover:bg-cream-800 inline-flex items-center gap-2">
              <FileDown size={14} /> 导出打款清单
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 rounded-lg bg-ink-900/5 border border-gold-300">
            <button
              onClick={() => setTab('settlements')}
              className={`h-9 px-4 rounded-md text-sm font-medium transition inline-flex items-center gap-1.5 ${
                tab === 'settlements' ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
              }`}
            >
              <Wallet size={14} /> 结算单列表
            </button>
            <button
              onClick={() => setTab('batches')}
              className={`h-9 px-4 rounded-md text-sm font-medium transition inline-flex items-center gap-1.5 ${
                tab === 'batches' ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
              }`}
            >
              <Layers size={14} /> 打款批次
            </button>
          </div>
          {tab === 'settlements' && (
            <>
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
            </>
          )}
          {tab === 'batches' && (
            <label className="inline-flex items-center gap-2">
              <span className="text-sm text-ink-800">账期</span>
              <input
                type="month" value={batchPeriod}
                onChange={e => setBatchPeriod(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
              />
            </label>
          )}
        </div>
      </PageHeader>

      {tab === 'settlements' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SettleSummaryCard label="待审批" value={formatMoney(totals.pending)} count={list.filter(s => s.status === 'pending').length} color="coral" />
            <SettleSummaryCard label="已审批待打款" value={formatMoney(totals.approved)} count={list.filter(s => s.status === 'approved').length} color="gold" />
            <SettleSummaryCard label="已完成打款" value={formatMoney(totals.paid)} count={list.filter(s => s.status === 'paid').length} color="ink" />
          </div>

          {someSelected && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-ink-900 to-ink-800 text-cream-900 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-gold-400" />
                <span className="text-sm">已选择 <b className="text-gold-400">{batchStats.count}</b> 张结算单</span>
                <span className="text-xs text-cream-700">合计金额 {formatMoney(batchStats.amount)}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {batchStats.canApprove && (
                  <button
                    onClick={handleBatchApprove}
                    className="h-9 px-4 rounded-md bg-gold-400/40 text-ink-900 hover:bg-gold-400/60 inline-flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <CheckCircle2 size={14} /> 批量审批
                  </button>
                )}
                {batchStats.canMarkPaid && (
                  <button
                    onClick={handleBatchMarkPaid}
                    className="h-9 px-4 rounded-md bg-ink-500/40 text-cream-900 hover:bg-ink-500/60 inline-flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Send size={14} /> 批量标记打款
                  </button>
                )}
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="h-9 px-3 rounded-md bg-ink-700/40 text-cream-700 hover:bg-ink-700/60 text-xs"
                >
                  取消选择
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-zebra text-sm">
                <thead>
                  <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                    <th className="px-2 py-3 text-center w-10">
                      <button onClick={toggleSelectAll} className="text-ink-800 hover:text-ink-900">
                        {allSelected ? <CheckSquare size={16} className="text-ink-900" /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="px-5 py-3"></th>
                    <th className="px-5 py-3 text-left font-semibold">结算单号</th>
                    <th className="px-5 py-3 text-left font-semibold">账期</th>
                    <th className="px-5 py-3 text-left font-semibold">收款方</th>
                    <th className="px-5 py-3 text-left font-semibold">类型</th>
                    <th className="px-5 py-3 text-center font-semibold">账单数</th>
                    <th className="px-5 py-3 text-right font-semibold">金额</th>
                    <th className="px-5 py-3 text-center font-semibold">打款批次</th>
                    <th className="px-5 py-3 text-center font-semibold">状态</th>
                    <th className="px-5 py-3 text-center font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(s => (
                    <>
                      <tr key={s.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                        <td className="px-2 py-3 text-center">
                          <button onClick={() => toggleSelect(s.id)} className="text-ink-800 hover:text-ink-900">
                            {selectedIds.has(s.id) ? <CheckSquare size={16} className="text-ink-900" /> : <Square size={16} />}
                          </button>
                        </td>
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
                        <td className="px-5 py-3 text-center">
                          {s.payoutBatchId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-ink-500/10 text-ink-800 font-medium">
                              <CreditCard size={11} />
                              {payoutBatches.find(b => b.id === s.payoutBatchId)?.batchNo || '已关联'}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-600">—</span>
                          )}
                        </td>
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
                          <td colSpan={11} className="px-8 py-4">
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
                      <td colSpan={11} className="px-5 py-16 text-center text-ink-700 text-sm">
                        <Wallet size={36} className="mx-auto mb-3 opacity-50 text-ink-600" />
                        暂无结算单数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'batches' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettleSummaryCard label="待打款批次" value={formatMoney(batchTotals.pending)} count={batchList.filter(b => b.status === 'pending').length} color="gold" />
            <SettleSummaryCard label="已完成打款" value={formatMoney(batchTotals.paid)} count={batchList.filter(b => b.status === 'paid').length} color="ink" />
          </div>

          {pendingGroups.length > 0 && (
            <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gold-200 bg-gradient-to-r from-gold-50 to-cream-900">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-gold-600" />
                  <div className="font-serif text-base font-semibold text-ink-900">待生成打款批次</div>
                  <div className="text-xs text-ink-700">{batchPeriod} 账期 · 共 {pendingGroups.length} 个收款方待打款</div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {pendingGroups.map(group => (
                  <div key={group.key} className="p-4 rounded-xl border border-gold-200 bg-gradient-to-br from-cream-900 to-white flex flex-wrap items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 font-bold text-xl">
                      {group.partyName.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink-900">{group.partyName}</div>
                      <div className="text-xs text-ink-700 mt-0.5 flex items-center gap-2">
                        <PartyBadge type={group.partyType} />
                        {group.bankAccount && <><CreditCard size={11} /> {group.bankAccount}</>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-ink-700">{group.count} 张结算单</div>
                      <div className="font-serif font-bold text-xl text-ink-900 gold-text">{formatMoney(group.totalAmount)}</div>
                    </div>
                    <button
                      onClick={() => handleCreateBatch(group)}
                      className="h-10 px-4 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 text-sm font-semibold hover:opacity-90 inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> 生成批次
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gold-200 flex items-center gap-2">
              <Layers size={18} className="text-ink-600" />
              <div className="font-serif text-base font-semibold text-ink-900">打款批次列表</div>
              <div className="text-xs text-ink-700">共 {batchList.length} 个批次</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-zebra text-sm">
                <thead>
                  <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3"></th>
                    <th className="px-5 py-3 text-left font-semibold">批次号</th>
                    <th className="px-5 py-3 text-left font-semibold">账期</th>
                    <th className="px-5 py-3 text-left font-semibold">收款方</th>
                    <th className="px-5 py-3 text-left font-semibold">收款账户</th>
                    <th className="px-5 py-3 text-center font-semibold">结算单数</th>
                    <th className="px-5 py-3 text-right font-semibold">总金额</th>
                    <th className="px-5 py-3 text-center font-semibold">状态</th>
                    <th className="px-5 py-3 text-center font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {batchList.map(batch => (
                    <>
                      <tr key={batch.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                        <td className="px-2 py-3">
                          <button
                            onClick={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}
                            className="w-7 h-7 rounded-md hover:bg-cream-800 text-ink-700 inline-flex items-center justify-center"
                          >
                            {expandedBatchId === batch.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-ink-700">{batch.batchNo}</td>
                        <td className="px-5 py-3 font-semibold text-ink-800">{batch.period}</td>
                        <td className="px-5 py-3">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 text-xs font-bold">
                              {batch.partyName.slice(0, 1)}
                            </div>
                            <span className="font-medium text-ink-900">{batch.partyName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-ink-700">
                          {batch.bankAccount ? (
                            <span className="inline-flex items-center gap-1">
                              <CreditCard size={12} /> {batch.bankAccount}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold">{batch.settlementIds.length}</td>
                        <td className="px-5 py-3 text-right font-serif font-bold text-ink-900 text-lg">{formatMoney(batch.totalAmount)}</td>
                        <td className="px-5 py-3 text-center">
                          {batch.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-400/30 text-ink-800 text-xs font-medium">
                              <Clock size={12} /> 待打款
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-500/15 text-ink-800 text-xs font-medium">
                              <CheckCircle2 size={12} /> 已打款
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center whitespace-nowrap">
                          {batch.status === 'pending' && (
                            <button
                              onClick={() => handleMarkBatchPaid(batch.id)}
                              className="h-8 px-3 rounded-md bg-ink-900 text-cream-900 text-xs font-semibold hover:bg-ink-800 inline-flex items-center gap-1"
                            >
                              <Send size={12} /> 标记打款
                            </button>
                          )}
                          {batch.status === 'paid' && (
                            <span className="text-xs text-ink-700">{batch.paidAt}</span>
                          )}
                        </td>
                      </tr>
                      {expandedBatchId === batch.id && (
                        <tr key={`${batch.id}-expand`} className="bg-cream-800/40">
                          <td colSpan={9} className="px-8 py-4">
                            <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">包含结算单明细</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {getBatchSettlements(batch).map(s => (
                                <div key={s.id} className="p-3 rounded-lg bg-white border border-gold-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[11px] text-ink-700">{s.settlementNo}</span>
                                    <PartyBadge type={s.partyType} />
                                  </div>
                                  <div className="mt-1.5 text-sm font-semibold text-ink-900">{s.partyName}</div>
                                  <div className="mt-1.5 flex items-center justify-between text-xs">
                                    <span className="text-ink-700">{s.billCount} 笔账单</span>
                                    <span className="font-semibold text-ink-900">{formatMoney(s.totalAmount)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {batchList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-ink-700 text-sm">
                        <Layers size={36} className="mx-auto mb-3 opacity-50 text-ink-600" />
                        暂无打款批次，上方选择账期后可生成
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
