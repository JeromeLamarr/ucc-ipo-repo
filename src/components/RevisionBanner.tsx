import React from 'react';
import { AlertCircle, User, MessageSquare } from 'lucide-react';
import { getStatusLabel } from '../lib/statusLabels';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

interface RevisionBannerProps {
  status: string;
  revisionReason?: string;
  revisionComments?: string;
  requestedBy?: User | null;
  requestedByRole?: 'supervisor' | 'evaluator';
  requestedAt?: string;
}

export function RevisionBanner({
  status,
  revisionReason,
  revisionComments,
  requestedBy,
  requestedByRole = 'supervisor',
  requestedAt,
}: RevisionBannerProps) {
  const isRevisionRequested =
    status === 'supervisor_revision' || status === 'evaluator_revision';

  if (!isRevisionRequested) {
    return null;
  }

  const roleLabel = requestedByRole === 'supervisor' ? 'Supervisor' : 'Evaluator';

  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-orange-900 mb-2">
            Revision Requested by {roleLabel}
          </h3>

          <div className="space-y-3 text-sm text-orange-800">
            {requestedBy && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{roleLabel}:</strong> {requestedBy.full_name}
                </span>
              </div>
            )}

            {requestedAt && (
              <div className="text-orange-700">
                <strong>Request Date:</strong>{' '}
                {new Date(requestedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}

            {(revisionReason || revisionComments) && (
              <div className="bg-orange-100 rounded p-3 mt-3 border border-orange-200">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-700" />
                  <div>
                    <p className="font-semibold text-orange-900 mb-1">
                      Revision Reason:
                    </p>
                    <p className="text-orange-800 whitespace-pre-wrap">
                      {revisionReason || revisionComments || 'No specific reason provided'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-orange-100 rounded border border-orange-200">
            <p className="text-orange-900 text-sm">
              <strong>Action Required:</strong> Please review the revision request above and update
              your submission accordingly. You can click the "Edit Submission" button to make changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
