import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { formatMoney, uid } from '@/utils';
import { PropertyStatusBadge } from '@/components/StatusBadge';
import { Search, Download, Edit2, Save } from 'lucide-react';

export default function PricingRates() {
  const { properties, landlords, seasonTiers, upsertProperty } = useAppStore();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = properties.filter(p =>
    !query || p.name.includes(query) || p.code.includes(query)
  );

  const tierName = (id: string) => {
    const t = seasonTiers.find(x => x.id === id);
    return t ? t.name : '未绑定';
  };
  const tierColor = (id: string) => {
    const t = seasonTiers.find(x => x.id === id);
    return t ? t.color : '#ccc';
  };
  const landlordName = (id: string) => landlords.find(l => l.id === id)?.name || '-';

  return (
    <div className="space-y-6">
      <PageHeader
        title="费率表维护"
        description="房源与费率档、分账规则的绑定关系管理，可逐行快速调整。"
        actions={
          <>
            <button className="h-10 px-4 rounded-lg border border-gold-300 text-ink-800 text-sm hover:bg-cream-800 inline-flex items-center gap-2">
              <Download size={14} /> 导出费率表
            </button>
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索房源名 / 编号..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-gold-300 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-700">
            <span>共 <b className="text-ink-900">{filtered.length}</b> 套房源</span>
            <span>·</span>
            <span>已绑定费率 <b className="text-ink-900">{filtered.filter(p => seasonTiers.some(t => t.id === p.rateTierId)).length}</b></span>
          </div>
        </div>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-card border border-gold-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-zebra text-sm">
            <thead>
              <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">房源信息</th>
                <th className="px-5 py-3 text-left font-semibold">业主</th>
                <th className="px-5 py-3 text-left font-semibold">绑定费率档</th>
                <th className="px-5 py-3 text-left font-semibold">分账规则</th>
                <th className="px-5 py-3 text-right font-semibold">状态</th>
                <th className="px-5 py-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink-900">{p.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-700">
                      <span className="font-mono">{p.code}</span>
                      <span>·</span>
                      <span>{p.type} · {p.area}㎡</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-800">{landlordName(p.landlordId)}</td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <select
                        className="h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm w-40"
                        value={p.rateTierId}
                        onChange={e => {
                          const updated = { ...p, rateTierId: e.target.value };
                          upsertProperty(updated);
                        }}
                      >
                        {seasonTiers.map(t => <option key={t.id} value={t.id}>{t.name}（日{formatMoney(t.dailyRate)}）</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tierColor(p.rateTierId) }} />
                        <span className="font-medium text-ink-900">{tierName(p.rateTierId)}</span>
                        <span className="text-xs text-ink-700">
                          日 {formatMoney(seasonTiers.find(t => t.id === p.rateTierId)?.dailyRate || 0)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === p.id ? (
                      <select
                        className="h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm w-52"
                        value={p.splitRuleId}
                        onChange={e => {
                          const updated = { ...p, splitRuleId: e.target.value };
                          upsertProperty(updated);
                        }}
                      >
                        {useAppStore.getState().splitRules.map(r => (
                          <option key={r.id} value={r.id}>{r.name}（平台{r.platformCut * 100}%+物业{r.propertyFee * 100}%）</option>
                        ))}
                      </select>
                    ) : (
                      <SplitRuleTag ruleId={p.splitRuleId} />
                    )}
                  </td>
                  <td className="px-5 py-3 text-right"><PropertyStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-center">
                    {editingId === p.id ? (
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-ink-900 text-cream-900 text-xs font-semibold hover:bg-ink-800"
                      >
                        <Save size={13} /> 保存
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingId(p.id)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-gold-300 text-ink-800 text-xs hover:bg-cream-800"
                      >
                        <Edit2 size={13} /> 调整
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-ink-700 text-sm">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SplitRuleTag({ ruleId }: { ruleId: string }) {
  const rule = useAppStore.getState().splitRules.find(r => r.id === ruleId);
  if (!rule) return <span className="text-ink-700 text-sm">-</span>;
  return (
    <div>
      <div className="font-medium text-ink-900 text-sm">{rule.name}</div>
      <div className="mt-0.5 text-[11px] text-ink-700">
        平台{(rule.platformCut * 100).toFixed(0)}% · 物业{(rule.propertyFee * 100).toFixed(0)}% · 房东{(rule.landlordCut * 100).toFixed(0)}%
      </div>
    </div>
  );
}
