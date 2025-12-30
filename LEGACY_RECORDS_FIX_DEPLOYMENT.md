# Legacy IP Records Fix - Action Plan for Deployment

## Summary
**Commit**: `af6d830`  
**Issues Fixed**:
1. ✅ Removed misleading DEPRECATED notice from `generate-disclosure`
2. ✅ Added `creator_name` field display to legacy disclosure PDF HTML
3. ✅ Added comprehensive logging to both `generate-disclosure` and `generate-certificate` edge functions

**No breaking changes** - all fixes are additive.

---

## Deployment Instructions

### 1. Deploy Updated Edge Functions to Supabase
```bash
# From your project root
supabase functions deploy generate-disclosure
supabase functions deploy generate-certificate
```

Or deploy both at once:
```bash
supabase functions deploy
```

### 2. Verify Deployment (Supabase Dashboard)
1. Go to: https://supabase.com/dashboard/projects
2. Select your project
3. Go to: **Edge Functions**
4. Verify both functions show recent deployment time:
   - `generate-disclosure` - Last deployed: today
   - `generate-certificate` - Last deployed: today

---

## Testing After Deployment

### Test 1: Verify legacy-generated-documents Bucket Exists
**Location**: Supabase Dashboard → Storage

1. Check if bucket `legacy-generated-documents` exists
2. If **NOT** found, create it:
   - Click "New bucket"
   - Name: `legacy-generated-documents`
   - Public: OFF (keep private)
   - Click "Create"

### Test 2: Verify RLS Policies (SQL Editor)
**Location**: Supabase Dashboard → SQL Editor

Run this query:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%legacy%';
```

**Expected Result**: Should see 3 policies:
- `allow_authenticated_legacy_read`
- `allow_authenticated_legacy_insert`
- `allow_authenticated_legacy_update`

**If missing**, create them using the SQL provided in `LEGACY_RECORDS_DEBUG_REPORT.md`

### Test 3: Verify Sample Legacy Record Has creator_name
**Location**: Supabase Dashboard → SQL Editor

Run this query:
```sql
SELECT id, title, details->>'creator_name' AS creator_name 
FROM legacy_ip_records 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Result**: 
- Should show at least one record
- `creator_name` column should have a value (not NULL)

**If no records exist**:
1. Create a test legacy record in the admin UI, OR
2. Use the admin account to manually insert a test record

### Test 4: Test Certificate Generation (Frontend)
**Location**: Browser → Supabase Admin Panel

1. Login to your app as an admin/evaluator
2. Navigate to: **Legacy IP Records**
3. Click on any record (or create a test one)
4. Click: **"Generate Certificate"** button
5. **Monitor**:
   - Check browser DevTools Network tab for response
   - Go to Supabase Dashboard → Functions → `generate-certificate` → Logs
   - Look for your request and check for success logs

**Expected Success Logs**:
```
[generate-certificate] Payload received: { record_id: "...", user_id: "...", timestamp: "..." }
[generate-certificate] Found in legacy_ip_records: { recordId: "...", title: "...", creatorName: "..." }
[generate-certificate] Uploading PDF to storage: { bucketName: "legacy-generated-documents", filePath: "2025/12/...", isLegacy: true }
[generate-certificate] PDF uploaded successfully: { bucketName: "legacy-generated-documents", filePath: "2025/12/..." }
```

### Test 5: Test Disclosure Generation (Frontend)
**Location**: Browser → Admin UI

1. From the same legacy record, click: **"Generate Disclosure"** button
2. **Monitor**:
   - Check browser DevTools Network tab
   - Go to Supabase Dashboard → Functions → `generate-disclosure` → Logs

**Expected Success Logs**:
```
[generate-disclosure] Payload: { actualRecordId: "...", timestamp: "..." }
[generate-disclosure] Found in legacy_ip_records: { recordId: "...", creatorName: "..." }
[generate-disclosure] Uploading PDF: { bucketName: "legacy-generated-documents", filePath: "...", isLegacy: true }
[generate-disclosure] PDF uploaded successfully: { bucketName: "legacy-generated-documents", filePath: "..." }
```

---

## Troubleshooting

### If Certificate Generation Still Fails

#### Check Browser Response
1. Open DevTools → Network tab
2. Click "Generate Certificate"
3. Look for the failed request (red X)
4. Click it → Response tab
5. Copy the error message
6. Check Supabase function logs for matching error

#### Common Errors & Fixes

**Error**: "IP record not found" (404)
- **Cause**: Record doesn't exist in either table
- **Fix**: Verify legacy record ID is correct, check database

**Error**: "Failed to upload certificate: bucket_not_found"
- **Cause**: `legacy-generated-documents` bucket doesn't exist
- **Fix**: Create the bucket (see Test 1)

**Error**: "permission denied" (403 RLS error)
- **Cause**: RLS policies missing
- **Fix**: Create the 3 RLS policies (see Test 2)

**Error**: "Storage upload error: ... unauthorized"
- **Cause**: Service role key missing or invalid in function deployment
- **Fix**: Check function environment variables in Supabase dashboard

---

## Verification Checklist

- [ ] Edge functions deployed to Supabase
- [ ] `legacy-generated-documents` bucket exists
- [ ] 3 RLS policies exist (`allow_authenticated_legacy_*`)
- [ ] Sample legacy record has `creator_name` in details
- [ ] Certificate generation succeeds with proper logs
- [ ] Disclosure generation succeeds with proper logs
- [ ] Generated PDFs are downloadable from Storage
- [ ] Creator name appears in legacy disclosure PDF

---

## What Changed

### Files Modified
1. **`supabase/functions/generate-disclosure/index.ts`**
   - Removed DEPRECATED notice (line 1-8)
   - Added Creator Information section to legacy HTML template (line 851-857)
   - Added 4 logging points (lines 50, 64, 72, 106-120, 127-141)

2. **`supabase/functions/generate-certificate/index.ts`**
   - Enhanced logging around record lookup (lines 884-942)
   - Enhanced logging around storage upload (lines 1060-1081)

### No Breaking Changes
- All modifications are backwards compatible
- Logging is non-breaking (just console output)
- HTML template changes only add content, don't remove anything

---

## Support

If you encounter errors:

1. **Check function logs** in Supabase Dashboard:
   - Look for detailed error messages with timestamps
   - Match the time to your browser request

2. **Check database**:
   - Run SQL query to verify legacy records exist
   - Verify `details` column contains valid JSON with `creator_name`

3. **Check storage**:
   - Verify bucket exists
   - Verify RLS policies are correct

4. **Check environment**:
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in function environment

All logging statements follow the pattern: `[function-name] Log message`  
This makes them easy to grep in Supabase dashboard logs.

---

## Rollback (if needed)

If you need to revert these changes:
```bash
git revert af6d830
supabase functions deploy
```

This will redeploy the previous version without the logging and creator name fix.
