-- Migration: Add SLA workflow tracking tables
-- Date: 2026-02-25
-- Purpose: Enable SLA/deadline tracking for workflow stages without changing core business logic
-- Impact: New tables only; existing workflow and statuses continue to work unchanged

BEGIN;

-- ==========================================
-- 1. WORKFLOW_SLA_POLICIES TABLE
-- ==========================================
-- Stores default time limits per workflow stage
-- Each organization can have multiple policies (future enhancement)
-- Currently Single global policy set per stage

CREATE TABLE IF NOT EXISTS workflow_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(100) NOT NULL UNIQUE,  -- supervisor_review, evaluation, revision_requested, materials_requested, certificate_issued
  duration_days INT NOT NULL CHECK (duration_days > 0),         -- Default deadline: X days from stage start
  grace_days INT NOT NULL DEFAULT 0 CHECK (grace_days >= 0),   -- Grace period after due date before OVERDUE status
  max_extensions INT NOT NULL DEFAULT 0 CHECK (max_extensions >= 0),  -- Max times stage can be extended (0 = no extensions)
  extension_days INT NOT NULL DEFAULT 0,  -- Additional days per extension
  allow_extensions BOOLEAN NOT NULL DEFAULT FALSE,              -- Can this stage be extended?
  description TEXT,                                              -- Human-readable description
  is_active BOOLEAN NOT NULL DEFAULT TRUE,                      -- Soft delete: disable without removing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE workflow_sla_policies IS 'SLA policies per workflow stage. Controls deadline durations, grace periods, and extensions.';
COMMENT ON COLUMN workflow_sla_policies.stage IS 'Workflow stage name: supervisor_review, evaluation, revision_requested, materials_requested, certificate_issued';
COMMENT ON COLUMN workflow_sla_policies.grace_days IS 'Days after due_at before marking as OVERDUE';
COMMENT ON COLUMN workflow_sla_policies.allow_extensions IS 'Whether this stage allows deadline extensions';

CREATE INDEX IF NOT EXISTS idx_sla_policies_stage ON workflow_sla_policies(stage) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sla_policies_active ON workflow_sla_policies(is_active);

-- ==========================================
-- 2. WORKFLOW_STAGE_INSTANCES TABLE
-- ==========================================
-- Tracks each time a record enters a stage
-- Records when work started, when it's due, when it completed
-- Supports deadline extensions, overdue tracking, and escalations

CREATE TYPE workflow_stage_status AS ENUM ('ACTIVE', 'COMPLETED', 'OVERDUE', 'EXPIRED');

CREATE TABLE IF NOT EXISTS workflow_stage_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  stage VARCHAR(100) NOT NULL,  -- supervisor_review, evaluation, revision_requested, materials_requested, certificate_issued
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Who owns this stage (supervisor, evaluator, applicant, admin)
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),                 -- When the record entered this stage
  due_at TIMESTAMPTZ NOT NULL,                                   -- Due date based on SLA policy
  completed_at TIMESTAMPTZ,                                      -- When stage was completed (NULL while ACTIVE)
  status workflow_stage_status NOT NULL DEFAULT 'ACTIVE',        -- ACTIVE, COMPLETED, OVERDUE, EXPIRED
  extensions_used INT NOT NULL DEFAULT 0,                        -- How many times this stage has been extended
  extended_until TIMESTAMPTZ,                                    -- Current extended due date (if extended)
  notes TEXT,                                                     -- Admin notes about the stage (delays, reasons, etc.)
  notified_at TIMESTAMPTZ,                                       -- When overdue notification was last sent (prevent spam)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workflow_stage_instances IS 'Tracks each workflow stage instance for a record. Links to SLA policies. Records deadline, completion, and extension info.';
COMMENT ON COLUMN workflow_stage_instances.assigned_user_id IS 'Who is responsible for this stage: supervisor for supervisor_review, evaluator for evaluation, applicant for revision_requested/materials_requested, etc.';
COMMENT ON COLUMN workflow_stage_instances.status IS 'Stage progress: ACTIVE=in progress, COMPLETED=finished, OVERDUE=past due_at, EXPIRED=past grace period (only for applicant stages)';
COMMENT ON COLUMN workflow_stage_instances.extended_until IS 'Updated when deadline is extended; NULL if not extended';
COMMENT ON COLUMN workflow_stage_instances.notified_at IS 'Prevents duplicate overdue notifications (checked-overdue-stages runs multiple times)';

CREATE INDEX IF NOT EXISTS idx_stage_instances_record ON workflow_stage_instances(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_stage ON workflow_stage_instances(stage);
CREATE INDEX IF NOT EXISTS idx_stage_instances_assigned_user ON workflow_stage_instances(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_status ON workflow_stage_instances(status) WHERE status IN ('ACTIVE', 'OVERDUE');
CREATE INDEX IF NOT EXISTS idx_stage_instances_due_date ON workflow_stage_instances(due_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_stage_instances_record_latest ON workflow_stage_instances(ip_record_id, created_at DESC);

-- ==========================================
-- 3. VIEW: CURRENT_STAGE_INSTANCE
-- ==========================================
-- Shows the latest active/most recent stage instance per record
-- Useful for queries needing current deadline info

CREATE OR REPLACE VIEW current_stage_instance AS
SELECT DISTINCT ON (ip_record_id)
  ip_record_id,
  id,
  stage,
  assigned_user_id,
  started_at,
  due_at,
  completed_at,
  status,
  extensions_used,
  extended_until,
  notes,
  CASE
    WHEN status = 'COMPLETED' THEN NULL
    WHEN status = 'EXPIRED' THEN -999  -- Very negative (overdue by lots)
    WHEN status = 'OVERDUE' AND (extended_until IS NULL OR extended_until < now()) THEN
      EXTRACT(DAY FROM (now() - due_at))::integer
    WHEN status = 'OVERDUE' THEN
      EXTRACT(DAY FROM (now() - extended_until))::integer
    WHEN status = 'ACTIVE' THEN
      EXTRACT(DAY FROM (due_at - now()))::integer
    ELSE NULL
  END AS remaining_or_overdue_days
FROM workflow_stage_instances
ORDER BY ip_record_id, created_at DESC;

COMMENT ON VIEW current_stage_instance IS 'Latest stage instance per record. Includes calculated remaining/overdue days.';

-- ==========================================
-- 4. HELPER FUNCTION: get_sla_policy
-- ==========================================
-- Returns SLA policy details for a given stage
-- Used when creating new stage instances and when checking overdue

CREATE OR REPLACE FUNCTION get_sla_policy(p_stage VARCHAR(100))
RETURNS TABLE (
  id UUID,
  stage VARCHAR,
  duration_days INT,
  grace_days INT,
  max_extensions INT,
  extension_days INT,
  allow_extensions BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    workflow_sla_policies.id,
    workflow_sla_policies.stage,
    workflow_sla_policies.duration_days,
    workflow_sla_policies.grace_days,
    workflow_sla_policies.max_extensions,
    workflow_sla_policies.extension_days,
    workflow_sla_policies.allow_extensions
  FROM workflow_sla_policies
  WHERE workflow_sla_policies.stage = p_stage AND is_active = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_sla_policy IS 'Get active SLA policy for a workflow stage';

-- ==========================================
-- 5. HELPER FUNCTION: close_stage_instance
-- ==========================================
-- Closes the current ACTIVE instance for a stage (marks as COMPLETED)
-- Called when workflow transitions to next stage

CREATE OR REPLACE FUNCTION close_stage_instance(
  p_record_id UUID,
  p_close_status workflow_stage_status DEFAULT 'COMPLETED'
)
RETURNS UUID AS $$
DECLARE
  v_instance_id UUID;
BEGIN
  -- Find the latest ACTIVE instance for this record
  SELECT id INTO v_instance_id
  FROM workflow_stage_instances
  WHERE ip_record_id = p_record_id
    AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update it to COMPLETED with current timestamp
  IF v_instance_id IS NOT NULL THEN
    UPDATE workflow_stage_instances
    SET 
      status = p_close_status,
      completed_at = now(),
      updated_at = now()
    WHERE id = v_instance_id;
  END IF;

  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION close_stage_instance IS 'Closes the current ACTIVE stage instance (marks as COMPLETED). Returns the closed instance ID.';

-- ==========================================
-- 6. HELPER FUNCTION: create_stage_instance
-- ==========================================
-- Creates a new ACTIVE stage instance when workflow transitions to next stage
-- Automatically calculates due_at based on SLA policy

CREATE OR REPLACE FUNCTION create_stage_instance(
  p_record_id UUID,
  p_stage VARCHAR(100),
  p_assigned_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_policy_id UUID;
  v_duration_days INT;
  v_instance_id UUID;
  v_due_at TIMESTAMPTZ;
BEGIN
  -- Get SLA policy for this stage
  SELECT id, duration_days INTO v_policy_id, v_duration_days
  FROM workflow_sla_policies
  WHERE stage = p_stage AND is_active = TRUE;

  IF v_policy_id IS NULL THEN
    RAISE WARNING 'No active SLA policy found for stage: %', p_stage;
    v_duration_days := 7;  -- Default fallback
  END IF;

  -- Calculate due date
  v_due_at := now() + (v_duration_days || ' days')::INTERVAL;

  -- Create new stage instance
  INSERT INTO workflow_stage_instances (
    ip_record_id,
    stage,
    assigned_user_id,
    started_at,
    due_at,
    status
  ) VALUES (
    p_record_id,
    p_stage,
    p_assigned_user_id,
    now(),
    v_due_at,
    'ACTIVE'
  )
  RETURNING workflow_stage_instances.id INTO v_instance_id;

  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_stage_instance IS 'Creates a new ACTIVE stage instance with SLA due date. Called when workflow transitions to a new stage.';

COMMIT;
