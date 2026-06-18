import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore, currentPeriod } from '@/store/appStore';
import { formatMoney, getYearMonth } from '@/utils';
import { SettlementStatusBadge, PartyBadge } from '@/components/StatusBadge';
import { FileCheck2, Filter, AlertCircle, RefreshCw, CheckCircle2, Send, TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react';
import type { ReconciliationResult } from '@/types';

export default function MonthlyReconciliation() {
  const { bills, settlements, runMonthlyReconciliation, approveSettlement, markSettlementPaid } = useAppStore();
  const [period, setPeriod] = useState(currentPeriod());
  const [partyFilter, setPartyFilter] = useState<'all' | 'platform' | 'landlord' | 'property'>('all');
  const [reconResult, setReconResult] = useState<ReconciliationResult | null>(null);

  const periodBills = bills.filter(b => getYearMonth(b.startDate) === period);
  const periodSettlements = useMemo(
    () => settlements.filter(s => s.period === period && (partyFilter === 'all' || s.partyType === partyFilter)),
    [settlements, period, partyFilter],
  );

  const stats = useMemo(() => {
    const s = periodSettlements;
    return {
      total: s.reduce((a, x) => a + x.totalAmount, 0),
      pending: s.filter(x => x.status === 'pending').length,
      approved: s.filter(x => x.status === 'approved').length,
      paid: s.filter(x => x.status === 'paid').length,
    };
  }, [periodSettlements]);

  const runRecon = (forceRegenerate = false) => {
    const result = runMonthlyReconciliation(period, forceRegenerate);
    setReconResult(result);
    if (forceRegenerate) {
      alert(`已重新生成 ${result.newSettlements.length} 张结算单！`);
    } else if (result.hasDiff) {
      // 有差异但不自动重生成
    } else if (result.newSettlements.length === 0) {
      alert('该账期已完成对账，无新增结算单。');
    } else {
      alert(`已生成 ${result.newSettlements.length} 张结算单！`);
    }
  };

  const handleRegenerate = () => {
    if (confirm(`确定要重新生成 ${period} 账期的所有结算单？已审批/已打款状态将被重置。`)) {
      runRecon(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="月度对账"
        description="按月归集所有账单，一键生成平台/房东/物业三方结算单，完成审批与打款流程。"
        actions={
          <div className="flex items-center gap-2">
            {periodSettlements.length > 0 && (
              <button
                onClick={handleRegenerate}
                disabled={periodBills.length === 0}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-white border border-gold-300 text-ink-800 font-medium text-sm hover:bg-cream-800 disabled:opacity-50"
              >
                <RotateCcw size={16} /> 重新生成结算
              </button>
            )}
            <button
              onClick={() => runRecon()}
              disabled={periodBills.length === 0}
              className="btn-elev inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 font-semibold text-sm shadow-card disabled:opacity-50"
            >
              <RefreshCw size={16} /> 执行对账核算
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <Filter size={14} className="text-ink-700" />
            <span className="text-sm text-ink-800">账期</span>
            <input
              type="month" value={period}
              onChange={e => setPeriod(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </label>
          <div className="flex p-1 rounded-lg bg-white border border-gold-300">
            {[
              { k: 'all', label: '全部' },
              { k: 'platform', label: '平台' },
              { k: 'landlord', label: '房东' },
              { k: 'property', label: '物业' },
            ].map(x => (
              <button
                key={x.k}
                onClick={() => setPartyFilter(x.k as any)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition ${
                  partyFilter === x.k ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
                }`}
              >{x.label}</button>
            ))}
          </div>
          <div className="ml-auto text-xs text-ink-700">
            <b className="text-ink-900">{periodBills.length}</b> 笔账单归集
            {periodSettlements.length > 0 && (
              <> · 共 <b className="text-ink-900">{periodSettlements.length}</b> 张结算单</>
            )}
          </div>
        </div>
      </PageHeader>

      {periodBills.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card border border-gold-200 p-16 text-center">
          <AlertCircle size={40} className="mx-auto text-gold-500 opacity-60" />
          <div className="mt-4 font-serif text-lg font-semibold text-ink-900">{period} 账期暂无账单</div>
          <div className="mt-1 text-sm text-ink-700">请先前往「账单生成器」创建该账期的租金账单</div>
        </div>
      ) : periodSettlements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card border border-gold-200 p-12 text-center">
          <FileCheck2 size={44} className="mx-auto text-ink-600 opacity-60" />
          <div className="mt-4 font-serif text-xl font-semibold text-ink-900">待执行对账核算</div>
          <div className="mt-1 text-sm text-ink-700">
            已归集 <b>{periodBills.length}</b> 笔账单，总额 <b>{formatMoney(periodBills.reduce((s, b) => s + b.totalAmount, 0))}</b>
          </div>
          <div className="mt-5 inline-flex gap-3">
            <button
              onClick={() => runRecon()}
              className="btn-elev inline-flex items-center gap-2 px-6 h-11 rounded-xl bg-gradient-to-br from-ink-900 to-ink-700 text-cream-900 font-serif font-bold shadow-elevated"
            >
              <RefreshCw size={18} /> 一键生成结算单
            </button>
          </div>
        </div>
      ) : (
        <>
          {reconResult && reconResult.hasDiff && (
            <div className="p-5 rounded-xl bg-coral-500/10 border border-coral-300 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-coral-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-ink-900">检测到结算金额差异</div>
                  <div className="text-sm text-ink-700 mt-0.5">本期账单有调整（水电更新/账单增删），以下收款方的应结金额与已有结算单不一致</div>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-coral-500 text-white text-xs font-semibold hover:bg-coral-600"
                >
                  <RotateCcw size={14} /> 重新生成结算
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-700 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left font-semibold">收款方</th>
                      <th className="px-3 py-2 text-center font-semibold">类型</th>
                      <th className="px-3 py-2 text-right font-semibold">原有金额</th>
                      <th className="px-3 py-2 text-right font-semibold">现有金额</th>
                      <th className="px-3 py-2 text-right font-semibold">差额</th>
                      <th className="px-3 py-2 text-center font-semibold">账单数变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconResult.diffs.map((d, i) => (
                      <tr key={i} className="border-t border-coral-200/50">
                        <td className="px-3 py-2.5 font-medium text-ink-900">{d.partyName}</td>
                        <td className="px-3 py-2.5 text-center"><PartyBadge type={d.partyType} /></td>
                        <td className="px-3 py-2.5 text-right text-ink-700">{formatMoney(d.existingAmount)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-ink-900">{formatMoney(d.newAmount)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            d.diffAmount > 0 ? 'text-green-600' : d.diffAmount < 0 ? 'text-coral-500' : 'text-ink-700'
                          }`}>
                            {d.diffAmount > 0 ? <TrendingUp size={14} /> : d.diffAmount < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                            {d.diffAmount > 0 ? '+' : ''}{formatMoney(d.diffAmount)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-ink-700">
                          {d.diffBillCount > 0 ? '+' : ''}{d.diffBillCount} 笔
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white shadow-card border border-gold-200">
              <div className="text-xs text-ink-700 uppercase tracking-wide">结算单总计</div>
              <div className="mt-2 font-serif font-bold text-2xl gold-text">{formatMoney(stats.total)}</div>
              <div className="text-[11px] text-ink-700 mt-1">{periodSettlements.length} 张合计</div>
            </div>
            <StatusBox label="待审批" count={stats.pending} color="#E07A5F" />
            <StatusBox label="已审批" count={stats.approved} color="#C8A96B" />
            <StatusBox label="已打款" count={stats.paid} color="#0F3D2E" />
          </div>

          <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-zebra text-sm">
                <thead>
                  <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">结算单号</th>
                    <th className="px-5 py-3 text-left font-semibold">收款方</th>
                    <th className="px-5 py-3 text-left font-semibold">类型</th>
                    <th className="px-5 py-3 text-center font-semibold">账单数</th>
                    <th className="px-5 py-3 text-right font-semibold">应结金额</th>
                    <th className="px-5 py-3 text-center font-semibold">状态</th>
                    <th className="px-5 py-3 text-center font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {periodSettlements.map(s => (
                    <tr key={s.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                      <td className="px-5 py-3 font-mono text-xs text-ink-700">{s.settlementNo}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 text-xs font-bold">
                            {s.partyName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-medium text-ink-900">{s.partyName}</div>
                            {s.paidAt && <div className="text-[11px] text-ink-700">打款日 {s.paidAt}</div>}
                          </div>
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
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-gold-400/30 text-ink-900 text-xs font-semibold hover:bg-gold-400/50"
                          ><CheckCircle2 size={13} /> 审批通过</button>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={() => markSettlementPaid(s.id)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-ink-900 text-cream-900 text-xs font-semibold hover:bg-ink-800"
                          ><Send size={13} /> 标记已打款</button>
                        )}
                        {s.status === 'paid' && (
                          <span className="text-xs text-ink-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBox({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-white shadow-card border border-gold-200 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: color }}
      />
      <div className="pl-2">
        <div className="text-xs text-ink-700 uppercase tracking-wide">{label}</div>
        <div className="mt-2 font-serif font-bold text-3xl text-ink-900">{count}</div>
        <div className="text-[11px] text-ink-700 mt-1">张结算单</div>
      </div>
    </div>
  );
}
