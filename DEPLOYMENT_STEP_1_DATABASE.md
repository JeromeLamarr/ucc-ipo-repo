# 📦 Deployment Step 1: Database Migration

## Overview
This document covers deploying the Academic Presentation Materials database migration to your Supabase instance.

**Status:** ✅ Migration file created and ready
**File:** `supabase/migrations/20260120_add_academic_presentation_materials.sql`

---

## ⚡ Quick Start (5 minutes)

### Option A: Using Supabase CLI (Recommended)

```powershell
# 1. Navigate to project
cd "c:\Users\delag\Desktop\ucc ipo\project"

# 2. Push migration to Supabase
supabase db push

# 3. Verify migration was applied
supabase migration list
```

### Option B: Manual SQL Execution (Alternative)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Open and copy contents of: `supabase/migrations/20260120_add_academic_presentation_materials.sql`
6. Paste into the editor
7. Click **Run**

---

## 📋 What Gets Created

### 1. **presentation_materials Table**
Tracks all materials requests and submissions with 30 columns:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `ip_record_id` | UUID FK | Links to IP record |
| `materials_requested_at` | TIMESTAMPTZ | When admin requested materials |
| `materials_requested_by` | UUID FK | Which admin made request |
| `materials_submitted_at` | TIMESTAMPTZ | When applicant submitted |
| `submitted_by` | UUID FK | Which applicant submitted |
| `poster_file_*` | Various | Scientific poster metadata (name, path, URL, size, timestamp) |
| `paper_file_*` | Various | IMRaD paper metadata (name, path, URL, size, timestamp) |
| `status` | TEXT ENUM | `not_requested` \| `requested` \| `submitted` \| `rejected` |
| `deadline_days` | INT | Business days allowed for submission (default: 10) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### 2. **Extended ip_records Table**
Two new columns added:
- `materials_requested_at` - Timestamp when materials were requested
- `materials_submitted_at` - Timestamp when materials were submitted

### 3. **Row-Level Security (RLS) Policies**

Four policies automatically created:

#### Policy 1: Admins can view all records
```sql
CREATE POLICY "Admins can view all presentation materials"
  ON presentation_materials
  FOR SELECT USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
```

#### Policy 2: Applicants can only view their own
```sql
CREATE POLICY "Applicants can view own presentation materials"
  ON presentation_materials
  FOR SELECT USING (
    submitted_by = auth.uid()
  );
```

#### Policy 3: Applicants can insert when requested
```sql
CREATE POLICY "Applicants can submit when requested"
  ON presentation_materials
  FOR INSERT WITH CHECK (
    status = 'requested' AND submitted_by = auth.uid()
  );
```

#### Policy 4: Admins can update and delete
```sql
CREATE POLICY "Admins can manage presentation materials"
  ON presentation_materials
  FOR UPDATE, DELETE USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
```

### 4. **Database Indexes**

Three performance indexes created:
```sql
CREATE INDEX idx_presentation_materials_ip_record_id 
  ON presentation_materials(ip_record_id);

CREATE INDEX idx_presentation_materials_status 
  ON presentation_materials(status);

CREATE INDEX idx_presentation_materials_submitted_by 
  ON presentation_materials(submitted_by);
```

### 5. **Helper Functions**

**Function:** `get_or_create_presentation_materials()`
- Creates materials record if doesn't exist
- Returns existing record if already created
- Used by backend API

### 6. **Triggers**

**Trigger:** `sync_materials_to_ip_records`
- Automatically syncs timestamps to ip_records table
- Fires on INSERT/UPDATE of presentation_materials
- Keeps data consistent

---

## ✅ Verification Steps

### After running migration, verify:

```sql
-- 1. Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'presentation_materials';
-- Should return: presentation_materials

-- 2. Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'presentation_materials'
ORDER BY ordinal_position;
-- Should show all 30 columns

-- 3. Check RLS is enabled
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'presentation_materials'
AND rowsecurity = true;
-- Should return: presentation_materials

-- 4. Verify indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'presentation_materials';
-- Should show 3 indexes

-- 5. Test policy (as admin)
SELECT COUNT(*) FROM presentation_materials;
-- Should work for admins

-- 6. Check helper function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'get_or_create_presentation_materials';
-- Should return: get_or_create_presentation_materials
```

---

## 🔐 Security Notes

✅ **RLS Enabled:** All access through policies, not raw API
✅ **Role-Based:** Admins see all, applicants see only own
✅ **Gating:** Applicants can only insert when status='requested'
✅ **Constraints:** Status field restricted to valid enum values
✅ **Cascading:** Deleting ip_record automatically cleans materials

---

## 📊 Data Flow

```
Admin Dashboard
    ↓
[Request Materials Button]
    ↓
POST /api/materials/request
    ↓
INSERT INTO presentation_materials
  (status='requested', materials_requested_at=NOW(), ...)
    ↓
Trigger: sync_materials_to_ip_records
    ↓
UPDATE ip_records
  (materials_requested_at=NOW())
    ↓
RLS Policy: Admins can view
    ↓
Email sent to applicant
    ↓
Applicant Dashboard
    ↓
[Upload Form]
    ↓
POST /api/materials/submit
    ↓
UPDATE presentation_materials
  (status='submitted', files uploaded, materials_submitted_at=NOW())
    ↓
Trigger: sync_materials_to_ip_records
    ↓
UPDATE ip_records
  (materials_submitted_at=NOW())
    ↓
Admin sees submission in dashboard
```

---

## 🚨 Troubleshooting

### Issue: "Table already exists"
**Cause:** Migration already applied
**Solution:** This is fine - migration is idempotent. Can safely re-run.

```sql
-- Verify data is intact
SELECT COUNT(*) FROM presentation_materials;
```

### Issue: "Permission denied for schema public"
**Cause:** Wrong role (not authenticated as service role)
**Solution:** Make sure using Supabase service role key when running migrations

### Issue: "Trigger permission denied"
**Cause:** Service role permissions
**Solution:** Run as service role with elevated privileges

### Issue: "Policy creation failed"
**Cause:** User table or roles not properly set up
**Solution:** Verify users table has 'role' column with 'admin', 'applicant' values

---

## 📝 Migration Checklist

- [ ] **Pre-Migration**
  - [ ] Backed up database (if production)
  - [ ] Tested migration on staging environment
  - [ ] Reviewed all table/policy definitions
  - [ ] Verified Supabase CLI is installed: `supabase --version`

- [ ] **Migration Execution**
  - [ ] Ran `supabase db push` or manual SQL
  - [ ] No errors in migration output
  - [ ] Migration appears in migration list

- [ ] **Post-Migration Verification**
  - [ ] Table `presentation_materials` exists
  - [ ] All 30 columns present
  - [ ] 4 RLS policies active
  - [ ] 3 indexes created
  - [ ] Helper function works
  - [ ] Trigger created successfully
  - [ ] Can read data as admin
  - [ ] Cannot read data as non-admin

- [ ] **Cleanup**
  - [ ] No orphaned objects
  - [ ] No error logs in Supabase
  - [ ] All constraints working

---

## 🔄 Rollback (If Needed)

If you need to undo the migration:

```sql
-- Option 1: Drop table (WARNING: loses all data)
DROP TABLE IF EXISTS presentation_materials CASCADE;

-- Option 2: Drop RLS policies only (keeps table)
DROP POLICY IF EXISTS "Admins can view all presentation materials" 
  ON presentation_materials;
DROP POLICY IF EXISTS "Applicants can view own presentation materials" 
  ON presentation_materials;
DROP POLICY IF EXISTS "Applicants can submit when requested" 
  ON presentation_materials;
DROP POLICY IF EXISTS "Admins can manage presentation materials" 
  ON presentation_materials;

-- Option 3: Restore from backup (best option for production)
-- Contact Supabase support for point-in-time restore
```

---

## 📞 Next Steps

After successfully deploying the database migration:

1. ✅ **Database Migration:** Complete (you are here)
2. ⏭️ **Next:** [Register API Routes](./DEPLOYMENT_STEP_2_API_ROUTES.md)
3. ⏭️ **Then:** [Test End-to-End](./ACADEMIC_MATERIALS_IMPLEMENTATION_CHECKLIST.md)

---

## 💡 Tips

- **Test queries:** Run the verification SQL above to confirm everything works
- **Staging first:** Always test migrations on staging before production
- **Backup:** Enable automatic backups in Supabase settings
- **Monitor:** Check Supabase logs for any errors post-migration
- **Version control:** Keep migration files in git for auditability

---

**Status:** ✅ Ready to Deploy

**Migration File:** `supabase/migrations/20260120_add_academic_presentation_materials.sql`

**Last Updated:** January 20, 2026

**Contact:** Development Team
