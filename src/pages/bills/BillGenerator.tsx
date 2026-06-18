import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAppStore } from '@/store/appStore';
import { computeBillingSegments } from '@/utils/billingEngine';
import { computeSplit, computeUtility, utilityDefaults } from '@/utils/splitCalculator';
import SegmentBar from '@/components/SegmentBar';
import DonutChart from '@/components/DonutChart';
import { formatMoney, daysBetween, parseDate } from '@/utils';
import { FileCheck2, Sparkles, Droplets, Zap, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BillGenerator() {
  const {
    seasonTiers, properties, landlords, splitRules, generateBill,
  } = useAppStore();
  const nav = useNavigate();

  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [tenantName, setTenantName] = useState('张先生');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  });

  const [waterPrev, setWaterPrev] = useState(100);
  const [waterCurr, setWaterCurr] = useState(142);
  const [waterPrice, setWaterPrice] = useState(5.5);
  const [elecPrev, setElecPrev] = useState(900);
  const [elecCurr, setElecCurr] = useState(1260);
  const [elecPrice, setElecPrice] = useState(0.85);
  const [commonArea, setCommonArea] = useState(120);

  const dateInvalid = startDate && endDate && parseDate(startDate) > parseDate(endDate);

  const prop = properties.find(p => p.id === propertyId);
  const landlord = prop ? landlords.find(l => l.id === prop.landlordId) : null;
  const splitRule = prop ? splitRules.find(r => r.id === prop.splitRuleId) : splitRules[0];

  const boundTier = prop ? seasonTiers.find(t => t.id === prop.rateTierId) : null;
  const peakRefTier = seasonTiers.find(t => t.name === '旺季') || seasonTiers[0];
  const rateMultiplier = boundTier && peakRefTier
    ? Number((boundTier.dailyRate / peakRefTier.dailyRate).toFixed(4))
    : 1;

  const result = useMemo(() => {
    if (!startDate || !endDate || dateInvalid) return null;
    return computeBillingSegments(startDate, endDate, seasonTiers, rateMultiplier);
  }, [startDate, endDate, seasonTiers, dateInvalid, rateMultiplier]);

  const utilities = useMemo(() => {
    const u = utilityDefaults();
    u.water = computeUtility({ type: 'water', previous: waterPrev, current: waterCurr, unitPrice: waterPrice });
    u.electric = computeUtility({ type: 'electric', previous: elecPrev, current: elecCurr, unitPrice: elecPrice });
    u.commonArea = commonArea;
    return u;
  }, [waterPrev, waterCurr, waterPrice, elecPrev, elecCurr, elecPrice, commonArea]);

  const baseRent = result?.baseRent || 0;
  const utilitiesTotal = utilities.water.amount + utilities.electric.amount + utilities.commonArea;
  const totalAmount = Number((baseRent + utilitiesTotal).toFixed(2));
  const splitResult = splitRule ? computeSplit(baseRent, utilities, splitRule) : null;

  const submit = () => {
    if (!prop) return;
    if (dateInvalid) return;
    try {
      const bill = generateBill({
        propertyId,
        tenantName,
        startDate,
        endDate,
        water: { previous: waterPrev, current: waterCurr, unitPrice: waterPrice },
        electric: { previous: elecPrev, current: elecCurr, unitPrice: elecPrice },
        commonArea,
      });
      alert(`账单 ${bill.billNo} 已成功生成！`);
      nav('/bills/list');
    } catch (e: any) {
      alert(e.message || '账单生成失败');
    }
  };

  useEffect(() => {
    if (!splitRule) return;
  }, [splitRule]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="账单生成器"
        description="选择房源与租期，系统自动完成跨档拆分、抽成分账与水电分摊，一键生成账单。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 左：输入表单 */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileCheck2 size={18} className="text-gold-500" />
              <div className="font-serif text-base font-semibold text-ink-900">账单基本信息</div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">选择房源</span>
              <select
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.type} · {p.area}㎡
                  </option>
                ))}
              </select>
            </label>

            {prop && (
              <div className="p-3 rounded-lg bg-cream-800/50 text-xs space-y-1.5 text-ink-800">
                <div className="flex justify-between"><span>房源编号</span><span className="font-mono">{prop.code}</span></div>
                <div className="flex justify-between"><span>业主</span><span>{landlord?.name || '-'}</span></div>
                <div className="flex justify-between"><span>分账规则</span><span>{splitRule?.name || '-'}</span></div>
                <div className="flex justify-between"><span>绑定费率</span><span>{boundTier ? `${boundTier.name}（日¥${boundTier.dailyRate}）` : '未绑定'}</span></div>
                {rateMultiplier !== 1 && (
                  <div className="flex justify-between"><span>费率系数</span><span className="font-semibold text-gold-500">×{rateMultiplier.toFixed(4)}</span></div>
                )}
                <div className="flex justify-between"><span>出租状态</span><span>{prop.status === 'rented' ? '在租' : '空置'}</span></div>
              </div>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">租户姓名</span>
              <input
                value={tenantName}
                onChange={e => setTenantName(e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm"
              />
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

            {dateInvalid && (
              <div className="p-3 rounded-lg bg-coral-500/10 border border-coral-500/30 flex items-center gap-2 text-sm text-coral-500">
                <AlertCircle size={16} />
                <span className="font-medium">起租日不能晚于结束日，请调整租期区间</span>
              </div>
            )}

            {result && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-gold-100 to-cream-800 text-xs flex items-center justify-between">
                <span className="text-ink-700 inline-flex items-center gap-1">
                  <Sparkles size={13} />
                  共 {result.totalDays} 天，拆分为 {result.segments.length} 个季节段
                </span>
                <span className="font-serif font-bold text-lg gold-text">{formatMoney(baseRent)}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gold-500" />
              <div className="font-serif text-base font-semibold text-ink-900">水电与公摊抄表</div>
            </div>

            <div className="p-3 rounded-lg bg-cream-800/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-800">
                <Droplets size={14} className="text-ink-600" /> 水费
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label>
                  <span className="text-[11px] text-ink-700">上次抄表</span>
                  <input type="number" value={waterPrev} onChange={e => setWaterPrev(+e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm" />
                </label>
                <label>
                  <span className="text-[11px] text-ink-700">本次抄表</span>
                  <input type="number" value={waterCurr} onChange={e => setWaterCurr(+e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm" />
                </label>
                <label>
                  <span className="text-[11px] text-ink-700">单价（元/吨）</span>
                  <input type="number" step="0.1" value={waterPrice} onChange={e => setWaterPrice(+e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm" />
                </label>
              </div>
              <div className="text-xs text-ink-700 flex justify-between">
                <span>用量：{utilities.water.usage} 吨</span>
                <span className="font-semibold text-ink-900">{formatMoney(utilities.water.amount)}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-cream-800/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-800">
                <Zap size={14} className="text-gold-500" /> 电费
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label>
                  <span className="text-[11px] text-ink-700">上次抄表</span>
                  <input type="number" value={elecPrev} onChange={e => setElecPrev(+e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm" />
                </label>
                <label>
                  <span className="text-[11px] text-ink-700">本次抄表</span>
                  <input type="number" value={elecCurr} onChange={e => setElecCurr(+e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm" />
                </label>
                <label>
                  <span className="text-[11px] text-ink-700">单价（元/度）</span>
                  <input type="number" step="0.01" value={elecPrice} onChange={e => setElecPrice(+e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-white border border-gold-300 text-sm" />
                </label>
              </div>
              <div className="text-xs text-ink-700 flex justify-between">
                <span>用量：{utilities.electric.usage} 度</span>
                <span className="font-semibold text-ink-900">{formatMoney(utilities.electric.amount)}</span>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">公摊费用（物业、公共照明等）</span>
              <input type="number" value={commonArea} onChange={e => setCommonArea(+e.target.value)}
                className="mt-1.5 w-full h-10 px-3 rounded-lg bg-white border border-gold-300 text-sm" />
            </label>
          </div>
        </div>

        {/* 右：实时预览 */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-serif text-base font-semibold text-ink-900">跨档拆分结果</div>
                <div className="text-xs text-ink-700 mt-0.5">系统自动识别季节切换点并分段计费</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-700">基础租金</div>
                <div className="font-serif font-bold text-2xl gold-text">{formatMoney(baseRent)}</div>
              </div>
            </div>
            {result && result.segments.length > 0 ? (
              <SegmentBar segments={result.segments} totalRent={result.baseRent} />
            ) : dateInvalid ? (
              <div className="h-28 flex items-center justify-center text-sm text-coral-500 bg-coral-500/10 rounded-lg border border-coral-500/30">
                <AlertCircle size={16} className="mr-2" /> 起租日晚于结束日，无法计费
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-sm text-ink-700 bg-cream-800/40 rounded-lg border border-dashed border-gold-300">
                请设置有效的租期区间
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
            <div className="font-serif text-base font-semibold text-ink-900 mb-4">费用明细</div>
            <div className="space-y-2 text-sm">
              <Row label="基础租金" value={baseRent} bold />
              <Row label={`水费（${utilities.water.usage}吨）`} value={utilities.water.amount} />
              <Row label={`电费（${utilities.electric.usage}度）`} value={utilities.electric.amount} />
              <Row label="公摊费用" value={utilities.commonArea} />
              <div className="pt-3 mt-3 border-t-2 border-gold-300">
                <Row label="应收总额" value={totalAmount} highlight />
              </div>
            </div>
          </div>

          {splitResult && splitRule && (
            <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-serif text-base font-semibold text-ink-900">抽成分账预览</div>
                  <div className="text-xs text-ink-700 mt-0.5">
                    {splitRule.name} · 平台{(splitRule.platformCut * 100).toFixed(0)}% +
                    物业{(splitRule.propertyFee * 100).toFixed(0)}% + 房东{(splitRule.landlordCut * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <DonutChart
                slices={[
                  { label: '运营平台收入', subLabel: `抽成 ${(splitRule.platformCut * 100).toFixed(0)}%`, value: splitResult.platformAmount, color: '#0F3D2E' },
                  { label: '物业服务费', subLabel: `计提 ${(splitRule.propertyFee * 100).toFixed(0)}%`, value: splitResult.propertyFeeAmount, color: '#4A7C59' },
                  { label: `房东结算 · ${landlord?.name || '-'}`, subLabel: `含代收水电 ${formatMoney(splitResult.utilitiesPassThrough)}`, value: splitResult.landlordAmount, color: '#C8A96B' },
                ]}
                centerLabel="分账总额"
                centerValue={formatMoney(totalAmount)}
              />
            </div>
          )}

          <button
            onClick={submit}
            disabled={dateInvalid || !result}
            className="btn-elev w-full h-14 rounded-xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 text-cream-900 font-serif font-bold text-lg shadow-elevated inline-flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={20} className="text-gold-400" />
            一键生成账单
            <span className="ml-2 font-sans text-sm font-normal text-gold-300">应收 {formatMoney(totalAmount)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? '' : 'py-1.5'}`}>
      <span className={highlight ? 'font-serif text-lg font-semibold text-ink-900' : bold ? 'font-semibold text-ink-800' : 'text-ink-700'}>{label}</span>
      <span className={highlight
        ? 'font-serif font-bold text-3xl gold-text'
        : bold
          ? 'font-serif font-bold text-xl text-ink-900'
          : 'font-medium text-ink-900'}>
        {formatMoney(value)}
      </span>
    </div>
  );
}
