# 🔄 Academic Materials Workflow - Complete Process Analysis

**Date:** January 20, 2026  
**Status:** Ready for Live Testing  
**Test Environment:** Production Dashboard  

---

## 📋 Executive Overview

The Academic Presentation Materials workflow is a **gated stage** in the IP submission process that sits between **Evaluation** and **Completion**.

### Key Points:
- ✅ **Admin-initiated:** Only admins can request materials
- ✅ **Applicant-executed:** Applicants upload specific files
- ✅ **Gated completion:** "Mark as Completed" is disabled until materials are submitted
- ✅ **10-day deadline:** Business days countdown
- ✅ **Real-time tracking:** Status updates immediately

---

## 🔄 Workflow Architecture

```
PREVIOUS STAGES          ACADEMIC MATERIALS          NEXT STAGES
                        (NEW WORKFLOW)
        │                       │                        │
  Supervisor            Materials Request         Completion &
    Review    ────→    & Submission    ────→    Certification
                                                      │
                    (Gated Stage)                 Mark as
                                                Completed Only
                                              When Materials
                                              Are Submitted
```

---

## 📊 Complete Submission Process (Start to Finish)

### **PHASE 1: ADMIN INITIATES REQUEST** ⏱️ 2 minutes

#### Where This Happens:
- **Page:** Submission Detail Page (for accepted IP records)
- **URL:** `/submissions/{record-id}`
- **User:** Admin or Supervisor with approval rights
- **Stage Display:** ProcessTrackingWizard shows "Academic Presentation Materials" stage

#### Step-by-Step:

**Step 1.1: Admin Navigates to Submission**
```
Admin Dashboard
    ↓
[Approved Records List]
    ↓
Click on IP Record
    ↓
Submission Detail Page Opens
    ↓
ProcessTrackingWizard shows stages:
  - Submission ✓
  - Supervisor Review ✓
  - Evaluation ✓
  - Academic Presentation Materials ← YOU ARE HERE
  - Completion
```

**Step 1.2: Admin Sees Materials Request Component**

When `current_stage === 'academic_presentation_materials'` and `role === 'admin'`:

```tsx
<MaterialsRequestAction
  ipRecordId={record.id}
  applicantEmail={record.applicant?.email}
  applicantName={record.applicant?.full_name}
  ipTitle={record.title}
  onSuccess={() => fetchSubmissionDetails()}
  onError={setError}
/>
```

**Component displays:**
```
┌─────────────────────────────────────────────┐
│  📋 REQUEST PRESENTATION MATERIALS          │
├─────────────────────────────────────────────┤
│                                             │
│  Status: Not Requested                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Request Materials                   │   │
│  │ (Blue Button - Enabled)             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Applicant: John Doe                        │
│  Email: john@university.edu                 │
│  IP Title: Advanced Solar Panel Tech        │
│                                             │
└─────────────────────────────────────────────┘
```

**Step 1.3: Admin Clicks "Request Materials"**

```
Admin clicks button
    ↓
Loading state: Button becomes disabled, shows "Requesting..."
    ↓
API call to Supabase:
  - Insert/update presentation_materials record
  - Set status = 'requested'
  - Record materials_requested_at = NOW()
  - Record materials_requested_by = admin_id
    ↓
Success response
    ↓
Component refreshes:
  - Status changes to "Requested"
  - Shows: "Materials requested on {DATE}"
  - Shows: "Requested by {ADMIN_NAME}"
  - Button disabled (grayed out)
    ↓
fetchSubmissionDetails() called
  ↓
Page state updates
```

**What happens in database:**

```sql
INSERT INTO presentation_materials (
  id,
  ip_record_id,
  status,
  materials_requested_at,
  materials_requested_by
) VALUES (
  'uuid-123',
  'record-id-456',
  'requested',
  '2026-01-20T14:30:00Z',
  'admin-id-789'
)

UPDATE ip_records SET
  materials_requested_at = '2026-01-20T14:30:00Z'
WHERE id = 'record-id-456'
```

**Step 1.4: Email Sent to Applicant** (Optional but recommended)

```
To: john@university.edu
Subject: Presentation Materials Requested - Advanced Solar Panel Tech

Body:
  Dear John Doe,
  
  Your IP submission "Advanced Solar Panel Tech" requires presentation materials.
  
  Please submit the following files within 10 business days:
  
  1. Scientific Poster (JPG/PNG, 10MB max)
  2. IMRaD Short Paper (PDF/DOCX, 5MB max)
  
  Dashboard Link: https://ucc-ipo.com/submissions/record-id-456
  
  Deadline: February 3, 2026
```

---

### **PHASE 2: APPLICANT RECEIVES NOTIFICATION** ⏱️ 5-30 minutes

#### What Applicant Sees:

**Step 2.1: Email Notification (if enabled)**

Applicant receives email with:
- ✅ Record title
- ✅ Dashboard link to submission
- ✅ Required files list
- ✅ Deadline (10 business days)
- ✅ File specifications

**Step 2.2: Applicant Logs Into Dashboard**

```
Applicant Login
    ↓
My Submissions Page
    ↓
Sees record with status indicator:
  "Awaiting Materials" (yellow badge)
    ↓
Clicks on record to view details
    ↓
Submission Detail Page opens
```

**Step 2.3: Applicant Sees Upload Form**

When `current_stage === 'academic_presentation_materials'` and `role === 'applicant'`:

```tsx
<MaterialsSubmissionForm
  ipRecordId={record.id}
  applicantId={profile.id}
  onSuccess={() => fetchSubmissionDetails()}
  onError={setError}
/>
```

**Component displays:**

```
┌──────────────────────────────────────────────────┐
│  📤 UPLOAD PRESENTATION MATERIALS                │
├──────────────────────────────────────────────────┤
│                                                  │
│  Status: Materials Requested ✓                   │
│  Deadline: February 3, 2026 (13 days remaining)  │
│                                                  │
│  ⚠️  REQUIRED: Upload both files before deadline │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 📊 SCIENTIFIC POSTER                       │ │
│  │ (JPG/PNG, Max 10MB)                        │ │
│  │                                            │ │
│  │ [Drag & drop or click to select]           │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 📄 IMRAD SHORT PAPER                       │ │
│  │ (PDF/DOCX, Max 5MB)                        │ │
│  │                                            │ │
│  │ [Drag & drop or click to select]           │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ What is IMRaD Format?                      │ │
│  │ • Introduction                             │ │
│  │ • Methods                                  │ │
│  │ • Results                                  │ │
│  │ • And Discussion                           │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Submit Materials (Disabled - No files)   │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### **PHASE 3: APPLICANT UPLOADS FILES** ⏱️ 5 minutes

#### Step 3.1: Applicant Selects Poster File

```
Applicant clicks "Scientific Poster" drop zone
    ↓
File picker opens
    ↓
Selects: poster.png (2.5MB)
    ↓
File validation happens:
  ✓ File type: image/png (ALLOWED)
  ✓ File size: 2.5MB < 10MB (ALLOWED)
    ↓
File appears in component:
  "poster.png - 2.5MB"
    ↓
Drag-and-drop alternative:
  Applicant can drag poster.png onto drop zone
```

**Validation Logic:**

```typescript
validateFile(file, 'poster'):
  - Check MIME type: image/jpeg or image/png? ✓
  - Check size: ≤ 10MB? ✓
  - Show success message

If invalid:
  - ❌ "Invalid file type. Use JPG or PNG"
  - ❌ "File too large. Max 10MB, got 15MB"
```

#### Step 3.2: Applicant Selects Paper File

```
Applicant clicks "IMRaD Short Paper" drop zone
    ↓
File picker opens
    ↓
Selects: research_paper.pdf (3.8MB)
    ↓
File validation happens:
  ✓ File type: application/pdf (ALLOWED)
  ✓ File size: 3.8MB < 5MB (ALLOWED)
    ↓
File appears in component:
  "research_paper.pdf - 3.8MB"
```

**Both files uploaded:**

```
Status updates:
┌────────────────────────────────────────────┐
│ ✓ Scientific Poster: poster.png (2.5MB)    │
│ ✓ IMRaD Short Paper: research_paper.pdf    │
│   (3.8MB)                                  │
│                                            │
│ ┌──────────────────────────────────────────┐
│ │ Submit Materials (ENABLED - Blue)        │
│ └──────────────────────────────────────────┘
└────────────────────────────────────────────┘
```

#### Step 3.3: Applicant Clicks "Submit Materials"

```
Applicant clicks "Submit Materials" button
    ↓
Component enters upload state:
  - Button becomes disabled
  - Shows progress: "Uploading... 0%"
    ↓
Files uploaded to Supabase Storage:
  POST /storage/v1/object/presentation-materials/
    ├─ presentations/{record-id}/poster-123456.png
    └─ presentations/{record-id}/paper-123456.pdf
    ↓
Progress updates: "Uploading... 50%"
    ↓
Files uploaded successfully ✓
    ↓
Database updated:

UPDATE presentation_materials SET
  status = 'submitted',
  materials_submitted_at = NOW(),
  submitted_by = applicant_id,
  poster_file_url = 'https://...poster-123456.png',
  poster_file_name = 'poster.png',
  poster_file_size = 2621440,
  paper_file_url = 'https://...paper-123456.pdf',
  paper_file_name = 'research_paper.pdf',
  paper_file_size = 3981312
WHERE ip_record_id = 'record-id-456'
    ↓
Success message:
  "✓ Materials submitted successfully!"
    ↓
Component refreshes:
  - Shows confirmation state
  - Displays download links for files
  - Button changes to "✓ Submitted"
    ↓
fetchSubmissionDetails() called
  ↓
Page state updates
```

**Database state:**

```sql
SELECT * FROM presentation_materials WHERE ip_record_id = 'record-456':

id: uuid-123
ip_record_id: record-456
status: 'submitted'  ← Changed from 'requested'
materials_requested_at: 2026-01-20T14:30:00Z
materials_requested_by: admin-789
materials_submitted_at: 2026-01-20T15:45:00Z ← NEW
submitted_by: applicant-456 ← NEW
poster_file_url: https://...poster.png
poster_file_name: poster.png
poster_file_size: 2621440
paper_file_url: https://...paper.pdf
paper_file_name: research_paper.pdf
paper_file_size: 3981312
```

---

### **PHASE 4: ADMIN REVIEWS & COMPLETES** ⏱️ 5 minutes

#### Step 4.1: Admin Sees Submission Complete

Admin refreshes or navigates back to submission detail page:

```
Submission Detail Page
    ↓
MaterialsRequestAction component now shows:
┌────────────────────────────────────────────┐
│  Status: Materials Submitted ✓             │
│                                            │
│  Submitted: January 20, 2026 at 3:45 PM   │
│  Submitted by: John Doe                    │
│                                            │
│  Files:                                    │
│  • poster.png (2.5MB) [Download]           │
│  • research_paper.pdf (3.8MB) [Download]   │
│                                            │
│  [Request Materials] (Disabled)            │
└────────────────────────────────────────────┘
```

#### Step 4.2: "Mark as Completed" Button Now Enabled

**Before materials submitted (GATING RULE):**
```
┌──────────────────────────────────────────────┐
│ Mark as Completed (DISABLED - Grayed out)    │
│ ⚠️  Materials must be submitted first        │
└──────────────────────────────────────────────┘
```

**After materials submitted:**
```
┌──────────────────────────────────────────────┐
│ ✓ Mark as Completed (ENABLED - Blue)         │
│ ✓ All required materials submitted            │
└──────────────────────────────────────────────┘
```

#### Step 4.3: Admin Clicks "Mark as Completed"

```
Admin clicks "Mark as Completed"
    ↓
CompletionButton component handles:
  - Updates ip_records.status = 'completed'
  - Updates ip_records.current_stage = 'completion'
  - Records timestamp
  - Creates activity log entry
  - Sends completion email to applicant
    ↓
Success response:
  ✓ Status changed to "Completed"
    ↓
Workflow progresses:
  - ProcessTrackingWizard advances to next stage
  - Page refreshes
  - Admin can now generate certificates
```

**Database update:**

```sql
UPDATE ip_records SET
  status = 'completed',
  current_stage = 'completion',
  updated_at = NOW()
WHERE id = 'record-456'

INSERT INTO activity_logs (
  ip_record_id,
  action,
  description,
  actor_id,
  actor_role
) VALUES (
  'record-456',
  'mark_completed',
  'Marked IP as completed after materials submission',
  'admin-789',
  'admin'
)

INSERT INTO process_tracking (
  ip_record_id,
  stage,
  status,
  completed_at
) VALUES (
  'record-456',
  'academic_presentation_materials',
  'completed',
  NOW()
)
```

---

## 🔄 Alternative Flows

### **SCENARIO A: Applicant Misses Deadline**

```
10 business days pass
    ↓
Applicant has not submitted
    ↓
Admin can see in dashboard:
  "Materials overdue - 5 days late"
    ↓
Admin options:
  • Request Materials Again (resets deadline)
  • Reject Materials (resets to requested)
  • Manual override (admin action)
```

### **SCENARIO B: Admin Rejects Materials**

```
Admin sees materials but quality is poor
    ↓
Admin clicks "Reject Materials"
    ↓
Presents rejection form with reason
    ↓
Updates presentation_materials:
  status = 'requested'  ← Back to requested
  poster_file_url = NULL
  paper_file_url = NULL
  materials_submitted_at = NULL
    ↓
Activity log records rejection
    ↓
Applicant sees:
  Status: "Materials Requested"
  Form: Upload form re-appears
  Message: "Materials were rejected: {reason}"
    ↓
Applicant can resubmit new files
```

### **SCENARIO C: Applicant Submits Early, Then Needs to Update**

```
Applicant submits poster + paper
    ↓
Later realizes poster has typo
    ↓
Clicks "Update Materials"
    ↓
Can re-upload new poster
    ↓
Old files replaced with new versions
    ↓
Admin sees updated submission
```

---

## 📊 Data Flow Diagram

```
┌──────────────────────────────────┐
│    ADMIN DASHBOARD               │
│  (SubmissionDetailPage)          │
└────────────────┬─────────────────┘
                 │
                 │ current_stage === 'academic_presentation_materials'
                 │ role === 'admin'
                 ↓
        ┌────────────────────────────┐
        │ MaterialsRequestAction      │
        │ Component                   │
        │ - Shows request status      │
        │ - [Request Materials] btn   │
        └────────────┬────────────────┘
                     │
         [Admin clicks button]
                     │
                     ↓
        ┌────────────────────────────┐
        │ materialsService            │
        │ .requestMaterials()         │
        └────────────┬────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │ Supabase Database           │
        │ presentation_materials      │
        │ (status='requested')        │
        │ ip_records (timestamp)      │
        └────────────┬────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │ Audit Log                   │
        │ (activity_logs table)       │
        │ Process Tracking            │
        │ (process_tracking table)    │
        └─────────────────────────────┘

═══════════════════════════════════════

┌──────────────────────────────────┐
│    APPLICANT DASHBOARD           │
│  (SubmissionDetailPage)          │
└────────────┬─────────────────────┘
             │
             │ current_stage === 'academic_presentation_materials'
             │ role === 'applicant'
             ↓
    ┌────────────────────────────┐
    │ MaterialsSubmissionForm     │
    │ Component                   │
    │ - Shows deadline            │
    │ - [Upload Poster]           │
    │ - [Upload Paper]            │
    │ - [Submit Materials]        │
    └────────────┬────────────────┘
                 │
    [Applicant selects files]
                 │
                 ↓
    ┌────────────────────────────┐
    │ File Validation             │
    │ - Check MIME type          │
    │ - Check file size          │
    │ - Validate requirements    │
    └────────────┬────────────────┘
                 │ ✓ Valid
                 │
    [Applicant clicks submit]
                 │
                 ↓
    ┌────────────────────────────┐
    │ Supabase Storage            │
    │ Upload files                │
    │ presentations/{id}/         │
    │ ├─ poster.png              │
    │ └─ paper.pdf               │
    └────────────┬────────────────┘
                 │ ✓ Uploaded
                 │
                 ↓
    ┌────────────────────────────┐
    │ Supabase Database           │
    │ presentation_materials      │
    │ (status='submitted')        │
    │ (file URLs stored)          │
    │ ip_records (timestamp)      │
    └────────────┬────────────────┘
                 │
                 ↓
    ┌────────────────────────────┐
    │ Component Refreshes         │
    │ Shows confirmation          │
    │ [Download Files]            │
    └────────────┬────────────────┘
                 │
    fetchSubmissionDetails()
                 │
                 ↓
    ┌────────────────────────────┐
    │ SubmissionDetailPage        │
    │ Updates state               │
    │ CompletionButton now        │
    │ enabled!                    │
    └─────────────────────────────┘
```

---

## 🧪 How to Test on Live Website

### **Test 1: Admin Request Materials**

**Pre-requisite:** IP record in academic_presentation_materials stage

**Steps:**
1. Log in as admin
2. Go to: Dashboard → All Records
3. Find record in "academic_presentation_materials" stage
4. Click to open detail page
5. Scroll down to "REQUEST PRESENTATION MATERIALS" section
6. Verify you see:
   - Current status: "Not Requested" or "Requested"
   - Applicant email
   - Applicant name
   - Record title
   - [Request Materials] button

**Expected Result:**
- Click button
- Button shows loading state
- Status changes to "Materials Requested"
- Button disables
- Timestamp shows when requested

---

### **Test 2: Applicant Uploads Materials**

**Pre-requisite:** Record must be in "Requested" status

**Steps:**
1. Log in as applicant (who owns the record)
2. Go to: My Submissions
3. Click on record with "Awaiting Materials" badge
4. Scroll down to "UPLOAD PRESENTATION MATERIALS" section
5. Verify you see:
   - Status: "Materials Requested ✓"
   - Deadline timer (days remaining)
   - Upload form with two drop zones
   - [Submit Materials] button (disabled)

**File Upload:**
1. Drag or select a JPG/PNG file (2-5MB) for poster
2. Verify file appears with size
3. Drag or select a PDF/DOCX file (2-5MB) for paper
4. Verify file appears with size
5. [Submit Materials] button should now be ENABLED

**Upload & Submit:**
1. Click [Submit Materials]
2. Wait for upload progress
3. See success message
4. Verify both files show download links

---

### **Test 3: Admin Sees Submission**

**Steps:**
1. Log in as admin
2. Go to record detail page
3. Scroll to "REQUEST PRESENTATION MATERIALS" section
4. Verify you see:
   - Status: "Materials Submitted ✓"
   - Submission date/time
   - Applicant name
   - File download links
   - [Request Materials] button (disabled)

---

### **Test 4: Completion Button Gating**

**Before Materials Submitted:**
1. Admin on detail page
2. Scroll down to "ADMIN ACTIONS"
3. Find [Mark as Completed] button
4. Verify it's DISABLED (grayed out)
5. Hover shows message: "Materials must be submitted first"

**After Materials Submitted:**
1. Applicant uploads materials
2. Admin refreshes page
3. Scroll down to "ADMIN ACTIONS"
4. [Mark as Completed] button now ENABLED (blue)
5. Can click to complete the stage

---

### **Test 5: File Validation**

**Invalid File Type:**
1. Try to upload a .txt file for poster
2. See error: "Invalid file type. Use JPG or PNG"

**File Too Large:**
1. Try to upload 15MB file for poster (max 10MB)
2. See error: "File too large. Max 10MB, got 15MB"

**Valid Files:**
1. Upload poster.png (5MB) → ✓ Accepted
2. Upload paper.pdf (3MB) → ✓ Accepted

---

### **Test 6: Real-time Updates**

**Two Users Test:**
1. Admin opens detail page
2. Applicant logs in separately, uploads materials
3. Admin refresh page (or wait for real-time update)
4. Sees materials immediately
5. [Mark as Completed] button enabled

---

### **Test 7: Rejection Flow**

**If Reject Button Exists:**
1. Materials submitted
2. Admin clicks [Reject Materials]
3. Enter rejection reason
4. Click confirm
5. Verify:
   - Status returns to "Requested"
   - Files are cleared
   - Applicant sees upload form again
   - Can resubmit

---

## 📊 Expected Behavior Checklist

### **Admin Side**
- [ ] Can see "Request Materials" button when stage is academic_presentation_materials
- [ ] Button click submits request successfully
- [ ] Button disables after request sent
- [ ] Can see submission status when applicant uploads
- [ ] File download links appear after submission
- [ ] "Mark as Completed" button enables only after materials submitted

### **Applicant Side**
- [ ] Can see "Upload Materials" form when materials are requested
- [ ] Can drag-and-drop or select files
- [ ] File validation works (type & size)
- [ ] Submit button disabled until both files selected
- [ ] Submit button enables with valid files
- [ ] Upload shows progress
- [ ] Files appear in Supabase Storage
- [ ] Database records file URLs

### **Database Side**
- [ ] presentation_materials table stores records
- [ ] Status transitions: not_requested → requested → submitted
- [ ] Timestamps recorded: materials_requested_at, materials_submitted_at
- [ ] User IDs recorded: materials_requested_by, submitted_by
- [ ] File metadata stored: URLs, names, sizes
- [ ] Activity logs created for actions
- [ ] Process tracking updated

### **Security Side**
- [ ] Applicants can only see/submit own records
- [ ] Admins can see all records
- [ ] RLS policies enforced
- [ ] Unauthenticated users cannot access
- [ ] File uploads go to storage bucket only

---

## 🔍 Live Testing Checklist

### **Before Testing:**
- [ ] Database migration deployed (`supabase db push`)
- [ ] presentation_materials table exists
- [ ] Storage bucket created ("presentation-materials")
- [ ] Components integrated in SubmissionDetailPage
- [ ] materialsService.ts in place

### **Testing Steps:**
- [ ] Admin can request materials
- [ ] Applicant receives notification
- [ ] Applicant can upload files
- [ ] Files stored in Supabase Storage
- [ ] Admin sees submission
- [ ] Completion button enabled
- [ ] Admin can mark as completed
- [ ] Workflow progresses

### **Validation:**
- [ ] Status transitions work correctly
- [ ] Timestamps accurate
- [ ] File URLs valid and downloadable
- [ ] No console errors
- [ ] No database errors
- [ ] Real-time updates work
- [ ] Email notifications sent (if enabled)

---

## 🚀 Go/No-Go for Production

**Green Light (Ready):**
- ✅ All components integrated
- ✅ Service layer complete
- ✅ Database ready
- ✅ Security policies configured
- ✅ Testing procedures defined

**Before Deploying:**
- [ ] Run all live tests above
- [ ] Verify no console errors
- [ ] Check database logs
- [ ] Confirm file storage working
- [ ] Validate audit logging
- [ ] Test with real users

---

## 📞 Troubleshooting During Testing

### **"Materials section not showing"**
- Verify `current_stage` is `'academic_presentation_materials'`
- Check ProcessTrackingWizard shows correct stage
- Verify user role (admin or applicant)

### **"Upload button disabled"**
- Both files must be valid and selected
- Check file sizes don't exceed limits
- Verify MIME types are correct

### **"Submit fails"**
- Check storage bucket exists and is PUBLIC
- Verify Supabase credentials in .env
- Check network in browser DevTools
- Look for errors in console

### **"Can't see applicant uploads as admin"**
- Refresh page to fetch updated data
- Check RLS policies allow admin read
- Verify presentation_materials table has records

---

## 📈 Success Metrics

**Successful Implementation:**
✓ Admin can request materials in <5 seconds  
✓ Applicant receives notification within 1 minute  
✓ Applicant can upload files in <2 minutes  
✓ Files stored securely in storage bucket  
✓ Admin sees submission immediately  
✓ Status updates real-time  
✓ Completion button gates correctly  
✓ No console errors  
✓ All data logged in audit trail  

---

**Status: READY FOR LIVE TESTING** 🚀

Start with Admin test, then Applicant test, then full end-to-end.

Document any issues found and we can fix them immediately!
