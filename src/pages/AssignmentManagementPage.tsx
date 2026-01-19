import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserCheck, Search, Filter, AlertCircle } from 'lucide-react';
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
  const [assignmentData, setAssignmentData] = useState({
    supervisorId: '',
    evaluatorId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, categoryFilter]);

  const fetchData = async () => {
    try {
      const [recordsRes, supervisorsRes, evaluatorsRes] = await Promise.all([
        supabase
          .from('ip_records')
          .select(`
            *,
            applicant:users!applicant_id(*),
            supervisor:users!supervisor_id(*),
            evaluator:users!evaluator_id(*)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, full_name, department_id, departments(name)')
          .eq('role', 'supervisor')
          .order('full_name'),
        supabase
          .from('users')
          .select('*')
          .eq('role', 'evaluator')
          .order('full_name'),
      ]);

      if (recordsRes.error) throw recordsRes.error;
      if (supervisorsRes.error) throw supervisorsRes.error;
      if (evaluatorsRes.error) throw evaluatorsRes.error;

      setRecords(recordsRes.data || []);
      setSupervisors(supervisorsRes.data || []);
      setEvaluators(evaluatorsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleAutoAssignEvaluator = (record: IpRecord) => {
    // Find evaluator with matching category specialization
    const categoryEvaluator = evaluators.find(
      e => e.category_specialization === record.category
    );

    if (categoryEvaluator) {
      setSelectedRecord(record);
      setAssignmentData({
        supervisorId: record.supervisor_id || '',
        evaluatorId: categoryEvaluator.id,
      });
      setShowAssignModal(true);
    } else {
      alert(`No evaluator found specialized in ${record.category}`);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assignment Management</h1>
        <p className="text-gray-600 mt-1">Assign supervisors and evaluators to IP submissions</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or applicant..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as IpCategory | 'all')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Categories</option>
              <option value="patent">Patent</option>
              <option value="copyright">Copyright</option>
              <option value="trademark">Trademark</option>
              <option value="design">Design</option>
              <option value="utility_model">Utility Model</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supervisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evaluator
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No submissions found</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{record.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.applicant?.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {record.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.supervisor ? (
                        <div className="text-sm text-gray-900">{record.supervisor.full_name}</div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.evaluator ? (
                        <div className="text-sm text-gray-900">{record.evaluator.full_name}</div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {!record.evaluator_id && (
                          <button
                            onClick={() => handleAutoAssignEvaluator(record)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded font-medium"
                            title="Auto-assign evaluator by category specialization"
                          >
                            Auto-Assign
                          </button>
                        )}
                        <button
                          onClick={() => handleAssignClick(record)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                          title="Manually assign reviewers"
                        >
                          <UserCheck className="h-4 w-4" />
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                    e => e.category_specialization === selectedRecord.category
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
                              !evaluator.category_specialization ||
                              evaluator.category_specialization === selectedRecord.category
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
                        Only showing evaluators specialized in or without specialization
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
