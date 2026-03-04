import { ReactNode, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  /** 'danger' = red, 'warning' = amber, 'success' = green */
  variant?: 'danger' | 'warning' | 'success';
  /** When true, shows a textarea for the user to enter a reason */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Slot for extra content between description and reason input */
  children?: ReactNode;
  loading?: boolean;
}

const variantStyles = {
  danger: {
    icon: 'bg-red-100 text-red-600',
    confirm: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: 'bg-amber-100 text-amber-600',
    confirm: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  success: {
    icon: 'bg-green-100 text-green-600',
    confirm: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter reason…',
  children,
  loading = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const styles = variantStyles[variant];

  if (!open) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return;
    onConfirm(requireReason ? reason.trim() : undefined);
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + title */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 rounded-xl p-2.5 ${styles.icon}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        </div>

        {children}

        {requireReason && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {reasonLabel}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || (requireReason && !reason.trim())}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors disabled:opacity-50 ${styles.confirm}`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
