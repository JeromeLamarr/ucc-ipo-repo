import { formatFieldName, ValidationResult } from '../lib/sectionValidation';

interface FormFieldProps {
  label: string;
  fieldName: string;
  isRequired?: boolean;
  validation?: ValidationResult;
  error?: boolean;
  warning?: boolean;
  children: React.ReactNode;
  helperText?: string;
}

/**
 * FormField component with inline validation status
 */
export function FormField({
  label,
  fieldName,
  isRequired = false,
  validation,
  children,
  helperText,
}: FormFieldProps) {
  const hasError = validation?.errors.some((e) => e.field === fieldName);
  const hasWarning = validation?.warnings.some((w) => w.field === fieldName);

  const errorMsg = validation?.errors.find((e) => e.field === fieldName)?.message;
  const warningMsg = validation?.warnings.find((w) => w.field === fieldName)?.message;

  return (
    <div className={`${hasError ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {label}
        {isRequired && <span className="text-red-600 font-bold">*</span>}
        {hasError && <span className="text-red-600 text-xs font-semibold">ERROR</span>}
        {hasWarning && !hasError && (
          <span className="text-yellow-600 text-xs font-semibold">⚠ WARNING</span>
        )}
      </label>

      <div className={hasError ? 'rounded-lg overflow-hidden' : ''}>{children}</div>

      {errorMsg && (
        <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
          <span>✗</span> {errorMsg}
        </p>
      )}

      {warningMsg && !hasError && (
        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
          <span>⚠</span> {warningMsg}
        </p>
      )}

      {helperText && !errorMsg && !warningMsg && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
}
