# FILE UPLOAD FIX - STEP BY STEP GUIDE

## Root Cause Analysis

The 400 Bad Request errors you're seeing are caused by:
- **Most Likely**: The `documents` storage bucket doesn't exist in your Supabase project
- **Also Possible**: RLS (Row Level Security) policies are blocking admin uploads

## Current Code Location
File: `src/pages/AddLegacyRecordPage.tsx` lines 120-124
```typescript
const filePath = `legacy-records/${recordId}/${Date.now()}-${file.name}`;
const { error: uploadError } = await supabase.storage
  .from('documents')      // <-- THIS BUCKET NEEDS TO EXIST
  .upload(filePath, file);
```

## FIX - THREE STEPS

### STEP 1: Verify/Create Storage Bucket
1. Go to your **Supabase Dashboard** (https://app.supabase.com)
2. Select your project
3. Click **Storage** in the left sidebar
4. Look for a bucket named `documents`
   - ✅ If it exists: proceed to STEP 2
   - ❌ If it doesn't exist:
     - Click **Create a new bucket**
     - Name: `documents`
     - Public: **OFF** (toggle the switch to disabled)
     - Click **Create bucket**

### STEP 2: Apply RLS Policies
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `FIX_FILE_UPLOAD_ISSUE.sql`
4. Highlight from line 25-27 (the verification query) and run it first to check buckets exist
5. If documents bucket exists, run lines 30-87 (the policy creation)
6. Run the verification query at the end (lines 90-96) to confirm policies are created

### STEP 3: Test Upload
1. Go to app: `/dashboard/legacy-records/new`
2. Fill in the form with test data
3. Select a file (any small file - PDF, TXT, etc.)
4. Click "Create Legacy Record"
5. Check browser console (F12) for errors:
   - ✅ If file uploads successfully, you'll see no upload warnings
   - ❌ If still getting errors, see TROUBLESHOOTING below

## EXPECTED BEHAVIOR (After Fix)

**Success Case:**
- Record created ✅
- File uploaded ✅
- No console warnings
- Redirect to detail page
- File appears in "Generated Documents" section... wait, no
- Actually: Uploaded user files won't show until we implement display logic
- But the upload error messages should disappear

**Current Behavior (With Bucket Issue):**
- Record created ✅ (this succeeds)
- File upload fails with 400 error
- Console shows: `File upload skipped (filename.pdf): ...`
- Still redirects (because upload is non-blocking)

## TROUBLESHOOTING

If it STILL fails after creating bucket and policies:

### Check 1: User is Admin
```typescript
// In browser console, run:
const { data: { user } } = await window.supabaseClient.auth.getUser();
console.log(user);
// Check user.id is a valid UUID
```

### Check 2: Verify Policy Matches
The user making the request MUST have `role = 'admin'` in the `public.users` table.

```sql
-- Run in Supabase SQL Editor to verify:
SELECT id, email, role FROM public.users WHERE email = 'your.email@example.com';
-- Should show role = 'admin'
```

### Check 3: File Size
If file is > 50MB, Supabase will reject it. Keep files < 10MB for testing.

### Check 4: File Type
Try uploading different file types:
- .txt (safest)
- .pdf
- .jpg

### Check 5: Check Storage Logs
In Supabase Dashboard:
1. Go to **Logs** in sidebar
2. Look for **Storage** logs
3. Filter by your bucket name
4. Find the failed upload request
5. Check the detailed error message

## VERIFICATION QUERIES

After applying the fix, run these in Supabase SQL Editor:

```sql
-- 1. Check bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'documents';
-- Should return one row with id=documents, public=false

-- 2. Check RLS policies exist
SELECT policy_name FROM storage.policies 
WHERE name ILIKE '%documents%' 
ORDER BY policy_name;
-- Should return 4 policies:
-- - admin_delete_documents
-- - admin_read_documents
-- - admin_update_documents
-- - admin_upload_documents

-- 3. Check user is admin
SELECT id, email, role FROM public.users 
WHERE role = 'admin' LIMIT 5;
-- Verify the user uploading files is in this list
```

## NEXT STEPS

After uploads are working:
1. Uploaded files will be stored at: `/documents/legacy-records/{recordId}/{timestamp}-{filename}`
2. Display uploaded files in LegacyRecordDetailPage (future enhancement)
3. Clean up old/temporary files as needed

## FILES INVOLVED

- **Frontend**: `src/pages/AddLegacyRecordPage.tsx` (upload handler at lines 120-124)
- **SQL Setup**: `FIX_FILE_UPLOAD_ISSUE.sql` (RLS policies)
- **Database**: `storage.buckets` and `storage.objects` tables
