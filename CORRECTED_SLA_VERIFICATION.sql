-- CORRECTED VERIFICATION QUERIES FOR SLA MIGRATIONS
-- The schema_migrations table uses different column names

-- ============================================================
-- QUERY 1: Check if SLA migrations are registered (CORRECTED)
-- ============================================================
SELECT version, name 
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260225%'
ORDER BY version DESC;

-- Expected: 4 rows for versions 20260225000100 through 20260225000400

-- ============================================================
-- QUERY 2: Check if SLA tables exist (KEY TEST)
-- ============================================================
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies','workflow_stage_instances')
ORDER BY table_schema, table_name;

-- Expected: 2 rows (public.workflow_sla_policies, public.workflow_stage_instances)
-- If returns 0 rows: TABLES DO NOT EXIST - need to re-apply migrations

-- ============================================================
-- QUERY 3: Alternative - show ALL columns in schema_migrations
-- ============================================================
-- Run this to see the actual table structure:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'supabase_migrations' 
  AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- This will show us what columns are actually available

-- ============================================================
-- QUERY 4: List all migrations (ordered by actual version)
-- ============================================================
SELECT version, name 
FROM supabase_migrations.schema_migrations 
WHERE version >= '20260220'
ORDER BY version DESC;

-- Shows all recent migrations including SLA ones