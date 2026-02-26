import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

export interface RowAction {
  type: 'link' | 'button';
  icon: 'view' | 'edit' | 'delete' | 'custom';
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'warning';
  customIcon?: ReactNode;
  hideLabel?: boolean;
}

interface RowActionsProps {
  actions: RowAction[];
  mobile?: boolean;
}

const iconMap = {
  view: Eye,
  edit: Edit,
  delete: Trash2,
  custom: MoreVertical,
};

export function RowActions({ actions, mobile = false }: RowActionsProps) {
  if (mobile) {
    return (
      <>
        {actions.map((action, index) => {
          const Icon = action.customIcon || iconMap[action.icon];
          const baseClass = 'flex-1 text-center px-3 py-2 rounded-lg font-medium inline-flex items-center justify-center gap-2';
          const variantClass =
            action.variant === 'danger'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : action.variant === 'warning'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-blue-600 text-white hover:bg-blue-700';

          if (action.type === 'link' && action.href) {
            return (
              <Link key={index} to={action.href} className={`${baseClass} ${variantClass}`}>
                {typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : Icon}
                {action.label}
              </Link>
            );
          }

          return (
            <button key={index} onClick={action.onClick} className={`${baseClass} ${variantClass}`}>
              {typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : Icon}
              {action.label}
            </button>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {actions.map((action, index) => {
        const Icon = action.customIcon || iconMap[action.icon];
        const colorClass =
          action.variant === 'danger'
            ? 'text-red-600 hover:text-red-700'
            : action.variant === 'warning'
            ? 'text-orange-600 hover:text-orange-700'
            : 'text-blue-600 hover:text-blue-700';

        if (action.type === 'link' && action.href) {
          return (
            <Link
              key={index}
              to={action.href}
              className={`${colorClass} font-medium inline-flex items-center gap-1`}
              title={action.label}
            >
              {typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : Icon}
              <span className={action.hideLabel ? 'hidden 2xl:inline' : ''}>{action.label}</span>
            </Link>
          );
        }

        return (
          <button
            key={index}
            onClick={action.onClick}
            className={`${colorClass} font-medium inline-flex items-center gap-1`}
            title={action.label}
          >
            {typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : Icon}
            <span className={action.hideLabel ? 'hidden 2xl:inline' : ''}>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
