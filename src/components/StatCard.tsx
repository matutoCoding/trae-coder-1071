import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  accent?: 'ink' | 'gold' | 'moss' | 'coral';
  footnote?: string;
}

const accentMap = {
  ink: 'from-ink-900 via-ink-800 to-ink-700 text-cream-900',
  gold: 'from-gold-500 via-gold-400 to-gold-300 text-ink-900',
  moss: 'from-ink-700 via-ink-600 to-ink-500 text-cream-900',
  coral: 'from-coral-500 via-coral-400 to-gold-300 text-ink-900',
};

export default function StatCard({ title, value, delta, icon, accent = 'ink', footnote }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-xl p-5 bg-gradient-to-br ${accentMap[accent]} shadow-card hover:shadow-card-hover transition-shadow`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 bg-current pointer-events-none" />
      <div className="absolute -right-4 -bottom-6 w-24 h-24 rounded-full opacity-10 bg-current pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs opacity-75 font-medium tracking-wide uppercase">{title}</div>
          <div className={`mt-2 font-serif font-bold text-2xl md:text-3xl ${accent === 'gold' ? '' : 'gold-text'}`} style={{
            WebkitTextFillColor: accent === 'gold' ? undefined : 'transparent',
            backgroundClip: accent === 'gold' ? undefined : 'text',
          }}>
            {value}
          </div>
          {delta && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${
              delta.positive ? 'bg-ink-500/20' : 'bg-coral-500/20'
            }`}>
              <span>{delta.positive ? '▲' : '▼'}</span>
              <span>{delta.value}</span>
            </div>
          )}
          {footnote && <div className="mt-2 text-xs opacity-60">{footnote}</div>}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
