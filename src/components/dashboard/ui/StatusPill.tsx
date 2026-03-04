import { getStatusColor, getStatusLabel } from '../../../lib/statusLabels';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const colorClasses = getStatusColor(status);
  const label = getStatusLabel(status);

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${colorClasses} ${sizeClasses}`}
    >
      {label}
    </span>
  );
}
