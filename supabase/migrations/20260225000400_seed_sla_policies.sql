-- Migration: Seed default SLA policies for workflow stages
-- Date: 2026-02-25
-- Purpose: Initialize SLA policies with recommended time frames per stage
-- Can be edited later via admin interface

BEGIN;

-- Clear existing policies (idempotent)
DELETE FROM workflow_sla_policies WHERE stage IN (
  'supervisor_review',
  'evaluation', 
  'revision_requested',
  'materials_requested',
  'certificate_issued'
);

-- ==========================================
-- SUPERVISOR_REVIEW
-- ==========================================
-- Supervisors review submitted work
-- Typically quick turnaround (7 days + 2 day grace)
INSERT INTO workflow_sla_policies (
  stage,
  duration_days,
  grace_days,
  max_extensions,
  extension_days,
  allow_extensions,
  description,
  is_active
) VALUES (
  'supervisor_review',
  7,
  2,
  2,
  7,
  TRUE,
  'Supervisor review of submitted IP record. Approve, request revision, or reject.',
  TRUE
);

-- ==========================================
-- EVALUATION
-- ==========================================
-- Evaluators assess submitted work
-- Longer timeframe for thorough evaluation (10 days + 2 day grace)
INSERT INTO workflow_sla_policies (
  stage,
  duration_days,
  grace_days,
  max_extensions,
  extension_days,
  allow_extensions,
  description,
  is_active
) VALUES (
  'evaluation',
  10,
  2,
  2,
  7,
  TRUE,
  'Evaluator technical assessment of approved submission. Approve, request revision, or reject.',
  TRUE
);

-- ==========================================
-- REVISION_REQUESTED
-- ==========================================
-- Applicant must resubmit after supervisor/evaluator revision request
-- Longer timeframe for applicant to make changes (14 days + 3 day grace)
INSERT INTO workflow_sla_policies (
  stage,
  duration_days,
  grace_days,
  max_extensions,
  extension_days,
  allow_extensions,
  description,
  is_active
) VALUES (
  'revision_requested',
  14,
  3,
  3,
  7,
  TRUE,
  'Applicant revises and resubmits after feedback from supervisor or evaluator.',
  TRUE
);

-- ==========================================
-- MATERIALS_REQUESTED
-- ==========================================
-- Applicant submits presentation/publication materials
-- Moderate timeframe (7 days + 2 day grace)
INSERT INTO workflow_sla_policies (
  stage,
  duration_days,
  grace_days,
  max_extensions,
  extension_days,
  allow_extensions,
  description,
  is_active
) VALUES (
  'materials_requested',
  7,
  2,
  2,
  7,
  TRUE,
  'Applicant submits academic presentation materials or supporting documents.',
  TRUE
);

-- ==========================================
-- CERTIFICATE_ISSUED
-- ==========================================
-- System generates and sends certificate
-- Quick final step (3 days, minimal grace/no extensions - admin-driven)
INSERT INTO workflow_sla_policies (
  stage,
  duration_days,
  grace_days,
  max_extensions,
  extension_days,
  allow_extensions,
  description,
  is_active
) VALUES (
  'certificate_issued',
  3,
  0,
  0,
  0,
  FALSE,
  'System generates, signs, and sends certificate. Final workflow stage.',
  TRUE
);

-- Create index for quick policy lookups
CREATE INDEX IF NOT EXISTS idx_sla_policies_stage_active 
ON workflow_sla_policies(stage, is_active);

COMMIT;
