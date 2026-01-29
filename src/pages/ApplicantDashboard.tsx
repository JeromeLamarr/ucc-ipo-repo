import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Clock, CheckCircle, XCircle, Plus, Edit, AlertCircle, Trash2 } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'];

export function ApplicantDashboard() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [drafts, setDrafts] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    drafts: 0,
  });

  useEffect(() => {
    fetchRecords();
  }, [profile]);

  const fetchRecords = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select('*')
        .eq('applicant_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allRecords = data || [];
      // Only submitted/completed records appear in main list
      const submittedRecords = allRecords.filter(r => r.status !== 'draft');
      // Drafts are auto-saved but not yet submitted to the workflow
      const draftRecords = allRecords.filter(r => r.status === 'draft');

      setRecords(submittedRecords);
      setDrafts(draftRecords);
      
      setStats({
        total: submittedRecords.length,
        pending:
          submittedRecords.filter((r) =>
            ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
          ).length || 0,
        approved:
          submittedRecords.filter((r) =>
            ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
          ).length || 0,
        rejected: submittedRecords.filter((r) => r.status === 'rejected').length || 0,
        drafts: draftRecords.length,
      });
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) return;

    setDeletingDraftId(draftId);
    try {
      console.log('[deleteDraft] Starting delete for draft:', draftId);
      
      // First, verify the draft exists and belongs to this user
      const { data: draftData, error: fetchError } = await supabase
        .from('ip_records')
        .select('id, status, applicant_id')
        .eq('id', draftId)
        .single();

      if (fetchError) {
        console.error('[deleteDraft] Error fetching draft:', fetchError);
        throw fetchError;
      }

      console.log('[deleteDraft] Draft data:', draftData);

      if (draftData.status !== 'draft') {
        throw new Error('Only draft submissions can be deleted');
      }

      if (draftData.applicant_id !== profile?.id) {
        throw new Error('You can only delete your own drafts');
      }

      // Now delete it
      const { error: deleteError, count } = await supabase
        .from('ip_records')
        .delete()
        .eq('id', draftId)
        .eq('applicant_id', profile.id)
        .eq('status', 'draft');

      if (deleteError) {
        console.error('[deleteDraft] Delete error:', deleteError);
        throw deleteError;
      }

      console.log('[deleteDraft] Delete count:', count);

      // Force refetch to ensure UI is synced
      await fetchRecords();
      
      alert('Draft deleted successfully');
    } catch (error) {
      console.error('[deleteDraft] Error:', error);
      alert('Failed to delete draft: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingDraftId(null);
    }
  };

  const needsRevision = (status: string) => {
    return status === 'supervisor_revision' || status === 'evaluator_revision';
  };

  const getRevisionMessage = (record: IpRecord) => {
    if (record.status === 'supervisor_revision') {
      return 'Supervisor requested revisions. Please update your submission.';
    } else if (record.status === 'evaluator_revision') {
      return 'Evaluator requested revisions. Please update your submission.';
    }
    return '';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {profile?.full_name}</h1>
          <p className="text-gray-600 mt-1">Manage your intellectual property submissions</p>
        </div>
        <Link
          to="/dashboard/submit"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="h-5 w-5" />
          New Submission
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Submissions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <FileText className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Draft Saves</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.drafts}</p>
            </div>
            <FileText className="h-12 w-12 text-amber-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Draft Submissions Section */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Draft Submissions ({drafts.length})</h2>
            <p className="text-sm text-gray-600 mt-1">Auto-saved drafts waiting to be completed and submitted</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Last Saved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-amber-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {draft.title || <span className="text-gray-500 italic">Untitled Draft</span>}
                      </div>
                      {draft.abstract && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{draft.abstract}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{draft.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full"
                            style={{ width: `${((draft.current_step || 1) / 6) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {draft.current_step || 1}/6
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(draft.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/dashboard/submit"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-xs"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Continue
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteDraft(draft.id)}
                          disabled={deletingDraftId === draft.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Delete draft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingDraftId === draft.id ? 'Deleting...' : ''}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No submissions yet</p>
                    <p className="text-sm mt-1">Get started by creating your first IP submission</p>
                    <Link
                      to="/dashboard/submit"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create Submission
                    </Link>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className={`hover:bg-gray-50 ${needsRevision(record.status) ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {record.title}
                        </Link>
                        {needsRevision(record.status) && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-orange-700">
                            <AlertCircle className="h-3 w-3" />
                            <span>{getRevisionMessage(record)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{record.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getStatusColor(record.status)
                        }`}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {needsRevision(record.status) && (
                          <Link
                            to={`/dashboard/submissions/${record.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                          >
                            <Edit className="h-4 w-4" />
                            Revise
                          </Link>
                        )}
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
