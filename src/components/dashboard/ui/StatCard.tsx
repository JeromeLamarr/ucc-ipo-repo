import { ComponentType } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  /** Tailwind gradient or solid color class for the icon background */
  iconColor?: string;
  /** Optional small descriptive sub-label under the value */
  description?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'from-blue-500 to-blue-600',
  description,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-start gap-4">
      {Icon && (
        <div
          className={`flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-sm`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        )}
      </div>
    </div>
  );
}
