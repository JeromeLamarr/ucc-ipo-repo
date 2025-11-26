/**
 * Consistent status label mapping across the entire application
 * Maps database status enums to user-friendly display labels
 */

export const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  waiting_supervisor: 'Waiting for Supervisor',
  supervisor_revision: 'Revision Requested - Supervisor',
  supervisor_approved: 'Approved by Supervisor',
  waiting_evaluation: 'Waiting for Evaluation',
  evaluator_revision: 'Revision Requested - Evaluator',
  evaluator_approved: 'Approved by Evaluator',
  preparing_legal: 'Preparing for Legal Filing',
  ready_for_filing: 'Ready for IPO Philippines Filing',
  rejected: 'Rejected',
};

export const statusDescriptions: Record<string, string> = {
  submitted: 'Application submitted',
  waiting_supervisor: 'Under supervisor review',
  supervisor_revision: 'Supervisor requested revisions',
  supervisor_approved: 'Approved by supervisor',
  waiting_evaluation: 'Technical evaluation',
  evaluator_revision: 'Evaluator requested revisions',
  evaluator_approved: 'Approved by evaluator',
  preparing_legal: 'Preparing for legal filing',
  ready_for_filing: 'Ready for IPO Philippines filing',
  rejected: 'Rejected by reviewer',
};

export const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  waiting_supervisor: 'bg-yellow-100 text-yellow-800',
  supervisor_revision: 'bg-orange-100 text-orange-800',
  supervisor_approved: 'bg-green-100 text-green-800',
  waiting_evaluation: 'bg-purple-100 text-purple-800',
  evaluator_revision: 'bg-orange-100 text-orange-800',
  evaluator_approved: 'bg-green-100 text-green-800',
  preparing_legal: 'bg-indigo-100 text-indigo-800',
  ready_for_filing: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export const statusStages: Record<string, number> = {
  submitted: 0,
  waiting_supervisor: 1,
  supervisor_revision: 1,
  supervisor_approved: 2,
  waiting_evaluation: 2,
  evaluator_revision: 2,
  evaluator_approved: 3,
  preparing_legal: 3,
  ready_for_filing: 4,
  rejected: -1,
};

/**
 * Get user-friendly label for a status
 */
export function getStatusLabel(status: string): string {
  return statusLabels[status] || status.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get description for a status
 */
export function getStatusDescription(status: string): string {
  return statusDescriptions[status] || '';
}

/**
 * Get CSS color classes for a status
 */
export function getStatusColor(status: string): string {
  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get stage index for process tracking
 */
export function getStatusStageIndex(status: string): number {
  return statusStages[status] ?? 0;
}
