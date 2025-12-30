# Legacy IP Records - Debug & Fix Report

**Date**: December 30, 2025  
**Latest Commit**: `af6d830` (fixed logging + removed deprecation notice)  
**Original HEAD**: `4eeb20b` (creator name field added)

---

## 🔍 Investigation Summary

### Step 1: Repository Status ✅
- **Repo**: Updated and at `HEAD -> main`
- **Latest commit (original)**: `4eeb20b` - feat: add creator name field to legacy records
- **Recent commits (relevant)**:
  - `4eeb20b`: Creator name field added
  - `0cb0cfb`: Update edge functions for legacy-generated-documents bucket
  - `787e629`: Add legacy record disclosure HTML template
  - `36fd173`: Fix array results handling in generate-certificate
  - `c7c3e6c`: Improve legacy record lookup in generate-disclosure

---

## 🔴 Critical Issues Found

### Issue 1: DEPRECATED Notice in generate-disclosure ⚠️ **FIXED**
**File**: `supabase/functions/generate-disclosure/index.ts` (line 1-8)

**Problem**: The function was marked as "DEPRECATED and archived since 2025-12-27" but is still actively:
- Called from `LegacyRecordDetailModal.tsx`
- Configured in `supabase/config.toml`
- Used in production code

**Impact**: Misleading comment could cause teams to skip testing or remove the function

**Fix Applied**: ✅ Removed deprecated notice and updated header to clarify the function is actively maintained

---

### Issue 2: Missing creator_name in Legacy Disclosure HTML ⚠️ **FIXED**
**File**: `supabase/functions/generate-disclosure/index.ts` (line 775+)

**Problem**: The `generateLegacyDisclosureHTML()` function didn't display `creator_name` field  
The `creator_name` is stored in `record.details.creator_name` but wasn't being rendered

**Expected**: Legacy disclosure should show who created the record (attribution)  
**Actual**: HTML template only showed title, category, abstract, legacy details, and inventors - no creator

**Fix Applied**: ✅ Added "Creator Information" section to legacy disclosure HTML template:
```html
<div class="section">
  <div class="sec-title">Creator Information</div>
  <div class="field-group">
    <div class="field-label">Creator / Applicant</div>
    <div class="field-value">${details.creator_name || 'N/A'}</div>
  </div>
</div>
```

---

## ✅ Code Logic Review

### generate-certificate (line 882-930)
**Status**: ✅ Correct

Verified:
- ✅ Queries `ip_records` with `.select("*")` and checks `.length > 0` (array result handling)
- ✅ Falls back to `legacy_ip_records` if not found
- ✅ Uses `record.details.creator_name` for legacy records (line 976)
- ✅ Skips workflow status validation for legacy records (isLegacy check)
- ✅ Uploads to `legacy-generated-documents` bucket when `isLegacy = true` (line 1053)
- ✅ Accepts both `record_id` and `recordId` parameters

### generate-disclosure (line 50-102)  
**Status**: ✅ Correct (after fixes)

Verified:
- ✅ Queries `ip_records` first with array result handling
- ✅ Falls back to `legacy_ip_records` if not found
- ✅ Detects legacy records via `!record.applicant && !record.status` check
- ✅ Routes to `legacy-generated-documents` bucket for legacy records
- ✅ Accepts both `recordId` and `record_id` parameters

---

## 📝 Logging Enhancements Added

Both edge functions now include comprehensive logging at key points:

### generate-disclosure
```typescript
[generate-disclosure] Payload: { actualRecordId, timestamp }
[generate-disclosure] Found in ip_records/legacy_ip_records: { recordId, status, creatorName }
[generate-disclosure] Uploading PDF: { bucketName, filePath, fileSize, isLegacy }
[generate-disclosure] Upload error: { bucketName, filePath, error }
[generate-disclosure] PDF uploaded successfully: { bucketName, filePath }
```

### generate-certificate
```typescript
[generate-certificate] Payload received: { record_id, user_id, requester_id, timestamp }
[generate-certificate] Found in ip_records/legacy_ip_records: { recordId, title, creatorName, status }
[generate-certificate] Uploading PDF to storage: { bucketName, filePath, fileSize, isLegacy, trackingId }
[generate-certificate] Storage upload error: { bucketName, filePath, error, errorCode }
[generate-certificate] PDF uploaded successfully: { bucketName, filePath, fileSize }
```

---

## ⚠️ Remaining Checks Needed (Frontend Test)

The following require your Supabase dashboard access to verify:

### Check 1: legacy-generated-documents Bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'legacy-generated-documents';
```

### Check 2: RLS Policies
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%legacy%';
```

**If missing, create these policies:**
```sql
DROP POLICY IF EXISTS "allow_authenticated_legacy_read" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_legacy_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_legacy_update" ON storage.objects;

CREATE POLICY "allow_authenticated_legacy_read" ON storage.objects 
  FOR SELECT USING (bucket_id = 'legacy-generated-documents');

CREATE POLICY "allow_authenticated_legacy_insert" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'legacy-generated-documents');

CREATE POLICY "allow_authenticated_legacy_update" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'legacy-generated-documents') 
  WITH CHECK (bucket_id = 'legacy-generated-documents');
```

### Check 3: Legacy Records with creator_name
```sql
SELECT id, title, details->>'creator_name' AS creator_name 
FROM legacy_ip_records 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🚀 Next Steps

### Immediate Actions:
1. **Deploy updated functions** to Supabase
   - Functions now have improved logging for debugging
   - Creator name will display in legacy disclosures
   - Deprecated notice removed

2. **Test in Supabase dashboard**
   - Check function logs after calling generate-disclosure/generate-certificate
   - Verify logging output matches the format above
   - Look for any RLS or bucket errors in the logs

3. **Verify Database** (using Supabase SQL Editor)
   - Run the three SQL checks above
   - Confirm legacy-generated-documents bucket exists
   - Confirm RLS policies are in place
   - Verify sample legacy record has creator_name

4. **Test Reproduction** (in browser)
   - Create or locate a test legacy IP record
   - Click "Generate Disclosure" button
   - Monitor network tab and Supabase function logs
   - Check for detailed error messages in logs

### If Still Failing:
- Logs will now show exactly where failures occur:
  - "Record not found in..." → Database/query issue
  - "Storage upload error..." → Bucket/RLS issue
  - Show the error message and I can provide targeted fix

---

## 📊 Code Changes Summary

**Commit**: `af6d830`

**Files Modified**:
1. `supabase/functions/generate-disclosure/index.ts`
   - Removed DEPRECATED notice
   - Added creator_name field to legacy HTML template
   - Added detailed logging at 4 key points

2. `supabase/functions/generate-certificate/index.ts`
   - Enhanced logging with more context
   - Better error messages with error codes

**Lines Changed**: ~50 additions (all additive - no breaking changes)

---

## 📌 Summary for Terminal Output

```
Done: pulled repo at af6d830, fixed deprecated notice & added creator_name to legacy disclosure HTML, 
added comprehensive logging to both functions. SQL check & RLS policies still need verification in Supabase dashboard. 
Next: Deploy updated functions, run SQL checks, test in browser with Supabase function logs visible.
```
