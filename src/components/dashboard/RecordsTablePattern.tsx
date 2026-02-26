import { useState } from 'react';
import { Search, Filter, Eye, Trash2, FileText } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../../lib/statusLabels';
import { Pagination } from '../Pagination';

// Export types for consuming components
export interface IpRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  applicant?: {
    full_name: string;
    email: string;
  };
  supervisor?: {
    full_name: string;
  };
  evaluator?: {
    full_name: string;
  };
}

export interface RecordsTablePatternProps {
  rows: IpRecord[];
  onView: (record: IpRecord) => void;
  onDelete: (record: IpRecord) => void;
  loading?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
  categoryOptions?: Array<{ value: string; label: string }>;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  viewButtonLabel?: string;
  deleteButtonLabel?: string;
  showPagination?: boolean;
  itemsPerPageDefault?: number;
}

type StatusOptionValue = string | 'all';
type CategoryOptionValue = string | 'all';

export function RecordsTablePattern({
  rows,
  onView,
  onDelete,
  loading = false,
  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'waiting_supervisor', label: 'Waiting Supervisor' },
    { value: 'supervisor_approved', label: 'Supervisor Approved' },
    { value: 'waiting_evaluation', label: 'Waiting Evaluation' },
    { value: 'evaluator_approved', label: 'Evaluator Approved' },
    { value: 'ready_for_filing', label: 'Ready for Filing' },
    { value: 'rejected', label: 'Rejected' },
  ],
  categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'patent', label: 'Patent' },
    { value: 'copyright', label: 'Copyright' },
    { value: 'trademark', label: 'Trademark' },
    { value: 'design', label: 'Industrial Design' },
    { value: 'utility_model', label: 'Utility Model' },
    { value: 'other', label: 'Other' },
  ],
  searchPlaceholder = 'Search by title or applicant...',
  emptyStateMessage = 'No records found',
  viewButtonLabel = 'View',
  deleteButtonLabel = 'Delete',
  showPagination = true,
  itemsPerPageDefault = 10,
}: RecordsTablePatternProps) {
  // Local state for filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusOptionValue>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryOptionValue>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageDefault);

  // Apply filters
  let filteredRows = rows;

  if (searchTerm) {
    filteredRows = filteredRows.filter(
      (record) =>
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (statusFilter !== 'all') {
    filteredRows = filteredRows.filter((record) => record.status === statusFilter);
  }

  if (categoryFilter !== 'all') {
    filteredRows = filteredRows.filter((record) => record.category === categoryFilter);
  }

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  // Helpers
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      {/* Toolbar: Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusOptionValue);
              setCurrentPage(1); // Reset to page 1 on filter change
            }}
            className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as CategoryOptionValue);
              setCurrentPage(1); // Reset to page 1 on filter change
            }}
            className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applicant
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                Supervisor
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                Evaluator
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden 2xl:table-cell">
                Created
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{emptyStateMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={record.title}>
                      {record.title}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900">{record.applicant?.full_name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[180px]">{record.applicant?.email}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">{record.category}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                    {record.supervisor?.full_name || '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                    {record.evaluator?.full_name || '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden 2xl:table-cell">
                    {formatDate(record.created_at)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm sticky right-0 bg-white">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onView(record)}
                        className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        title={viewButtonLabel}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden 2xl:inline">{viewButtonLabel}</span>
                      </button>
                      <button
                        onClick={() => onDelete(record)}
                        className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        title={deleteButtonLabel}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden 2xl:inline">{deleteButtonLabel}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredRows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{emptyStateMessage}</p>
          </div>
        ) : (
          paginatedRows.map((record) => (
            <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">{record.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {record.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium w-24">Applicant:</span>
                  <span className="truncate">{record.applicant?.full_name}</span>
                </div>
                {record.supervisor?.full_name && (
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Supervisor:</span>
                    <span className="truncate">{record.supervisor.full_name}</span>
                  </div>
                )}
                {record.evaluator?.full_name && (
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Evaluator:</span>
                    <span className="truncate">{record.evaluator.full_name}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <span className="font-medium w-24">Created:</span>
                  <span>{formatDate(record.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onView(record)}
                  className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {viewButtonLabel}
                </button>
                <button
                  onClick={() => onDelete(record)}
                  className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium inline-flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteButtonLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(count) => {
            setItemsPerPage(count);
            setCurrentPage(1);
          }}
          totalItems={filteredRows.length}
        />
      )}
    </div>
  );
}
