import { Search, Filter } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    icon?: React.ReactNode;
  }[];
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
}: TableToolbarProps) {
  const gridCols = filters.length === 0 ? 'grid-cols-1' : filters.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-3 lg:gap-4 mb-4 lg:mb-6`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filters.map((filter, index) => (
        <div key={index} className="relative">
          {filter.icon || <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />}
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
