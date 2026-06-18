import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  active?: string[];
}

interface Props {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  currentPath: string;
  onNavigate?: () => void;
}

export default function SidebarGroup({ title, items, collapsed, currentPath, onNavigate }: Props) {
  return (
    <div>
      {!collapsed && (
        <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-cream-700/60">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {items.map((it) => {
          const paths = it.active || [it.to];
          const active = paths.some(p => currentPath.startsWith(p));
          return (
            <NavLink
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              title={collapsed ? it.label : undefined}
              className={`flex items-center gap-3 h-9 rounded-lg px-3 transition-all ${
                active
                  ? 'bg-gradient-to-r from-ink-700 to-ink-800 text-gold-300 shadow-inner'
                  : 'text-cream-700 hover:bg-ink-800/60 hover:text-cream-900'
              }`}
            >
              <span className={`flex-shrink-0 ${active ? 'text-gold-400' : ''}`}>{it.icon}</span>
              {!collapsed && <span className="text-sm whitespace-nowrap">{it.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400" />
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
