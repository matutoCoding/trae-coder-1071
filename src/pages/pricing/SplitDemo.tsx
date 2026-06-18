import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { computeBillingSegments } from '@/utils/billingEngine';
import SegmentBar from '@/components/SegmentBar';
import { Calendar, Zap } from 'lucide-react';
import { formatMoney, daysBetween, formatDateCN } from '@/utils';

const quickRanges = [
  { label: '单月（3月整）', s: '2026-03-01', e: '2026-03-31' },
  { label: '跨平旺（5.15 ~ 6.20）', s: '2026-05-15', e: '2026-06-20' },
  { label: '跨旺淡（8.20 ~ 12.15）', s: '2026-08-20', e: '2026-12-15' },
  { label: '跨年整租（11.1 ~ 2.28）', s: '2026-11-01', e: '2027-02-28' },
];

export default function SplitDemo() {
  const { seasonTiers, properties } = useAppStore();
  const [startDate, setStartDate] = useState('2026-05-15');
  const [endDate, setEndDate] = useState('2026-06-20');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');

  const result = useMemo(() => {
    if (!startDate || !endDate) return null;
    return computeBillingSegments(startDate, endDate, seasonTiers);
  }, [startDate, endDate, seasonTiers]);

  const prop = properties.find(p => p.id === propertyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="跨档拆分演示"
        description="选择租期区间，可视化展示系统如何识别季节切换点并按档拆分计费。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-card border border-gold-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gold-500" />
            <div className="font-serif text-base font-semibold text-ink-900">参数设置</div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">选择房源</span>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
            >
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}（{p.type} · {p.area}㎡）</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">起租日</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">结束日</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
              />
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">快捷场景</div>
            <div className="flex flex-wrap gap-2">
              {quickRanges.map(q => (
                <button
                  key={q.label}
                  onClick={() => { setStartDate(q.s); setEndDate(q.e); }}
                  className={`h-8 px-3 rounded-md text-xs font-medium transition ${
                    startDate === q.s && endDate === q.e
                      ? 'bg-ink-900 text-cream-900'
                      : 'bg-cream-800 text-ink-800 hover:bg-gold-200'
                  }`}
                >
                  <Zap size={11} className="inline -mt-0.5 mr-1" />{q.label}
                </button>
              ))}
            </div>
          </div>

          {prop && (
            <div className="pt-4 border-t border-gold-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-700">房源</span>
                <span className="font-medium text-ink-900">{prop.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-700">租期天数</span>
                <span className="font-medium text-ink-900">{daysBetween(startDate, endDate)} 天</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-700">区间跨度</span>
                <span className="font-medium text-ink-900 text-right text-xs">
                  {formatDateCN(startDate)}<br />至 {formatDateCN(endDate)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-gold-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-serif text-base font-semibold text-ink-900">分段计费结果</div>
              <div className="text-xs text-ink-700 mt-0.5">按季节切换点自动切分，各段独立计算后求和</div>
            </div>
            {result && (
              <div className="text-right">
                <div className="text-xs text-ink-700 uppercase tracking-wide">基础租金合计</div>
                <div className="font-serif text-3xl font-bold gold-text mt-0.5">
                  {formatMoney(result.baseRent)}
                </div>
                <div className="text-xs text-ink-700 mt-0.5">共 {result.segments.length} 个分段 · {result.totalDays} 天</div>
              </div>
            )}
          </div>

          {result && result.segments.length > 0 ? (
            <>
              <SegmentBar segments={result.segments} totalRent={result.baseRent} />

              <div className="mt-6 p-4 rounded-xl bg-cream-800/50 border border-gold-200">
                <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-3">算法说明</div>
                <ol className="space-y-2 text-sm text-ink-800 list-decimal list-inside">
                  <li>系统识别租期 <b>{startDate} ~ {endDate}</b> 内所有季节切换点；</li>
                  <li>按切换点将区间切分为 <b>{result.segments.length}</b> 个连续子段；</li>
                  <li>每个子段匹配对应季节档费率，段费 = 天数 × 日单价；</li>
                  <li>各段费用求和得到基础租金 <b>{formatMoney(result.baseRent)}</b>。</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-sm text-ink-700 bg-cream-800/40 rounded-lg border border-dashed border-gold-300">
              请设置有效的租期区间以查看拆分结果
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
