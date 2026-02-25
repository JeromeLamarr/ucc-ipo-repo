import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { Save, AlertCircle, CheckCircle, Clock, Calendar, Settings } from 'lucide-react';

interface SLAPolicy {
  id: string;
  stage: string;
  duration_days: number;
  grace_days: number;
  allow_extensions: boolean;
  max_extensions: number;
  extension_days: number;
  description: string | null;
  is_active: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  supervisor_review: 'Supervisor Review',
  evaluation: 'Evaluation',
  revision_requested: 'Revision Requested',
  materials_requested: 'Materials Requested',
  certificate_issued: 'Certificate Issued',
};

export function AdminSLAManagement() {
  const { profile } = useAuth();
  const { primaryColor } = useBranding();
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);

  // Authorization check: only admins can manage SLA policies
  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
            <div className="flex gap-4">
              <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-2">Access Denied</h3>
                <p className="text-red-800">Only administrators can manage SLA policies.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_sla_policies')
        .select('*')
        .order('stage', { ascending: true });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error: any) {
      console.error('Error fetching SLA policies:', error);
      setMessage({ type: 'error', text: `Failed to load policies: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (policy: SLAPolicy) => {
    try {
      setSaving(policy.id);
      setMessage(null);

      // Validation
      if (policy.duration_days < 1) {
        throw new Error('Duration must be at least 1 day');
      }
      if (policy.grace_days < 0) {
        throw new Error('Grace days cannot be negative');
      }
      if (policy.allow_extensions) {
        if (policy.max_extensions < 1) {
          throw new Error('Max extensions must be at least 1 if extensions are allowed');
        }
        if (policy.extension_days < 1) {
          throw new Error('Extension days must be at least 1 if extensions are allowed');
        }
      }

      const { error } = await supabase
        .from('workflow_sla_policies')
        .update({
          duration_days: policy.duration_days,
          grace_days: policy.grace_days,
          allow_extensions: policy.allow_extensions,
          max_extensions: policy.max_extensions,
          extension_days: policy.extension_days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', policy.id);

      if (error) throw error;

      setMessage({ type: 'success', text: `✓ SLA policy for "${STAGE_LABELS[policy.stage]}" updated successfully!` });
      setEditingPolicy(null);
      await fetchPolicies();

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving SLA policy:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(null);
    }
  };

  const handleFieldChange = (policyId: string, field: keyof SLAPolicy, value: any) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId
          ? { ...p, [field]: value }
          : p
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="h-8 w-8" style={{ color: primaryColor }} />
            <h1 className="text-4xl md:text-5xl font-black text-gray-900">SLA Policy Management</h1>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            Configure Service Level Agreement durations and grace periods for each workflow stage
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ Note:</strong> Changes apply only to NEW stage instances created after saving. Existing active stages retain their original deadlines.
            </p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </span>
          </div>
        )}

        {/* SLA Policies Grid */}
        <div className="grid gap-6">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {STAGE_LABELS[policy.stage] || policy.stage}
                  </h3>
                  <p className="text-sm text-gray-600">Stage: {policy.stage}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  policy.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {policy.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Duration Days */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={policy.duration_days}
                    onChange={(e) => handleFieldChange(policy.id, 'duration_days', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Primary deadline for this stage</p>
                </div>

                {/* Grace Days */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={policy.grace_days}
                    onChange={(e) => handleFieldChange(policy.id, 'grace_days', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Buffer before EXPIRED status</p>
                </div>

                {/* Allow Extensions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Allow Extensions
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policy.allow_extensions}
                      onChange={(e) => handleFieldChange(policy.id, 'allow_extensions', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable deadline extensions</span>
                  </label>
                </div>

                {/* Max Extensions */}
                {policy.allow_extensions && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Extensions
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={policy.max_extensions}
                        onChange={(e) => handleFieldChange(policy.id, 'max_extensions', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum allowed extensions</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Extension Duration (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={policy.extension_days}
                        onChange={(e) => handleFieldChange(policy.id, 'extension_days', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days added per extension</p>
                    </div>
                  </>
                )}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSavePolicy(policy)}
                  disabled={saving === policy.id}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {saving === policy.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-bold text-gray-900 mb-4">Understanding SLA Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <strong className="text-gray-900">Duration:</strong> The standard time allocated for completing this stage.
            </div>
            <div>
              <strong className="text-gray-900">Grace Period:</strong> Additional buffer time before marking applicant stages as EXPIRED.
            </div>
            <div>
              <strong className="text-gray-900">Extensions:</strong> Allow users to request deadline extensions (if enabled).
            </div>
            <div>
              <strong className="text-gray-900">Consequences:</strong>
              <ul className="list-disc ml-5 mt-1">
                <li>Supervisor/Evaluator: Marked OVERDUE, reminders sent</li>
                <li>Applicant stages: After grace → EXPIRED</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
