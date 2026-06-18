import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import type { Property } from '@/types';
import { PropertyStatusBadge } from '@/components/StatusBadge';
import { Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import { uid } from '@/utils';

export default function Properties() {
  const {
    properties, landlords, seasonTiers, splitRules,
    upsertProperty, deleteProperty,
  } = useAppStore();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vacant' | 'rented'>('all');
  const [editing, setEditing] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);

  const list = properties.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (q && !(p.name.includes(q) || p.code.includes(q))) return false;
    return true;
  });

  const openNew = () => {
    setEditing({
      id: uid(), name: '', code: '', type: '一居室', area: 50,
      landlordId: landlords[0]?.id || '',
      rateTierId: seasonTiers[0]?.id || '',
      splitRuleId: splitRules[0]?.id || '',
      status: 'vacant',
    });
    setShowForm(true);
  };
  const openEdit = (p: Property) => { setEditing({ ...p }); setShowForm(true); };

  const save = () => {
    if (!editing) return;
    if (!editing.name || !editing.code) { alert('请填写房源名称与编号'); return; }
    upsertProperty(editing);
    setShowForm(false);
    setEditing(null);
  };

  const ldName = (id: string) => landlords.find(l => l.id === id)?.name || '-';
  const tierName = (id: string) => seasonTiers.find(t => t.id === id)?.name || '-';
  const srName = (id: string) => splitRules.find(r => r.id === id)?.name || '-';

  return (
    <div className="space-y-6">
      <PageHeader
        title="房源管理"
        description="维护房源基础档案，关联业主、费率档与分账规则。"
        actions={
          <button
            onClick={openNew}
            className="btn-elev inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 font-semibold text-sm shadow-card"
          >
            <Plus size={16} /> 新增房源
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="搜索房源名 / 编号..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </div>
          <div className="flex p-1 rounded-lg bg-white border border-gold-300">
            {[
              { k: 'all', label: '全部' },
              { k: 'rented', label: '在租' },
              { k: 'vacant', label: '空置' },
            ].map(x => (
              <button
                key={x.k} onClick={() => setStatusFilter(x.k as any)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition ${
                  statusFilter === x.k ? 'bg-ink-900 text-cream-900' : 'text-ink-800 hover:bg-cream-800'
                }`}
              >{x.label}</button>
            ))}
          </div>
          <div className="ml-auto text-xs text-ink-700">
            共 <b className="text-ink-900">{list.length}</b> 套 · 在租
            <b className="text-ink-900"> {properties.filter(p => p.status === 'rented').length}</b> · 空置
            <b className="text-ink-900"> {properties.filter(p => p.status === 'vacant').length}</b>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map(p => {
          const tier = seasonTiers.find(t => t.id === p.rateTierId);
          return (
            <div key={p.id} className="group bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden hover:shadow-card-hover transition">
              <div
                className="h-24 relative"
                style={{ background: `linear-gradient(135deg, ${tier?.color || '#0F3D2E'}CC, ${tier?.color || '#0F3D2E'})` }}
              >
                <div className="absolute inset-0 opacity-25" style={{
                  backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 45%)',
                }} />
                <div className="absolute top-3 right-3">
                  <PropertyStatusBadge status={p.status} />
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="font-serif text-xl font-bold text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-white/80 mt-0.5 font-mono">{p.code}</div>
                </div>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoCell k="户型" v={p.type} />
                  <InfoCell k="建筑面积" v={`${p.area}㎡`} />
                  <InfoCell k="业主" v={ldName(p.landlordId)} />
                  <InfoCell k="费率档" v={tierName(p.rateTierId)} />
                </div>
                <div className="pt-2 mt-2 border-t border-gold-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-ink-700">分账规则</span>
                    <span className="text-xs font-medium text-ink-900">{srName(p.splitRuleId)}</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 h-8 rounded-md border border-gold-300 text-xs text-ink-800 hover:bg-cream-800 inline-flex items-center justify-center gap-1"
                  ><Edit2 size={12} /> 编辑</button>
                  <button
                    onClick={() => {
                      if (confirm(`删除房源 ${p.name}？`)) deleteProperty(p.id);
                    }}
                    className="w-8 h-8 rounded-md border border-gold-300 text-coral-500 hover:bg-coral-500/10 inline-flex items-center justify-center"
                  ><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full py-16 text-center text-ink-700 text-sm bg-white rounded-xl border border-dashed border-gold-300">
            暂无匹配房源
          </div>
        )}
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-cream-900 rounded-2xl shadow-elevated w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gold-200 flex items-start justify-between sticky top-0 bg-cream-900 z-10">
              <div>
                <div className="font-serif text-xl font-semibold text-ink-900">
                  {properties.some(x => x.id === editing.id) ? '编辑房源' : '新增房源'}
                </div>
                <div className="text-sm text-ink-700 mt-1">维护房源基础信息与关联配置</div>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-ink-700 hover:text-ink-900">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block col-span-2 md:col-span-1">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">房源名称</span>
                  <input
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    placeholder="如：春风里 A-1203"
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  />
                </label>
                <label className="block col-span-2 md:col-span-1">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">房源编号</span>
                  <input
                    value={editing.code}
                    onChange={e => setEditing({ ...editing, code: e.target.value })}
                    placeholder="如：CF-A-1203"
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">户型</span>
                  <select
                    value={editing.type}
                    onChange={e => setEditing({ ...editing, type: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  >
                    {['一居室', '两居室', '三居室', '四居室'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">建筑面积（㎡）</span>
                  <input
                    type="number" value={editing.area}
                    onChange={e => setEditing({ ...editing, area: +e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">所属业主</span>
                  <select
                    value={editing.landlordId}
                    onChange={e => setEditing({ ...editing, landlordId: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  >
                    {landlords.map(l => <option key={l.id} value={l.id}>{l.name}（{l.phone}）</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">出租状态</span>
                  <select
                    value={editing.status}
                    onChange={e => setEditing({ ...editing, status: e.target.value as any })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  >
                    <option value="rented">在租</option>
                    <option value="vacant">空置</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">绑定费率档</span>
                  <select
                    value={editing.rateTierId}
                    onChange={e => setEditing({ ...editing, rateTierId: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  >
                    {seasonTiers.map(t => <option key={t.id} value={t.id}>{t.name}（日¥{t.dailyRate} / 月¥{t.monthlyRate}）</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">绑定分账规则</span>
                  <select
                    value={editing.splitRuleId}
                    onChange={e => setEditing({ ...editing, splitRuleId: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
                  >
                    {splitRules.map(r => <option key={r.id} value={r.id}>{r.name}（平台{r.platformCut * 100}%+物业{r.propertyFee * 100}%）</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gold-200 flex justify-end gap-3 sticky bottom-0 bg-cream-900">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="h-10 px-4 rounded-lg border border-gold-300 text-sm text-ink-800 hover:bg-cream-800"
              >取消</button>
              <button
                onClick={save}
                className="h-10 px-5 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 text-sm font-semibold shadow-card btn-elev inline-flex items-center gap-2"
              ><Save size={14} /> 保存房源</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="p-2 rounded-md bg-cream-800/50">
      <div className="text-[10px] text-ink-700 uppercase tracking-wide">{k}</div>
      <div className="mt-0.5 font-semibold text-ink-900 truncate">{v}</div>
    </div>
  );
}
