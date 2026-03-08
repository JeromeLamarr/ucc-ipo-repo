import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Eye, Plus, Archive, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type LegacyRecord = Database['public']['Tables']['legacy_ip_records']['Row'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function LegacyRecordsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [records, setRecords] = useState<LegacyRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<LegacyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // inputSearch: live input value; searchTerm: debounced value used for filtering
  const [inputSearch, setInputSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IpCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Delete
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk delete
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchRecords();
    }
  }, [profile]);

  // Debounce: update searchTerm 350 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputSearch), 350);
    return () => clearTimeout(timer);
  }, [inputSearch]);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, categoryFilter, sourceFilter]);

  const fetchRecords = async () => {
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('legacy_ip_records')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching legacy records:', error);
      setFetchError('Unable to load legacy records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.details?.creator_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      // Use the top-level indexed column, not the JSONB details field
      filtered = filtered.filter((record) => record.legacy_source === sourceFilter);
    }

    setFilteredRecords(filtered);
  };

  const hasActiveFilters = inputSearch !== '' || categoryFilter !== 'all' || sourceFilter !== 'all';

  const handleDeleteRecord = async (id: string) => {
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase
        .from('legacy_ip_records')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by_admin_id: profile!.id,
        })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Record not found or you do not have permission to delete it.');
      }
      // Re-fetch from DB for ground truth (do not rely on optimistic state)
      await fetchRecords();
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Error archiving legacy record:', err);
      alert(err instanceof Error ? err.message : 'Failed to archive record. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setInputSearch('');
    setSearchTerm('');
    setCategoryFilter('all');
    setSourceFilter('all');
  };

  // ─── Row selection helpers (non-paginated-dependent) ──────────────────────
  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Bulk archive (soft delete) ───────────────────────────────────────────
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const ids = [...selectedIds];
      const { data, error } = await supabase
        .from('legacy_ip_records')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by_admin_id: profile!.id,
        })
        .in('id', ids)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No records were archived. You may not have permission or the records were not found.');
      }
      if (data.length < ids.length) {
        // Partial success — some records were archived, some were not
        console.warn(`Bulk archive: expected ${ids.length} rows, only ${data.length} were archived.`);
      }
      // Re-fetch from DB for ground truth
      await fetchRecords();
      clearSelection();
      setBulkDeleteConfirm(false);
    } catch (err) {
      console.error('Bulk archive error:', err);
      alert(err instanceof Error ? err.message : 'Failed to archive selected records. Please try again.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const categories = ['patent', 'trademark', 'copyright', 'trade_secret', 'software', 'design', 'other'] as IpCategory[];
  const sources = ['old_system', 'physical_archive', 'email', 'manual_entry', 'other'];

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, sourceFilter]);

  // Clear selection when filters or page change (selections from another page/filter are confusing)
  useEffect(() => {
    clearSelection();
  }, [searchTerm, categoryFilter, sourceFilter, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Selection helpers that depend on paginatedRecords ───────────────────
  const allCurrentPageSelected =
    paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedIds.has(r.id));

  const someCurrentPageSelected =
    paginatedRecords.some((r) => selectedIds.has(r.id)) && !allCurrentPageSelected;

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedRecords.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedRecords.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Archive className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Legacy IP Records</h1>
            <p className="text-gray-600 mt-1">Digitized historical intellectual property records</p>
          </div>
        </div>
        <Link
          to="/dashboard/legacy-records/new"
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Legacy Record
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
            <input
              type="search"
              id="legacy-search"
              aria-label="Search by title or inventor name"
              placeholder="Title or inventor name..."
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <select
            id="legacy-category-filter"
            aria-label="Filter by IP category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as IpCategory | 'all')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
          <select
            id="legacy-source-filter"
            aria-label="Filter by legacy source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="old_system">Old System</option>
            <option value="physical_archive">Physical Archive</option>
            <option value="email">Email</option>
            <option value="manual_entry">Manual Entry</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Records section */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Legacy Records</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm font-medium text-amber-800">
                {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Delete Selected
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-amber-700 hover:text-amber-900 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : fetchError ? (
          <div className="py-12 text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-1">Failed to load records</p>
            <p className="text-gray-500 text-sm mb-4">{fetchError}</p>
            <button
              onClick={fetchRecords}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            {hasActiveFilters ? (
              <>
                <p className="text-gray-900 font-medium mb-1">No records match your search or filters.</p>
                <p className="text-gray-500 text-sm mb-4">Try adjusting the filters or clearing your search.</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-900 font-medium mb-1">No legacy records yet.</p>
                <p className="text-gray-500 text-sm mb-4">Start digitising historical IP records by adding the first one.</p>
                <Link
                  to="/dashboard/legacy-records/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add the first legacy record
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        checked={allCurrentPageSelected}
                        ref={(el) => { if (el) el.indeterminate = someCurrentPageSelected; }}
                        onChange={toggleSelectAll}
                        aria-label="Select all records on this page"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventor / Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`hover:bg-gray-50 transition-colors${selectedIds.has(record.id) ? ' bg-amber-50' : ''}`}
                    >
                      <td className="px-3 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleRow(record.id)}
                          aria-label={`Select record: ${record.title}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{record.title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.details?.creator_name || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                          {record.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.legacy_source || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/dashboard/legacy-records/${record.id}`}
                            aria-label={`View record: ${record.title}`}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                            View
                          </Link>
                          <button
                            onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
                            aria-label={`Delete record: ${record.title}`}
                            className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {paginatedRecords.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-xl border p-4 space-y-3 transition-colors${
                    selectedIds.has(record.id)
                      ? ' bg-amber-50 border-amber-400'
                      : ' bg-white border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 shrink-0"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleRow(record.id)}
                      aria-label={`Select record: ${record.title}`}
                    />
                    <div className="flex-1 flex items-start justify-between gap-2">
                      <div className="font-medium text-gray-900">{record.title}</div>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 shrink-0">
                        {record.category}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500">Inventor / Author</div>
                      <div className="font-medium text-gray-900">{record.details?.creator_name || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Source</div>
                      <div className="font-medium text-gray-900">{record.legacy_source || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500">Date Created</div>
                      <div className="font-medium text-gray-900">{new Date(record.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/dashboard/legacy-records/${record.id}`}
                      aria-label={`View record: ${record.title}`}
                      className="flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      View
                    </Link>
                    <button
                      onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
                      aria-label={`Delete record: ${record.title}`}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(count) => {
                setItemsPerPage(count);
                setCurrentPage(1);
              }}
              totalItems={filteredRecords.length}
            />
          </>
        )}
      </div>
      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Selected Records</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete{' '}
              <strong>{selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''}</strong>?{' '}
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleteLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {bulkDeleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete {selectedIds.size} Record{selectedIds.size !== 1 ? 's' : ''} Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Legacy Record</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete{' '}
              <strong>&ldquo;{deleteConfirmation.title}&rdquo;</strong>?{' '}
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(deleteConfirmation.id)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
