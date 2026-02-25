import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Check, X } from 'lucide-react';

interface SLAPolicy {
  id: string;
  stage: string;
  duration_days: number;
  grace_days: number;
  max_extensions: number;
  extension_days: number;
  allow_extensions: boolean;
  description: string;
  is_active: boolean;
}

export function SLAPolicyManager() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SLAPolicy>>({});

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('workflow_sla_policies')
        .select('*')
        .order('stage', { ascending: true });

      if (fetchError) throw fetchError;
      setPolicies(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy: SLAPolicy) => {
    setEditingId(policy.id);
    setFormData({
      duration_days: policy.duration_days,
      grace_days: policy.grace_days,
      max_extensions: policy.max_extensions,
      extension_days: policy.extension_days,
      allow_extensions: policy.allow_extensions,
      description: policy.description,
    });
  };

  const handleSave = async (policyId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('workflow_sla_policies')
        .update(formData)
        .eq('id', policyId);

      if (updateError) throw updateError;

      setEditingId(null);
      setFormData({});
      fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save policy');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-gray-600">Loading SLA policies...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">SLA Policy Manager</h2>
        <span className="text-sm text-gray-600">{policies.length} policies</span>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stage</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Grace Period</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Extensions</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => {
              const isEditing = editingId === policy.id;
              return (
                <tr key={policy.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {policy.stage.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{policy.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={formData.duration_days || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_days: parseInt(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{policy.duration_days} days</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={formData.grace_days || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            grace_days: parseInt(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{policy.grace_days} days</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {isEditing ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.allow_extensions || false}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                allow_extensions: e.target.checked,
                              })
                            }
                          />
                          <span>Allow</span>
                        </label>
                      ) : (
                        <span className="text-gray-900">
                          {policy.allow_extensions ? (
                            <span className="flex items-center gap-1">
                              <Check className="w-4 h-4 text-green-600" /> Up to {policy.max_extensions}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <X className="w-4 h-4 text-red-600" /> Not allowed
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        policy.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleSave(policy.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 bg-gray-300 text-gray-900 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(policy)}
                        className="px-3 py-1 bg-gray-200 text-gray-900 rounded text-sm hover:bg-gray-300"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> Changes to SLA policies apply to new workflow stage instances only.
          Existing stages keep their original due dates unless manually extended.
        </p>
      </div>
    </div>
  );
}
