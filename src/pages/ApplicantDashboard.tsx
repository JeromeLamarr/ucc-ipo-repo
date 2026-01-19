import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Clock, CheckCircle, XCircle, Plus, Edit, AlertCircle, BookOpen, X } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'];

export function ApplicantDashboard() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ [key: string]: string }>({});
  const [selectedRecord, setSelectedRecord] = useState<IpRecord | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchDepartments();
    fetchRecords();
  }, [profile]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name');
      
      if (error) throw error;
      if (data) {
        const deptMap = data.reduce((acc, dept) => {
          acc[dept.id] = dept.name;
          return acc;
        }, {} as { [key: string]: string });
        setDepartments(deptMap);
      }
    } catch (error) {
      console.warn('Could not fetch departments:', error);
    }
  };

  const getDepartmentName = (affiliationId: string) => {
    if (!affiliationId) return 'Not specified';
    return departments[affiliationId] || affiliationId;
  };

  const fetchRecords = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select('*')
        .eq('applicant_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
      setStats({
        total: data?.length || 0,
        pending:
          data?.filter((r) =>
            ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
          ).length || 0,
        approved:
          data?.filter((r) =>
            ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
          ).length || 0,
        rejected: data?.filter((r) => r.status === 'rejected').length || 0,
      });
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
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
              <p className="text-sm text-gray-600">Total Submissions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <FileText className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="h-12 w-12 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowMoreDetails(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap"
                        >
                          <BookOpen className="h-4 w-4" />
                          View Additional Details
                        </button>
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

      {/* Additional Details Modal */}
      {showMoreDetails && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowMoreDetails(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Additional Details</h2>
                <button
                  onClick={() => setShowMoreDetails(false)}
                  className="text-white hover:bg-blue-700 p-2 rounded-lg"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-6">
                {selectedRecord.details ? (
                  <>
                    {selectedRecord.details.inventors && Array.isArray(selectedRecord.details.inventors) && selectedRecord.details.inventors.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Inventors</h3>
                        <div className="space-y-3">
                          {selectedRecord.details.inventors.map((inv: any, idx: number) => (
                            <div key={idx} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <p className="font-semibold text-gray-900">{inv.name}</p>
                              {inv.affiliation && (
                                <p className="text-sm text-gray-600 mt-1">Department: {getDepartmentName(String(inv.affiliation))}</p>
                              )}
                              {inv.contribution && (
                                <p className="text-sm text-gray-600 mt-1">Contribution: {inv.contribution}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRecord.details.dateConceived && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">When did you come up with this idea?</label>
                        <p className="text-gray-900 mt-1">{new Date(selectedRecord.details.dateConceived).toLocaleString()}</p>
                      </div>
                    )}

                    {selectedRecord.details.dateReduced && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">When did you start working on it?</label>
                        <p className="text-gray-900 mt-1">{new Date(selectedRecord.details.dateReduced).toLocaleString()}</p>
                      </div>
                    )}

                    {selectedRecord.details.funding && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Funding Source</label>
                        <p className="text-gray-900 mt-1">{selectedRecord.details.funding}</p>
                      </div>
                    )}

                    {selectedRecord.details.keywords && Array.isArray(selectedRecord.details.keywords) && selectedRecord.details.keywords.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedRecord.details.keywords.map((keyword: string, idx: number) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-4">No additional details available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
