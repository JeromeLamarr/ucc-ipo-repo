/**
 * Process Stage Constants and Enums
 * Defines all stages in the IP submission workflow
 */

export enum ProcessStage {
  SUBMISSION = 'submission',
  SUPERVISOR_REVIEW = 'supervisor_review',
  EVALUATION = 'evaluation',
  ACADEMIC_PRESENTATION = 'academic_presentation_materials',
  COMPLETION = 'completion',
}

export enum ProcessStatus {
  // Submission
  SUBMITTED = 'submitted',
  
  // Supervisor Review
  WAITING_SUPERVISOR = 'waiting_supervisor',
  SUPERVISOR_REVISION = 'supervisor_revision',
  SUPERVISOR_APPROVED = 'supervisor_approved',
  
  // Evaluation
  WAITING_EVALUATION = 'waiting_evaluation',
  EVALUATOR_REVISION = 'evaluator_revision',
  EVALUATOR_APPROVED = 'evaluator_approved',
  
  // Academic Presentation Materials
  PREPARING_MATERIALS = 'preparing_materials',
  MATERIALS_SUBMITTED = 'materials_submitted',
  
  // Completion
  READY_FOR_FILING = 'ready_for_filing',
  COMPLETED = 'completed',
  
  // Rejection
  REJECTED = 'rejected',
  
  // Draft
  DRAFT = 'draft',
}

export enum MaterialsRequestStatus {
  NOT_REQUESTED = 'not_requested',
  REQUESTED = 'requested',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
}

export const PROCESS_STAGE_LABELS: Record<ProcessStage, string> = {
  [ProcessStage.SUBMISSION]: 'Submitted',
  [ProcessStage.SUPERVISOR_REVIEW]: 'Supervisor Review',
  [ProcessStage.EVALUATION]: 'Evaluation',
  [ProcessStage.ACADEMIC_PRESENTATION]: 'Academic Presentation Materials',
  [ProcessStage.COMPLETION]: 'Ready for Filing',
};

export const PROCESS_STAGE_DESCRIPTIONS: Record<ProcessStage, string> = {
  [ProcessStage.SUBMISSION]: 'Application submitted and received',
  [ProcessStage.SUPERVISOR_REVIEW]: 'Under supervisor review',
  [ProcessStage.EVALUATION]: 'Technical evaluation',
  [ProcessStage.ACADEMIC_PRESENTATION]: 'Preparing academic presentation materials',
  [ProcessStage.COMPLETION]: 'Ready for filing',
};

export const MATERIALS_REQUIREMENTS = {
  POSTER: {
    name: 'Scientific Poster',
    fileTypes: ['image/jpeg', 'image/png'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'A scientific poster (JPG or PNG format) presenting your research',
  },
  PAPER: {
    name: 'IMRaD Short Paper',
    fileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'A short paper following IMRaD structure (PDF or DOCX format)',
  },
};

export const MATERIALS_STORAGE_PATHS = {
  POSTER: 'presentation-materials/posters',
  PAPER: 'presentation-materials/papers',
};
