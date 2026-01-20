# 🎓 Academic Presentation Materials - Implementation Checklist

## ✅ Files Created

### Database
- [x] `supabase/migrations/20260120_add_academic_presentation_materials.sql`
  - Presentation materials table
  - RLS policies
  - Helper functions
  - Triggers

### Constants & Types
- [x] `src/lib/processConstants.ts`
  - Process stage enums
  - Materials requirements
  - Storage paths
  - Labels and descriptions

### Backend API
- [x] `src/api/materialsRoutes.ts`
  - POST /api/materials/request (Admin)
  - POST /api/materials/submit (Applicant)
  - GET /api/materials/:ipRecordId (Both)
  - DELETE /api/materials/:materialId (Admin)

### Email Service
- [x] `src/services/materialsEmailService.ts`
  - Email template generation
  - HTML formatting
  - Text fallback
  - Professional design

### Frontend Components
- [x] `src/components/MaterialsRequestAction.tsx`
  - Admin interface
  - Request button
  - Status indicators
  - Gating rule info

- [x] `src/components/MaterialsSubmissionForm.tsx`
  - Applicant interface
  - File upload boxes
  - Validation
  - Progress tracking
  - IMRaD explanation

### Documentation
- [x] `ACADEMIC_PRESENTATION_MATERIALS_GUIDE.md`
  - Complete implementation guide
  - API documentation
  - Database schema
  - Deployment instructions

---

## 🔧 Integration Steps (TODO)

### 1. Register API Routes
**File:** `src/server/index.ts` or main Express app
```typescript
import materialsRoutes from '@/api/materialsRoutes';
app.use('/api', materialsRoutes);
```

### 2. Update Admin Record Detail Page
**File:** `src/pages/AdminRecordDetail.tsx` (or equivalent)
```tsx
import { MaterialsRequestAction } from '@/components/MaterialsRequestAction';

// In render:
{currentStage === 'Academic Presentation Materials' && (
  <MaterialsRequestAction
    ipRecordId={recordId}
    applicantEmail={record.users.email}
    applicantName={record.users.full_name}
    ipTitle={record.title}
    onSuccess={handleRefresh}
    onError={setError}
  />
)}
```

### 3. Update Applicant Record Detail Page
**File:** `src/pages/SubmissionDetail.tsx` (or equivalent)
```tsx
import { MaterialsSubmissionForm } from '@/components/MaterialsSubmissionForm';

// In render:
{currentStage === 'Academic Presentation Materials' && (
  <MaterialsSubmissionForm
    ipRecordId={recordId}
    applicantId={userId}
    onSuccess={handleRefresh}
    onError={setError}
  />
)}
```

### 4. Update Process Tracking Component
**File:** `src/components/ProcessTrackingWizard.tsx`
```tsx
// Update stage definition:
{
  stage: 'academic_presentation_materials',
  label: 'Academic Presentation Materials',
  description: getStatusDescription('preparing_materials'),
  status: 'pending',
}

// Update matching logic:
case 'academic_presentation_materials':
  return t.status === 'preparing_materials' ||
         t.status === 'materials_submitted' ||
         t.action === 'request_materials' ||
         t.action === 'materials_submitted';
```

### 5. Update "Mark as Completed" Button Logic
**Wherever stage completion happens (likely in AdminRecordDetail or similar)**
```tsx
const canMarkCompleted = 
  materialsRequested && 
  materialsSubmitted &&
  currentStage === 'Academic Presentation Materials';

<button
  onClick={handleMarkCompleted}
  disabled={!canMarkCompleted}
  className={canMarkCompleted ? 'bg-green-600' : 'bg-gray-400'}
>
  Mark as Completed
</button>
```

### 6. Setup Supabase Storage Bucket
```bash
# Create bucket
supabase storage create-bucket presentation-materials --public

# Or via Supabase Dashboard:
# - Name: presentation-materials
# - Make public: true
# - Add RLS policy below
```

### 7. Add Storage RLS Policies
**Via Supabase Dashboard → Storage → Policies:**
```sql
-- Policy 1: Allow reading
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'presentation-materials');

-- Policy 2: Allow authenticated upload
CREATE POLICY "Allow authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'presentation-materials');

-- Policy 3: Allow owner delete
CREATE POLICY "Allow owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'presentation-materials');
```

### 8. Configure Email Service
Ensure Edge Function exists: `/functions/v1/send-email`

Should handle:
```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "html": "HTML content",
  "text": "Plain text content",
  "metadata": {
    "category": "materials_request",
    "record_id": "uuid"
  }
}
```

---

## 📋 Database Migration Steps

### Step 1: Backup Current Data
```bash
supabase db pull  # Save current schema
```

### Step 2: Create Migration
```bash
# The migration file is ready:
# supabase/migrations/20260120_add_academic_presentation_materials.sql
```

### Step 3: Test Migration Locally
```bash
supabase migration test 20260120_add_academic_presentation_materials
```

### Step 4: Deploy to Production
```bash
supabase migration push
```

---

## 🧪 Testing Workflow

### Test Scenario 1: Admin Requests Materials
1. Go to submission in "Evaluation" stage
2. Find "Academic Presentation Materials" section
3. Click "Request Materials" button
4. ✓ Button should disable
5. ✓ Status should show "Requested"
6. ✓ Email should be sent to applicant

### Test Scenario 2: Applicant Receives Email
1. Check applicant email inbox
2. ✓ Should have email with subject "Presentation Materials Requested"
3. ✓ Email should contain:
   - IP title
   - Requirements (Poster + Paper)
   - File specs
   - Dashboard link
   - 10-day deadline

### Test Scenario 3: Applicant Uploads Files
1. As applicant, click dashboard link from email
2. Scroll to "Submit Presentation Materials" section
3. Upload Scientific Poster (JPG/PNG, max 10MB)
4. Upload IMRaD Short Paper (PDF/DOCX, max 5MB)
5. ✓ Submit button should enable only when both files selected
6. ✓ Files should upload with progress indicator
7. ✓ Success message should appear

### Test Scenario 4: Admin Sees Completion
1. Go back to admin view
2. Refresh page
3. ✓ Materials status should show "Submitted"
4. ✓ File names should be visible
5. ✓ "Mark as Completed" button should now be ENABLED
6. ✓ Click and verify stage completes

### Test Scenario 5: Admin Rejects Files
1. From admin view
2. Click "Reject" or similar option (if implemented)
3. ✓ Materials status should reset to "Requested"
4. ✓ Applicant should see form again
5. ✓ Applicant can resubmit

---

## 🔍 QA Checklist

### Functional
- [ ] Admin can request materials
- [ ] Applicant receives email
- [ ] Email link works correctly
- [ ] Applicant can upload poster
- [ ] Applicant can upload paper
- [ ] File validation works (size & type)
- [ ] Files stored in Supabase Storage
- [ ] Admin sees submitted files
- [ ] "Mark as Completed" button behavior correct
- [ ] Admin can reject and request resubmission
- [ ] Process tracking updated
- [ ] Activity logs show all actions

### Security
- [ ] Applicants can't access other records' materials
- [ ] Admins can access all materials
- [ ] RLS policies enforced
- [ ] API authorization checked
- [ ] File download URLs signed (if applicable)
- [ ] File sizes validated
- [ ] File types validated

### Performance
- [ ] File upload doesn't block UI
- [ ] Progress indicator updates smoothly
- [ ] Page loads quickly
- [ ] No console errors
- [ ] Email sent within 5 seconds

### User Experience
- [ ] Clear instructions on form
- [ ] Error messages helpful
- [ ] Success messages confirm
- [ ] Timestamps show correctly
- [ ] Deadline clearly visible
- [ ] IMRaD explanation helpful

---

## 📊 Key Metrics to Track

After deployment, monitor:
- [ ] How many materials requests sent
- [ ] Average time to submission
- [ ] File size distribution
- [ ] Email delivery rate
- [ ] Error rate on upload
- [ ] User feedback/issues

---

## 🎯 Success Criteria

✅ **All Complete When:**
1. Admin can request materials with one click
2. Applicant receives professional email
3. Applicant can upload two files
4. Files validated and stored
5. Admin sees upload status
6. "Mark as Completed" gates correctly
7. All data logged and tracked
8. Emails sent successfully
9. RLS policies enforced
10. Production ready

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: "Mark as Completed" still disabled**
- Check: `presentation_materials.materials_requested_at` is not null
- Check: `presentation_materials.materials_submitted_at` is not null
- Check: Both files uploaded

**Issue: Email not received**
- Check: Edge function `/functions/v1/send-email` exists
- Check: SMTP credentials configured
- Check: No spam filter blocking

**Issue: File upload fails**
- Check: Storage bucket `presentation-materials` exists
- Check: Bucket is public
- Check: RLS policies allow upload
- Check: File size < limit
- Check: File type matches spec

**Issue: "Unauthorized" error**
- Check: User is authenticated
- Check: User is applicant of record
- Check: Materials status is 'requested'
- Check: API authorization headers correct

---

**Next Steps:**
1. Review all created files
2. Integrate into existing pages
3. Run local testing
4. Deploy migration
5. QA testing
6. Go live

---

**Created:** January 20, 2026
**Ready for Integration:** ✅ YES
