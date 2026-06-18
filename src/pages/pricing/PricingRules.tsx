import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import type { SeasonTier } from '@/types';
import { Plus, Trash2, Save, Palette, Moon, Sun, Leaf } from 'lucide-react';
import { uid, formatMoney } from '@/utils';

const tierPresets = [
  { color: '#E07A5F', icon: <Sun size={14} />, name: '旺季' },
  { color: '#C8A96B', icon: <Leaf size={14} />, name: '平季' },
  { color: '#6D9978', icon: <Moon size={14} />, name: '淡季' },
  { color: '#0F3D2E', icon: <Palette size={14} />, name: '自定义' },
];

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const daysByMonth = (m: number) => {
  const d = new Date(2024, m, 0);
  return d.getDate();
};

export default function PricingRules() {
  const { seasonTiers, upsertSeasonTier, deleteSeasonTier } = useAppStore();
  const [editing, setEditing] = useState<SeasonTier | null>(null);
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setEditing({
      id: uid(), name: '新时段', color: '#C8A96B',
      startMonth: 1, startDay: 1, endMonth: 12, endDay: 31,
      dailyRate: 120, monthlyRate: 3300,
    });
    setShowForm(true);
  };

  const openEdit = (t: SeasonTier) => {
    setEditing({ ...t });
    setShowForm(true);
  };

  const save = () => {
    if (!editing) return;
    if (editing.dailyRate <= 0 || editing.monthlyRate <= 0) {
      alert('请填写有效费率');
      return;
    }
    upsertSeasonTier(editing);
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="费率规则配置"
        description="定义全年分档季节时段，配置各档日租/月租单价。系统按此自动跨档拆分计费。"
        actions={
          <button
            onClick={openNew}
            className="btn-elev inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 font-semibold text-sm shadow-card"
          >
            <Plus size={16} />
            新增季节档
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
        <div className="font-serif text-base text-ink-900 font-semibold mb-1">年度季节时间轴</div>
        <p className="text-xs text-ink-700 mb-5">可视化查看全年各季节档的分布情况</p>
        <YearTimeline tiers={seasonTiers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {seasonTiers.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
            <div
              className="h-24 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${t.color} 0%, ${t.color}BB 100%)` }}
            >
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 35%)',
              }} />
              <div className="relative p-4 h-full flex flex-col justify-between text-white">
                <div className="flex items-start justify-between">
                  <div className="font-serif text-lg font-bold">{t.name}</div>
                  <button
                    onClick={() => deleteSeasonTier(t.id)}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur-sm"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-xs opacity-90">
                  {String(t.startMonth).padStart(2, '0')}/{String(t.startDay).padStart(2, '0')} &nbsp;→&nbsp;
                  {String(t.endMonth).padStart(2, '0')}/{String(t.endDay).padStart(2, '0')}
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-cream-800/50">
                  <div className="text-[11px] text-ink-700 uppercase tracking-wide">日单价</div>
                  <div className="mt-1 font-serif font-bold text-xl text-ink-900">{formatMoney(t.dailyRate)}</div>
                </div>
                <div className="p-3 rounded-lg bg-cream-800/50">
                  <div className="text-[11px] text-ink-700 uppercase tracking-wide">月单价</div>
                  <div className="mt-1 font-serif font-bold text-xl text-ink-900">{formatMoney(t.monthlyRate)}</div>
                </div>
              </div>
              <button
                onClick={() => openEdit(t)}
                className="w-full h-9 rounded-lg bg-ink-900 text-cream-900 text-sm font-medium hover:bg-ink-800 transition inline-flex items-center justify-center gap-2"
              >
                <Save size={14} />
                编辑此费率档
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-cream-900 rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="p-6 border-b border-gold-200 flex items-start justify-between">
              <div>
                <div className="font-serif text-xl text-ink-900 font-semibold">
                  {seasonTiers.some(x => x.id === editing.id) ? '编辑季节费率档' : '新增季节费率档'}
                </div>
                <div className="text-sm text-ink-700 mt-1">配置季节名称、时间范围与费率</div>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-ink-700 hover:text-ink-900 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">季节名称</span>
                  <input
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                  />
                </label>
                <div>
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide block">标识色</span>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {tierPresets.map(p => (
                      <button
                        key={p.color}
                        onClick={() => setEditing({ ...editing, color: p.color })}
                        className={`h-9 px-3 rounded-lg text-white inline-flex items-center gap-1.5 text-xs font-semibold border-2 ${
                          editing.color === p.color ? 'border-ink-900 scale-105' : 'border-transparent'
                        } transition`}
                        style={{ backgroundColor: p.color }}
                      >
                        {p.icon} {p.name}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={editing.color}
                      onChange={e => setEditing({ ...editing, color: e.target.value })}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-gold-300 p-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-white border border-gold-200">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide">开始时间</div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[11px] text-ink-700">月份</span>
                      <select
                        className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm"
                        value={editing.startMonth}
                        onChange={e => setEditing({ ...editing, startMonth: +e.target.value })}
                      >
                        {months.map(m => <option key={m} value={m}>{m}月</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-ink-700">日期</span>
                      <select
                        className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm"
                        value={editing.startDay}
                        onChange={e => setEditing({ ...editing, startDay: +e.target.value })}
                      >
                        {Array.from({ length: daysByMonth(editing.startMonth) }, (_, i) => i + 1).map(d =>
                          <option key={d} value={d}>{d}日</option>
                        )}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-ink-700 uppercase tracking-wide">结束时间</div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[11px] text-ink-700">月份</span>
                      <select
                        className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm"
                        value={editing.endMonth}
                        onChange={e => setEditing({ ...editing, endMonth: +e.target.value })}
                      >
                        {months.map(m => <option key={m} value={m}>{m}月</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-ink-700">日期</span>
                      <select
                        className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm"
                        value={editing.endDay}
                        onChange={e => setEditing({ ...editing, endDay: +e.target.value })}
                      >
                        {Array.from({ length: daysByMonth(editing.endMonth) }, (_, i) => i + 1).map(d =>
                          <option key={d} value={d}>{d}日</option>
                        )}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">日租单价（元/天）</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                    value={editing.dailyRate}
                    onChange={e => setEditing({ ...editing, dailyRate: +e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">月租单价（元/月）</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                    value={editing.monthlyRate}
                    onChange={e => setEditing({ ...editing, monthlyRate: +e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gold-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="h-10 px-4 rounded-lg border border-gold-300 text-sm text-ink-800 hover:bg-cream-800"
              >
                取消
              </button>
              <button
                onClick={save}
                className="h-10 px-5 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 text-sm font-semibold shadow-card btn-elev inline-flex items-center gap-2"
              >
                <Save size={14} /> 保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function YearTimeline({ tiers }: { tiers: SeasonTier[] }) {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const totalDays = 365;
  const dayToM = (m: number, d: number) => {
    let total = 0;
    for (let i = 1; i < m; i++) total += daysByMonth(i);
    return total + d - 1;
  };

  return (
    <div>
      <div className="relative h-10 md:h-12 rounded-xl overflow-hidden border border-gold-300 bg-cream-800 shadow-inner">
        {months.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-gold-200/60 last:border-r-0"
            style={{ left: `${(dayToM(i + 1, 1) / totalDays) * 100}%`, width: `${(daysByMonth(i + 1) / totalDays) * 100}%` }}
          />
        ))}
        {tiers.map((t, i) => {
          const startPos = (dayToM(t.startMonth, t.startDay) / totalDays) * 100;
          const e1 = dayToM(t.endMonth, t.endDay);
          const s1 = dayToM(t.startMonth, t.startDay);
          let width;
          if (e1 >= s1) width = ((e1 - s1 + 1) / totalDays) * 100;
          else width = ((totalDays - s1 + e1 + 1) / totalDays) * 100;
          return (
            <>
              <div
                key={`t-${i}`}
                className="absolute top-1.5 bottom-1.5 rounded-md flex items-center justify-center text-[11px] font-semibold text-white whitespace-nowrap overflow-hidden"
                style={{ left: `${startPos}%`, width: `${width}%`, backgroundColor: t.color }}
              >
                {width > 6 && <span className="px-1 drop-shadow">{t.name}</span>}
              </div>
              {e1 < s1 && (
                <div
                  key={`t2-${i}`}
                  className="absolute top-1.5 bottom-1.5 rounded-md flex items-center justify-center text-[11px] font-semibold text-white whitespace-nowrap overflow-hidden"
                  style={{ left: '0%', width: `${((e1 + 1) / totalDays) * 100}%`, backgroundColor: t.color }}
                >
                  {width > 6 && <span className="px-1 drop-shadow">{t.name}</span>}
                </div>
              )}
            </>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-700 px-1">
        {months.map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}
