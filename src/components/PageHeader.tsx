import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({ title, description, actions, children }: Props) {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl md:text-[28px] text-ink-900 leading-tight">{title}</h2>
          {description && (
            <p className="mt-1.5 text-sm text-ink-700 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
