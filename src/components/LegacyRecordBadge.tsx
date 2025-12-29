interface LegacyRecordBadgeProps {
  source?: string;
  className?: string;
}

export function LegacyRecordBadge({ source, className = '' }: LegacyRecordBadgeProps) {
  return (
    <div className={`group relative inline-block ${className}`}>
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"
        title="This record was manually digitized by the IP Office."
      >
        🔖 LEGACY RECORD
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-md py-2 px-3 whitespace-nowrap z-10">
        This record was manually digitized by the IP Office.
        {source && <div className="text-amber-200">Source: {source}</div>}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
