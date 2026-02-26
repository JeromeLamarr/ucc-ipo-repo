import { ReactNode } from 'react';

interface TableCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'warning';
}

export function TableCard({ title, subtitle, actions, children, variant = 'default' }: TableCardProps) {
  const borderColor = variant === 'warning' ? 'border-amber-200' : 'border-gray-200';
  const headerBg = variant === 'warning'
    ? 'bg-gradient-to-r from-amber-50/50 to-amber-100/30'
    : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30';
  const headerBorderColor = variant === 'warning' ? 'border-amber-200/40' : 'border-blue-200/40';

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${borderColor} p-4 lg:p-6`}>
      <div className={`mb-4 lg:mb-6 ${actions ? 'flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4' : ''}`}>
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-600 text-xs lg:text-sm mt-1">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
