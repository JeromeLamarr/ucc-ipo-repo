import { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  rowKey?: (row: T, index: number) => string | number;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full max-w-[160px]" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  emptyIcon,
  rowKey,
}: DataTableProps<T>) {
  const getValue = (row: T, accessor: string): unknown => {
    // Support dot-notation e.g. "user.name"
    return accessor.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, row);
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  {emptyIcon && (
                    <div className="mb-3 text-gray-300">{emptyIcon}</div>
                  )}
                  <p className="text-sm text-gray-400">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowKey ? rowKey(row, rowIndex) : rowIndex}
                className="hover:bg-gray-50 transition-colors duration-100"
              >
                {columns.map((col, colIndex) => {
                  const rawValue = getValue(row, col.accessor as string);
                  return (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-sm text-gray-700 ${col.className ?? ''}`}
                    >
                      {col.render
                        ? col.render(rawValue, row)
                        : rawValue !== undefined && rawValue !== null
                        ? String(rawValue)
                        : <span className="text-gray-400">—</span>}
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
