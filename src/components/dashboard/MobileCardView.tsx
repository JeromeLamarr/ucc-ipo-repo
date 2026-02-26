import { ReactNode } from 'react';

export interface CardField {
  label: string;
  value: ReactNode;
}

export interface MobileCardViewProps<T> {
  data: T[];
  getRowKey: (row: T) => string;
  renderHeader: (row: T) => ReactNode;
  renderFields: (row: T) => CardField[];
  renderActions: (row: T) => ReactNode;
  emptyState?: ReactNode;
}

export function MobileCardView<T>({
  data,
  getRowKey,
  renderHeader,
  renderFields,
  renderActions,
  emptyState,
}: MobileCardViewProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className="lg:hidden">{emptyState}</div>;
  }

  return (
    <div className="lg:hidden space-y-4">
      {data.map((row) => {
        const fields = renderFields(row);
        return (
          <div
            key={getRowKey(row)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">{renderHeader(row)}</div>
            </div>
            <div className="space-y-2 text-sm">
              {fields.map((field, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <span className="font-medium w-24">{field.label}:</span>
                  <span className="truncate">{field.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              {renderActions(row)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
