import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore, currentPeriod } from '@/store/appStore';
import { formatMoney, getYearMonth } from '@/utils';
import DonutChart from '@/components/DonutChart';
import { PartyBadge } from '@/components/StatusBadge';
import { FileSpreadsheet, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import type { Bill } from '@/types';

export default function SplitDetails() {
  const { bills, landlords } = useAppStore();
  const [period, setPeriod] = useState(currentPeriod());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewBill, setViewBill] = useState<Bill | null>(null);

  const periodBills = useMemo(
    () => bills.filter(b => getYearMonth(b.startDate) === period),
    [bills, period],
  );

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
      const prop = useAppStore.getState().properties.find(p => p.id === b.propertyId);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="分账明细"
        description="按账期查看平台、物业、房东三方的收入归集，可按房东维度展开查看明细账单。"
        actions={
          <button className="h-10 px-4 rounded-lg border border-gold-300 text-ink-800 text-sm hover:bg-cream-800 inline-flex items-center gap-2">
            <FileSpreadsheet size={14} /> 导出分账表
          </button>
        }
      >
        <label className="inline-flex items-center gap-2">
          <Filter size={14} className="text-ink-700" />
          <span className="text-sm text-ink-800">账期</span>
          <input
            type="month" value={period}
            onChange={e => setPeriod(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
          />
        </label>
      </PageHeader>

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

      {viewBill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewBill(null)}>
          <div
            className="bg-cream-900 rounded-2xl shadow-elevated w-full max-w-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gold-200 flex items-start justify-between bg-gradient-to-br from-ink-900 to-ink-800 text-cream-900">
              <div>
                <div className="text-xs font-mono text-gold-300">{viewBill.billNo}</div>
                <div className="font-serif text-xl font-bold mt-1">{viewBill.propertyName}</div>
                <div className="text-xs text-cream-700 mt-1">{viewBill.tenantName} · {viewBill.startDate} ~ {viewBill.endDate}</div>
              </div>
              <button onClick={() => setViewBill(null)} className="text-cream-700 hover:text-cream-900 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <SplitRow label="应收总额" value={viewBill.totalAmount} bold />
              <div className="pt-2 mt-2 border-t border-gold-200">
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">分账结果</div>
                <SplitRow label="运营平台" value={viewBill.splitResult.platformAmount} />
                <SplitRow label="物业服务" value={viewBill.splitResult.propertyFeeAmount} />
                <SplitRow label="房东结算" value={viewBill.splitResult.landlordAmount} highlight sub={`含水电代收 ${formatMoney(viewBill.splitResult.utilitiesPassThrough)}`} />
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
