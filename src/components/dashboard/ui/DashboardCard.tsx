import { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  /** Optional heading rendered inside the card above children */
  title?: string;
  /** Optional right-side actions rendered next to the title */
  titleActions?: ReactNode;
  noPadding?: boolean;
}

export function DashboardCard({
  children,
  className = '',
  title,
  titleActions,
  noPadding = false,
}: DashboardCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {titleActions && <div className="flex items-center gap-2">{titleActions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}
