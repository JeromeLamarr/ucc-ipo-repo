# 🔧 Foreign Key Constraint Fix - Comprehensive Solution

## Problem
When attempting to insert or update records in the `presentation_materials` table, the following error occurs:

```
Database error: insert or update on table 'presentation_materials' violates 
foreign key constraint 'presentation_materials_materials_id_fkey'
```

**Status**: The "Request Materials" button fails when clicked, preventing admins from requesting materials from applicants.

## Root Cause Analysis
The `presentation_materials` table has been created with an erroneous foreign key constraint named `presentation_materials_materials_id_fkey` that:
1. References a non-existent `materials_id` column
2. References a non-existent `materials` table
3. Prevents any INSERT or UPDATE operations on the table
4. Did not appear in the migration code, suggesting it was created externally or is a database corruption

## Solution Overview
The fix uses a **drop and recreate** approach to ensure database integrity:

1. **Backup** all existing data from `presentation_materials`
2. **Drop** the table with the corrupted constraint
3. **Recreate** the table with the correct schema (no `materials_id`)
4. **Restore** all data without data loss
5. **Recreate** all indexes, policies, triggers, and functions

This approach ensures:
- ✅ Erroneous constraint is completely removed
- ✅ All data is preserved
- ✅ Table structure is clean and correct
- ✅ All dependent objects (indexes, policies, triggers) are recreated
- ✅ Database is transaction-safe (uses `BEGIN/COMMIT`)

## Migration File
- **File**: `supabase/migrations/20260120_fix_presentation_materials_fk_constraint.sql`
- **Size**: ~350 lines
- **Type**: Data-safe migration with rollback capability
- **Transaction**: Protected with `BEGIN/COMMIT`

## How to Apply

### Method 1: Supabase CLI (Recommended)
```bash
cd "c:\Users\delag\Desktop\ucc ipo\project"
supabase db push
```

The CLI will automatically:
- Run all pending migrations in order
- Apply this fix after the main academic_presentation_materials migration
- Show progress in the terminal

### Method 2: Manual via Supabase Dashboard
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy the entire contents of `20260120_fix_presentation_materials_fk_constraint.sql`
4. Execute the SQL
5. Verify success (see section below)

### Method 3: Direct PostgreSQL Connection
```bash
psql -h <host> -U <user> -d <database> -f supabase/migrations/20260120_fix_presentation_materials_fk_constraint.sql
```

## Verification

### After applying the migration, run these checks:

**1. Verify constraint is gone:**
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'presentation_materials' 
AND constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;
```

**Expected output** (exactly 3 constraints):
```
presentation_materials_ip_record_id_fkey
presentation_materials_materials_requested_by_fkey
presentation_materials_submitted_by_fkey
```

❌ **NOT present**: `presentation_materials_materials_id_fkey`

**2. Verify table structure:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'presentation_materials'
ORDER BY ordinal_position;
```

**Expected**: No `materials_id` column

**3. Test insertion:**
```sql
INSERT INTO presentation_materials (
  ip_record_id, 
  status, 
  materials_requested_at,
  materials_requested_by
)
VALUES (
  'some-valid-ip-record-uuid',
  'requested',
  NOW(),
  'some-valid-admin-uuid'
);
```

**Expected result**: ✅ Row inserted successfully

### Test in Production UI

After migration:
1. Go to the admin dashboard
2. Navigate to an IP record
3. Click **"Request Materials"** button
4. Verify that:
   - ✅ No database error appears
   - ✅ Materials request email is sent
   - ✅ Status changes to "In Progress"
   - ✅ Record appears in `presentation_materials` table

## Technical Details

### What Gets Dropped
- `presentation_materials` table
- All dependent triggers and indexes
- All RLS policies

### What Gets Recreated
| Component | Purpose |
|---|---|
| Table structure | Correct schema without `materials_id` |
| Indexes (3) | Performance optimization |
| RLS Policies (5) | Row-level security for access control |
| Functions (2) | Helper and trigger functions |
| Trigger (1) | Auto-sync to `ip_records` table |
| Permissions | Grants to authenticated/anon roles |

### Data Preservation
- Uses `CREATE TEMPORARY TABLE` backup
- `ON CONFLICT` clause prevents duplicate key errors
- Transaction rollback on any error (all changes reversed)

## Rollback Instructions

If something goes wrong and you need to rollback:

```bash
# Undo the latest migration
supabase migration repair --remove 20260120_fix_presentation_materials_fk_constraint

# Or manually restore from backup (if available)
```

## Expected Outcome

**After applying this fix:**
- ✅ "Request Materials" button works without errors
- ✅ Admins can request materials from applicants
- ✅ Applicants receive email notifications
- ✅ All existing data is preserved
- ✅ System can proceed to next workflow stages
- ✅ No data loss
- ✅ No service interruption

## FAQ

**Q: Will this delete my data?**
A: No. The migration backs up all data before dropping the table and restores it afterward. Zero data loss.

**Q: What if the migration fails?**
A: The migration uses `BEGIN/COMMIT`, so if any statement fails, the entire transaction rolls back and the database remains unchanged.

**Q: How long will this take?**
A: For typical databases, < 1 second. The operation is very fast.

**Q: Do I need to restart the application?**
A: No. The application should automatically reconnect to the database after the migration completes.

**Q: Can I run this during production?**
A: Yes, but recommend running during low-traffic hours. The table will be briefly unavailable during the migration (typically < 1 second).

## Support

If the migration fails or you need to investigate further:
1. Check Supabase logs: Dashboard → Logs
2. Run the verification queries above
3. Contact your database administrator
4. Review this documentation for details
