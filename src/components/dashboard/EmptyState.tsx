import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  colSpan?: number;
}

export function EmptyState({ icon: Icon, title, description, action, colSpan }: EmptyStateProps) {
  const content = (
    <div className="text-center py-12 text-gray-500">
      <Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-12">
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
