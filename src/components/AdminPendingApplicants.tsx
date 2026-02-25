import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { Check, X, Clock, Mail, Calendar, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

interface PendingApplicant {
  id: string;
  email: string;
  full_name: string;
  department_id: string | null;
  created_at: string;
  department_name?: string;
}

export function AdminPendingApplicants() {
  const { primaryColor } = useBranding();
  const { profile } = useAuth();
  const [pendingApplicants, setPendingApplicants] = useState<PendingApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectReason, setShowRejectReason] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Authorization check: only admins can approve applicants
  if (profile?.role !== 'admin') {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 md:p-8">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-800">Only administrators can approve applicant accounts. If you need to approve applications, please contact the system administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchPendingApplicants();
  }, []);

  const fetchPendingApplicants = async () => {
    try {
      setLoading(true);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[AdminPendingApplicants] No session found');
        throw new Error('Authentication required');
      }

      console.log('[AdminPendingApplicants] Fetching pending applicants via edge function...');
      console.log('[AdminPendingApplicants] User:', session.user.email, '| Role:', profile?.role);

      // Call edge function with SERVICE ROLE access
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pending-applicants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      console.log('[AdminPendingApplicants] Edge function response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AdminPendingApplicants] Edge function error:', {
          status: response.status,
          error: errorData,
        });
        throw new Error(errorData.error || errorData.message || 'Failed to fetch pending applicants');
      }

      const result = await response.json();
      console.log('[AdminPendingApplicants] Success! Found:', result.count, 'pending applicants');
      console.log('[AdminPendingApplicants] Applicants:', result.applicants);

      setPendingApplicants(result.applicants || []);
    } catch (error: any) {
      console.error('[AdminPendingApplicants] ERROR:', {
        message: error?.message,
        stack: error?.stack,
      });
      setMessage({
        type: 'error',
        text: `Failed to load pending applicants: ${error?.message || 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicantId: string) => {
    try {
      setProcessingId(applicantId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call the approve-applicant edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-applicant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ applicant_user_id: applicantId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to approve applicant');
      }

      // Remove approved applicant from list
      setPendingApplicants((prev) => prev.filter((a) => a.id !== applicantId));
      
      // Show status based on email success
      if (result.email_sent) {
        setMessage({ type: 'success', text: `✓ Applicant approved. Confirmation email sent to ${result.applicant_email}` });
      } else {
        setMessage({ type: 'success', text: `✓ Applicant approved (email could not be sent: ${result.email_error || result.message}). Contact them to notify of approval.` });
      }

      console.log('[AdminPendingApplicants] Approval successful:', {
        applicantId,
        email: result.applicant_email,
        emailSent: result.email_sent,
        approvedAt: result.approved_at,
      });
    } catch (error) {
      console.error('Error approving applicant:', error);
      setMessage({ type: 'error', text: `Failed to approve applicant: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicantId: string) => {
    try {
      setProcessingId(applicantId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const rejectData: Database['public']['Tables']['users']['Update'] = {
        is_approved: false,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectReason,
      };
      const { error } = await supabase
        .from('users')
        .update(rejectData)
        .eq('id', applicantId);

      if (error) throw error;

      // Remove rejected applicant from pending list
      setPendingApplicants((prev) => prev.filter((a) => a.id !== applicantId));
      setShowRejectReason(null);
      setRejectReason('');
      setMessage({ type: 'success', text: 'Applicant rejected' });

      // Log the action
      const rejectLogData: Database['public']['Tables']['activity_logs']['Insert'] = {
        user_id: session.user.id,
        action: 'reject_applicant',
        details: { applicant_id: applicantId, reason: rejectReason },
      };
      await supabase.from('activity_logs').insert(rejectLogData);
    } catch (error) {
      console.error('Error rejecting applicant:', error);
      setMessage({ type: 'error', text: 'Failed to reject applicant' });
    } finally {
      setProcessingId(null);
      setShowRejectReason(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysWaiting = (dateString: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border shadow-lg p-8" style={{ borderColor: `${primaryColor}40` }}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border shadow-lg p-6 hover:shadow-xl transition-shadow duration-300" style={{ background: `linear-gradient(135deg, #fef3c7, #fcd34d08)`, borderColor: '#fbbf2440' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6" style={{ color: '#f59918' }} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pending Applicants</h2>
            <p className="text-sm text-gray-600">Applications awaiting administrator review</p>
          </div>
        </div>
        <span className="text-3xl font-bold px-4 py-2 rounded-xl" style={{ color: '#f59918', backgroundColor: '#f5991820' }}>
          {pendingApplicants.length}
        </span>
      </div>

      {/* Messages */}
      {message && (
        <div
          className="mb-4 p-4 rounded-lg flex items-center gap-3"
          style={{
            backgroundColor: message.type === 'success' ? '#d1fae508' : '#fee2e2',
            borderLeft: `4px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          }}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <X className="h-5 w-5 text-red-600" />
          )}
          <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Empty State */}
      {pendingApplicants.length === 0 ? (
        <div className="text-center py-8">
          <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <p className="text-gray-600 font-medium">No pending applicants</p>
          <p className="text-sm text-gray-500">All applicants have been reviewed</p>
        </div>
      ) : (
        // Applicants List
        <div className="space-y-4">
          {pendingApplicants.map((applicant) => (
            <div
              key={applicant.id}
              className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{applicant.full_name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {applicant.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {getDaysWaiting(applicant.created_at)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Department: {applicant.department_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(applicant.created_at)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {showRejectReason === applicant.id ? (
                <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": `${primaryColor}80` } as any}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(applicant.id)}
                      disabled={processingId === applicant.id}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {processingId === applicant.id ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectReason(null);
                        setRejectReason('');
                      }}
                      disabled={processingId === applicant.id}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(applicant.id)}
                    disabled={processingId === applicant.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectReason(applicant.id)}
                    disabled={processingId === applicant.id}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
