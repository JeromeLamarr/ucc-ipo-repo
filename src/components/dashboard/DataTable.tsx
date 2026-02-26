import { ReactNode } from 'react';

export interface TableColumn<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
  hideOn?: 'xl' | '2xl';
}

export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  variant?: 'default' | 'warning';
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  emptyState,
  variant = 'default',
}: DataTableProps<T>) {
  const headerBg = variant === 'warning' ? 'bg-amber-50' : 'bg-gray-50';

  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead className={`${headerBg} sticky top-0 z-10`}>
          <tr>
            {columns.map((column, index) => {
              const hideClass = column.hideOn === 'xl' ? 'hidden xl:table-cell' : column.hideOn === '2xl' ? 'hidden 2xl:table-cell' : '';
              return (
                <th
                  key={index}
                  className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${hideClass} ${column.className || ''}`}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 && emptyState ? (
            emptyState
          ) : (
            data.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column, index) => {
                  const hideClass = column.hideOn === 'xl' ? 'hidden xl:table-cell' : column.hideOn === '2xl' ? 'hidden 2xl:table-cell' : '';
                  return (
                    <td key={index} className={`px-3 py-3 ${hideClass} ${column.className || ''}`}>
                      {column.accessor(row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
