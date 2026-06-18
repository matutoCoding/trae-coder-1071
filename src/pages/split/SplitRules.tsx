import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import type { SplitRule } from '@/types';
import { Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { formatPercent, uid, formatMoney } from '@/utils';

export default function SplitRules() {
  const { splitRules, upsertSplitRule, deleteSplitRule, properties } = useAppStore();
  const [editing, setEditing] = useState<SplitRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setEditing({ id: uid(), name: '新分账方案', platformCut: 0.10, propertyFee: 0.05, landlordCut: 0.85 });
    setShowForm(true);
  };
  const openEdit = (r: SplitRule) => {
    setEditing({ ...r });
    setShowForm(true);
  };

  const save = () => {
    if (!editing) return;
    const total = editing.platformCut + editing.propertyFee;
    if (total >= 1) {
      alert('平台+物业抽成合计不得超过100%');
      return;
    }
    const landlordCut = Number((1 - editing.platformCut - editing.propertyFee).toFixed(4));
    upsertSplitRule({ ...editing, landlordCut });
    setShowForm(false);
    setEditing(null);
  };

  const updatePlatform = (v: number) => {
    if (!editing) return;
    const pf = editing.propertyFee;
    if (v + pf >= 1) return;
    setEditing({ ...editing, platformCut: v, landlordCut: Number((1 - v - pf).toFixed(4)) });
  };
  const updatePropertyFee = (v: number) => {
    if (!editing) return;
    const pl = editing.platformCut;
    if (pl + v >= 1) return;
    setEditing({ ...editing, propertyFee: v, landlordCut: Number((1 - pl - v).toFixed(4)) });
  };

  const propertyCount = (rid: string) => properties.filter(p => p.splitRuleId === rid).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="分账规则"
        description="配置平台、物业、房东三方的分配比例，房东所得自动 = 1 - 平台 - 物业。"
        actions={
          <button
            onClick={openNew}
            className="btn-elev inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 font-semibold text-sm shadow-card"
          >
            <Plus size={16} /> 新建分账方案
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {splitRules.map(r => {
          const total = 10000;
          const platformAmt = total * r.platformCut;
          const propertyAmt = total * r.propertyFee;
          const landlordAmt = total * r.landlordCut;
          return (
            <div key={r.id} className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
              <div className="p-5 pb-4 border-b border-gold-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ink-900 text-gold-300 text-[11px] font-semibold">
                      <CheckCircle2 size={11} /> 启用中
                    </span>
                    <span className="text-[11px] text-ink-700">{propertyCount(r.id)} 套房源使用</span>
                  </div>
                  <div className="mt-2 font-serif text-xl font-bold text-ink-900">{r.name}</div>
                </div>
                <button
                  onClick={() => deleteSplitRule(r.id)}
                  className="w-8 h-8 rounded-lg border border-gold-300 text-coral-500 hover:bg-coral-500/10 flex items-center justify-center"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="p-5">
                <div className="h-8 rounded-lg overflow-hidden flex shadow-inner bg-cream-800">
                  <div style={{ width: `${r.platformCut * 100}%` }}
                    className="bg-[#0F3D2E] text-white text-[10px] font-bold flex items-center justify-center">
                    {r.platformCut * 100 >= 8 ? `平台 ${(r.platformCut * 100).toFixed(0)}%` : ''}
                  </div>
                  <div style={{ width: `${r.propertyFee * 100}%` }}
                    className="bg-[#4A7C59] text-white text-[10px] font-bold flex items-center justify-center">
                    {r.propertyFee * 100 >= 5 ? `物业 ${(r.propertyFee * 100).toFixed(0)}%` : ''}
                  </div>
                  <div style={{ width: `${r.landlordCut * 100}%` }}
                    className="bg-gradient-to-r from-gold-400 to-gold-500 text-ink-900 text-[10px] font-bold flex items-center justify-center">
                    房东 {(r.landlordCut * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#0F3D2E]/5 border border-[#0F3D2E]/10">
                    <div className="text-[11px] text-ink-700">平台抽成</div>
                    <div className="mt-0.5 font-bold text-ink-900">{formatPercent(r.platformCut)}</div>
                    <div className="text-[10px] text-ink-700 mt-0.5">{formatMoney(platformAmt)}/万</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/20">
                    <div className="text-[11px] text-ink-700">物业服务费</div>
                    <div className="mt-0.5 font-bold text-ink-900">{formatPercent(r.propertyFee)}</div>
                    <div className="text-[10px] text-ink-700 mt-0.5">{formatMoney(propertyAmt)}/万</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gradient-to-br from-gold-100 to-gold-200 border border-gold-300">
                    <div className="text-[11px] text-ink-700">房东所得</div>
                    <div className="mt-0.5 font-bold text-ink-900">{formatPercent(r.landlordCut)}</div>
                    <div className="text-[10px] text-ink-700 mt-0.5">{formatMoney(landlordAmt)}/万</div>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(r)}
                  className="mt-4 w-full h-9 rounded-lg bg-ink-900 text-cream-900 text-sm font-medium hover:bg-ink-800 transition inline-flex items-center justify-center gap-2"
                >
                  <Save size={14} /> 编辑分账比例
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-cream-900 rounded-2xl shadow-elevated w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gold-200 flex items-start justify-between">
              <div>
                <div className="font-serif text-xl font-semibold text-ink-900">
                  {splitRules.some(x => x.id === editing.id) ? '编辑分账方案' : '新建分账方案'}
                </div>
                <div className="text-sm text-ink-700 mt-1">调整平台、物业、房东三方分配比例</div>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-ink-700 hover:text-ink-900 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              <label className="block">
                <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">方案名称</span>
                <input
                  className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                />
              </label>

              <div className="space-y-5 p-4 rounded-xl bg-white border border-gold-200">
                <Slider label="平台抽成" color="#0F3D2E"
                  value={editing.platformCut}
                  onChange={updatePlatform}
                  max={1 - editing.propertyFee - 0.01} />
                <Slider label="物业服务费" color="#4A7C59"
                  value={editing.propertyFee}
                  onChange={updatePropertyFee}
                  max={1 - editing.platformCut - 0.01} />
                <div className="pt-3 border-t border-gold-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-800 inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-gold-500" /> 房东自动所得
                    </span>
                    <span className="font-serif font-bold text-2xl gold-text">{formatPercent(editing.landlordCut)}</span>
                  </div>
                  <div className="text-[11px] text-ink-700 mt-1">= 100% - 平台 - 物业</div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gold-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="h-10 px-4 rounded-lg border border-gold-300 text-sm text-ink-800 hover:bg-cream-800"
              >取消</button>
              <button
                onClick={save}
                className="h-10 px-5 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 text-sm font-semibold shadow-card btn-elev inline-flex items-center gap-2"
              ><Save size={14} /> 保存方案</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ label, color, value, onChange, max }: {
  label: string; color: string; value: number; onChange: (n: number) => void; max: number;
}) {
  const percent = (value * 100).toFixed(1);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-ink-800 inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="font-serif font-bold text-lg text-ink-900">{percent}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0.01, max)}
        step={0.005}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-2 rounded-full bg-cream-800 appearance-none cursor-pointer accent-ink-900"
      />
    </div>
  );
}
