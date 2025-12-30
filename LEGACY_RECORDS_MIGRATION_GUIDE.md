# Legacy Records Database Migration Guide

## Overview
This SQL script updates the `legacy_ip_records` and `legacy_record_documents` tables to support the complete legacy records functionality with all necessary fields, indexes, and security policies.

## What Gets Updated

### 1. legacy_ip_records Table
**Columns Added:**
- `abstract` (TEXT) - Full abstract/description of the IP
- `created_at` (TIMESTAMP) - Auto-set to current time when record is created
- `updated_at` (TIMESTAMP) - Auto-updated whenever record is modified
- `admin_id` (UUID) - References the admin user who created the record

**Indexes Added:**
- Category index (for filtering)
- Created date index (for sorting/filtering)
- Legacy source index (for filtering by source)
- Admin ID index (for user-specific queries)

### 2. legacy_record_documents Table
**Purpose:** Stores generated PDF documents (disclosures and certificates)

**Columns:**
- `id` - Unique document ID
- `record_id` - Reference to legacy IP record (FK)
- `document_type` - 'disclosure' or 'certificate'
- `file_name` - Original filename
- `file_path` - Storage path (if stored in Supabase Storage)
- `pdf_data` - Base64 encoded PDF (if stored in database)
- `created_at` - When document was generated
- `updated_at` - Last update time

**Indexes Added:**
- Record ID index (for fast lookups)
- Created date index
- Document type index

### 3. Security Policies (RLS)
All policies restrict access to **admin users only**:
- INSERT: Only admins can create documents
- SELECT: Only admins can view documents
- UPDATE: Only admins can update documents
- DELETE: Only admins can delete documents

### 4. Triggers
Automatic `updated_at` timestamp updates when records are modified.

## How to Run

### Option 1: Via Supabase Dashboard (Recommended for First Time)

1. Go to **Supabase Console** → Your Project
2. Click **SQL Editor** (or **SQL** in the sidebar)
3. Click **New Query**
4. Copy the entire contents of `SQL_LEGACY_RECORDS_TABLE_UPDATE.sql`
5. Paste into the SQL Editor
6. Click **Run** button (or press Ctrl+Enter)
7. Wait for completion - you should see green ✓ checks

### Option 2: Via Command Line (Advanced)

```bash
# Using psql (if you have PostgreSQL client installed)
psql "postgresql://user:password@host/database" -f SQL_LEGACY_RECORDS_TABLE_UPDATE.sql

# Or using Supabase CLI
supabase db push
```

### Option 3: Run Sections Individually

If you want to be cautious, run the SQL in sections:

1. First run the ALTER TABLE section (adds columns)
2. Then run the CREATE INDEX section
3. Then run the CREATE TABLE for legacy_record_documents
4. Then run the RLS policies
5. Finally run the triggers

## What This Enables

Once this migration runs, the application will be able to:

✅ Create legacy records with complete metadata
✅ Store abstract, created_at, and updated_at automatically
✅ Track which admin created each record
✅ Generate and store disclosure PDFs
✅ Generate and store certificate PDFs
✅ Enforce admin-only access to all legacy records
✅ Maintain proper audit trails with timestamps
✅ Efficiently query records by category, date, source, etc.

## Verify Installation

After running the SQL, verify it worked:

1. Go to **Supabase Console** → **Database** → **Tables**
2. Click on `legacy_ip_records`
3. Check the **Columns** section - you should see:
   - `abstract`
   - `created_at`
   - `updated_at`
   - `admin_id`

4. Click on `legacy_record_documents` table
5. Verify it exists with all required columns

## Troubleshooting

**If you get an error about "table does not exist":**
- The table might not be created yet
- Create it with the CREATE TABLE statement in the SQL

**If you get "permission denied":**
- Ensure you're logged in as the project owner or have admin permissions
- Run as the postgres superuser or project owner account

**If columns already exist:**
- The `IF NOT EXISTS` clause will skip them - this is safe to re-run

**If triggers fail:**
- Check that the functions don't already exist
- Drop old functions first: `DROP FUNCTION IF EXISTS update_legacy_ip_records_updated_at() CASCADE;`

## Rollback (If Needed)

If something goes wrong, you can undo with:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS legacy_ip_records_update_trigger ON public.legacy_ip_records;
DROP TRIGGER IF EXISTS legacy_record_documents_update_trigger ON public.legacy_record_documents;

-- Remove functions
DROP FUNCTION IF EXISTS update_legacy_ip_records_updated_at();
DROP FUNCTION IF EXISTS update_legacy_record_documents_updated_at();

-- Drop new table
DROP TABLE IF EXISTS public.legacy_record_documents CASCADE;

-- Remove columns (optional - they won't hurt)
-- ALTER TABLE legacy_ip_records DROP COLUMN abstract, DROP COLUMN created_at, DROP COLUMN updated_at, DROP COLUMN admin_id;
```

## Next Steps

1. Run the SQL migration
2. Verify columns and tables exist
3. Rebuild and redeploy the application
4. Test creating a legacy record
5. Test generating disclosure PDF
6. Test generating certificate PDF

---

**Status**: Ready to deploy
**Date**: Dec 31, 2025
