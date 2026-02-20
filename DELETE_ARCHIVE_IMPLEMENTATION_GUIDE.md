# Delete Archive Feature - Implementation & Testing Guide

## Feature Summary

This feature adds soft delete functionality to IP records with the following capabilities:

1. **Delete Records**: Mark records as deleted (drafts or workflow records)
2. **Deleted Archive Tab**: View all deleted records in a separate managed section
3. **Restore Records**: Restore deleted records back to active status
4. **Delete Forever**: Permanently delete records (entire record and associated documents)

## Files Modified

### 1. Database Layer
- **Migration File**: `supabase/migrations/20260220_add_soft_delete_to_ip_records.sql`
  - Adds `is_deleted` (BOOLEAN) column to ip_records table
  - Adds `deleted_at` (TIMESTAMP) column to track deletion date/time
  - Creates indexes for performance
  - Creates `active_ip_records` view for future use

- **TypeScript Types**: `src/lib/database.types.ts`
  - Updated Row type to include `is_deleted` and `deleted_at`
  - Updated Insert type to include new fields
  - Updated Update type to include new fields

### 2. Frontend Components

#### AllRecordsPage.tsx
- **New Imports**:
  - `Trash2` icon from lucide-react for delete button
  
- **New State**:
  - `deleteConfirmation`: Tracks which record is being deleted and shows confirmation modal
  
- **New Function**:
  - `handleDeleteRecord()`: Soft deletes a record by setting `is_deleted=true` and `deleted_at=NOW()`
  
- **Modified Fetching**:
  - `fetchRecords()`: Now filters out deleted records with `.eq('is_deleted', false)`
  
- **UI Changes**:
  - Added "Delete" button (red, with Trash icon) in both Draft and Workflow sections
  - Added delete confirmation modal before deletion

#### DeletedArchivePage.tsx (NEW)
- **Purpose**: Manages deleted records archive
- **Features**:
  - View deleted drafts separately from deleted workflow records
  - Search/filter deleted records
  - Restore single records
  - Delete forever (hard delete with cascading document deletion)
  - Pagination for both sections
  - Warning message about permanent deletion
  
- **Actions Available**:
  - **Restore**: Moves record back to active status
  - **Delete Forever**: Permanently removes record and all associated documents

### 3. Routing

#### App.tsx
- Added import for `DeletedArchivePage`
- Added new route: `/dashboard/deleted-records` → `DeletedArchivePage`

#### DashboardLayout.tsx
- Added new navigation item: "Deleted Archive"
- Only visible to admin users
- Uses Archive icon (same as Legacy Records for consistency)

## Database Migration Steps

### Method 1: Supabase CLI (Recommended but requires Docker)
```bash
cd "c:\Users\delag\Desktop\ucc ipo\project"
supabase db push
```

### Method 2: Manual via Supabase Web Console
1. Open your Supabase project
2. Go to SQL Editor
3. Copy content from `supabase/migrations/20260220_add_soft_delete_to_ip_records.sql`
4. Execute the SQL

### Method 3: Direct SQL Execution
```sql
-- Add soft delete columns to ip_records table
ALTER TABLE ip_records
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for faster queries on active records
CREATE INDEX idx_ip_records_is_deleted ON ip_records(is_deleted);
CREATE INDEX idx_ip_records_deleted_at ON ip_records(deleted_at);

-- Comments for documentation
COMMENT ON COLUMN ip_records.is_deleted IS 'Boolean flag for soft delete (true = deleted, false = active)';
COMMENT ON COLUMN ip_records.deleted_at IS 'Timestamp when the record was deleted (soft delete)';
```

## Testing Checklist

### Create Test Data
- [ ] Ensure you have at least 2 draft records and 2 workflow records in the system
- [ ] Record the record IDs for testing

### Test Delete Functionality
- [ ] Click "Delete" button on a draft record
- [ ] Verify confirmation modal appears with correct record title
- [ ] Click "Cancel" and verify record is not deleted
- [ ] Click "Delete" again and confirm deletion
- [ ] Verify record disappears from draft list
- [ ] Verify record appears in "Deleted Archive"
- [ ] Repeat for workflow record

### Test Deleted Archive Page
- [ ] Navigate to Dashboard → Deleted Archive
- [ ] Verify deleted drafts and workflow records are separated
- [ ] Verify deleted_at timestamp displays correctly
- [ ] Search for a deleted record by title
- [ ] Search for a deleted record by applicant name

### Test Restore Functionality
- [ ] From Deleted Archive, click "Restore" on any record
- [ ] Verify confirmation modal
- [ ] Cancel and verify it stays in archive
- [ ] Click "Restore" again and confirm
- [ ] Verify record disappears from Deleted Archive
- [ ] Navigate to All Records and verify record is back and active
- [ ] Verify record appears in the correct section (drafts or workflow)

### Test Delete Forever Functionality
- [ ] From Deleted Archive, click "Delete Forever" on any record
- [ ] Verify warning confirmation modal
- [ ] Cancel and verify record remains in archive
- [ ] Click "Delete Forever" again and confirm
- [ ] Verify record is completely removed from Deleted Archive
- [ ] Verify record cannot be recovered
- [ ] Check in database that record no longer exists

### Test Edge Cases
- [ ] Delete multiple records and verify all appear in archive
- [ ] Delete a record with documents and verify all docs are removed on "Delete Forever"
- [ ] Restore and delete the same record multiple times
- [ ] Test pagination in both All Records and Deleted Archive
- [ ] Verify filtering/search works with deleted records

### Test Permissions
- [ ] Verify only admin users can see "Deleted Archive" in sidebar
- [ ] Verify non-admin users cannot access `/dashboard/deleted-records` directly
- [ ] Test deleting records with various user roles (should be admin only)

## Deployment Steps

### 1. Apply Database Migration
Use one of the methods above to execute the migration SQL

### 2. Build and Test Locally
```bash
npm run build
npm run dev
```

### 3. Verify in Development
- [ ] Test all features from checklist above
- [ ] Check browser console for errors
- [ ] Verify database records are correctly updated

### 4. Commit Changes
```bash
git add -A
git commit -m "feat: add delete archive functionality for IP records

- Add soft delete columns (is_deleted, deleted_at) to ip_records
- Create DeletedArchivePage for managing deleted records
- Add delete buttons to All Records page
- Implement restore and delete forever actions
- Add Deleted Archive nav item (admin only)
- Update database types and migrations"
```

### 5. Push to Main Repository
```bash
git push origin main
```

## Important Notes

1. **Soft Delete vs Hard Delete**:
   - Soft Delete (temporary): Record is hidden from active views but data remains
   - Hard Delete (forever): Record and all associated documents are permanently removed

2. **RLS Policies**:
   - Current RLS policies should automatically filter out deleted records since the query uses `.eq('is_deleted', false)`
   - If custom RLS policies exist, they may need updates to respect the `is_deleted` flag

3. **Future Improvements**:
   - Add automatic purge of deleted records after X days
   - Add recovery window (records can only be permanently deleted after 30+ days)
   - Add audit logging for delete actions
   - Add bulk delete/restore operations

4. **Database Rollback**:
   If issues occur, rollback SQL:
   ```sql
   DROP VIEW IF EXISTS active_ip_records;
   DROP INDEX IF EXISTS idx_ip_records_is_deleted;
   DROP INDEX IF EXISTS idx_ip_records_deleted_at;
   ALTER TABLE ip_records DROP COLUMN deleted_at;
   ALTER TABLE ip_records DROP COLUMN is_deleted;
   ```

## Performance Considerations

- Indexes on `is_deleted` and `deleted_at` columns ensure efficient queries
- Soft delete prevents data reconstruction issues with foreign keys
- Active records queries are optimized with filters
- Pagination prevents loading huge deleted records list at once

## Support & Troubleshooting

### Migration Fails with Permission Error
- Check if Supabase project user has proper permissions
- Try applying migration through web console instead of CLI
- Verify connection string is correct

### Delete Button Not Working
- Check browser console for JavaScript errors
- Verify Supabase session is valid
- Check RLS policies allow UPDATE operations

### Deleted Records Still Visible
- Clear browser cache
- Refresh the page
- Check that migration was properly applied by verifying columns exist in database

### Records Cannot Be Restored
- Verify `deleted_at` was set correctly during deletion
- Check RLS policies allow restoration behavior
- Verify no foreign key constraints preventing update
