import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Circle, Clock, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { getStatusLabel, getStatusDescription } from '../lib/statusLabels';

// Force rebuild - version 3.0 (added SLA tracking)
interface ProcessStep {
  stage: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  date?: string;
  actor?: string;
  dueDate?: string;
  remainingDays?: number;
  slaStatus?: 'on-track' | 'due-soon' | 'overdue' | 'expired';
}

interface ProcessTrackingWizardProps {
  ipRecordId: string;
  currentStatus: string;
  currentStage: string;
}

export function ProcessTrackingWizard({
  ipRecordId,
  currentStatus,
  currentStage,
}: ProcessTrackingWizardProps) {
  const [tracking, setTracking] = useState<any[]>([]);
  const [stageInstances, setStageInstances] = useState<any[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);

  useEffect(() => {
    fetchTracking();
    fetchStageInstances();
  }, [ipRecordId]);

  useEffect(() => {
    updateSteps();
  }, [currentStatus, currentStage, tracking, stageInstances]);

  const fetchTracking = async () => {
    const { data, error } = await supabase
      .from('process_tracking')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTracking(data);
    }
  };

  const fetchStageInstances = async () => {
    const { data, error } = await supabase
      .from('workflow_stage_instances')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStageInstances(data);
    }
  };

  /**
   * Get the latest tracking record to determine current status
   * This ensures we use the most recent status change, not old historical ones
   */
  const getLatestTrackingStatus = (): string | null => {
    if (tracking.length === 0) return null;
    // Get the most recent record
    return tracking[tracking.length - 1]?.status || null;
  };

  /**
   * Calculate SLA status badge info for a stage
   */
  const getSLAStatus = (stage: string): { status: 'on-track' | 'due-soon' | 'overdue' | 'expired', daysRemaining: number, dueDate: string } | null => {
    // Find the latest stage instance for this stage
    const stageInstance = stageInstances
      .filter(si => si.stage === stage)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .at(0);

    if (!stageInstance) return null;

    const now = new Date();
    const dueAt = new Date(stageInstance.extended_until || stageInstance.due_at);
    const daysLeft = Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: 'on-track' | 'due-soon' | 'overdue' | 'expired'; 
    if (stageInstance.status === 'EXPIRED') {
      status = 'expired';
    } else if (stageInstance.status === 'OVERDUE') {
      status = 'overdue';
    } else if (daysLeft <= 2 && daysLeft > 0) {
      status = 'due-soon';
    } else {
      status = 'on-track';
    }

    return {
      status,
      daysRemaining: daysLeft,
      dueDate: dueAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    };
  };

  const updateSteps = () => {
    const allSteps: ProcessStep[] = [
      {
        stage: 'submission',
        label: 'Submitted',
        description: getStatusDescription('submitted'),
        status: 'completed',
      },
      {
        stage: 'supervisor_review',
        label: 'Supervisor Review',
        description: getStatusDescription('waiting_supervisor'),
        status: 'pending',
      },
      {
        stage: 'evaluation',
        label: 'Evaluation',
        description: getStatusDescription('waiting_evaluation'),
        status: 'pending',
      },
      {
        stage: 'academic_presentation_materials',
        label: 'Academic Presentation Materials',
        description: 'Preparing presentation materials for publication',
        status: 'pending',
      },
      {
        stage: 'completion',
        label: 'Ready for Filing',
        description: getStatusDescription('ready_for_filing'),
        status: 'pending',
      },
    ];

    const statusMap: Record<string, number> = {
      draft: 0,
      submitted: 0,
      waiting_supervisor: 1,
      supervisor_revision: 1,
      supervisor_approved: 2,
      waiting_evaluation: 2,
      evaluator_revision: 2,
      evaluator_approved: 3,
      preparing_legal: 3,
      ready_for_filing: 4,
      completed: 4,
      rejected: -1,
    };

    // CRITICAL: Always use the latest status from process_tracking, never rely on currentStatus prop
    const latestStatus = getLatestTrackingStatus() || currentStatus;
    const currentStepIndex = statusMap[latestStatus] ?? 0;

    const updatedSteps = allSteps.map((step, index) => {
      let status: 'completed' | 'current' | 'pending' | 'rejected' = 'pending';

      if (latestStatus === 'rejected') {
        if (index <= currentStepIndex || (currentStepIndex === -1 && index <= 1)) {
          status = 'rejected';
        }
      } else if (latestStatus === 'completed' || latestStatus === 'ready_for_filing') {
        // If completed or ready for filing, mark all steps as completed
        status = 'completed';
      } else if (index < currentStepIndex) {
        status = 'completed';
      } else if (index === currentStepIndex) {
        status = 'current';
      }

      // Find related tracking entry by exact status match or action match
      const relatedTracking = tracking.find((t) => {
        switch (step.stage) {
          case 'submission':
            return t.status === 'submitted' || t.action === 'created' || t.action === 'submission';
          case 'supervisor_review':
            return t.status === 'waiting_supervisor' || 
                   t.status === 'supervisor_revision' || 
                   t.status === 'supervisor_approved' ||
                   t.action === 'supervisor_approve' ||
                   t.action === 'supervisor_reject' ||
                   t.action === 'supervisor_revision';
          case 'evaluation':
            return t.status === 'waiting_evaluation' || 
                   t.status === 'evaluator_revision' || 
                   t.status === 'evaluator_approved' ||
                   t.action === 'evaluator_approve' ||
                   t.action === 'evaluator_reject' ||
                   t.action === 'evaluator_revision';
          case 'legal_preparation':
            return t.status === 'preparing_legal' ||
                   t.action === 'start_legal_prep' ||
                   t.action === 'legal_preparation';
          case 'completion':
            return t.status === 'ready_for_filing' || 
                   t.status === 'completed' ||
                   t.action === 'completion' ||
                   t.action === 'admin_complete';
          default:
            return false;
        }
      });

      return {
        ...step,
        status,
        date: relatedTracking?.created_at
          ? new Date(relatedTracking.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : undefined,
        actor: relatedTracking?.actor_name,
        slaStatus: getSLAStatus(step.stage)?.status,
        dueDate: getSLAStatus(step.stage)?.dueDate,
        remainingDays: getSLAStatus(step.stage)?.daysRemaining,
      };
    });

    setSteps(updatedSteps);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Process Tracking</h3>

      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.stage} className="flex gap-4 pb-8 last:pb-0">
            <div className="relative flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : step.status === 'current'
                    ? 'bg-blue-500 border-blue-500 animate-pulse'
                    : step.status === 'rejected'
                    ? 'bg-red-500 border-red-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="h-6 w-6 text-white" />
                ) : step.status === 'current' ? (
                  <Clock className="h-6 w-6 text-white" />
                ) : step.status === 'rejected' ? (
                  <XCircle className="h-6 w-6 text-white" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-full mt-2 transition-colors ${
                    step.status === 'completed' || step.status === 'rejected'
                      ? 'bg-gray-300'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between mb-1">
                <h4
                  className={`font-semibold ${
                    step.status === 'completed' || step.status === 'current'
                      ? 'text-gray-900'
                      : step.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </h4>
                <div className="flex items-center gap-2">
                  {step.status === 'current' && getSLAStatus(step.stage) && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      getSLAStatus(step.stage)?.status === 'expired' ? 'bg-red-100 text-red-700' :
                      getSLAStatus(step.stage)?.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      getSLAStatus(step.stage)?.status === 'due-soon' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {getSLAStatus(step.stage)?.status === 'expired' ? 'Deadline Expired' :
                       getSLAStatus(step.stage)?.status === 'overdue' ? 'Overdue' :
                       getSLAStatus(step.stage)?.status === 'due-soon' ? 'Due Soon' :
                       'On Track'}
                    </span>
                  )}
                  {step.status === 'current' && !getSLAStatus(step.stage) && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      In Progress
                    </span>
                  )}
                  {step.status === 'completed' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Completed
                    </span>
                  )}
                  {step.status === 'rejected' && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Rejected
                    </span>
                  )}
                </div>
              </div>

              <p
                className={`text-sm ${
                  step.status === 'completed' || step.status === 'current'
                    ? 'text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {step.description}
              </p>

              {step.date && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.date}
                  {step.actor && ` • ${step.actor}`}
                </p>
              )}

              {step.status === 'current' && getSLAStatus(step.stage) && (
                <div className="mt-2 rounded bg-blue-50 p-2 border border-blue-100">
                  <div className="flex items-center gap-1 text-xs text-blue-700">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Due: {getSLAStatus(step.stage)?.dueDate} 
                      {getSLAStatus(step.stage)?.daysRemaining ? (
                        <> • {getSLAStatus(step.stage)?.daysRemaining! > 0 
                          ? `${getSLAStatus(step.stage)?.daysRemaining} days remaining` 
                          : `${Math.abs(getSLAStatus(step.stage)?.daysRemaining!)} days overdue`}</> 
                      ) : null}
                    </span>
                  </div>
                </div>
              )}

              {step.status === 'current' && !getSLAStatus(step.stage) && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-blue-600">{currentStage}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tracking.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
              View detailed history ({tracking.length} events)
            </summary>
            <div className="mt-4 space-y-3">
              {tracking.slice().reverse().map((event, index) => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5" />
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{event.description || event.action}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(event.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {event.actor_name && ` • ${event.actor_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
