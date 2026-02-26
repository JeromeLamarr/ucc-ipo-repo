import { getStatusColor, getStatusLabel } from '../../lib/statusLabels';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
