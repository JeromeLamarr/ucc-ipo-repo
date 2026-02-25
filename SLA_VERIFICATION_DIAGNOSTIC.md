# SLA Migration Deployment Status - Diagnostic Report

## Executive Summary
- **Migration List Status:** All 4 SLA migrations show as APPLIED in local and remote (per `supabase migration list`)
- **CLI Push Status:** `supabase db push` reports "Remote database is up to date"
- **User Report:** SQL Editor shows tables don't exist (ERROR 42P01: relation "workflow_sla_policies" does not exist)
- **Critical Issue:** Migrations marked applied in schema_migrations but tables may not actually exist in database

---

## SLA Migration Files Verified Locally

✅ **20260225000100_add_sla_workflow_tables.sql**
- Size: 240 lines
- Structure: BEGIN...CREATE TABLE...CREATE FUNCTION...COMMIT
- Contains: workflow_sla_policies table, workflow_stage_instances table, functions, view

✅ **20260225000200_fix_applicant_approval_defaults.sql**
- Updating applicant workflow logic

✅ **20260225000300_fix_email_verification_trigger.sql**
- Fixing email verification trigger logic

✅ **20260225000400_seed_sla_policies.sql**
- Size: 147 lines
- Structure: BEGIN...INSERT...COMMIT
- Inserts: Default SLA policies for 5 stages (supervisor_review, evaluation, revision_requested, materials_requested, certificate_issued)

---

## Migration List Comparison (Local vs Remote)

```
CLI Output: supabase migration list

   20260225000100 | 20260225000100 | ✅ APPLIED
   20260225000200 | 20260225000200 | ✅ APPLIED
   20260225000300 | 20260225000300 | ✅ APPLIED
   20260225000400 | 20260225000400 | ✅ APPLIED

Last migration:   20260222151754 (Feb 22, 15:17:54)
```

---

## Immediate VERIFICATION STEPS (You must run these in Supabase SQL Editor)

### Step 1: Confirm SLA migrations are registered as applied

```sql
SELECT version, name, executed_at 
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260225%'
ORDER BY version DESC;
```

**Expected result:** 4 rows with versions 20260225000100 through 20260225000400

**If returns 0 rows or fewer than 4:** Migrations were never applied

---

### Step 2: Confirm SLA tables exist (THIS IS THE CRITICAL TEST)

```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies','workflow_stage_instances')
ORDER BY table_schema, table_name;
```

**Expected result:** 2 rows (public.workflow_sla_policies, public.workflow_stage_instances)

**If returns 0 rows:** TABLES DO NOT EXIST - despite migrations being marked applied!

---

## If Tables Don't Exist (Most Likely Scenario)

This indicates: **Migrations marked applied but never executed**

### Possible Causes:
1. Migration history was repaired with wrong status flag
2. SQL execution failed silently during migration
3. Transaction rolled back during execution

### Solution Option A: Drop and Re-Apply (Safest)

```powershell
cd "c:\Users\delag\Desktop\ucc ipo\project"

# Mark the 4 SLA migrations as NOT applied
supabase migration repair --status reverted 20260225000100
supabase migration repair --status reverted 20260225000200
supabase migration repair --status reverted 20260225000300
supabase migration repair --status reverted 20260225000400

# Now re-apply them
supabase db push
```

Then verify with SQL:
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies','workflow_stage_instances');
```

---

### Solution Option B: Manually Execute SQL (If repair fails)

If `supabase migration repair` doesn't work:

1. Open Supabase SQL Editor
2. Copy the contents of [20260225000100_add_sla_workflow_tables.sql](../supabase/migrations/20260225000100_add_sla_workflow_tables.sql)
3. Paste and execute in SQL Editor
4. Then copy/paste [20260225000400_seed_sla_policies.sql](../supabase/migrations/20260225000400_seed_sla_policies.sql)
5. Execute to seed policies

---

## If Tables DO Exist (Good News)

Then the SLA infrastructure is ready:

```sql
-- Verify table structure
SELECT * FROM workflow_sla_policies ORDER BY stage;

-- Should show 5 default policies:
--   - supervisor_review (7 days + 2 grace)
--   - evaluation (10 days + 2 grace)
--   - revision_requested (14 days + 3 grace)
--   - materials_requested (7 days + 2 grace)
--   - certificate_issued (3 days + 0 grace)

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_sla_policy', 'create_stage_instance', 'close_stage_instance')
ORDER BY routine_name;

-- Check view exists
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'current_stage_instance';
```

---

## Next Steps After Verifying Tables

1. **Component Testing:** Verify ProcessTrackingWizard and other components correctly fetch SLA data
2. **Edge Function Deploy:** Deploy [check-overdue-stages/index.ts](../supabase/functions/check-overdue-stages/index.ts) for deadline monitoring
3. **Full SLA Testing:** Test deadline calculations, overdue marking, and UI display

---

## Production Project Details

- **Project Reference:** mqfftubqlwiemtxpagps
- **Project Name:** bolt-native-database-60230247
- **Region:** South Asia (Mumbai)
- **Last Migration Applied (non-SLA):** 20260222151754 (Feb 22, 2026)

---

**DO NOT PROCEED FURTHER UNTIL THE SQL VERIFICATION CONFIRMS TABLES EXIST**

Run the queries above and report back with results.
