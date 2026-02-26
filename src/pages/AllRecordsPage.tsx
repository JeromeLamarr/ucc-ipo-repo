import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Download, Eye, Trash2 } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { TableCard } from '../components/dashboard/TableCard';
import { TableToolbar } from '../components/dashboard/TableToolbar';
import { DataTable, TableColumn } from '../components/dashboard/DataTable';
import { MobileCardView, CardField } from '../components/dashboard/MobileCardView';
import { EmptyState } from '../components/dashboard/EmptyState';
import { LoadingSkeleton } from '../components/dashboard/LoadingSkeleton';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { RowActions, RowAction } from '../components/dashboard/RowActions';
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

  // Pagination states for workflow records
  const [workflowCurrentPage, setWorkflowCurrentPage] = useState(1);
  const [workflowItemsPerPage, setWorkflowItemsPerPage] = useState(10);

  // Pagination states for drafts
  const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
  const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, categoryFilter]);

  const fetchRecords = async () => {
    try {
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

      await fetchRecords();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  const filterRecords = () => {
    const drafts = records.filter((record) => record.status === 'draft');
    const submitted = records.filter((record) => record.status !== 'draft');

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

    setFilteredRecords(filtered);
    setFilteredDrafts(drafts);
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Applicant', 'Category', 'Status', 'Supervisor', 'Evaluator', 'Created'];
    const rows = filteredRecords.map((record) => [
      record.title,
      record.applicant?.full_name || '',
      record.category,
      record.status,
      record.supervisor?.full_name || 'Not assigned',
      record.evaluator?.full_name || 'Not assigned',
      new Date(record.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-workflow-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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

  // Calculate paginated draft records
  const draftsStartIndex = (draftsCurrentPage - 1) * draftsItemsPerPage;
  const draftsEndIndex = draftsStartIndex + draftsItemsPerPage;
  const paginatedDrafts = filteredDrafts.slice(draftsStartIndex, draftsEndIndex);
  const draftsTotalPages = Math.ceil(filteredDrafts.length / draftsItemsPerPage);

  // Define workflow table columns
  const workflowColumns: TableColumn<IpRecord>[] = [
    {
      header: 'Title',
      accessor: (record) => (
        <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={record.title}>
          {record.title}
        </div>
      ),
    },
    {
      header: 'Applicant',
      accessor: (record) => (
        <>
          <div className="text-sm text-gray-900">{record.applicant?.full_name}</div>
          <div className="text-xs text-gray-500 truncate max-w-[180px]">{record.applicant?.email}</div>
        </>
      ),
    },
    {
      header: 'Category',
      accessor: (record) => <div className="text-sm text-gray-900 capitalize">{record.category}</div>,
      className: 'whitespace-nowrap',
    },
    {
      header: 'Status',
      accessor: (record) => <StatusBadge status={record.status} />,
      className: 'whitespace-nowrap',
    },
    {
      header: 'Supervisor',
      accessor: (record) => <span className="text-sm text-gray-500">{record.supervisor?.full_name || '-'}</span>,
      className: 'whitespace-nowrap',
      hideOn: 'xl',
    },
    {
      header: 'Evaluator',
      accessor: (record) => <span className="text-sm text-gray-500">{record.evaluator?.full_name || '-'}</span>,
      className: 'whitespace-nowrap',
      hideOn: 'xl',
    },
    {
      header: 'Created',
      accessor: (record) => <span className="text-sm text-gray-500">{formatDate(record.created_at)}</span>,
      className: 'whitespace-nowrap',
      hideOn: '2xl',
    },
    {
      header: 'Actions',
      accessor: (record) => {
        const actions: RowAction[] = [
          {
            type: 'link',
            icon: 'view',
            label: 'View',
            href: `/dashboard/submissions/${record.id}`,
            hideLabel: true,
          },
          {
            type: 'button',
            icon: 'delete',
            label: 'Delete',
            onClick: () => setDeleteConfirmation({ id: record.id, title: record.title }),
            variant: 'danger',
            hideLabel: true,
          },
        ];
        return <RowActions actions={actions} />;
      },
      className: 'whitespace-nowrap text-sm sticky right-0 bg-white text-right',
    },
  ];

  // Define draft table columns
  const draftColumns: TableColumn<IpRecord>[] = [
    {
      header: 'Title',
      accessor: (record) => (
        <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={record.title}>
          {record.title}
        </div>
      ),
    },
    {
      header: 'Applicant',
      accessor: (record) => (
        <>
          <div className="text-sm text-gray-900">{record.applicant?.full_name}</div>
          <div className="text-xs text-gray-500">{record.applicant?.email}</div>
        </>
      ),
    },
    {
      header: 'Category',
      accessor: (record) => <div className="text-sm text-gray-900 capitalize">{record.category}</div>,
      className: 'whitespace-nowrap',
    },
    {
      header: 'Created',
      accessor: (record) => <span className="text-sm text-gray-500">{formatDate(record.created_at)}</span>,
      className: 'whitespace-nowrap',
    },
    {
      header: 'Actions',
      accessor: (record) => {
        const actions: RowAction[] = [
          {
            type: 'link',
            icon: 'view',
            label: 'View',
            href: `/dashboard/submissions/${record.id}`,
            hideLabel: false,
          },
          {
            type: 'button',
            icon: 'delete',
            label: 'Delete',
            onClick: () => setDeleteConfirmation({ id: record.id, title: record.title }),
            variant: 'danger',
            hideLabel: false,
          },
        ];
        return <RowActions actions={actions} />;
      },
      className: 'whitespace-nowrap text-sm sticky right-0 bg-white text-right',
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
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
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm lg:text-base"
        >
          <Download className="h-4 w-4 lg:h-5 lg:w-5" />
          Export CSV
        </button>
      </div>

      {/* DRAFT SUBMISSIONS SECTION */}
      {filteredDrafts.length > 0 && (
        <TableCard
          title={`Draft Submissions (${filteredDrafts.length})`}
          subtitle="Incomplete submissions waiting to be submitted to the workflow"
          variant="warning"
        >
          <DataTable
            columns={draftColumns}
            data={paginatedDrafts}
            getRowKey={(record) => record.id}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No drafts found"
                colSpan={draftColumns.length}
              />
            }
            variant="warning"
          />

          <MobileCardView
            data={paginatedDrafts}
            getRowKey={(record) => record.id}
            renderHeader={(record) => (
              <>
                <h3 className="text-sm font-medium text-gray-900 mb-1">{record.title}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {record.category}
                </span>
              </>
            )}
            renderFields={(record): CardField[] => [
              { label: 'Applicant', value: record.applicant?.full_name },
              { label: 'Created', value: formatDate(record.created_at) },
            ]}
            renderActions={(record) => {
              const actions: RowAction[] = [
                {
                  type: 'link',
                  icon: 'view',
                  label: 'View',
                  href: `/dashboard/submissions/${record.id}`,
                },
                {
                  type: 'button',
                  icon: 'delete',
                  label: 'Delete',
                  onClick: () => setDeleteConfirmation({ id: record.id, title: record.title }),
                  variant: 'danger',
                },
              ];
              return <RowActions actions={actions} mobile />;
            }}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No drafts found"
              />
            }
          />

          {draftsTotalPages > 1 && (
            <Pagination
              currentPage={draftsCurrentPage}
              totalPages={draftsTotalPages}
              onPageChange={setDraftsCurrentPage}
              itemsPerPage={draftsItemsPerPage}
              onItemsPerPageChange={(count) => {
                setDraftsItemsPerPage(count);
                setDraftsCurrentPage(1);
              }}
              totalItems={filteredDrafts.length}
            />
          )}
        </TableCard>
      )}

      {/* WORKFLOW IP RECORDS SECTION */}
      <TableCard
        title={`Workflow IP Records (${filteredRecords.length})`}
        subtitle="Active submissions in the evaluation workflow"
      >
        <TableToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by title or applicant..."
          filters={[
            {
              value: statusFilter,
              onChange: (value) => setStatusFilter(value as IpStatus | 'all'),
              options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'waiting_supervisor', label: 'Waiting Supervisor' },
                { value: 'supervisor_approved', label: 'Supervisor Approved' },
                { value: 'waiting_evaluation', label: 'Waiting Evaluation' },
                { value: 'evaluator_approved', label: 'Evaluator Approved' },
                { value: 'ready_for_filing', label: 'Ready for Filing' },
                { value: 'rejected', label: 'Rejected' },
              ],
            },
            {
              value: categoryFilter,
              onChange: (value) => setCategoryFilter(value as IpCategory | 'all'),
              options: [
                { value: 'all', label: 'All Categories' },
                { value: 'patent', label: 'Patent' },
                { value: 'copyright', label: 'Copyright' },
                { value: 'trademark', label: 'Trademark' },
                { value: 'design', label: 'Industrial Design' },
                { value: 'utility_model', label: 'Utility Model' },
                { value: 'other', label: 'Other' },
              ],
            },
          ]}
        />

        <DataTable
          columns={workflowColumns}
          data={paginatedWorkflowRecords}
          getRowKey={(record) => record.id}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No workflow records found"
              colSpan={workflowColumns.length}
            />
          }
        />

        <MobileCardView
          data={paginatedWorkflowRecords}
          getRowKey={(record) => record.id}
          renderHeader={(record) => (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{record.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {record.category}
                </span>
                <StatusBadge status={record.status} />
              </div>
            </>
          )}
          renderFields={(record): CardField[] => {
            const fields: CardField[] = [
              { label: 'Applicant', value: record.applicant?.full_name },
            ];
            if (record.supervisor?.full_name) {
              fields.push({ label: 'Supervisor', value: record.supervisor.full_name });
            }
            if (record.evaluator?.full_name) {
              fields.push({ label: 'Evaluator', value: record.evaluator.full_name });
            }
            fields.push({ label: 'Created', value: formatDate(record.created_at) });
            return fields;
          }}
          renderActions={(record) => {
            const actions: RowAction[] = [
              {
                type: 'link',
                icon: 'view',
                label: 'View',
                href: `/dashboard/submissions/${record.id}`,
              },
              {
                type: 'button',
                icon: 'delete',
                label: 'Delete',
                onClick: () => setDeleteConfirmation({ id: record.id, title: record.title }),
                variant: 'danger',
              },
            ];
            return <RowActions actions={actions} mobile />;
          }}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No workflow records found"
            />
          }
        />

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
      </TableCard>

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
