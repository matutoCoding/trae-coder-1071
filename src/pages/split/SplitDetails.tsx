import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore, currentPeriod } from '@/store/appStore';
import { formatMoney, getYearMonth } from '@/utils';
import DonutChart from '@/components/DonutChart';
import { PartyBadge, BillStatusBadge, SettlementStatusBadge } from '@/components/StatusBadge';
import { FileSpreadsheet, Filter, ChevronDown, ChevronUp, Eye, Droplets, Zap, Building2, FileText, Wallet, Users, User, CheckCircle2, Clock, CreditCard, Layers } from 'lucide-react';
import type { Bill, Settlement, Landlord } from '@/types';

export default function SplitDetails() {
  const { bills, landlords, settlements, properties, payoutBatches } = useAppStore();
  const [period, setPeriod] = useState(currentPeriod());
  const [tab, setTab] = useState<'overview' | 'landlord'>('overview');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);

  const periodBills = useMemo(
    () => bills.filter(b => getYearMonth(b.startDate) === period),
    [bills, period],
  );

  const periodSettlements = useMemo(
    () => settlements.filter(s => s.period === period),
    [settlements, period],
  );

  const findSettlementForBill = (b: Bill): Settlement | undefined => {
    const prop = properties.find(p => p.id === b.propertyId);
    if (!prop) return undefined;
    const ld = landlords.find(l => l.id === prop.landlordId);
    const partyId = ld ? ld.id : '';
    return periodSettlements.find(s => s.partyType === 'landlord' && s.partyId === partyId);
  };

  const agg = useMemo(() => {
    let platform = 0, property = 0, landlord = 0, baseRent = 0, utilities = 0, total = 0;
    const byLandlord = new Map<string, { name: string; amount: number; count: number; bills: Bill[] }>();
    periodBills.forEach(b => {
      platform += b.splitResult.platformAmount;
      property += b.splitResult.propertyFeeAmount;
      landlord += b.splitResult.landlordAmount;
      baseRent += b.baseRent;
      utilities += (b.totalAmount - b.baseRent);
      total += b.totalAmount;
      const prop = properties.find(p => p.id === b.propertyId);
      if (prop) {
        const l = landlords.find(x => x.id === prop.landlordId);
        if (l) {
          if (!byLandlord.has(l.id)) byLandlord.set(l.id, { name: l.name, amount: 0, count: 0, bills: [] });
          const r = byLandlord.get(l.id)!;
          r.amount += b.splitResult.landlordAmount;
          r.count += 1;
          r.bills.push(b);
        }
      }
    });
    return {
      platform, property, landlord, baseRent, utilities, total,
      byLandlord: Array.from(byLandlord.values()),
    };
  }, [periodBills, landlords]);

  const landlordData = useMemo(() => {
    if (!selectedLandlord) return null;
    const landlordBills = periodBills.filter(b => {
      const prop = properties.find(p => p.id === b.propertyId);
      return prop && prop.landlordId === selectedLandlord.id;
    });
    const landlordSettlements = periodSettlements.filter(s => s.partyType === 'landlord' && s.partyId === selectedLandlord.id);
    const landlordBatches = payoutBatches.filter(b => b.period === period && b.partyType === 'landlord' && b.partyId === selectedLandlord.id);
    
    const totalReceivable = landlordBills.reduce((a, b) => a + b.splitResult.landlordAmount, 0);
    const totalPaid = landlordSettlements.filter(s => s.status === 'paid').reduce((a, x) => a + x.totalAmount, 0);
    const totalPending = landlordSettlements.filter(s => s.status !== 'paid').reduce((a, x) => a + x.totalAmount, 0);
    
    return {
      bills: landlordBills.sort((a, b) => a.startDate.localeCompare(b.startDate)),
      settlements: landlordSettlements,
      batches: landlordBatches,
      totalReceivable,
      totalPaid,
      totalPending,
    };
  }, [selectedLandlord, periodBills, periodSettlements, payoutBatches, properties, period]);

  const getBatchForSettlement = (settlementId: string) => {
    return payoutBatches.find(b => b.settlementIds.includes(settlementId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="分账明细"
        description="按账期查看平台、物业、房东三方的收入归集，支持房东对账视角直接导出对账单。"
        actions={
          <button className="h-10 px-4 rounded-lg border border-gold-300 text-ink-800 text-sm hover:bg-cream-800 inline-flex items-center gap-2">
            <FileSpreadsheet size={14} /> 导出分账表
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 rounded-lg bg-ink-900/5 border border-gold-300">
            <button
              onClick={() => setTab('overview')}
              className={`h-9 px-4 rounded-md text-sm font-medium transition inline-flex items-center gap-1.5 ${
                tab === 'overview' ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
              }`}
            >
              <Wallet size={14} /> 整体分账
            </button>
            <button
              onClick={() => setTab('landlord')}
              className={`h-9 px-4 rounded-md text-sm font-medium transition inline-flex items-center gap-1.5 ${
                tab === 'landlord' ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
              }`}
            >
              <Users size={14} /> 房东对账
            </button>
          </div>
          <label className="inline-flex items-center gap-2">
            <Filter size={14} className="text-ink-700" />
            <span className="text-sm text-ink-800">账期</span>
            <input
              type="month" value={period}
              onChange={e => { setPeriod(e.target.value); setSelectedLandlord(null); }}
              className="h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </label>
        </div>
      </PageHeader>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard title="账单总数" value={`${periodBills.length} 笔`} accent="ink" sub={`总应收 ${formatMoney(agg.total)}`} />
            <SummaryCard title="基础租金池" value={formatMoney(agg.baseRent)} accent="moss" sub="参与抽成计算" />
            <SummaryCard title="水电代收" value={formatMoney(agg.utilities)} accent="gold" sub="全额转付房东" />
            <SummaryCard title="三方归集总额" value={formatMoney(agg.platform + agg.property + agg.landlord)} accent="coral" sub={`${period} 期`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-gold-200 p-5">
              <div className="font-serif text-base font-semibold text-ink-900 mb-1">三方收入占比</div>
              <div className="text-xs text-ink-700 mb-4">{period} 账期分账汇总</div>
              <DonutChart
                slices={[
                  { label: '运营平台', subLabel: `平台抽成收入`, value: agg.platform, color: '#0F3D2E' },
                  { label: '物业服务', subLabel: `物业服务费`, value: agg.property, color: '#4A7C59' },
                  { label: '所有房东', subLabel: `基础租金净额+水电`, value: agg.landlord, color: '#C8A96B' },
                ]}
              />
            </div>

            <div className="lg:col-span-3 bg-white rounded-xl shadow-card border border-gold-200 p-5">
              <div className="font-serif text-base font-semibold text-ink-900 mb-1">房东分账归集</div>
              <div className="text-xs text-ink-700 mb-4">点击行展开对应账单明细</div>

              <div className="space-y-2">
                {agg.byLandlord.map(r => {
                  const isOpen = expanded === r.name;
                  return (
                    <div key={r.name} className="rounded-xl border border-gold-200 overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : r.name)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-gold-100/30 transition text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 font-serif font-bold">
                          {r.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink-900">{r.name}</span>
                            <PartyBadge type="landlord" />
                            <span className="text-[11px] text-ink-700">{r.count} 笔账单</span>
                          </div>
                          <div className="text-[11px] text-ink-700 mt-0.5">房东应结收入</div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif font-bold text-xl gold-text">{formatMoney(r.amount)}</div>
                        </div>
                        <div className="ml-1 text-ink-700">
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-gold-200 bg-cream-800/40">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-ink-700 uppercase tracking-wider">
                                <th className="px-4 py-2 text-left">账单编号</th>
                                <th className="px-4 py-2 text-left">房源</th>
                                <th className="px-4 py-2 text-right">租期</th>
                                <th className="px-4 py-2 text-right">应收</th>
                                <th className="px-4 py-2 text-right">房东所得</th>
                                <th className="px-4 py-2 text-center">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.bills.map(b => (
                                <tr key={b.id} className="border-t border-gold-200/60 hover:bg-white/50">
                                  <td className="px-4 py-2.5 font-mono text-xs text-ink-700">{b.billNo}</td>
                                  <td className="px-4 py-2.5 text-ink-900">{b.propertyName}</td>
                                  <td className="px-4 py-2.5 text-right text-xs text-ink-700">{b.startDate.slice(5)}~{b.endDate.slice(5)}</td>
                                  <td className="px-4 py-2.5 text-right font-medium">{formatMoney(b.totalAmount)}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-ink-900">{formatMoney(b.splitResult.landlordAmount)}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button
                                      onClick={() => setViewBill(b)}
                                      className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-white border border-gold-300 text-xs text-ink-800 hover:bg-gold-100"
                                    >
                                      <Eye size={12} /> 查看
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {agg.byLandlord.length === 0 && (
                  <div className="h-48 flex items-center justify-center text-sm text-ink-700 bg-cream-800/40 rounded-lg border border-dashed border-gold-300">
                    当前账期暂无分账数据
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'landlord' && (
        <>
          {!selectedLandlord ? (
            <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gold-200">
                <div className="font-serif text-base font-semibold text-ink-900 flex items-center gap-2">
                  <Users size={18} className="text-ink-600" />
                  选择房东查看对账明细
                </div>
                <div className="text-xs text-ink-700 mt-1">{period} 账期 · 共 {landlords.length} 位房东</div>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {landlords.map(ld => {
                  const data = agg.byLandlord.find(x => x.name === ld.name);
                  const settled = data ? data.amount : 0;
                  return (
                    <button
                      key={ld.id}
                      onClick={() => setSelectedLandlord(ld)}
                      className="p-4 rounded-xl border border-gold-200 bg-gradient-to-br from-cream-900 to-white hover:border-gold-400 hover:shadow-lg transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 font-serif font-bold text-xl">
                          {ld.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink-900">{ld.name}</div>
                          <div className="text-[11px] text-ink-700 mt-0.5 flex items-center gap-1">
                            <CreditCard size={11} /> {ld.bankAccount || '未设置账户'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gold-200 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-ink-700">本期应结</div>
                          <div className="font-serif font-bold text-lg gold-text">{formatMoney(settled)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-ink-700">账单数</div>
                          <div className="font-semibold text-ink-900">{data?.count || 0} 笔</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setSelectedLandlord(null)}
                  className="h-8 px-3 rounded-md border border-gold-300 text-sm text-ink-800 hover:bg-cream-800 inline-flex items-center gap-1"
                >
                  <ChevronDown size={14} className="-rotate-90" /> 返回房东列表
                </button>
              </div>

              <div className="bg-gradient-to-br from-ink-900 to-ink-800 rounded-2xl shadow-elevated p-6 text-cream-900 overflow-hidden relative">
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gold-400/10" />
                <div className="absolute right-10 bottom-0 w-40 h-40 rounded-full bg-gold-400/5" />
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-ink-900 font-serif font-bold text-2xl">
                      {selectedLandlord.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-serif text-2xl font-bold">{selectedLandlord.name}</div>
                      <div className="text-sm text-cream-700 mt-1 flex items-center gap-2">
                        <PartyBadge type="landlord" />
                        <span className="inline-flex items-center gap-1">
                          <CreditCard size={12} /> {selectedLandlord.bankAccount || '未设置收款账户'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                      <div className="text-xs uppercase tracking-wide text-cream-700">本期应结总额</div>
                      <div className="mt-2 font-serif font-bold text-2xl gold-text">{formatMoney(landlordData?.totalReceivable || 0)}</div>
                      <div className="text-xs text-cream-700 mt-1">{landlordData?.bills.length || 0} 笔账单</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                      <div className="text-xs uppercase tracking-wide text-cream-700 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-ink-500" /> 已结金额
                      </div>
                      <div className="mt-2 font-serif font-bold text-2xl text-ink-400">{formatMoney(landlordData?.totalPaid || 0)}</div>
                      <div className="text-xs text-cream-700 mt-1">{landlordData?.settlements.filter(s => s.status === 'paid').length || 0} 张结算单</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                      <div className="text-xs uppercase tracking-wide text-cream-700 flex items-center gap-1">
                        <Clock size={12} className="text-gold-400" /> 待打款金额
                      </div>
                      <div className="mt-2 font-serif font-bold text-2xl text-gold-400">{formatMoney(landlordData?.totalPending || 0)}</div>
                      <div className="text-xs text-cream-700 mt-1">{landlordData?.settlements.filter(s => s.status !== 'paid').length || 0} 张结算单</div>
                    </div>
                  </div>
                </div>
              </div>

              {landlordData && landlordData.batches.length > 0 && (
                <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gold-200 flex items-center gap-2">
                    <Layers size={18} className="text-ink-600" />
                    <div className="font-serif text-base font-semibold text-ink-900">关联打款批次</div>
                    <div className="text-xs text-ink-700">共 {landlordData.batches.length} 个批次</div>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {landlordData.batches.map(batch => (
                      <div key={batch.id} className="p-4 rounded-xl border border-gold-200 bg-cream-800/40">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-ink-700">{batch.batchNo}</span>
                          {batch.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-400/30 text-ink-800 text-[11px] font-medium">
                              <Clock size={10} /> 待打款
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-500/15 text-ink-800 text-[11px] font-medium">
                              <CheckCircle2 size={10} /> 已打款
                            </span>
                          )}
                        </div>
                        <div className="mt-2 font-serif font-bold text-xl gold-text">{formatMoney(batch.totalAmount)}</div>
                        <div className="text-[11px] text-ink-700 mt-1">含 {batch.settlementIds.length} 张结算单</div>
                        {batch.paidAt && <div className="text-[11px] text-ink-700 mt-0.5">打款时间：{batch.paidAt}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gold-200 flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-ink-600" />
                  <div className="font-serif text-base font-semibold text-ink-900">本期账单明细</div>
                  <div className="text-xs text-ink-700">共 {landlordData?.bills.length || 0} 笔</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-zebra text-sm">
                    <thead>
                      <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                        <th className="px-5 py-3 text-left font-semibold">账单编号</th>
                        <th className="px-5 py-3 text-left font-semibold">房源</th>
                        <th className="px-5 py-3 text-left font-semibold">租期</th>
                        <th className="px-5 py-3 text-right font-semibold">应收总额</th>
                        <th className="px-5 py-3 text-right font-semibold">基础租金</th>
                        <th className="px-5 py-3 text-right font-semibold">水电公摊</th>
                        <th className="px-5 py-3 text-right font-semibold">房东应得</th>
                        <th className="px-5 py-3 text-center font-semibold">结算单</th>
                        <th className="px-5 py-3 text-center font-semibold">打款批次</th>
                        <th className="px-5 py-3 text-center font-semibold">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {landlordData?.bills.map(b => {
                        const s = findSettlementForBill(b);
                        const batch = s ? getBatchForSettlement(s.id) : null;
                        return (
                          <tr key={b.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                            <td className="px-5 py-3 font-mono text-xs text-ink-700">{b.billNo}</td>
                            <td className="px-5 py-3 font-medium text-ink-900">{b.propertyName}</td>
                            <td className="px-5 py-3 text-xs text-ink-700">{b.startDate.slice(5)} ~ {b.endDate.slice(5)}</td>
                            <td className="px-5 py-3 text-right font-semibold text-ink-900">{formatMoney(b.totalAmount)}</td>
                            <td className="px-5 py-3 text-right text-ink-800">{formatMoney(b.baseRent)}</td>
                            <td className="px-5 py-3 text-right text-ink-800">{formatMoney(b.utilities.water.amount + b.utilities.electric.amount + b.utilities.commonArea)}</td>
                            <td className="px-5 py-3 text-right font-serif font-bold text-lg gold-text">{formatMoney(b.splitResult.landlordAmount)}</td>
                            <td className="px-5 py-3 text-center">
                              {s ? <span className="font-mono text-[11px] text-ink-700">{s.settlementNo}</span> : <span className="text-ink-600 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {batch ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-ink-500/10 text-ink-800 font-medium">
                                  <CreditCard size={11} /> {batch.batchNo}
                                </span>
                              ) : <span className="text-ink-600 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <BillStatusBadge status={b.status} />
                            </td>
                          </tr>
                        );
                      })}
                      {!landlordData || landlordData.bills.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-5 py-16 text-center text-ink-700 text-sm">
                            <FileText size={36} className="mx-auto mb-3 opacity-50 text-ink-600" />
                            该房东本期暂无账单
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {viewBill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewBill(null)}>
          <div
            className="bg-cream-900 rounded-2xl shadow-elevated w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gold-200 flex items-start justify-between bg-gradient-to-br from-ink-900 to-ink-800 text-cream-900 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gold-300">{viewBill.billNo}</span>
                  <BillStatusBadge status={viewBill.status} />
                </div>
                <div className="font-serif text-xl font-bold mt-1">{viewBill.propertyName}</div>
                <div className="text-xs text-cream-700 mt-1">{viewBill.tenantName} · {viewBill.startDate} ~ {viewBill.endDate} · 共 {viewBill.totalDays} 天</div>
              </div>
              <button onClick={() => setViewBill(null)} className="text-cream-700 hover:text-cream-900 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-5 text-sm overflow-y-auto flex-1">
              <div>
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileText size={14} /> 基础租金（分档计费）
                </div>
                <div className="space-y-1.5 bg-white rounded-lg p-3 border border-gold-200">
                  {viewBill.segments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.tierColor }} />
                        <span className="text-ink-800">{seg.tierName}</span>
                        <span className="text-xs text-ink-700">{seg.startDate.slice(5)} ~ {seg.endDate.slice(5)} · {seg.days} 天</span>
                      </div>
                      <div className="text-right">
                        <span className="text-ink-700 text-xs">¥{seg.unitPrice}/天</span>
                        <span className="ml-2 font-semibold text-ink-900">{formatMoney(seg.amount)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-gold-200 flex items-center justify-between">
                    <span className="font-medium text-ink-800">基础租金合计</span>
                    <span className="font-serif font-bold text-ink-900">{formatMoney(viewBill.baseRent)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Droplets size={14} /> 水费
                </div>
                <div className="bg-white rounded-lg p-3 border border-gold-200 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-700">上次读数</div>
                    <div className="font-medium text-ink-900">{viewBill.utilities.water.previous} 吨</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-700">本次读数</div>
                    <div className="font-medium text-ink-900">{viewBill.utilities.water.current} 吨</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-700">用量 / 单价</div>
                    <div className="font-medium text-ink-900">{viewBill.utilities.water.usage} 吨 · ¥{viewBill.utilities.water.unitPrice}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Zap size={14} /> 电费
                </div>
                <div className="bg-white rounded-lg p-3 border border-gold-200 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-700">上次读数</div>
                    <div className="font-medium text-ink-900">{viewBill.utilities.electric.previous} 度</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-700">本次读数</div>
                    <div className="font-medium text-ink-900">{viewBill.utilities.electric.current} 度</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-700">用量 / 单价</div>
                    <div className="font-medium text-ink-900">{viewBill.utilities.electric.usage} 度 · ¥{viewBill.utilities.electric.unitPrice}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Building2 size={14} /> 公摊费用
                </div>
                <div className="bg-white rounded-lg p-3 border border-gold-200 flex items-center justify-between text-sm">
                  <span className="text-ink-700">公摊费用（按房源面积分摊）</span>
                  <span className="font-medium text-ink-900">{formatMoney(viewBill.utilities.commonArea)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gold-200">
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-ink-900">应收总额</span>
                  <span className="font-serif font-bold text-2xl gold-text">{formatMoney(viewBill.totalAmount)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gold-200">
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">分账结果</div>
                <div className="space-y-1.5">
                  <SplitRow label="运营平台抽成" value={viewBill.splitResult.platformAmount} />
                  <SplitRow label="物业服务费" value={viewBill.splitResult.propertyFeeAmount} />
                  <SplitRow label="房东应结" value={viewBill.splitResult.landlordAmount} highlight sub={`含水电代收 ${formatMoney(viewBill.splitResult.utilitiesPassThrough)}`} />
                </div>
              </div>

              <div className="pt-2 border-t border-gold-200">
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Wallet size={14} /> 关联结算单
                </div>
                {findSettlementForBill(viewBill) ? (
                  <div className="bg-gradient-to-r from-gold-400/20 to-gold-300/20 rounded-lg p-3 border border-gold-300 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-ink-700">{findSettlementForBill(viewBill)?.settlementNo}</div>
                      <div className="text-sm font-medium text-ink-900 mt-0.5">{findSettlementForBill(viewBill)?.partyName}</div>
                    </div>
                    <div className="text-right">
                      <SettlementStatusBadge status={findSettlementForBill(viewBill)!.status} />
                      <div className="text-xs text-ink-700 mt-1">房东应结 {formatMoney(findSettlementForBill(viewBill)!.totalAmount)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-ink-700 bg-cream-800/40 rounded-lg p-3 border border-dashed border-gold-300 text-center">
                    该账期尚未生成结算单，请前往「月度对账」执行核算
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, accent, sub }: { title: string; value: string; accent: 'ink' | 'gold' | 'moss' | 'coral'; sub?: string }) {
  const accentMap = {
    ink: 'from-ink-900 to-ink-700 text-cream-900',
    gold: 'from-gold-500 to-gold-300 text-ink-900',
    moss: 'from-ink-700 to-ink-500 text-cream-900',
    coral: 'from-coral-500 to-coral-400 text-ink-900',
  };
  return (
    <div className={`relative rounded-xl p-5 bg-gradient-to-br ${accentMap[accent]} shadow-card overflow-hidden`}>
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10 bg-current" />
      <div className="relative">
        <div className="text-xs opacity-80 uppercase tracking-wide">{title}</div>
        <div className="mt-2 font-serif font-bold text-2xl gold-text">{value}</div>
        {sub && <div className="text-[11px] opacity-75 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function SplitRow({ label, value, bold, highlight, sub }: { label: string; value: number; bold?: boolean; highlight?: boolean; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <span className={highlight ? 'font-semibold text-ink-900' : bold ? 'font-medium text-ink-800' : 'text-ink-700'}>{label}</span>
        {sub && <div className="text-[11px] text-ink-700 mt-0.5">{sub}</div>}
      </div>
      <span className={highlight
        ? 'font-serif font-bold text-xl gold-text'
        : bold
          ? 'font-serif font-bold text-lg text-ink-900'
          : 'font-medium text-ink-900'}>
        {formatMoney(value)}
      </span>
    </div>
  );
}
