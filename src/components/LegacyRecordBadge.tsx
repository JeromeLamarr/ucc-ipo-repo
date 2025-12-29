interface LegacyRecordBadgeProps {
  source?: string;
  className?: string;
}

export function LegacyRecordBadge({ source, className = '' }: LegacyRecordBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-800 rounded-md text-sm font-semibold border border-amber-300 ${className}`}
      title={source ? `Source: ${source}` : 'Legacy record'}
    >
      🔖 LEGACY RECORD
    </span>
  );
}
