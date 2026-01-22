/**
 * Materials Request Action Component
 * Admin interface for requesting presentation materials from applicant
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Send, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MaterialsRequestActionProps {
  ipRecordId: string;
  applicantEmail: string;
  applicantName: string;
  ipTitle: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function MaterialsRequestAction({
  ipRecordId,
  applicantEmail,
  applicantName,
  ipTitle,
  onSuccess,
  onError,
}: MaterialsRequestActionProps) {
  const [materialsStatus, setMaterialsStatus] = useState<'not_requested' | 'requested' | 'submitted'>('not_requested');
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterialsStatus();
  }, [ipRecordId]);

  const fetchMaterialsStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('presentation_materials')
        .select('*')
        .eq('ip_record_id', ipRecordId)
        .single();

      if (!error && data) {
        setMaterialsStatus(data.status);
        setRequestedAt(data.materials_requested_at);
        setSubmittedAt(data.materials_submitted_at);
        setHasRequested(data.materials_requested_at !== null);
      }
    } catch (err) {
      console.error('Error fetching materials status:', err);
    }
  };

  const handleRequestMaterials = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated. Please log in.');
      }

      console.log('Requesting materials for IP Record:', ipRecordId);
      console.log('User ID:', user.id);

      // First check if presentation_materials record exists, if not create it
      const { data: existingRecord, error: checkError } = await supabase
        .from('presentation_materials')
        .select('id')
        .eq('ip_record_id', ipRecordId)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Record doesn't exist, create it
        console.log('Creating new presentation_materials record');
        const { error: insertError } = await supabase
          .from('presentation_materials')
          .insert({
            ip_record_id: ipRecordId,
            status: 'requested',
            materials_requested_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to create materials record:', insertError);
          throw new Error(`Failed to create materials request: ${insertError.message}`);
        }
      } else if (checkError) {
        console.error('Database check error:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      } else {
        // Record exists, update it
        const { error: updateError } = await supabase
          .from('presentation_materials')
          .update({
            status: 'requested',
            materials_requested_at: new Date().toISOString(),
          })
          .eq('ip_record_id', ipRecordId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error(`Database error: ${updateError.message}`);
        }
      }

      console.log('Materials request recorded in database');

      // Try to send email but don't fail if it doesn't work
      try {
        const emailUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`;
        console.log('Sending email to:', applicantEmail);
        
        const emailResponse = await fetch(emailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: applicantEmail,
            subject: 'Presentation Materials Requested',
            title: 'Presentation Materials Requested',
            message: `We are requesting the following presentation materials for your IP submission "${ipTitle}":\n\n- Scientific Poster (JPG/PNG, max 10MB)\n- IMRaD Short Paper (PDF/DOCX, max 5MB)\n\nPlease submit these materials within 10 days.`,
            applicantName: applicantName,
          }),
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text();
          console.warn('Email notification failed (non-critical):', emailError);
        } else {
          console.log('Email sent successfully');
        }
      } catch (emailError) {
        console.warn('Email notification error (continuing anyway):', emailError);
      }

      // Refresh status
      await fetchMaterialsStatus();
      alert('✅ Materials request recorded successfully!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error requesting materials:', error);
      const message = error.message || 'Failed to request materials';
      alert(`❌ Error: ${message}`);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Academic Presentation Materials
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Request scientific poster and IMRaD short paper from applicant
          </p>

          {/* Status Indicators */}
          <div className="space-y-3">
            {/* Request Status */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {hasRequested ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {hasRequested ? '✓ Materials Requested' : '○ Not Yet Requested'}
                </p>
                {requestedAt && (
                  <p className="text-sm text-gray-600">
                    Requested on {new Date(requestedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Submission Status */}
            {hasRequested && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                {materialsStatus === 'submitted' ? (
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-blue-900">
                    {materialsStatus === 'submitted'
                      ? '✓ Materials Submitted'
                      : '○ Awaiting Submission'}
                  </p>
                  {submittedAt && (
                    <p className="text-sm text-blue-700">
                      Submitted on {new Date(submittedAt).toLocaleString()}
                    </p>
                  )}
                  {hasRequested && materialsStatus !== 'submitted' && (
                    <p className="text-sm text-blue-600 mt-1">
                      ⏰ Deadline: {getDeadlineDate()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Information Box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Required Materials:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Scientific Poster (JPG/PNG, max 10MB)</li>
                <li>IMRaD Short Paper (PDF/DOCX, max 5MB)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="ml-4">
          {materialsStatus === 'submitted' ? (
            <div className="text-center">
              <div className="inline-block p-3 bg-green-100 rounded-full mb-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-medium text-green-900">Completed</p>
            </div>
          ) : (
            <button
              onClick={handleRequestMaterials}
              disabled={loading || hasRequested}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                hasRequested
                  ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Requesting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {hasRequested ? 'Requested' : 'Request Materials'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Gating Rule Info */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700">
          <p className="font-medium">
            🔒 Gating Rule: "Mark as Completed" will be enabled only after:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Materials have been requested</li>
            <li>Applicant submits both required files</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function getDeadlineDate(): string {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 10); // 10 business days
  return deadline.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
