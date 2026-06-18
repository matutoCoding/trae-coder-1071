import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarRange, FileSpreadsheet, Receipt,
  Calculator, Landmark, Scale, FileCheck2, Wallet, Building2,
  ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react';
import SidebarGroup from './SidebarGroup';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  active?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '概览',
    items: [
      { label: '仪表盘', icon: <LayoutDashboard size={18} />, to: '/dashboard', active: ['/dashboard'] },
    ],
  },
  {
    title: '分时段计费',
    items: [
      { label: '费率规则配置', icon: <CalendarRange size={18} />, to: '/pricing/rules', active: ['/pricing/rules'] },
      { label: '费率表维护', icon: <FileSpreadsheet size={18} />, to: '/pricing/rates', active: ['/pricing/rates'] },
      { label: '跨档拆分演示', icon: <Calculator size={18} />, to: '/pricing/split-demo', active: ['/pricing/split-demo'] },
    ],
  },
  {
    title: '账单管理',
    items: [
      { label: '账单列表', icon: <Receipt size={18} />, to: '/bills/list', active: ['/bills/list'] },
      { label: '账单生成器', icon: <Calculator size={18} />, to: '/bills/generator', active: ['/bills/generator'] },
      { label: '水电分摊', icon: <Landmark size={18} />, to: '/bills/utilities', active: ['/bills/utilities'] },
    ],
  },
  {
    title: '抽成分账',
    items: [
      { label: '分账规则', icon: <Scale size={18} />, to: '/split/rules', active: ['/split/rules'] },
      { label: '分账明细', icon: <FileSpreadsheet size={18} />, to: '/split/details', active: ['/split/details'] },
    ],
  },
  {
    title: '对账结算',
    items: [
      { label: '月度对账', icon: <FileCheck2 size={18} />, to: '/reconciliation/monthly', active: ['/reconciliation/monthly'] },
      { label: '结算单管理', icon: <Wallet size={18} />, to: '/reconciliation/settlements', active: ['/reconciliation/settlements'] },
    ],
  },
  {
    title: '基础档案',
    items: [
      { label: '房源管理', icon: <Building2 size={18} />, to: '/properties', active: ['/properties'] },
    ],
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  return (
    <div className="h-screen w-full flex bg-cream-900 overflow-hidden">
      {/* 侧边栏 桌面 */}
      <aside
        className={`hidden md:flex flex-col bg-ink-900 text-cream-900 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-60'
        } flex-shrink-0 relative border-r border-ink-800`}
      >
        <div className="h-16 flex items-center px-5 border-b border-ink-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-ink-900 font-bold text-lg">寓</span>
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="font-serif text-base font-semibold leading-tight">寓金所</div>
              <div className="text-[11px] text-cream-700 mt-0.5 whitespace-nowrap">长租收租管理系统</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3 space-y-5">
          {navGroups.map((g) => (
            <SidebarGroup
              key={g.title}
              title={g.title}
              items={g.items}
              collapsed={collapsed}
              currentPath={loc.pathname}
            />
          ))}
        </nav>

        <div className="border-t border-ink-800 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-cream-700 hover:bg-ink-800 hover:text-cream-900 transition"
            title={collapsed ? '展开' : '收起'}
          >
            {collapsed ? <ChevronRight size={16} /> : (
              <>
                <ChevronLeft size={16} />
                <span className="text-xs">收起侧栏</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 移动遮罩 */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* 移动端侧栏 */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-60 bg-ink-900 text-cream-900 z-50 transform transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-ink-800">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center">
              <span className="font-serif text-ink-900 font-bold text-lg">寓</span>
            </div>
            <div className="ml-3">
              <div className="font-serif text-base font-semibold leading-tight">寓金所</div>
              <div className="text-[11px] text-cream-700 mt-0.5">长租收租管理系统</div>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)}><X size={18} className="text-cream-700" /></button>
        </div>
        <nav className="overflow-y-auto py-3 px-3 space-y-5 h-[calc(100%-4rem)] scrollbar-thin">
          {navGroups.map((g) => (
            <SidebarGroup
              key={g.title}
              title={g.title}
              items={g.items}
              collapsed={false}
              currentPath={loc.pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </aside>

      {/* 主内容 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/70 backdrop-blur border-b border-gold-200 flex items-center px-4 md:px-6 gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gold-100 text-ink-800"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-lg md:text-xl text-ink-900 truncate">
              {(() => {
                for (const g of navGroups) {
                  const hit = g.items.find(i =>
                    (i.active || [i.to]).some(p => loc.pathname.startsWith(p))
                  );
                  if (hit) return hit.label;
                }
                return '长租公寓收租管理系统';
              })()}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="px-2.5 py-1 rounded-md bg-ink-500/10 text-ink-700 text-xs">
              账期 · {new Date().toISOString().slice(0, 7)}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ink-600 to-ink-800 flex items-center justify-center text-cream-900 text-xs font-semibold">
              管
            </div>
            <span className="text-ink-700">运营管理员</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
