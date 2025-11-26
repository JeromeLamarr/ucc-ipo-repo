# 🔧 BUG FIX: Documents, History, and Certificate Generation - Complete

## Issues Fixed

### 1. ✅ "fetchRecord is not defined" Error
**Location**: `src/pages/SubmissionDetailPage.tsx` Line 508  
**Cause**: Function called `fetchRecord()` but it was named `fetchSubmissionDetails()`  
**Fix**: Changed callback to `fetchSubmissionDetails()`

### 2. ✅ "Missing required fields: record_id, user_id" Certificate Error
**Location**: `src/components/CertificateManager.tsx` Line 130  
**Cause**: Sending camelCase field names (`ipRecordId`, `applicantName`) but function expected snake_case  
**Fix**: Updated payload to use snake_case:
- `ipRecordId` → `record_id` ✅
- `applicantName` → `applicant_name` ✅
- Added `user_id: profile?.id` ✅

### 3. ✅ Documents Not Showing for Supervisors/Evaluators
**Location**: `src/pages/SubmissionDetailPage.tsx` Lines 88-103  
**Cause**: Document RLS policies prevented supervisor/evaluator access  
**Fix**: 
- Implemented role-based document query filtering
- Applicants see: documents they uploaded
- Supervisors: all documents for their assigned records
- Evaluators: all documents for their evaluation assignments
- Admins: all documents

**Before**:
```typescript
const { data: docsData, error: docsError } = await supabase
  .from('ip_documents')
  .select('*')
  .eq('ip_record_id', id)
  .order('created_at', { ascending: false });
```

**After**:
```typescript
let docsQuery = supabase
  .from('ip_documents')
  .select('*')
  .eq('ip_record_id', id);

// Applicants can only see their own documents
if (profile?.role === 'applicant') {
  docsQuery = docsQuery.eq('uploader_id', profile.id);
}

const { data: docsData, error: docsError } = await docsQuery
  .order('created_at', { ascending: false });

if (docsError) {
  console.warn('Could not fetch documents:', docsError);
  setDocuments([]);
} else {
  setDocuments(docsData || []);
}
```

### 4. ✅ Supervisor and Evaluator History Gone
**Location**: `src/pages/SubmissionDetailPage.tsx`  
**Cause**: History section not displaying; process tracking not being fetched  
**Fix**: 
- Added state for `processHistory` and `activityLogs`
- Fetch from `process_tracking` and `activity_logs` tables
- Display timeline with action, actor, status, and description
- Handle failed queries gracefully (fallback to empty array)

**Added to State** (Line 44):
```typescript
const [processHistory, setProcessHistory] = useState<any[]>([]);
const [activityLogs, setActivityLogs] = useState<any[]>([]);
```

**Added to Fetch Function** (Lines 119-142):
```typescript
// Fetch process tracking history
const { data: historyData, error: historyError } = await supabase
  .from('process_tracking')
  .select('*')
  .eq('ip_record_id', id)
  .order('created_at', { ascending: false });

if (historyError) {
  console.warn('Could not fetch process history:', historyError);
  setProcessHistory([]);
} else {
  setProcessHistory(historyData || []);
}

// Fetch activity logs
const { data: logsData, error: logsError } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('ip_record_id', id)
  .order('created_at', { ascending: false });

if (logsError) {
  console.warn('Could not fetch activity logs:', logsError);
  setActivityLogs([]);
} else {
  setActivityLogs(logsData || []);
}
```

**Added to UI** (After Evaluations Section):
```tsx
{(processHistory.length > 0 || activityLogs.length > 0) && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-4">Submission History</h2>
    <div className="space-y-4">
      {processHistory.map((event: any, index: number) => (
        <div key={`process-${event.id}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Clock className="h-5 w-5 text-blue-600" />
            {index < processHistory.length - 1 && (
              <div className="w-1 h-8 bg-blue-200 mt-2" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{event.action.replace(/_/g, ' ').toUpperCase()}</p>
                <p className="text-sm text-gray-600">{event.actor_name} ({event.actor_role})</p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(event.created_at)}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {event.status}
              </span>
            </div>
            {event.description && (
              <p className="text-sm text-gray-700 mt-2">{event.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

### 5. ✅ Button Accessibility Error
**Location**: `src/pages/SubmissionDetailPage.tsx` Line 594  
**Cause**: Download button had no title or aria-label  
**Fix**: Added accessibility attributes
```tsx
<button 
  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
  title="Download document"
  aria-label={`Download ${doc.file_name}`}
>
  <Download className="h-5 w-5" />
</button>
```

---

## Database Migrations

### New Migration Created
**File**: `supabase/migrations/20251126_fix_documents_and_tracking_visibility.sql`

**Fixes RLS Policies for**:
1. **ip_documents table**:
   - Applicants: view own documents only
   - Supervisors: view documents for records they supervise
   - Evaluators: view documents for records they evaluate
   - Admins: view all documents

2. **process_tracking table**:
   - Applicants: view tracking for their records
   - Supervisors: view tracking for records they supervise
   - Evaluators: view tracking for records they evaluate
   - Admins: view all tracking
   - Admins/Supervisors: can insert tracking records

---

## ⚠️ NEXT STEP: Apply Migration in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix RLS policies for ip_documents and process_tracking
BEGIN;

-- Drop old problematic policies on ip_documents
DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;

-- Create new policies for ip_documents
CREATE POLICY "Applicants view own documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Applicants upload documents" ON ip_documents
FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Supervisors view documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Evaluators view documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Admins view all documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Drop old policies on process_tracking
DROP POLICY IF EXISTS "Admins view tracking" ON process_tracking;
DROP POLICY IF EXISTS "Applicants view tracking" ON process_tracking;

-- Create new policies for process_tracking
CREATE POLICY "Applicants view their tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = process_tracking.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Supervisors view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = process_tracking.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Evaluators view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = process_tracking.ip_record_id
    AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Admins view all tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins and supervisors insert tracking" ON process_tracking
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'supervisor')
  )
);

COMMIT;
```

---

## Testing Checklist

After applying the migration:

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Login as Applicant
  - [ ] Navigate to submission
  - [ ] Upload documents - should work ✅
  - [ ] View history timeline ✅
  - [ ] Request certificate ✅

- [ ] Login as Supervisor
  - [ ] Go to Supervisor Dashboard
  - [ ] Open submission
  - [ ] **Documents should be visible** ✅
  - [ ] **Process history should show** ✅
  - [ ] Approve submission → should update history ✅

- [ ] Login as Evaluator
  - [ ] Go to Evaluator Dashboard
  - [ ] Open submission to evaluate
  - [ ] **Documents should be visible** ✅
  - [ ] **Process history should show** ✅
  - [ ] Submit evaluation → should update history ✅

- [ ] Login as Admin
  - [ ] Open submission detail
  - [ ] **All documents visible** ✅
  - [ ] **Full history visible** ✅
  - [ ] Click "Generate Certificate"
    - [ ] No "Missing required fields" error ✅
    - [ ] Certificate generates successfully ✅

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `src/pages/SubmissionDetailPage.tsx` | State, fetch history, display history, role-based docs | +60 |
| `src/components/CertificateManager.tsx` | Fixed certificate payload fields | -10 |
| `supabase/migrations/20251126_fix_documents_and_tracking_visibility.sql` | New RLS policies | +130 |

---

## Commit

**Commit Hash**: `e83bfdf`

**Message**: 
```
fix: Resolve document visibility, history display, and certificate generation errors

- Fixed 'fetchRecord is not defined' error
- Added state for processHistory and activityLogs
- Fetch and display process tracking history
- Restored documents with role-based filtering
- Fixed certificate generation payload fields
- Added button accessibility labels
- Created migration for ip_documents and process_tracking visibility
```

**Status**: ✅ Pushed to GitHub

---

## Summary

All 5 bugs have been fixed at the code level:

1. ✅ Function reference error resolved
2. ✅ Certificate generation payload corrected
3. ✅ Document visibility implemented with role-based filtering
4. ✅ Process history now fetched and displayed
5. ✅ Accessibility warnings fixed

**Pending**: Apply RLS migration in Supabase SQL Editor to enable supervisor/evaluator document and history visibility.

Once migration is applied, all features should work correctly! 🎉
