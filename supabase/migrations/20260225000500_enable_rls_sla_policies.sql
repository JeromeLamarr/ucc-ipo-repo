-- Migration: Enable RLS on workflow_sla_policies with admin-only write access
-- Date: 2026-02-25
-- Purpose: Secure SLA policy table so only admins can modify, all authenticated users can read
-- Impact: Additive only - existing workflow_sla_policies data is unaffected

BEGIN;

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE workflow_sla_policies ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. POLICY: READ ACCESS FOR ALL AUTHENTICATED USERS
-- ==========================================
-- All authenticated users can SELECT policies (needed for creating stage instances)
CREATE POLICY "Authenticated users can read active SLA policies"
  ON workflow_sla_policies
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- ==========================================
-- 3. POLICY: ADMIN ONLY INSERT
-- ==========================================
-- Only admins can insert new SLA policies
CREATE POLICY "Only admins can create SLA policies"
  ON workflow_sla_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ==========================================
-- 4. POLICY: ADMIN ONLY UPDATE
-- ==========================================
-- Only admins can update SLA policies
CREATE POLICY "Only admins can update SLA policies"
  ON workflow_sla_policies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ==========================================
-- 5. POLICY: ADMIN ONLY DELETE
-- ==========================================
-- Only admins can delete SLA policies
CREATE POLICY "Only admins can delete SLA policies"
  ON workflow_sla_policies
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ==========================================
-- 6. SERVICE ROLE BYPASS (for edge functions)
-- ==========================================
-- Service role (used in edge functions) can do anything (bypass RLS)
-- This is implicit in Supabase, but documenting the contract here:
-- check-overdue-stages and other bg functions use SERVICE_ROLE_KEY
-- and can read/update workflow_sla_policies without RLS constraints

COMMENT ON TABLE workflow_sla_policies IS 'SLA policies per workflow stage. RLS: all authenticated users can read, only admins can insert/update/delete.';

COMMIT;
