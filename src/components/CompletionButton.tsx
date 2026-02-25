import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Loader2, Lock } from 'lucide-react';

interface CompletionButtonProps {
  recordId: string;
  currentStatus: string;
  currentStage?: string;
  applicantEmail: string;
  applicantName: string;
  title: string;
  referenceNumber: string;
  category: string;
  onComplete: () => void;
}

export function CompletionButton({
  recordId,
  currentStatus,
  currentStage,
  applicantEmail,
  applicantName,
  title,
  referenceNumber,
  category,
  onComplete,
}: CompletionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [materialsStatus, setMaterialsStatus] = useState<'not_requested' | 'requested' | 'submitted' | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Check if materials have been submitted when in academic_presentation_materials stage
  useEffect(() => {
    if (currentStage === 'academic_presentation_materials') {
      fetchMaterialsStatus();
    } else {
      setLoadingMaterials(false);
    }
  }, [recordId, currentStage]);

  const fetchMaterialsStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('presentation_materials')
        .select('status')
        .eq('ip_record_id', recordId)
        .single();

      if (!error && data) {
        setMaterialsStatus(data.status);
      }
    } catch (err) {
      console.error('Error fetching materials status:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleComplete = async () => {
    if (
      !confirm(
        `Are you sure you want to mark this submission as completed and ready for IPO Philippines filing?\n\nThis will:\n1. Update the status to "Ready for Filing"\n2. Send a completion notification email to the applicant\n3. Enable certificate generation for this record`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const { data: recordData, error: fetchError } = await supabase
        .from('ip_records')
        .select('applicant_id')
        .eq('id', recordId)
        .single();

      if (fetchError) {
        console.error('Error fetching record:', fetchError);
        throw new Error('Failed to fetch record details');
      }

      const { error: updateError } = await supabase
        .from('ip_records')
        .update({
          status: 'ready_for_filing',
          current_stage: 'Completed - Ready for IPO Philippines Filing',
        })
        .eq('id', recordId);

      if (updateError) {
        console.error('Error updating record:', updateError);
        throw new Error('Failed to update record status');
      }

      // ==========================================
      // SLA TRACKING: Close certificate_issued stage as workflow is completed
      // ==========================================
      try {
        const { data: closedStageData, error: closedStageError } = await supabase
          .rpc('close_stage_instance', {
            p_record_id: recordId,
            p_close_status: 'COMPLETED',
          });

        if (closedStageError) {
          console.warn('Could not close certificate_issued stage instance:', closedStageError);
        } else {
          console.log('Closed certificate_issued stage instance:', closedStageData);
        }
      } catch (slaError) {
        // SLA tracking is non-critical; log but don't fail the completion
        console.warn('SLA tracking error (non-critical):', slaError);
      }

      const { data: { session } } = await supabase.auth.getSession();

      // Send status notification email
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicantEmail,
            applicantName,
            recordTitle: title,
            referenceNumber,
            oldStatus: currentStatus,
            newStatus: 'ready_for_filing',
            currentStage: 'Completed - Ready for IPO Philippines Filing',
            remarks: 'Your submission has been completed and is now ready for IPO Philippines filing. You can request your official certificate from your dashboard.',
            actorRole: 'Admin',
          }),
        });
      } catch (emailError) {
        console.error('Error sending status notification email:', emailError);
      }

      // Also send completion notification for backwards compatibility
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-completion-notification`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicantEmail,
          applicantName,
          title,
          referenceNumber,
          category,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send completion notification:', errorText);
      }

      // Get admin user info for process tracking
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('auth_user_id', currentUser?.id)
        .single();

      // Insert process tracking entry
      const { error: trackingError } = await supabase.from('process_tracking').insert({
        ip_record_id: recordId,
        stage: 'Completion',
        status: 'ready_for_filing',
        actor_id: recordData.applicant_id,
        actor_name: adminProfile?.full_name || 'Admin',
        actor_role: 'Admin',
        action: 'completion_marked',
        description: 'Admin marked submission as completed and ready for IPO Philippines filing',
        metadata: { previousStatus: currentStatus },
      });

      if (trackingError) {
        console.error('Failed to create process tracking entry:', trackingError);
      }

      if (recordData?.applicant_id) {
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: recordData.applicant_id,
          type: 'completion',
          title: 'IP Registration Completed',
          message: `Your submission "${title}" has been completed and is now ready for IPO Philippines filing. You can now request your official certificate!`,
          payload: { ip_record_id: recordId },
        });

        if (notificationError) {
          console.error('Failed to create notification:', notificationError);
        }
      }

      alert('✅ Submission marked as completed! The applicant has been notified via email.');
      onComplete();
    } catch (error: any) {
      console.error('Error completing submission:', error);
      alert(`Failed to complete submission: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === 'ready_for_filing') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Completed - Ready for Filing</span>
      </div>
    );
  }

  // Gate the button if in academic_presentation_materials stage and materials not submitted
  if (currentStage === 'academic_presentation_materials') {
    if (loadingMaterials) {
      return (
        <button disabled className="px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
          Loading...
        </button>
      );
    }

    if (materialsStatus !== 'submitted') {
      return (
        <div className="flex flex-col gap-2">
          <button
            disabled
            className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed flex items-center gap-2"
          >
            <Lock className="h-5 w-5" />
            Awaiting Materials Submission
          </button>
          <p className="text-sm text-gray-600">
            ℹ️ This button will be enabled once the applicant submits their presentation materials (poster and paper).
          </p>
        </div>
      );
    }
  }

  if (currentStatus !== 'evaluator_approved') {
    return (
      <button
        disabled
        className="px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
      >
        Not Ready for Completion
      </button>
    );
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Completing...
        </>
      ) : (
        <>
          <CheckCircle className="h-5 w-5" />
          Mark as Completed
        </>
      )}
    </button>
  );
}
