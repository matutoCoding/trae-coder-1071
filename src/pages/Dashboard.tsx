import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import AreaLineChart from '@/components/AreaLineChart';
import { useAppStore, currentPeriod } from '@/store/appStore';
import {
  Wallet, Home, Clock, Receipt, TrendingUp, ChevronRight,
} from 'lucide-react';
import { formatMoney, getYearMonth } from '@/utils';
import { BillStatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { bills, properties, settlements } = useAppStore();
  const period = currentPeriod();

  const periodBills = bills.filter(b => getYearMonth(b.startDate) === period);
  const totalRevenue = periodBills.reduce((s, b) => s + b.totalAmount, 0);
  const totalLandlord = periodBills.reduce((s, b) => s + b.splitResult.landlordAmount, 0);
  const totalPlatform = periodBills.reduce((s, b) => s + b.splitResult.platformAmount, 0);
  const pendingSettlement = settlements
    .filter(s => s.period === period && s.status === 'pending' && s.partyType !== 'platform')
    .reduce((s, x) => s + x.totalAmount, 0);

  const rentedCount = properties.filter(p => p.status === 'rented').length;
  const occupied = properties.length > 0 ? (rentedCount / properties.length * 100).toFixed(0) : '0';

  const trendData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bs = bills.filter(b => getYearMonth(b.startDate) === key);
    return {
      label: `${d.getMonth() + 1}月`,
      value: bs.reduce((s, b) => s + b.totalAmount, 0),
      value2: bs.reduce((s, b) => s + b.splitResult.landlordAmount, 0),
    };
  });

  const recentBills = bills.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="运营总览"
        description={`${period} 账期实时数据概览 · 掌握收入、入住与结算动态`}
        actions={
          <Link
            to="/bills/generator"
            className="btn-elev inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 text-ink-900 font-semibold text-sm shadow-card"
          >
            <Receipt size={16} />
            快速开单
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="本期总收入"
          value={formatMoney(totalRevenue)}
          accent="ink"
          icon={<Wallet size={20} />}
          footnote={`含平台 ¥${(totalPlatform).toFixed(0)} + 房东 ¥${(totalLandlord).toFixed(0)}`}
          delta={{ value: '较上月 +12.4%', positive: true }}
        />
        <StatCard
          title="在租房源 / 入住率"
          value={`${rentedCount} / ${properties.length}`}
          accent="gold"
          icon={<Home size={20} />}
          footnote={`入住率 ${occupied}%`}
          delta={{ value: '稳定', positive: true }}
        />
        <StatCard
          title="本期账单数"
          value={`${periodBills.length} 笔`}
          accent="moss"
          icon={<Receipt size={20} />}
          footnote={`¥${(totalRevenue / Math.max(1, periodBills.length)).toFixed(0)} 均单`}
        />
        <StatCard
          title="待结算金额"
          value={formatMoney(pendingSettlement)}
          accent="coral"
          icon={<Clock size={20} />}
          footnote="房东+物业待打款合计"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-gold-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-serif text-base text-ink-900 font-semibold">收入趋势（近 6 个月）</div>
              <div className="text-xs text-ink-700 mt-0.5">总营收与房东净收入对比</div>
            </div>
            <Link to="/reconciliation/monthly" className="text-xs text-ink-600 hover:text-ink-900 inline-flex items-center gap-1">
              查看明细 <ChevronRight size={14} />
            </Link>
          </div>
          <AreaLineChart data={trendData} height={240} />
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-serif text-base text-ink-900 font-semibold">分档收入占比</div>
              <div className="text-xs text-ink-700 mt-0.5">{period} 各季节档贡献</div>
            </div>
            <TrendingUp size={18} className="text-gold-500" />
          </div>
          <TierBreakdown periodBills={periodBills} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gold-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-serif text-base text-ink-900 font-semibold">最近账单</div>
            <div className="text-xs text-ink-700 mt-0.5">按生成时间倒序展示</div>
          </div>
          <Link to="/bills/list" className="text-xs text-ink-600 hover:text-ink-900 inline-flex items-center gap-1">
            查看全部 <ChevronRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full table-zebra text-sm">
            <thead>
              <tr className="bg-cream-800/60 text-ink-700 text-xs uppercase tracking-wider">
                <th className="px-5 py-2.5 text-left font-semibold">账单编号</th>
                <th className="px-5 py-2.5 text-left font-semibold">房源</th>
                <th className="px-5 py-2.5 text-left font-semibold">租户</th>
                <th className="px-5 py-2.5 text-left font-semibold">租期</th>
                <th className="px-5 py-2.5 text-right font-semibold">应收总额</th>
                <th className="px-5 py-2.5 text-center font-semibold">状态</th>
              </tr>
            </thead>
            <tbody>
              {recentBills.map(b => (
                <tr key={b.id} className="border-t border-gold-100 hover:bg-gold-100/40 transition">
                  <td className="px-5 py-3 font-mono text-xs text-ink-700">{b.billNo}</td>
                  <td className="px-5 py-3 font-medium text-ink-900">{b.propertyName}</td>
                  <td className="px-5 py-3">{b.tenantName}</td>
                  <td className="px-5 py-3 text-xs text-ink-700 whitespace-nowrap">
                    {b.startDate} ~ {b.endDate}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-ink-900 font-serif">
                    {formatMoney(b.totalAmount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <BillStatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
              {recentBills.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ink-700 text-sm">暂无账单数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TierBreakdown({ periodBills }: { periodBills: any[] }) {
  const map = new Map<string, { name: string; color: string; amount: number }>();
  periodBills.forEach(b => {
    b.segments.forEach((s: any) => {
      const k = s.tierId;
      if (!map.has(k)) map.set(k, { name: s.tierName, color: s.tierColor, amount: 0 });
      map.get(k)!.amount += s.amount;
    });
  });
  const rows = Array.from(map.values());
  const total = rows.reduce((s, x) => s + x.amount, 0);

  if (rows.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-ink-700">暂无分档数据</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const pct = total > 0 ? r.amount / total : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} />
                <span className="font-medium text-ink-900">{r.name}</span>
              </span>
              <span className="text-ink-700">{(pct * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-cream-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct * 100}%`, backgroundColor: r.color }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-ink-700 font-medium">{formatMoney(r.amount)}</div>
          </div>
        );
      })}
      <div className="pt-3 mt-3 border-t border-gold-200 flex items-center justify-between">
        <span className="text-xs text-ink-700">合计基础租金</span>
        <span className="font-serif font-bold text-ink-900 text-base gold-text">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
