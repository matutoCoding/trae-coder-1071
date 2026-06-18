import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/utils';
import { Droplets, Zap, Building2, Calculator, Users, Ruler } from 'lucide-react';

type Rule = 'area' | 'count' | 'flat';

export default function Utilities() {
  const { properties, bills, updateBillUtilities } = useAppStore();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [waterTotal, setWaterTotal] = useState(2480);
  const [waterUnitPrice, setWaterUnitPrice] = useState(5.5);
  const [elecTotal, setElecTotal] = useState(18600);
  const [elecUnitPrice, setElecUnitPrice] = useState(0.85);
  const [commonFee, setCommonFee] = useState(3600);
  const [rule, setRule] = useState<Rule>('area');
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const billed = useMemo(() => {
    return properties.filter(p => p.status === 'rented').map(p => {
      return { property: p, bill: bills.find(b => b.propertyId === p.id && b.startDate.startsWith(period)) };
    });
  }, [properties, bills, period]);

  const totalArea = billed.reduce((s, x) => s + x.property.area, 0);
  const totalCount = billed.length;

  const waterPerUnit = rule === 'area' ? waterTotal / Math.max(1, totalArea) : rule === 'count' ? waterTotal / Math.max(1, totalCount) : waterTotal / Math.max(1, totalCount);
  const elecPerUnit = rule === 'area' ? elecTotal / Math.max(1, totalArea) : rule === 'count' ? elecTotal / Math.max(1, totalCount) : elecTotal / Math.max(1, totalCount);
  const commonPerUnit = rule === 'area' ? commonFee / Math.max(1, totalArea) : rule === 'count' ? commonFee / Math.max(1, totalCount) : commonFee / Math.max(1, totalCount);

  const ruleLabel = {
    area: '按建筑面积分摊',
    count: '按户数均摊',
    flat: '按固定金额均摊',
  }[rule];

  const applyToBills = () => {
    let updated = 0;
    billed.forEach(({ property: p, bill }) => {
      if (!bill) return;
      const base = rule === 'area' ? p.area : 1;
      const wUsage = Number((waterPerUnit * base).toFixed(1));
      const wAmount = Number((wUsage * waterUnitPrice).toFixed(2));
      const eUsage = Number((elecPerUnit * base).toFixed(0));
      const eAmount = Number((eUsage * elecUnitPrice).toFixed(2));
      const cAmount = Number((commonPerUnit * base).toFixed(2));
      updateBillUtilities(bill.id,
        { usage: wUsage, amount: wAmount, unitPrice: waterUnitPrice, previous: bill.utilities.water.previous, current: bill.utilities.water.previous + wUsage },
        { usage: eUsage, amount: eAmount, unitPrice: elecUnitPrice, previous: bill.utilities.electric.previous, current: bill.utilities.electric.previous + eUsage },
        cAmount,
      );
      updated += 1;
    });
    setApplyResult(`已更新 ${updated} 笔账单的水电公摊金额`);
    setTimeout(() => setApplyResult(null), 4000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="水电分摊计费"
        description="录入整栋/整层总表读数，选择分摊规则（面积/户数/固定），系统自动核算各房源应缴。"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <span className="text-sm text-ink-800">账期</span>
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </label>
          <div className="flex p-1 rounded-lg bg-white border border-gold-300">
            {[
              { k: 'area' as Rule, label: '按面积', icon: <Ruler size={13} /> },
              { k: 'count' as Rule, label: '按户数', icon: <Users size={13} /> },
              { k: 'flat' as Rule, label: '均摊', icon: <Calculator size={13} /> },
            ].map(x => (
              <button
                key={x.k}
                onClick={() => setRule(x.k)}
                className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  rule === x.k ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
                }`}
              >
                {x.icon} {x.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-ink-700">
            <b>{billed.length}</b> 套在租房源参与分摊 · 总建筑面积 <b>{totalArea}</b>㎡
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Droplets size={18} className="text-ink-600" />
              <div className="font-serif text-base font-semibold text-ink-900">水费总表</div>
            </div>
            <label className="block mb-3">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">总用水量（吨）</span>
              <input type="number" value={waterTotal} onChange={e => setWaterTotal(+e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">单价（元/吨）</span>
              <input type="number" step="0.1" value={waterUnitPrice} onChange={e => setWaterUnitPrice(+e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm" />
            </label>
            <div className="mt-4 p-3 rounded-lg bg-ink-900 text-cream-900">
              <div className="text-xs opacity-75">水费总计</div>
              <div className="mt-1 font-serif font-bold text-2xl gold-text">{formatMoney(waterTotal * waterUnitPrice)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-gold-500" />
              <div className="font-serif text-base font-semibold text-ink-900">电费总表</div>
            </div>
            <label className="block mb-3">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">总用电量（度）</span>
              <input type="number" value={elecTotal} onChange={e => setElecTotal(+e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">单价（元/度）</span>
              <input type="number" step="0.01" value={elecUnitPrice} onChange={e => setElecUnitPrice(+e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm" />
            </label>
            <div className="mt-4 p-3 rounded-lg bg-gold-500/90 text-ink-900">
              <div className="text-xs opacity-75">电费总计</div>
              <div className="mt-1 font-serif font-bold text-2xl">{formatMoney(elecTotal * elecUnitPrice)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-ink-600" />
              <div className="font-serif text-base font-semibold text-ink-900">公摊费用</div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">公共服务费（元）</span>
              <input type="number" value={commonFee} onChange={e => setCommonFee(+e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm" />
              <div className="text-[11px] text-ink-700 mt-1.5">包含物业管理、公共照明、电梯运维等</div>
            </label>
            <div className="mt-4 p-3 rounded-lg bg-cream-800 text-ink-800">
              <div className="text-xs opacity-75">合计需分摊</div>
              <div className="mt-1 font-serif font-bold text-2xl text-ink-900">{formatMoney(commonFee)}</div>
              <div className="text-[11px] mt-2 text-ink-700">分摊规则：{ruleLabel}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gold-200 flex items-center justify-between">
              <div>
                <div className="font-serif text-base font-semibold text-ink-900">房源分摊明细</div>
                <div className="text-xs text-ink-700 mt-0.5">{period} 账期 · 依据「{ruleLabel}」</div>
              </div>
              <div className="flex items-center gap-3">
                {applyResult && (
                  <span className="text-xs font-semibold text-ink-900 bg-ink-500/15 px-3 py-1.5 rounded-lg">
                    {applyResult}
                  </span>
                )}
                <button
                  onClick={applyToBills}
                  disabled={billed.filter(x => x.bill).length === 0}
                  className="h-9 px-4 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 text-sm font-semibold shadow-card btn-elev inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calculator size={14} /> 应用到各账单
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-zebra text-sm">
                <thead>
                  <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">房源</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      {rule === 'area' ? '面积(㎡)' : '户型'}
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">水(吨/元)</th>
                    <th className="px-5 py-3 text-right font-semibold">电(度/元)</th>
                    <th className="px-5 py-3 text-right font-semibold">公摊</th>
                    <th className="px-5 py-3 text-right font-semibold">合计</th>
                  </tr>
                </thead>
                <tbody>
                  {billed.map(({ property: p, bill }) => {
                    const base = rule === 'area' ? p.area : 1;
                    const wUsage = waterPerUnit * base;
                    const wAmount = wUsage * waterUnitPrice;
                    const eUsage = elecPerUnit * base;
                    const eAmount = eUsage * elecUnitPrice;
                    const cAmount = commonPerUnit * base;
                    const sum = Number((wAmount + eAmount + cAmount).toFixed(2));
                    return (
                      <tr key={p.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-ink-900">{p.name}</div>
                          <div className="text-[11px] text-ink-700 mt-0.5">{p.type} · {p.area}㎡ · {bill ? '已有账单' : '未生成账单'}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-ink-800">
                          {rule === 'area' ? p.area : p.type}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="text-ink-800">{wUsage.toFixed(1)}</div>
                          <div className="text-xs font-semibold text-ink-900">{formatMoney(wAmount)}</div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="text-ink-800">{eUsage.toFixed(0)}</div>
                          <div className="text-xs font-semibold text-ink-900">{formatMoney(eAmount)}</div>
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{formatMoney(cAmount)}</td>
                        <td className="px-5 py-3 text-right font-serif font-bold text-ink-900 text-base">{formatMoney(sum)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-ink-900 text-cream-900">
                    <td className="px-5 py-3 font-serif font-bold text-lg">合计</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {rule === 'area' ? `${totalArea}㎡` : `${totalCount}户`}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div>{waterTotal}</div>
                      <div className="text-xs font-semibold text-gold-300">{formatMoney(waterTotal * waterUnitPrice)}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div>{elecTotal}</div>
                      <div className="text-xs font-semibold text-gold-300">{formatMoney(elecTotal * elecUnitPrice)}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gold-300">{formatMoney(commonFee)}</td>
                    <td className="px-5 py-3 text-right font-serif font-bold text-2xl gold-text">
                      {formatMoney(waterTotal * waterUnitPrice + elecTotal * elecUnitPrice + commonFee)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
