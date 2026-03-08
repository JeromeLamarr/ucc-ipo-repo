import { useEffect, useState } from 'react';
import ExcelJS from 'exceljs';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Eye, Download, Plus, Award, Trash2, MoreVertical } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type IpStatus = Database['public']['Tables']['ip_records']['Row']['status'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function AllRecordsPage() {
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<IpRecord[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<IpStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IpCategory | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination states for workflow records
  const [workflowCurrentPage, setWorkflowCurrentPage] = useState(1);
  const [workflowItemsPerPage, setWorkflowItemsPerPage] = useState(10);

  // Pagination states for drafts
  const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
  const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

  // Row selection state
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
    setWorkflowCurrentPage(1);
  }, [records, searchTerm, statusFilter, categoryFilter, dateFrom, dateTo]);

  const fetchRecords = async () => {
    try {
      // Fetch ALL records from ip_records (both drafts and submitted)
      // Only fetch non-deleted records
      const { data, error } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        throw error;
      }

      console.log('Fetched records:', data?.length || 0, 'records');
      console.log('Sample record:', data?.[0]);
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('ip_records')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) throw error;

      // Refresh records
      await fetchRecords();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  const filterRecords = () => {
    console.log('Filtering records. Total records:', records.length);

    // Separate drafts from workflow records
    const drafts = records.filter((record) => record.status === 'draft');
    const submitted = records.filter((record) => record.status !== 'draft');

    console.log('Drafts:', drafts.length, 'Submitted:', submitted.length);

    // Apply filters only to submitted records (not to drafts)
    let filtered = submitted;

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === categoryFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter((record) => new Date(record.created_at) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((record) => new Date(record.created_at) <= to);
    }

    console.log('Filtered workflow records:', filtered.length);
    console.log('Filtered drafts:', drafts.length);

    setFilteredRecords(filtered);
    setFilteredDrafts(drafts);
  };

  const exportToExcel = async () => {
    const exportSource =
      selectedWorkflowIds.length > 0
        ? filteredRecords.filter((r) => selectedWorkflowIds.includes(r.id))
        : filteredRecords;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCC IPO System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('IP Records');

    // ── Metadata rows ────────────────────────────────────────────────
    const metaStyle: Partial<ExcelJS.Style> = {
      font: { italic: true, size: 10, color: { argb: 'FF6B7280' } },
    };

    const genRow = sheet.addRow(['Generated:', new Date().toLocaleString()]);
    genRow.eachCell((c) => Object.assign(c, metaStyle));

    const filterParts: string[] = [];
    if (searchTerm) filterParts.push(`Search: "${searchTerm}"`);
    if (statusFilter !== 'all') filterParts.push(`Status: ${getStatusLabel(statusFilter)}`);
    if (categoryFilter !== 'all') filterParts.push(`Category: ${categoryFilter}`);
    if (dateFrom) filterParts.push(`From: ${dateFrom}`);
    if (dateTo) filterParts.push(`To: ${dateTo}`);
    if (selectedWorkflowIds.length > 0) filterParts.push(`Selection: ${selectedWorkflowIds.length} rows`);

    const filterRow = sheet.addRow([
      'Active Filters:',
      filterParts.length > 0 ? filterParts.join('  |  ') : 'None',
    ]);
    filterRow.eachCell((c) => Object.assign(c, metaStyle));

    const totalRow = sheet.addRow(['Total Records:', exportSource.length]);
    totalRow.getCell(1).font = { bold: true, size: 10 };
    totalRow.getCell(2).font = { bold: true, size: 10 };

    sheet.addRow([]); // blank spacer

    // ── Header row (row 5) ───────────────────────────────────────────
    const HEADER_FILL: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' }, // green-600
    };
    const HEADER_BORDER: Partial<ExcelJS.Borders> = {
      top:    { style: 'thin', color: { argb: 'FF15803D' } },
      bottom: { style: 'thin', color: { argb: 'FF15803D' } },
      left:   { style: 'thin', color: { argb: 'FF15803D' } },
      right:  { style: 'thin', color: { argb: 'FF15803D' } },
    };

    const headerRow = sheet.addRow([
      'Tracking ID', 'Reference Number', 'Title', 'Applicant',
      'Category', 'Status', 'Supervisor', 'Evaluator', 'Date Filed',
    ]);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = HEADER_BORDER;
    });

    // ── Data rows ────────────────────────────────────────────────────
    const EVEN_FILL: ExcelJS.Fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' }, // green-50
    };
    const ODD_FILL: ExcelJS.Fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' },
    };
    const DATA_BORDER: Partial<ExcelJS.Borders> = {
      top:    { style: 'hair', color: { argb: 'FFD1FAE5' } },
      bottom: { style: 'hair', color: { argb: 'FFD1FAE5' } },
      left:   { style: 'hair', color: { argb: 'FFD1FAE5' } },
      right:  { style: 'hair', color: { argb: 'FFD1FAE5' } },
    };

    exportSource.forEach((record, idx) => {
      const row = sheet.addRow([
        record.tracking_id ?? '',
        record.reference_number ?? '',
        record.title,
        record.applicant?.full_name || '',
        record.category,
        getStatusLabel(record.status),
        record.supervisor?.full_name || 'Not assigned',
        record.evaluator?.full_name || 'Not assigned',
        new Date(record.created_at).toLocaleDateString(),
      ]);
      row.height = 18;
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = idx % 2 === 0 ? EVEN_FILL : ODD_FILL;
        cell.border = DATA_BORDER;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 9 ? 'center' : 'left',
          wrapText: colNum === 3, // wrap Title column
        };
        cell.font = { size: 10 };
      });
    });

    // ── Column widths ────────────────────────────────────────────────
    const colWidths = [16, 18, 42, 24, 14, 26, 24, 24, 14];
    colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    // ── Auto-filter & freeze pane ────────────────────────────────────
    sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 9 } };
    sheet.views = [{ state: 'frozen', ySplit: 5 } as ExcelJS.WorksheetView];

    // ── Filename ─────────────────────────────────────────────────────
    const parts = ['ip-records'];
    if (selectedWorkflowIds.length > 0) parts.push(`selected-${selectedWorkflowIds.length}`);
    if (statusFilter !== 'all') parts.push(statusFilter);
    if (categoryFilter !== 'all') parts.push(categoryFilter);
    if (dateFrom) parts.push(`from-${dateFrom}`);
    if (dateTo) parts.push(`to-${dateTo}`);
    parts.push(new Date().toISOString().split('T')[0]);
    const filename = `${parts.join('_')}.xlsx`;

    // ── Download ─────────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCount = selectedWorkflowIds.length > 0 ? selectedWorkflowIds.length : filteredRecords.length;
  const exportLabel = selectedWorkflowIds.length > 0 ? `Export Selected (${exportCount})` : `Export Filtered (${exportCount})`;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate paginated workflow records
  const workflowStartIndex = (workflowCurrentPage - 1) * workflowItemsPerPage;
  const workflowEndIndex = workflowStartIndex + workflowItemsPerPage;
  const paginatedWorkflowRecords = filteredRecords.slice(workflowStartIndex, workflowEndIndex);
  const workflowTotalPages = Math.ceil(filteredRecords.length / workflowItemsPerPage);

  const toggleWorkflowRow = (id: string) =>
    setSelectedWorkflowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAllWorkflow = () =>
    setSelectedWorkflowIds(selectedWorkflowIds.length === paginatedWorkflowRecords.length ? [] : paginatedWorkflowRecords.map(r => r.id));

  // Calculate paginated draft records
  const draftsStartIndex = (draftsCurrentPage - 1) * draftsItemsPerPage;
  const draftsEndIndex = draftsStartIndex + draftsItemsPerPage;
  const paginatedDrafts = filteredDrafts.slice(draftsStartIndex, draftsEndIndex);
  const draftsTotalPages = Math.ceil(filteredDrafts.length / draftsItemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">All IP Records</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            Viewing {filteredRecords.length} workflow records and {filteredDrafts.length} drafts
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm lg:text-base"
        >
          <Download className="h-4 w-4 lg:h-5 lg:w-5" />
          {exportLabel}
        </button>
      </div>

      {/* WORKFLOW IP RECORDS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Workflow IP Records ({filteredRecords.length})</h2>
          <p className="text-gray-600 text-xs lg:text-sm mt-1">Active submissions in the evaluation workflow</p>
        </div>

        <div className="space-y-3 mb-4 lg:mb-6">
          {/* Row 1: Search, Status, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or applicant..."
                className="w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as IpStatus | 'all')}
                className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="waiting_supervisor">Waiting Supervisor</option>
                <option value="supervisor_revision">Revision Requested – Supervisor</option>
                <option value="supervisor_approved">Supervisor Approved</option>
                <option value="waiting_evaluation">Waiting Evaluation</option>
                <option value="evaluator_revision">Revision Requested – Evaluator</option>
                <option value="evaluator_approved">Evaluator Approved</option>
                <option value="preparing_legal">Preparing for Legal Filing</option>
                <option value="ready_for_filing">Ready for Filing</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as IpCategory | 'all')}
                className="w-full pl-9 lg:pl-10 pr-8 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Categories</option>
                <option value="patent">Patent</option>
                <option value="copyright">Copyright</option>
                <option value="trademark">Trademark</option>
                <option value="design">Industrial Design</option>
                <option value="utility_model">Utility Model</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Range */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Date Range:</span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={paginatedWorkflowRecords.length > 0 && selectedWorkflowIds.length === paginatedWorkflowRecords.length}
                    onChange={toggleSelectAllWorkflow}
                    aria-label="Select all workflow records"
                  />
                </th>
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No workflow records found</p>
                  </td>
                </tr>
              ) : (
                paginatedWorkflowRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedWorkflowIds.includes(record.id)}
                        onChange={() => toggleWorkflowRow(record.id)}
                        aria-label={`Select record ${record.title}`}
                      />
                    </td>
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
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getStatusColor(record.status)
                        }`}
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
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden 2xl:inline">View</span>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden 2xl:inline">Delete</span>
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
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No workflow records found</p>
            </div>
          ) : (
            paginatedWorkflowRecords.map((record) => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">{record.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {record.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getStatusColor(record.status)
                        }`}
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
                  <Link
                    to={`/dashboard/submissions/${record.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                  <button
                    onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
                    className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {workflowTotalPages > 1 && (
          <Pagination
            currentPage={workflowCurrentPage}
            totalPages={workflowTotalPages}
            onPageChange={setWorkflowCurrentPage}
            itemsPerPage={workflowItemsPerPage}
            onItemsPerPageChange={(count) => {
              setWorkflowItemsPerPage(count);
              setWorkflowCurrentPage(1);
            }}
            totalItems={filteredRecords.length}
          />
        )}
      </div>

      {/* Information about Legacy Records */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p>
          <strong>Legacy IP Records:</strong> Historical IP submissions are now managed in a separate admin module. 
          Access them from the <strong>Legacy Records</strong> section in the sidebar.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the record "<strong>{deleteConfirmation.title}</strong>"? 
              It will be moved to the Deleted Archive and can be restored later.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(deleteConfirmation.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
