import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { formatMoney, getYearMonth } from '@/utils';
import { BillStatusBadge } from '@/components/StatusBadge';
import { Search, Filter, Plus, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Bill } from '@/types';

const filters: { key: Bill['status'] | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'generated', label: '已生成' },
  { key: 'confirmed', label: '已确认' },
  { key: 'paid', label: '已收款' },
  { key: 'draft', label: '草稿' },
];

export default function BillList() {
  const { bills, updateBillStatus, deleteBill } = useAppStore();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Bill['status'] | 'all'>('all');
  const [period, setPeriod] = useState('');
  const [viewing, setViewing] = useState<Bill | null>(null);
  const nav = useNavigate();

  const list = bills.filter(b => {
    if (f !== 'all' && b.status !== f) return false;
    if (period && getYearMonth(b.startDate) !== period) return false;
    if (q && !(b.billNo.includes(q) || b.propertyName.includes(q) || b.tenantName.includes(q))) return false;
    return true;
  });

  const totalAmount = list.reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="账单列表"
        description="查看与管理所有租金账单，支持多条件筛选与状态流转。"
        actions={
          <button
            onClick={() => nav('/bills/generator')}
            className="btn-elev inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 font-semibold text-sm shadow-card"
          >
            <Plus size={16} /> 新建账单
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索编号 / 房源 / 租户..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </div>
          <label className="flex items-center gap-2">
            <Filter size={14} className="text-ink-700" />
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-white border border-gold-300">
            {filters.map(x => (
              <button
                key={x.key}
                onClick={() => setF(x.key)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition ${
                  f === x.key ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-ink-700">
            筛选结果 <b className="text-ink-900">{list.length}</b> 笔 · 合计
            <span className="ml-1 font-serif font-bold text-lg gold-text">{formatMoney(totalAmount)}</span>
          </div>
        </div>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full table-zebra text-sm">
            <thead>
              <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">账单编号</th>
                <th className="px-5 py-3 text-left font-semibold">房源</th>
                <th className="px-5 py-3 text-left font-semibold">租户</th>
                <th className="px-5 py-3 text-left font-semibold">租期</th>
                <th className="px-5 py-3 text-center font-semibold">天数</th>
                <th className="px-5 py-3 text-right font-semibold">基础租金</th>
                <th className="px-5 py-3 text-right font-semibold">水电公摊</th>
                <th className="px-5 py-3 text-right font-semibold">应收</th>
                <th className="px-5 py-3 text-center font-semibold">状态</th>
                <th className="px-5 py-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                  <td className="px-5 py-3 font-mono text-xs text-ink-700">{b.billNo}</td>
                  <td className="px-5 py-3 font-medium text-ink-900 whitespace-nowrap">{b.propertyName}</td>
                  <td className="px-5 py-3">{b.tenantName}</td>
                  <td className="px-5 py-3 text-xs text-ink-700 whitespace-nowrap">{b.startDate} ~ {b.endDate}</td>
                  <td className="px-5 py-3 text-center">{b.totalDays}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(b.baseRent)}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(b.totalAmount - b.baseRent)}</td>
                  <td className="px-5 py-3 text-right font-bold text-ink-900 font-serif">{formatMoney(b.totalAmount)}</td>
                  <td className="px-5 py-3 text-center"><BillStatusBadge status={b.status} /></td>
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setViewing(b)}
                        className="h-8 px-2 rounded-md text-ink-800 hover:bg-cream-800 inline-flex items-center gap-1 text-xs"
                      >
                        <Eye size={13} /> 明细
                      </button>
                      {b.status === 'generated' && (
                        <button
                          onClick={() => updateBillStatus(b.id, 'confirmed')}
                          className="h-8 px-2 rounded-md bg-ink-500/10 text-ink-800 hover:bg-ink-500/20 inline-flex items-center gap-1 text-xs"
                        >
                          <CheckCircle2 size={13} /> 确认
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => updateBillStatus(b.id, 'paid')}
                          className="h-8 px-2 rounded-md bg-gold-400/30 text-ink-900 hover:bg-gold-400/50 inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          标记收款
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`确认删除账单 ${b.billNo}？`)) deleteBill(b.id);
                        }}
                        className="h-8 px-2 rounded-md text-coral-500 hover:bg-coral-500/10 inline-flex items-center gap-1 text-xs"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center text-ink-700 text-sm">
                    暂无匹配账单
                    <Link to="/bills/generator" className="ml-2 text-gold-500 hover:underline">立即创建</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <BillDetailModal bill={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function BillDetailModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { landlords, properties, splitRules } = useAppStore();
  const prop = properties.find(p => p.id === bill.propertyId);
  const ld = prop ? landlords.find(l => l.id === prop.landlordId) : null;
  const rule = splitRules.find(r => r.id === bill.splitResult.ruleId);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-cream-900 rounded-2xl shadow-elevated w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gold-200 flex items-start justify-between sticky top-0 bg-cream-900 z-10">
          <div>
            <div className="text-xs text-ink-700 font-mono">{bill.billNo}</div>
            <div className="font-serif text-2xl text-ink-900 font-bold mt-1">{bill.propertyName}</div>
            <div className="text-sm text-ink-700 mt-1">
              {bill.tenantName} · {bill.startDate} ~ {bill.endDate}（{bill.totalDays}天）
            </div>
          </div>
          <button onClick={onClose} className="text-ink-700 hover:text-ink-900 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-3">分段计费明细</div>
            <div className="p-4 rounded-xl bg-white border border-gold-200 space-y-2">
              {bill.segments.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gold-100 last:border-b-0">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.tierColor }} />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-ink-900">{s.tierName} · {s.days}天</div>
                    <div className="text-xs text-ink-700">{s.startDate} ~ {s.endDate}</div>
                  </div>
                  <div className="text-xs text-ink-700">{formatMoneyPlain(s.unitPrice)}/天</div>
                  <div className="text-right w-24 font-bold text-ink-900 font-serif">{formatMoney(s.amount)}</div>
                </div>
              ))}
              <div className="pt-3 mt-2 border-t-2 border-gold-300 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-800">基础租金小计</span>
                <span className="font-serif font-bold text-xl text-ink-900">{formatMoney(bill.baseRent)}</span>
              </div>
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-3">水电与公摊</div>
            <div className="p-4 rounded-xl bg-white border border-gold-200 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>水费（{bill.utilities.water.usage}吨 × {formatMoney(bill.utilities.water.unitPrice)}/吨）</span>
                <span className="font-medium">{formatMoney(bill.utilities.water.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>电费（{bill.utilities.electric.usage}度 × {formatMoney(bill.utilities.electric.unitPrice)}/度）</span>
                <span className="font-medium">{formatMoney(bill.utilities.electric.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>公摊费用（物业、公共照明等）</span>
                <span className="font-medium">{formatMoney(bill.utilities.commonArea)}</span>
              </div>
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-3">抽成分账 · {rule?.name || ''}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SplitTile label="运营平台" amount={bill.splitResult.platformAmount} pct={rule?.platformCut || 0} color="#0F3D2E" />
              <SplitTile label="物业服务" amount={bill.splitResult.propertyFeeAmount} pct={rule?.propertyFee || 0} color="#4A7C59" />
              <SplitTile label={`房东·${ld?.name || '-'}`} amount={bill.splitResult.landlordAmount} pct={rule?.landlordCut || 0} color="#C8A96B" sub={`含代收水电 ${formatMoney(bill.splitResult.utilitiesPassThrough)}`} />
            </div>
          </section>

          <div className="p-5 rounded-xl bg-gradient-to-br from-ink-900 to-ink-800 text-cream-900 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gold-300">应收总额</div>
              <div className="text-xs text-cream-700 mt-1">基础租金 + 水电 + 公摊</div>
            </div>
            <div className="font-serif font-bold text-3xl gold-text">{formatMoney(bill.totalAmount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitTile({ label, amount, pct, color, sub }: { label: string; amount: number; pct: number; color: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-gold-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-ink-500/10 text-ink-700">{(pct * 100).toFixed(0)}%</span>
      </div>
      <div className="font-serif font-bold text-xl text-ink-900">{formatMoney(amount)}</div>
      {sub && <div className="text-[11px] text-ink-700 mt-1">{sub}</div>}
    </div>
  );
}

function formatMoneyPlain(n: number) {
  return n.toFixed(0);
}
