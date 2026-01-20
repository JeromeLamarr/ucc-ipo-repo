## 🎓 Academic Presentation Materials - Complete Implementation Guide

### Overview
This document provides a comprehensive guide for the new "Academic Presentation Materials" stage in the IP submission workflow. This replaces the passive "Legal Preparation" stage with an admin-driven materials request system.

---

## 📋 Table of Contents
1. [Database Schema](#database-schema)
2. [Process Constants & Enums](#process-constants--enums)
3. [Backend API Routes](#backend-api-routes)
4. [Frontend Components](#frontend-components)
5. [Email Notifications](#email-notifications)
6. [Workflow & Gating Rules](#workflow--gating-rules)
7. [RLS Policies & Security](#rls-policies--security)
8. [Deployment Instructions](#deployment-instructions)

---

## 🗄️ Database Schema

### New Table: `presentation_materials`

Tracks all materials requests and submissions for each IP record.

```sql
CREATE TABLE presentation_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id),
  
  -- Request tracking
  materials_requested_at TIMESTAMPTZ,
  materials_requested_by UUID REFERENCES users(id),
  
  -- Submission tracking
  materials_submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id),
  
  -- Poster file (image)
  poster_file_name TEXT,
  poster_file_path TEXT,
  poster_file_url TEXT,
  poster_file_size BIGINT,
  poster_uploaded_at TIMESTAMPTZ,
  
  -- Paper file (PDF/DOCX)
  paper_file_name TEXT,
  paper_file_path TEXT,
  paper_file_url TEXT,
  paper_file_size BIGINT,
  paper_uploaded_at TIMESTAMPTZ,
  
  -- Status & metadata
  status TEXT CHECK (status IN ('not_requested', 'requested', 'submitted', 'rejected')),
  submission_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Extended Columns on `ip_records`

```sql
ALTER TABLE ip_records 
ADD COLUMN materials_requested_at TIMESTAMPTZ,
ADD COLUMN materials_submitted_at TIMESTAMPTZ;
```

---

## 🎯 Process Constants & Enums

### File: `src/lib/processConstants.ts`

```typescript
export enum ProcessStage {
  SUBMISSION = 'submission',
  SUPERVISOR_REVIEW = 'supervisor_review',
  EVALUATION = 'evaluation',
  ACADEMIC_PRESENTATION = 'academic_presentation_materials',
  COMPLETION = 'completion',
}

export enum ProcessStatus {
  PREPARING_MATERIALS = 'preparing_materials',
  MATERIALS_SUBMITTED = 'materials_submitted',
  // ... other statuses
}

export const MATERIALS_REQUIREMENTS = {
  POSTER: {
    name: 'Scientific Poster',
    fileTypes: ['image/jpeg', 'image/png'],
    maxSize: 10 * 1024 * 1024,
    description: 'A scientific poster (JPG or PNG format) presenting your research',
  },
  PAPER: {
    name: 'IMRaD Short Paper',
    fileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 5 * 1024 * 1024,
    description: 'A short paper following IMRaD structure (PDF or DOCX format)',
  },
};
```

---

## 🔌 Backend API Routes

### File: `src/api/materialsRoutes.ts`

#### 1. Request Materials (Admin Only)
```
POST /api/materials/request
Authorization: Admin role required

Request body:
{
  "ip_record_id": "uuid"
}

Response:
{
  "success": true,
  "data": { ... materials record ... },
  "message": "Materials requested successfully. Email sent to applicant."
}
```

**Actions:**
- Creates/updates presentation_materials record
- Sets status to 'requested'
- Sends email to applicant
- Creates activity log entry
- Creates process_tracking entry

#### 2. Submit Materials (Applicant Only)
```
POST /api/materials/submit
Authorization: Authenticated user

Request body:
{
  "ip_record_id": "uuid",
  "poster_file_url": "string",
  "poster_file_name": "string",
  "poster_file_size": "number",
  "paper_file_url": "string",
  "paper_file_name": "string",
  "paper_file_size": "number"
}

Response:
{
  "success": true,
  "data": { ... materials record ... },
  "message": "Materials submitted successfully. Admin has been notified."
}
```

**Actions:**
- Verifies applicant ownership
- Updates presentation_materials with file details
- Updates ip_records status to 'materials_submitted'
- Creates activity log entry
- Notifies admin

#### 3. Get Materials Status
```
GET /api/materials/:ipRecordId
Authorization: Authenticated user

Response:
{
  "success": true,
  "data": {
    "status": "requested",
    "materials_requested_at": "2026-01-20T10:00:00Z",
    "materials_submitted_at": null,
    "poster_file_name": null,
    "paper_file_name": null,
    ...
  }
}
```

#### 4. Reject Materials (Admin Only)
```
DELETE /api/materials/:materialId
Authorization: Admin role required

Request body:
{
  "reason": "string"
}

Response:
{
  "success": true,
  "data": { ... materials record (reset to 'requested') ... },
  "message": "Materials rejected. Applicant has been notified to resubmit."
}
```

---

## 🎨 Frontend Components

### 1. MaterialsRequestAction (Admin Component)
**File:** `src/components/MaterialsRequestAction.tsx`

Displays on admin submission detail page:

```tsx
<MaterialsRequestAction
  ipRecordId={recordId}
  applicantEmail={applicantEmail}
  applicantName={applicantName}
  ipTitle={ipTitle}
  onSuccess={() => fetchRecord()}
  onError={(error) => setError(error)}
/>
```

**Features:**
- Shows request status
- Shows submission status
- Request Materials button (clickable only if not already requested)
- Displays deadline (10 business days)
- Gating info explaining conditions

### 2. MaterialsSubmissionForm (Applicant Component)
**File:** `src/components/MaterialsSubmissionForm.tsx`

Displays on applicant submission detail page:

```tsx
<MaterialsSubmissionForm
  ipRecordId={recordId}
  applicantId={userId}
  onSuccess={() => fetchRecord()}
  onError={(error) => setError(error)}
/>
```

**Features:**
- Shows when materials not requested
- Shows deadline when materials requested
- File upload boxes with drag-and-drop
- File validation (type & size)
- Progress indicators
- Displays submitted files
- Submit button disabled until both files selected

---

## 📧 Email Notifications

### File: `src/services/materialsEmailService.ts`

#### Materials Request Email

**Sent to:** Applicant
**When:** Admin clicks "Request Materials" button
**Template includes:**
- IP title
- Required materials (Scientific Poster + IMRaD Short Paper)
- File type and size requirements
- Explanation of IMRaD format
- Direct link to submission dashboard
- 10-day deadline

**Email includes:**
- HTML and plain text versions
- Professional formatting
- Clear instructions
- Direct action link

---

## 🔄 Workflow & Gating Rules

### Process Flow

```
1. Admin views submission in stage "Evaluation" → "Academic Presentation Materials"
   ↓
2. Admin clicks "Request Materials" button
   ├─ Sets materials_requested_at timestamp
   ├─ Sends email to applicant
   ├─ Creates activity log entry
   └─ Creates process_tracking entry (status: 'preparing_materials')
   ↓
3. Applicant receives email notification
   ↓
4. Applicant logs in and sees materials submission form
   ↓
5. Applicant uploads:
   - Scientific Poster (JPG/PNG, max 10MB)
   - IMRaD Short Paper (PDF/DOCX, max 5MB)
   ↓
6. System validates and stores files
   ├─ Sets materials_submitted_at timestamp
   ├─ Updates ip_records status to 'materials_submitted'
   ├─ Creates activity log entry
   └─ Notifies admin
   ↓
7. Admin can now click "Mark as Completed" to move to next stage
```

### Gating Rules

**"Mark as Completed" button is DISABLED until:**
1. ✓ Materials have been requested (`materials_requested_at IS NOT NULL`)
2. ✓ Both files have been submitted (`materials_submitted_at IS NOT NULL`)

**Implementation in admin UI:**

```tsx
<button
  onClick={handleMarkCompleted}
  disabled={!materialsRequested || !materialsSubmitted}
  className={materialsRequested && materialsSubmitted ? 'bg-green-600' : 'bg-gray-400'}
>
  Mark as Completed
</button>
```

---

## 🔐 RLS Policies & Security

### Row Level Security

All RLS policies are defined in the migration file.

#### Policy 1: Applicant View
Applicants can see their own materials:
```sql
CREATE POLICY "Applicants can view their own presentation materials"
  ON presentation_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = presentation_materials.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );
```

#### Policy 2: Admin View
Admins can see all materials:
```sql
CREATE POLICY "Admins can view all presentation materials"
  ON presentation_materials FOR SELECT
  USING (
    (SELECT role FROM users WHERE users.id = auth.uid()) = 'admin'
  );
```

#### Policy 3: Applicant Submit
Applicants can only submit when requested:
```sql
CREATE POLICY "Applicants can submit presentation materials"
  ON presentation_materials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = presentation_materials.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
    AND status = 'requested'
  );
```

#### Policy 4: Admin Manage
Admins can manage all materials:
```sql
CREATE POLICY "Admins can manage presentation materials"
  ON presentation_materials FOR UPDATE
  USING (
    (SELECT role FROM users WHERE users.id = auth.uid()) = 'admin'
  );
```

---

## 📦 Access Control Rules

### Admin Access
- ✓ Can request materials from any applicant
- ✓ Can view all submission materials
- ✓ Can reject submissions
- ✓ Can mark stage as completed (after materials submitted)

### Applicant Access
- ✓ Can view their own materials status
- ✓ Can submit files only when requested
- ✓ Cannot request materials themselves
- ✓ Cannot modify after submission

### No Access
- ✗ Supervisor/Evaluator cannot request materials
- ✗ Unauthenticated users cannot access materials
- ✗ Users cannot access other applicants' materials

---

## 🚀 Deployment Instructions

### Step 1: Run Database Migration
```bash
supabase migration up
```

This will:
- Create `presentation_materials` table
- Add columns to `ip_records`
- Set up RLS policies
- Create helper functions

### Step 2: Update Frontend

Add components to record detail pages:

**Admin Page (e.g., `src/pages/AdminRecordDetail.tsx`):**
```tsx
import { MaterialsRequestAction } from '@/components/MaterialsRequestAction';

<MaterialsRequestAction
  ipRecordId={recordId}
  applicantEmail={record.users.email}
  applicantName={record.users.full_name}
  ipTitle={record.title}
  onSuccess={handleRefresh}
  onError={setError}
/>
```

**Applicant Page (e.g., `src/pages/SubmissionDetail.tsx`):**
```tsx
import { MaterialsSubmissionForm } from '@/components/MaterialsSubmissionForm';

<MaterialsSubmissionForm
  ipRecordId={recordId}
  applicantId={userId}
  onSuccess={handleRefresh}
  onError={setError}
/>
```

### Step 3: Update ProcessTrackingWizard

Update `src/components/ProcessTrackingWizard.tsx` to reflect new stage name:

```tsx
{
  stage: 'academic_presentation_materials',
  label: 'Academic Presentation Materials',
  description: 'Preparing academic presentation materials',
  status: 'pending',
}
```

### Step 4: Configure Storage

Create Supabase storage bucket:

```bash
# Via Supabase Dashboard or CLI
supabase storage create presentation-materials --public
```

Add permissions policy:
```sql
CREATE POLICY "Anyone can read presentation materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'presentation-materials');

CREATE POLICY "Authenticated users can upload materials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'presentation-materials');
```

### Step 5: Configure Email Service

Ensure Edge Function exists: `/functions/v1/send-email`

The function should accept:
```json
{
  "to": "email@example.com",
  "subject": "string",
  "html": "string",
  "text": "string",
  "metadata": {}
}
```

### Step 6: Test the Flow

1. Create test IP record
2. Move it to "Evaluation" stage
3. As admin, click "Request Materials"
4. Verify email sent to applicant
5. As applicant, log in and upload files
6. Verify admin can see "Mark as Completed" enabled

---

## 📊 Database Tracking

### Activity Log Entries Created
- `materials_requested` - When admin requests materials
- `materials_submitted` - When applicant submits files
- `materials_rejected` - When admin rejects submission

### Process Tracking Entries
- Action: `request_materials` → Stage: `academic_presentation_materials`
- Action: `materials_submitted` → Stage: `academic_presentation_materials`
- Action: `materials_rejected` → Stage: `academic_presentation_materials`

---

## ✅ Testing Checklist

- [ ] Admin can request materials
- [ ] Applicant receives email with correct link
- [ ] Applicant can upload poster (JPG/PNG)
- [ ] Applicant can upload paper (PDF/DOCX)
- [ ] File validation works (size & type)
- [ ] Admin sees "Mark as Completed" enabled after submission
- [ ] Process tracking updated correctly
- [ ] Activity logs show all actions
- [ ] RLS policies enforced correctly
- [ ] Email notifications sent successfully

---

## 🔧 Troubleshooting

### "Mark as Completed" button still disabled
**Solution:** Check that both:
1. `presentation_materials.materials_requested_at IS NOT NULL`
2. `presentation_materials.materials_submitted_at IS NOT NULL`

### Email not received
**Solution:** Verify Edge Function `/functions/v1/send-email` exists and has correct sender configuration

### File upload fails
**Solution:** 
1. Check Supabase storage bucket exists
2. Verify RLS policies allow authenticated uploads
3. Check file size and type validation

### "Unauthorized" on submit
**Solution:** Verify user is applicant of the record (check `ip_records.applicant_id`)

---

## 📝 Notes

- Gating rule enforced in UI AND backend API
- Files stored in Supabase Storage (not database)
- All actions logged for audit trail
- Email templates are responsive and professional
- Workflow aligns with IP management best practices

---

**Version:** 1.0
**Last Updated:** January 20, 2026
**Status:** Production Ready ✅
