-- COMPLETE VERIFICATION SUITE FOR SLA MIGRATIONS
-- Run these queries in Supabase SQL Editor to verify actual production state

-- ============================================================
-- QUERY 1: Check if SLA migrations are in schema_migrations
-- ============================================================
SELECT version, name, executed_at 
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260225%'
ORDER BY version DESC;

-- Expected: Should show 4 rows for versions:
--   20260225000100 (add_sla_workflow_tables)
--   20260225000200 (fix_applicant_approval_defaults)
--   20260225000300 (fix_email_verification_trigger)
--   20260225000400 (seed_sla_policies)

-- ============================================================
-- QUERY 2: Check if SLA tables exist IN PRODUCTION
-- ============================================================
SELECT table_schema, table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies','workflow_stage_instances')
ORDER BY table_schema, table_name;

-- Expected: Should show 2 rows (public.workflow_sla_policies, public.workflow_stage_instances)
-- If returns 0 rows, the tables WERE NOT CREATED despite migrations being marked applied

-- ============================================================
-- QUERY 3: Check if SLA functions exist
-- ============================================================
SELECT routine_schema, routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_sla_policy', 'create_stage_instance', 'close_stage_instance')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- Expected: Should show 3 rows (the helper functions created by migration)
-- If returns 0 rows, the functions WERE NOT CREATED

-- ============================================================
-- QUERY 4: Check if SLA view exists
-- ============================================================
SELECT table_schema, table_name 
FROM information_schema.views
WHERE table_name = 'current_stage_instance'
  AND table_schema = 'public';

-- Expected: Should show 1 row (public.current_stage_instance)
-- If returns 0 rows, the view DOES NOT EXIST

-- ============================================================
-- QUERY 5: If tables exist, check their structure
-- ============================================================
-- Run this ONLY if Query 2 returns rows:

-- For workflow_sla_policies:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workflow_sla_policies'
ORDER BY ordinal_position;

-- For workflow_stage_instances:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workflow_stage_instances'
ORDER BY ordinal_position;

-- ============================================================
-- QUERY 6: If tables exist, check data
-- ============================================================
-- Run this ONLY if Query 2 returns rows:

-- Check SLA policies:
SELECT * FROM workflow_sla_policies ORDER BY stage;

-- Check stage instances (first 10):
SELECT * FROM workflow_stage_instances ORDER BY started_at DESC LIMIT 10;

-- ============================================================
-- Summary Decision Tree:
-- ============================================================
-- IF Query 1 returns 4 rows AND Query 2 returns 0 rows:
--   → Migrations marked applied but NOT EXECUTED
--   → Solution: Need to drop and recreate migrations or manually execute the SQL
--
-- IF Query 1 returns 4 rows AND Query 2 returns 2 rows:
--   → Migrations properly applied and tables exist
--   → Solution: Everything working, use tables in code
--
-- IF Query 1 returns fewer than 4 rows:
--   → Some SLA migrations not applied to production
--   → Solution: Run supabase db push with debug to see why