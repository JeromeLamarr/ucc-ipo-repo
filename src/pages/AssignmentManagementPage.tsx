import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserCheck, Search, Filter, AlertCircle, FileText, Eye } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type User = Database['public']['Tables']['users']['Row'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function AssignmentManagementPage() {
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<IpRecord[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [evaluators, setEvaluators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IpCategory | 'all'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IpRecord | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [debugError, setDebugError] = useState<any>(null);
  const [assignmentData, setAssignmentData] = useState({
    supervisorId: '',
    evaluatorId: '',
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, categoryFilter]);

  const fetchData = async () => {
    try {
      setDebugError(null);
      const [recordsRes, supervisorsRes, evaluatorsRes] = await Promise.all([
        supabase
          .from('ip_records')
          .select(`*`)
          .neq('status', 'draft')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, full_name, department_id')
          .eq('role', 'supervisor')
          .order('full_name'),
        supabase
          .from('users')
          .select('*')
          .eq('role', 'evaluator')
          .order('full_name'),
      ]);

      // Detailed error logging with context
      if (recordsRes.error) {
        const errorDetails = {
          query: 'SELECT from ip_records',
          table: 'ip_records',
          status: recordsRes.status,
          error: {
            message: recordsRes.error.message,
            details: (recordsRes.error as any).details,
            hint: (recordsRes.error as any).hint,
            code: (recordsRes.error as any).code,
          },
        };
        console.error('IP Records Query Error:', errorDetails);
        setDebugError(errorDetails);
        throw recordsRes.error;
      }
      
      if (supervisorsRes.error) {
        const errorDetails = {
          query: 'SELECT from users WHERE role=supervisor',
          table: 'users',
          filter: 'role = supervisor',
          status: supervisorsRes.status,
          error: {
            message: supervisorsRes.error.message,
            details: (supervisorsRes.error as any).details,
            hint: (supervisorsRes.error as any).hint,
            code: (supervisorsRes.error as any).code,
          },
        };
        console.error('Supervisors Query Error:', errorDetails);
        setDebugError(errorDetails);
        throw supervisorsRes.error;
      }
      
      if (evaluatorsRes.error) {
        const errorDetails = {
          query: 'SELECT from users WHERE role=evaluator',
          table: 'users',
          filter: 'role = evaluator',
          status: evaluatorsRes.status,
          error: {
            message: evaluatorsRes.error.message,
            details: (evaluatorsRes.error as any).details,
            hint: (evaluatorsRes.error as any).hint,
            code: (evaluatorsRes.error as any).code,
          },
        };
        console.error('Evaluators Query Error:', errorDetails);
        setDebugError(errorDetails);
        throw evaluatorsRes.error;
      }

      // Process related records - fetch relationships separately if data loading
      const recordsData = recordsRes.data || [];
      
      if (recordsData.length > 0) {
        // Collect all related IDs
        const applicantIds = [...new Set(recordsData.map((r: any) => r.applicant_id).filter(Boolean))];
        const supervisorIds = [...new Set(recordsData.map((r: any) => r.supervisor_id).filter(Boolean))];
        const evaluatorIds = [...new Set(recordsData.map((r: any) => r.evaluator_id).filter(Boolean))];

        // Fetch all related users in one query if IDs exist
        const allUserIds = [...new Set([...applicantIds, ...supervisorIds, ...evaluatorIds])];
        
        if (allUserIds.length > 0) {
          const { data: allUsers, error: usersErr } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', allUserIds);
          
          if (usersErr) {
            console.warn('Warning: Could not fetch related user details:', usersErr);
          } else {
            const userMap = (allUsers || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
            recordsData.forEach((r: any) => {
              r.applicant = userMap[r.applicant_id] || null;
              r.supervisor = userMap[r.supervisor_id] || null;
              r.evaluator = userMap[r.evaluator_id] || null;
            });
          }
        }
      }

      setRecords(recordsData);
      setSupervisors(supervisorsRes.data || []);
      setEvaluators(evaluatorsRes.data || []);
    } catch (error: any) {
      const errorInfo = {
        message: error?.message || 'Unknown error',
        status: error?.status,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        timestamp: new Date().toISOString(),
      };
      console.error('Failed to fetch data:', errorInfo);
      setDebugError(errorInfo);
      alert('Failed to load data');
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
          record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === categoryFilter);
    }

    setFilteredRecords(filtered);
  };

  const handleAssignClick = (record: IpRecord) => {
    setSelectedRecord(record);
    setAssignmentData({
      supervisorId: record.supervisor_id || '',
      evaluatorId: record.evaluator_id || '',
    });
    setShowAssignModal(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setAssigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: any = {
        supervisor_id: assignmentData.supervisorId || null,
        evaluator_id: assignmentData.evaluatorId || null,
        updated_at: new Date().toISOString(),
      };

      if (assignmentData.supervisorId && !selectedRecord.supervisor_id) {
        updates.assigned_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('ip_records')
        .update(updates)
        .eq('id', selectedRecord.id);

      if (updateError) throw updateError;

      // Handle supervisor assignment
      if (assignmentData.supervisorId && assignmentData.supervisorId !== selectedRecord.supervisor_id) {
        const { error: assignError } = await supabase
          .from('supervisor_assignments')
          .insert({
            ip_record_id: selectedRecord.id,
            supervisor_id: assignmentData.supervisorId,
            assigned_by: user.id,
            status: 'pending',
          });

        if (assignError && !assignError.message.includes('duplicate')) throw assignError;

        // ==========================================
        // SLA TRACKING: Create supervisor_review stage instance
        // ==========================================
        try {
          const { data: stageData, error: stageError } = await supabase
            .rpc('create_stage_instance', {
              p_record_id: selectedRecord.id,
              p_stage: 'supervisor_review',
              p_assigned_user_id: assignmentData.supervisorId,
            });

          if (stageError) {
            console.warn('Could not create supervisor_review stage instance:', stageError);
          } else {
            console.log('Created supervisor_review stage instance:', stageData);
          }
        } catch (slaError) {
          console.warn('SLA tracking error (non-critical):', slaError);
        }

        await supabase.from('notifications').insert({
          user_id: assignmentData.supervisorId,
          type: 'assignment',
          title: 'New IP Submission Assigned',
          message: `You have been assigned to supervise: ${selectedRecord.title}`,
          payload: { ip_record_id: selectedRecord.id },
        });

        await supabase.from('activity_logs').insert({
          user_id: user.id,
          ip_record_id: selectedRecord.id,
          action: 'supervisor_assigned',
          details: {
            supervisor_id: assignmentData.supervisorId,
            method: 'admin_manual',
          },
        });
      }

      // Handle evaluator assignment
      if (assignmentData.evaluatorId && assignmentData.evaluatorId !== selectedRecord.evaluator_id) {
        const selectedEvaluator = evaluators.find(e => e.id === assignmentData.evaluatorId);
        
        // Check if assignment already exists
        const { data: existingAssignment } = await supabase
          .from('evaluator_assignments')
          .select('id')
          .eq('ip_record_id', selectedRecord.id)
          .eq('evaluator_id', assignmentData.evaluatorId)
          .maybeSingle();

        if (!existingAssignment) {
          const { error: evalAssignError } = await supabase
            .from('evaluator_assignments')
            .insert({
              ip_record_id: selectedRecord.id,
              evaluator_id: assignmentData.evaluatorId,
              category: selectedRecord.category,
              assigned_by: user.id,
            });

          if (evalAssignError) throw evalAssignError;
        }

        await supabase.from('notifications').insert({
          user_id: assignmentData.evaluatorId,
          type: 'assignment',
          title: 'IP Submission Assigned for Evaluation',
          message: `You have been assigned to evaluate: ${selectedRecord.title}`,
          payload: { ip_record_id: selectedRecord.id },
        });

        await supabase.from('activity_logs').insert({
          user_id: user.id,
          ip_record_id: selectedRecord.id,
          action: 'evaluator_assigned',
          details: {
            evaluator_id: assignmentData.evaluatorId,
            category: selectedRecord.category,
            method: 'admin_manual',
            evaluator_name: selectedEvaluator?.full_name,
          },
        });
      }

      // Track in process_tracking
      if (assignmentData.evaluatorId && assignmentData.evaluatorId !== selectedRecord.evaluator_id) {
        const evaluatorName = evaluators.find(e => e.id === assignmentData.evaluatorId)?.full_name;
        await supabase.from('process_tracking').insert({
          ip_record_id: selectedRecord.id,
          stage: 'Evaluator Assignment',
          status: 'evaluator_assigned',
          actor_id: user.id,
          actor_name: 'Admin',
          actor_role: 'Admin',
          action: 'evaluator_assigned',
          description: `Evaluator "${evaluatorName}" assigned by admin`,
          metadata: { evaluator_id: assignmentData.evaluatorId },
        });
      }

      setShowAssignModal(false);
      setSelectedRecord(null);
      fetchData();
      alert('Assignment updated successfully');
    } catch (error: any) {
      console.error('Error assigning:', error);
      alert('Failed to update assignment: ' + error.message);
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate paginated records
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const handleAutoAssignEvaluator = (record: IpRecord) => {
    // Find evaluator with matching category specialization
    // Exclude the supervisor from being assigned as evaluator (avoid same person reviewing both)
    const categoryEvaluator = evaluators.find(
      e => 
        e.category_specialization === record.category &&
        e.id !== record.supervisor_id // Don't assign supervisor as evaluator
    );

    if (categoryEvaluator) {
      setSelectedRecord(record);
      setAssignmentData({
        supervisorId: record.supervisor_id || '',
        evaluatorId: categoryEvaluator.id,
      });
      setShowAssignModal(true);
    } else {
      // If no category match excluding supervisor, try to find any match
      const anyEvaluator = evaluators.find(
        e => 
          e.category_specialization === record.category &&
          e.id !== record.supervisor_id
      );
      
      if (anyEvaluator) {
        setSelectedRecord(record);
        setAssignmentData({
          supervisorId: record.supervisor_id || '',
          evaluatorId: anyEvaluator.id,
        });
        setShowAssignModal(true);
      } else {
        alert(
          `No available evaluator found specialized in ${record.category}. ${
            record.supervisor_id 
              ? 'The assigned supervisor cannot also be the evaluator.' 
              : ''
          }`
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Assignment Management</h1>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">Assign supervisors and evaluators to IP submissions</p>
      </div>

      {import.meta.env.DEV && debugError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-red-900">Debug Error (Development Only)</p>
              <pre className="mt-2 font-mono text-xs text-red-800 bg-red-100 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(debugError, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">IP Submissions ({filteredRecords.length})</h2>
          <p className="text-gray-600 text-xs lg:text-sm mt-1">Manage supervisor and evaluator assignments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
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
                  Supervisor
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evaluator
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
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
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No submissions found</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
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
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize">
                        {record.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.supervisor?.full_name || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.evaluator?.full_name || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm sticky right-0 bg-white">
                      <div className="flex items-center justify-end gap-2">
                        {!record.evaluator_id && (
                          <button
                            onClick={() => handleAutoAssignEvaluator(record)}
                            className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                            title="Auto-assign evaluator by category specialization"
                          >
                            <span className="text-xs">Auto-Assign</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleAssignClick(record)}
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                          title="Manually assign reviewers"
                        >
                          <UserCheck className="h-4 w-4" />
                          <span className="hidden 2xl:inline">Assign</span>
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
              <p>No submissions found</p>
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 truncate" title={record.title}>
                      {record.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {record.category}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Applicant:</span>
                    <span className="truncate">{record.applicant?.full_name}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Supervisor:</span>
                    <span className="truncate">{record.supervisor?.full_name || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Evaluator:</span>
                    <span className="truncate">{record.evaluator?.full_name || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Created:</span>
                    <span>{formatDate(record.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                  {!record.evaluator_id && (
                    <button
                      onClick={() => handleAutoAssignEvaluator(record)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium inline-flex items-center justify-center gap-2 text-sm"
                      title="Auto-assign evaluator by category specialization"
                    >
                      Auto-Assign
                    </button>
                  )}
                  <button
                    onClick={() => handleAssignClick(record)}
                    className={`${!record.evaluator_id ? 'flex-1' : 'w-full'} px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center justify-center gap-2 text-sm`}
                    title="Manually assign reviewers"
                  >
                    <UserCheck className="h-4 w-4" />
                    Assign
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
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
        )}
      </div>

      {showAssignModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Assign Reviewers</h3>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{selectedRecord.title}</p>
              <p className="text-xs text-gray-600 mt-1">
                Category: <span className="capitalize font-semibold">{selectedRecord.category}</span>
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Status: <span className="capitalize font-semibold">{selectedRecord.status}</span>
              </p>
            </div>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisor {selectedRecord.supervisor_id && <span className="text-green-600 text-xs font-normal">(Already Assigned)</span>}
                </label>
                <select
                  value={assignmentData.supervisorId}
                  onChange={(e) =>
                    setAssignmentData({ ...assignmentData, supervisorId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  title="Select a supervisor for this submission"
                >
                  <option value="">-- Select Supervisor --</option>
                  {supervisors.map((supervisor: any) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.full_name}
                      {supervisor.departments?.name ? ` (${supervisor.departments.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evaluator {selectedRecord.evaluator_id && <span className="text-green-600 text-xs font-normal">(Already Assigned)</span>}
                </label>
                {(() => {
                  const suggestedEvaluator = evaluators.find(
                    e => 
                      e.category_specialization === selectedRecord.category &&
                      e.id !== assignmentData.supervisorId
                  );
                  return (
                    <>
                      <select
                        value={assignmentData.evaluatorId}
                        onChange={(e) =>
                          setAssignmentData({ ...assignmentData, evaluatorId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        title="Select an evaluator for this submission"
                      >
                        <option value="">-- Select Evaluator --</option>
                        {evaluators
                          .filter(
                            (evaluator) =>
                              evaluator.id !== assignmentData.supervisorId && // Exclude supervisor
                              (!evaluator.category_specialization ||
                              evaluator.category_specialization === selectedRecord.category)
                          )
                          .map((evaluator) => (
                            <option key={evaluator.id} value={evaluator.id}>
                              {evaluator.full_name}
                              {evaluator.category_specialization
                                ? ` (${evaluator.category_specialization})`
                                : ' (No specialization)'}
                              {evaluator.affiliation ? ` - ${evaluator.affiliation}` : ''}
                            </option>
                          ))}
                      </select>
                      {suggestedEvaluator && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs text-green-700">
                            <strong>Recommended:</strong> {suggestedEvaluator.full_name} 
                            <span className="text-green-600 ml-1">({suggestedEvaluator.category_specialization} specialist)</span>
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Only showing evaluators specialized in or without specialization (supervisor excluded)
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>Note:</strong> Category-specialized evaluators are automatically recommended based on their specialization field.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedRecord(null);
                  }}
                  disabled={assigning}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || (!assignmentData.supervisorId && !assignmentData.evaluatorId)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Assign the selected reviewers"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
