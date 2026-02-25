-- SQL Test Script for SLA Admin Access & Notifications
-- Date: 2026-02-25
-- Purpose: Verify RLS, admin policies, and notification system

-- ==========================================
-- 1. TEST RLS ON workflow_sla_policies
-- ==========================================

-- TEST 1A: Authenticated user can SELECT
-- EXPECTED: Returns rows (filter to is_active = TRUE)
SELECT 'TEST 1A: Authenticated user SELECT' AS test;
SELECT id, stage, duration_days, grace_days, is_active
FROM workflow_sla_policies
WHERE is_active = TRUE
LIMIT 1;

-- TEST 1B: Check RLS is enabled
-- EXPECTED: on | "Enabled" 
SELECT 'TEST 1B: RLS enabled?' AS test;
SELECT relname, rowsecurity
FROM pg_class
WHERE relname = 'workflow_sla_policies';

-- TEST 1C: Check policies exist
-- EXPECTED: Should see SELECT, INSERT, UPDATE, DELETE policies
SELECT 'TEST 1C: RLS policies' AS test;
SELECT policyname, qual, with_check, permissive
FROM pg_policies
WHERE tablename = 'workflow_sla_policies'
ORDER BY policyname;

-- ==========================================
-- 2. TEST NOTIFICATION CONTENT
-- ==========================================

-- TEST 2A: Check stage instances with SLA data
-- EXPECTED: See stages with due dates, status
SELECT 'TEST 2A: Stage instances' AS test;
SELECT 
  si.id,
  si.ip_record_id,
  si.stage,
  si.status,
  si.started_at,
  si.due_at,
  si.extended_until,
  si.notified_at,
  wsp.duration_days,
  wsp.grace_days
FROM workflow_stage_instances si
LEFT JOIN workflow_sla_policies wsp ON wsp.stage = si.stage
WHERE si.status = 'ACTIVE'
ORDER BY si.started_at DESC
LIMIT 5;

-- TEST 2B: Check notifications created
-- EXPECTED: See notifications with SLA details in payload
SELECT 'TEST 2B: Notifications with SLA' AS test;
SELECT 
  id,
  type,
  title,
  created_at,
  payload
FROM notifications
WHERE type LIKE '%overdue%' OR type LIKE '%sla%'
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- 3. TEST SLA POLICY DEFAULTS
-- ==========================================

-- TEST 3A: Check all required stages have policies
-- EXPECTED: All stages present with duration > 0
SELECT 'TEST 3A: All stages have policies' AS test;
SELECT 
  stage,
  duration_days,
  grace_days,
  allow_extensions,
  max_extensions,
  is_active
FROM workflow_sla_policies
ORDER BY stage;

-- TEST 3B: Verify policy constraints
-- EXPECTED: All duration_days > 0, grace_days >= 0
SELECT 'TEST 3B: Policy constraints' AS test;
SELECT 
  COUNT(*) as total_policies,
  SUM(CASE WHEN duration_days > 0 THEN 1 ELSE 0 END) as valid_duration,
  SUM(CASE WHEN grace_days >= 0 THEN 1 ELSE 0 END) as valid_grace
FROM workflow_sla_policies;

-- ==========================================
-- 4. TEST SLA CALCULATIONS
-- ==========================================

-- TEST 4A: Verify due_at is calculated correctly
-- EXPECTED: due_at should be started_at + duration_days
SELECT 'TEST 4A: SLA due date calculation' AS test;
SELECT 
  si.id,
  si.stage,
  si.started_at,
  si.due_at,
  (si.started_at + (wsp.duration_days || ' days')::INTERVAL) as expected_due_at,
  si.due_at = (si.started_at + (wsp.duration_days || ' days')::INTERVAL) as is_correct
FROM workflow_stage_instances si
LEFT JOIN workflow_sla_policies wsp ON wsp.stage = si.stage
WHERE si.status = 'ACTIVE'
LIMIT 10;

-- TEST 4B: Check overdue detection
-- EXPECTED: Show stages that are past due_at
SELECT 'TEST 4B: Overdue stages' AS test;
SELECT 
  si.id,
  si.stage,
  si.status,
  si.due_at,
  NOW() as current_time,
  (NOW() > si.due_at) as is_overdue,
  EXTRACT(DAY FROM (NOW() - si.due_at))::INT as days_overdue
FROM workflow_stage_instances si
WHERE si.status IN ('ACTIVE', 'OVERDUE')
  AND si.due_at < NOW()
ORDER BY si.due_at;

-- ==========================================
-- 5. TEST VIEW: current_stage_instance
-- ==========================================

-- TEST 5A: Check view works correctly
-- EXPECTED: Should show latest stage per record
SELECT 'TEST 5A: current_stage_instance view' AS test;
SELECT 
  ip_record_id,
  stage,
  status,
  due_at,
  remaining_or_overdue_days
FROM current_stage_instance
LIMIT 10;

-- ==========================================
-- 6. SUMMARY QUERY: SLA HEALTH CHECK
-- ==========================================

-- Shows overall SLA status
SELECT 'SUMMARY: SLA Health Check' AS section;
SELECT 
  'Total stage instances' as metric, COUNT(*) as value
FROM workflow_stage_instances
UNION ALL
SELECT 'Active stages', COUNT(*)
FROM workflow_stage_instances
WHERE status = 'ACTIVE'
UNION ALL
SELECT 'Overdue stages', COUNT(*)
FROM workflow_stage_instances
WHERE status = 'OVERDUE'
UNION ALL
SELECT 'Expired stages', COUNT(*)
FROM workflow_stage_instances
WHERE status = 'EXPIRED'
UNION ALL
SELECT 'Completed stages', COUNT(*)
FROM workflow_stage_instances
WHERE status = 'COMPLETED'
UNION ALL
SELECT 'SLA policies defined', COUNT(*)
FROM workflow_sla_policies
WHERE is_active = TRUE
UNION ALL
SELECT 'Notifications sent', COUNT(*)
FROM notifications
WHERE type LIKE '%overdue%' OR type LIKE '%sla%';
