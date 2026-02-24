# API MAP & DATA SOURCES REFERENCE

Complete inventory of all API endpoints, external services, database queries, and data flows.

---

## Edge Functions API (Supabase Serverless)

### Authentication Functions

#### `POST /auth/register-user` (or via edge function invoke)
- **Function**: `register-user` 
- **File**: supabase/functions/register-user/index.ts
- **Auth Required**: No (public signup)
- **Input**:
  ```json
  {
    "email": "user@example.com",
    "fullName": "John Doe",
    "password": "password123",
    "departmentId": "uuid (optional)",
    "resend": false
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "user_id": "uuid",
    "message": "User created successfully"
  }
  ```
- **Operations**:
  1. Creates Supabase Auth user
  2. Creates `users` profile (role = 'applicant' by default)
  3. Sends verification email
  4. If resend=true, resends previous verification code
- **Status**: ✓ Working
- **Called From**: RegisterPage.tsx

---

#### `POST /auth/send-verification-code`
- **Function**: `send-verification-code`
- **File**: supabase/functions/send-verification-code/index.ts
- **Auth Required**: No
- **Input**:
  ```json
  { "email": "user@example.com" }
  ```
- **Output**:
  ```json
  { "success": true, "message": "Verification code sent" }
  ```
- **Operations**:
  1. Generates 6-digit code
  2. Stores in `verification_codes` table (expires 15 min)
  3. Sends via Supabase email service
- **Status**: ✓ Working

---

#### `POST /auth/verify-code`
- **Function**: `verify-code`
- **File**: supabase/functions/verify-code/index.ts
- **Auth Required**: No
- **Input**:
  ```json
  {
    "email": "user@example.com",
    "code": "123456"
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "user_id": "uuid",
    "session_token": "jwt"
  }
  ```
- **Operations**:
  1. Validates code (must be valid + not expired)
  2. Auto-creates user if not exists (via trigger)
  3. Sets `is_verified = true` on users row
  4. Returns JWT token
- **Status**: ✓ Working
- **Called From**: AuthCallbackPage.tsx

---

#### `POST /auth/reset-user-password`
- **Function**: `reset-user-password`
- **File**: supabase/functions/reset-user-password/index.ts
- **Auth Required**: No
- **Input**:
  ```json
  {
    "email": "user@example.com",
    "new_password": "newpassword123"
  }
  ```
- **Output**:
  ```json
  { "success": true, "message": "Password reset successful" }
  ```
- **Operations**:
  1. Sends verification code
  2. User verifies code
  3. Updates Supabase Auth password
- **Status**: ✓ Working

---

### User Management Functions

#### `POST /admin/create-user`
- **Function**: `create-user`
- **File**: supabase/functions/create-user/index.ts
- **Auth Required**: Yes (admin role)
- **Input**:
  ```json
  {
    "email": "supervisor@ucc.edu.gh",
    "full_name": "Dr. Smith",
    "role": "supervisor",
    "department_id": "uuid",
    "category_specialization": "patent"
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "user_id": "uuid",
    "temporary_password": "TempPass123!"
  }
  ```
- **Operations**:
  1. Creates Supabase Auth user with temp password
  2. Creates `users` profile with specified role + dept
  3. Sends invitation email with temp creds
- **Status**: ✓ Working
- **Called From**: UserManagement.tsx

---

#### `POST /admin/initialize-evaluators`
- **Function**: `initialize-evaluators`
- **File**: supabase/functions/initialize-evaluators/index.ts
- **Auth Required**: Yes (admin role)
- **Input**:
  ```json
  {
    "evaluators": [
      {
        "email": "eval1@ucc.edu.gh",
        "full_name": "Prof. Johnson",
        "category": "patent"
      },
      {
        "email": "eval2@ucc.edu.gh",
        "full_name": "Prof. Williams",
        "category": "copyright"
      }
    ]
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "created": 2,
    "failed": 0
  }
  ```
- **Operations**:
  1. Bulk-creates evaluators (calls create-user for each)
  2. Assigns category_specialization
  3. Sends invitation emails
- **Status**: ✓ Working
- **Called From**: AdminDashboard or manual script

---

### Certificate & Document Generation

#### `POST /certificates/generate-certificate`
- **Function**: `generate-certificate`
- **File**: supabase/functions/generate-certificate/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "record_id": "uuid",
    "user_id": "uuid (applicant)",
    "requester_id": "uuid (admin/supervisor)",
    "requester_role": "admin|supervisor|applicant"
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "file_path": "generated-pdfs/certificate_UUID.pdf",
    "tracking_id": "IP-2025-PT-00001",
    "checksum": "sha256_hash",
    "qr_code": "data:image/png;base64,..."
  }
  ```
- **Operations**:
  1. Fetches IP record + user data
  2. Generates PDF using pdf-lib
  3. Embeds QR code (links to /verify/:trackingId)
  4. Uploads to generated-pdfs bucket with RLS
  5. Stores metadata in `generated_pdfs` table
  6. Returns download link & QR code
- **Status**: ✓ Working (1200+ lines, heavy computation)
- **Called From**: CertificateManager.tsx, CompletionButton.tsx
- **Validation**: UUID format checks, RLS permissions

---

#### `POST /certificates/generate-certificate-legacy`
- **Function**: `generate-certificate-legacy`
- **File**: supabase/functions/generate-certificate-legacy/index.ts
- **Auth Required**: Yes (admin)
- **Input**: Same as generate-certificate but for legacy_ip_records
- **Output**: Same PDF + tracking_id
- **Status**: ✓ Working
- **Called From**: LegacyRecordDetailPage.tsx

---

#### `POST /documents/generate-full-disclosure`
- **Function**: `generate-full-disclosure`
- **File**: supabase/functions/generate-full-disclosure/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "record_id": "uuid",
    "include_attachments": true
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "file_path": "generated-pdfs/disclosure_UUID.pdf",
    "tracking_id": "IP-2025-DISC-00001"
  }
  ```
- **Operations**:
  1. Generates comprehensive legal disclosure document
  2. Includes all IP details, evaluations, supervisor remarks
  3. Optionally includes attached files
  4. Used for legal filing (status = ready_for_filing)
- **Status**: ✓ Working
- **Called From**: AdminDashboard (implied)

---

#### `POST /documents/generate-pdf` (Generic)
- **Function**: `generate-pdf`
- **File**: supabase/functions/generate-pdf/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "template": "certificate|disclosure|report",
    "data": { "record_id": "...", ... }
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "file_path": "...",
    "url": "signed_download_url"
  }
  ```
- **Status**: ✓ Working
- **Called From**: Various components

---

### Email & Notification Functions

#### `POST /notifications/send-status-notification`
- **Function**: `send-status-notification`
- **File**: supabase/functions/send-status-notification/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "user_id": "uuid (recipient)",
    "status": "supervisor_approved",
    "previous_status": "waiting_supervisor"
  }
  ```
- **Output**:
  ```json
  { "success": true, "email_sent": true }
  ```
- **Operations**:
  1. Creates notification row in `notifications` table
  2. Sends email (Supabase or Resend)
  3. Template: "Your submission has been [status]"
- **Triggered By**: IP record status UPDATE (trigger)
- **Status**: ✓ Working
- **Email Service**: Supabase Email or Resend API

---

#### `POST /notifications/send-certificate-email`
- **Function**: `send-certificate-email`
- **File**: supabase/functions/send-certificate-email/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "recipient_email": "applicant@example.com",
    "certificate_path": "generated-pdfs/..."
  }
  ```
- **Output**:
  ```json
  { "success": true, "email_sent": true }
  ```
- **Operations**:
  1. Attaches certificate PDF to email
  2. Sends to applicant
- **Status**: ✓ Working
- **Called From**: CertificateManager.tsx

---

#### `POST /notifications/send-notification-email` (Generic)
- **Function**: `send-notification-email`
- **File**: supabase/functions/send-notification-email/index.ts
- **Auth Required**: No (public, for transactional emails)
- **Input**:
  ```json
  {
    "to": "user@example.com",
    "subject": "Email Subject",
    "html_body": "<html>...</html>"
  }
  ```
- **Output**:
  ```json
  { "success": true, "message_id": "..." }
  ```
- **Email Service**: Resend API (via RESEND_API_KEY env var)
- **Status**: ✓ Working

---

#### `POST /notifications/send-completion-notification`
- **Function**: `send-completion-notification`
- **File**: supabase/functions/send-completion-notification/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "user_id": "uuid (applicant)"
  }
  ```
- **Output**: Email notification
- **Trigger**: IP reaches status = 'ready_for_filing' or 'completed'
- **Status**: ✓ Working

---

#### `POST /notifications/send-revision-resubmit-notification`
- **Function**: `send-revision-resubmit-notification`
- **File**: supabase/functions/send-revision-resubmit-notification/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "user_id": "uuid (applicant)",
    "revision_reason": "Needs more details"
  }
  ```
- **Output**: Email notification
- **Trigger**: Supervisor/Evaluator requests revision (status = supervisor_revision or evaluator_revision)
- **Status**: ✓ Working

---

#### `POST /notifications/process-email-queue`
- **Function**: `process-email-queue`
- **File**: supabase/functions/process-email-queue/index.ts
- **Auth Required**: Yes (admin)
- **Input**: (Runs as background job)
- **Operations**:
  1. Processes batched emails from queue table
  2. Sends pending emails (retry logic)
  3. Updates sent status
- **Status**: ✓ Working
- **Called From**: Scheduled task (implied)

---

### Materials & Academic Functions

#### `POST /materials/submit-presentation-materials`
- **Function**: `submit-presentation-materials`
- **File**: supabase/functions/submit-presentation-materials/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "user_id": "uuid",
    "files": [ { "name": "...", "data": "base64" } ]
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "material_id": "uuid",
    "file_paths": [ "..." ]
  }
  ```
- **Operations**:
  1. Uploads files to presentation-materials bucket
  2. Creates academic_presentation_materials row
  3. Sends email notification
- **Status**: ✓ Working

---

### Document & Title Functions

#### `POST /documents/check-title`
- **Function**: `check-title`
- **File**: supabase/functions/check-title/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "title": "Patent Title",
    "exclude_record_id": "uuid (if editing)"
  }
  ```
- **Output**:
  ```json
  {
    "is_duplicate": true,
    "existing_record_id": "uuid",
    "similarity_score": 0.95
  }
  ```
- **Operations**:
  1. Searches ip_records for similar titles (fuzzy match)
  2. Returns duplicate risk
- **Status**: ✓ Working
- **Called From**: ProcessTrackingWizard, NewSubmissionPage

---

#### `POST /documents/delete-draft`
- **Function**: `delete-draft`
- **File**: supabase/functions/delete-draft/index.ts
- **Auth Required**: Yes
- **Input**:
  ```json
  {
    "record_id": "uuid"
  }
  ```
- **Output**:
  ```json
  { "success": true, "message": "Draft deleted" }
  ```
- **Operations**:
  1. Sets is_deleted = true on ip_records (soft delete)
  2. Does NOT delete files (remain accessible to admin)
- **Status**: ✓ Working
- **Called From**: SubmissionDetailPage, ApplicantDashboard

---

#### `POST /admin/manage-departments`
- **Function**: `manage-departments`
- **File**: supabase/functions/manage-departments/index.ts
- **Auth Required**: Yes (admin)
- **Input**:
  ```json
  {
    "action": "create|update|delete",
    "data": {
      "id": "uuid (for update/delete)",
      "name": "Department Name",
      "code": "DEPT",
      "description": "..."
    }
  }
  ```
- **Output**:
  ```json
  { "success": true, "department_id": "uuid" }
  ```
- **Status**: ✓ Working
- **Called From**: DepartmentManagementPage.tsx

---

#### `POST /admin/generate-documentation`
- **Function**: `generate-documentation`
- **File**: supabase/functions/generate-documentation/index.ts
- **Auth Required**: Yes (admin)
- **Input**:
  ```json
  {
    "record_id": "uuid",
    "include_sections": [ "abstract", "evaluation", "comments" ]
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "documentation": "markdown/html"
  }
  ```
- **Status**: ✓ Working

---

## PostgREST Endpoints (Auto-Generated from Tables)

All Supabase tables automatically expose REST endpoints:

### IP Records

#### `GET /rest/v1/ip_records`
- **Purpose**: Fetch IP submissions with filters & sorting
- **Query Params**:
  ```
  ?select=*
  &status=eq.submitted
  &applicant_id=eq.uuid
  &is_deleted=eq.false
  &order=created_at.desc
  &limit=50
  &offset=0
  ```
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "title": "Patent for AI Algorithm",
      "category": "patent",
      "status": "submitted",
      "applicant_id": "uuid",
      "supervisor_id": "uuid | null",
      "evaluator_id": "uuid | null",
      "created_at": "2026-02-24T10:30:00Z",
      ...
    }
  ]
  ```
- **Used By**: ApplicantDashboard, AllRecordsPage, SupervisorDashboard, EvaluatorDashboard

---

#### `POST /rest/v1/ip_records`
- **Purpose**: Create new IP submission
- **Input**:
  ```json
  {
    "applicant_id": "uuid",
    "category": "patent",
    "title": "New Patent Idea",
    "abstract": "Abstract text",
    "status": "submitted"
  }
  ```
- **Response**: Created record with auto-generated ID
- **Used By**: NewSubmissionPage, ProcessTrackingWizard

---

#### `PATCH /rest/v1/ip_records?id=eq.uuid`
- **Purpose**: Update IP record status, supervisor, etc.
- **Input**:
  ```json
  {
    "status": "supervisor_approved",
    "supervisor_id": "uuid",
    "current_step": 2
  }
  ```
- **Triggers**: Auto-fires `send-status-notification` edge function
- **Used By**: SubmissionDetailPage, SupervisorDashboard, EvaluatorDashboard

---

### Documents

#### `GET /rest/v1/ip_documents?ip_record_id=eq.uuid`
- **Purpose**: Fetch documents for an IP submission
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "file_name": "disclosure.pdf",
      "file_path": "ip-documents/uuid/disclosure.pdf",
      "doc_type": "disclosure",
      "size_bytes": 2048000,
      "created_at": "2026-02-24T10:30:00Z"
    }
  ]
  ```

---

#### `POST /rest/v1/ip_documents`
- **Purpose**: Create document record (storage via separate bucket upload)
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "uploader_id": "uuid",
    "file_name": "disclosure.pdf",
    "file_path": "ip-documents/uuid/disclosure.pdf",
    "doc_type": "disclosure",
    "size_bytes": 2048000
  }
  ```

---

### Users & Profiles

#### `GET /rest/v1/users`
- **Purpose**: Fetch user profiles (admin only via RLS)
- **Query Params**:
  ```
  ?select=id,email,full_name,role,department_id,is_verified
  &role=eq.supervisor
  &department_id=eq.uuid
  ```

---

#### `GET /rest/v1/users?auth_user_id=eq.user_uuid`
- **Purpose**: Get own profile (called by AuthContext on login)
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "auth_user_id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "applicant",
      "department_id": "uuid",
      "is_verified": true,
      "category_specialization": null,
      "created_at": "2026-02-24T..."
    }
  ]
  ```

---

#### `PATCH /rest/v1/users?id=eq.uuid`
- **Purpose**: Update user profile
- **Input**:
  ```json
  {
    "email": "newemail@example.com",
    "role": "supervisor",
    "category_specialization": "patent"
  }
  ```

---

### Evaluations

#### `GET /rest/v1/evaluations?evaluator_id=eq.uuid`
- **Purpose**: Get evaluations for evaluator
- **Query Params**:
  ```
  ?select=*
  &evaluator_id=eq.uuid
  &order=created_at.desc
  ```
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "ip_record_id": "uuid",
      "evaluator_id": "uuid",
      "innovation_score": 8,
      "feasibility_score": 7,
      "market_potential_score": 6,
      "technical_merit_score": 8,
      "decision": "approved",
      "remarks": "Excellent proposal...",
      "created_at": "2026-02-24T..."
    }
  ]
  ```

---

#### `POST /rest/v1/evaluations`
- **Purpose**: Submit evaluation/grades
- **Input**:
  ```json
  {
    "ip_record_id": "uuid",
    "evaluator_id": "uuid",
    "innovation_score": 8,
    "feasibility_score": 7,
    "market_potential_score": 6,
    "technical_merit_score": 8,
    "decision": "approved",
    "remarks": "..."
  }
  ```

---

### Notifications

#### `GET /rest/v1/notifications?user_id=eq.uuid`
- **Purpose**: Fetch notifications for logged-in user
- **Query Params**:
  ```
  ?select=*
  &user_id=eq.uuid
  &order=created_at.desc
  &read_at=is.null
  ```
- **Used By**: NotificationCenter.tsx

---

#### `PATCH /rest/v1/notifications?id=eq.uuid`
- **Purpose**: Mark notification as read
- **Input**:
  ```json
  { "read_at": "now()" }
  ```

---

### CMS Pages & Sections

#### `GET /rest/v1/public_pages?is_published=eq.true`
- **Purpose**: Fetch published CMS pages
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "slug": "home",
      "title": "Home",
      "subtitle": "Welcome",
      "is_published": true,
      "created_at": "..."
    }
  ]
  ```
- **Used By**: CMSPageRenderer (public pages), PublicNavigation

---

#### `GET /rest/v1/page_sections?page_id=eq.uuid`
- **Purpose**: Fetch sections for a page
- **Query Params**:
  ```
  ?order=order.asc
  ```
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "page_id": "uuid",
      "section_type": "hero",
      "content": { "heading": "...", "description": "..." },
      "styling": { "background_color": "#fff", ... },
      "order": 1
    }
  ]
  ```

---

#### `POST /rest/v1/public_pages`
- **Purpose**: Create CMS page
- **Input**:
  ```json
  {
    "slug": "about",
    "title": "About Us",
    "is_published": false
  }
  ```

---

#### `PATCH /rest/v1/page_sections?id=eq.uuid`
- **Purpose**: Update section (reorder, edit content)
- **Input**:
  ```json
  {
    "content": { "heading": "Updated" },
    "order": 2
  }
  ```

---

### Departments

#### `GET /rest/v1/departments`
- **Purpose**: Fetch all departments
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "name": "Faculty of Science",
      "code": "FOS",
      "description": "..."
    }
  ]
  ```
- **Used By**: DepartmentManagementPage, RegisterPage (dept selector)

---

### Legacy IP Records

#### `GET /rest/v1/legacy_ip_records`
- **Purpose**: Fetch pre-digital IPs
- **Query Params**:
  ```
  ?is_deleted=eq.false
  &order=created_at.desc
  ```

---

#### `POST /rest/v1/legacy_ip_records`
- **Purpose**: Create legacy IP (admin digitization)
- **Input**:
  ```json
  {
    "reference_number": "IP-1995-001",
    "title": "Old Patent",
    "category": "patent",
    "applicant_info": { "name": "...", ... },
    "digitized_at": "now()"
  }
  ```

---

### Other Tables

- `GET /rest/v1/supervisor_assignments` - Supervisor workflow
- `GET /rest/v1/evaluator_assignments` - Evaluator assignments
- `GET /rest/v1/generated_pdfs` - Certificate/PDF records
- `GET /rest/v1/activity_logs` - Audit trail
- `GET /rest/v1/academic_presentation_materials` - Materials records
- `GET /rest/v1/full_disclosures` - Legal disclosure docs
- `GET /rest/v1/verification_codes` - Email codes (system use only)

---

## Storage Bucket APIs

### Upload Document

```typescript
const { data, error } = await supabase.storage
  .from('ip-documents')
  .upload(`${recordId}/${filename}`, file, {
    cacheControl: '3600',
    upsert: false
  });
```

### Download Document

```typescript
const { data } = await supabase.storage
  .from('ip-documents')
  .getPublicUrl(`${recordId}/${filename}`);

// Or create signed URL (private):
const { data } = await supabase.storage
  .from('ip-documents')
  .createSignedUrl(`${recordId}/${filename}`, 3600); // 1 hour expiry
```

### Delete Document

```typescript
const { error } = await supabase.storage
  .from('ip-documents')
  .remove([`${recordId}/${filename}`]);
```

---

## External API Integrations

### Supabase Email Service (Built-in)
- **Configuration**: No setup needed (uses Supabase project's email)
- **Used For**: Verification codes, status notifications, certificates
- **Rate Limit**: 100 emails/day for free tier (higher on paid)
- **Template**: Hardcoded in edge functions (no template system)

---

### Resend Email Service (Optional)
- **Configuration**: `RESEND_API_KEY` environment variable
- **Used For**: send-notification-email, transactional emails
- **API**: https://resend.com/docs
- **Status**: Available but not primary

---

### QR Code Generation
- **Library**: qrcode npm package (v1.5.3)
- **Used In**: generate-certificate function
- **Output**: Data URL (base64 PNG embedded in PDF)

---

### PDF Generation
- **Library**: pdf-lib npm package (v1.17.1)
- **Used In**: generate-certificate, generate-full-disclosure, generate-pdf
- **Features**: Text, images (QR codes), styling, multi-page

---

## Data Sources by Feature

### IP Submission Creation
1. **Frontend**: ProcessTrackingWizard.tsx collects data
2. **Files**: File upload → Supabase Storage (ip-documents bucket)
3. **Database**: INSERT ip_records (title, abstract, category, status, applicant_id)
4. **Trigger**: Auto-creates ip_documents rows for each file
5. **Email**: send-status-notification edge function notifies supervisor

---

### IP Review Workflow
1. **Frontend**: SupervisorDashboard queries ip_records (status = waiting_supervisor)
2. **Edit**: EditSubmissionModal updates status -> supervisor_approved|revision|rejected
3. **Database**: UPDATE ip_records status, supervisor_id
4. **Trigger**: Auto-sends email notification to applicant
5. **Next Step**: If approved, evaluator_assignments table populated by admin

---

### Evaluation Grading
1. **Frontend**: EvaluatorDashboard queries evaluator_assignments + related ip_records
2. **Submit**: Inline form POSTs to evaluations table
3. **Database**: INSERT evaluations (scores, decision, remarks)
4. **Impact**: IP record status updates -> evaluator_approved (if approved)
5. **Notify**: send-completion-notification if workflow complete

---

### Certificate Generation
1. **Trigger**: ApplicantDashboard CompletionButton calls generate-certificate function
2. **Function**:
   - Fetches ip_records + users data
   - Generates PDF with QR code
   - Uploads to generated-pdfs bucket
   - Stores metadata in generated_pdfs table
   - Returns tracking_id for public verification
3. **Download**: CertificateManager.tsx offers download link

---

### CMS Page Rendering
1. **Frontend**: CMSPageRenderer queries public_pages (slug match)
2. **Sections**: Fetches page_sections (filtered by page_id, ordered)
3. **Render**: PagePreviewRenderer maps section_type -> component
4. **Styling**: Applies Tailwind classes from styling JSON
5. **Navigation**: PublicNavigation fetches all public_pages for links

---

## Error Handling & Logging

### Errors Logged To
- Browser console (dev mode)
- Supabase logs (edge functions)
- Activity logs table (database operations)

### Response Patterns
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: "message" }`
- HTTP Status: 200 (success), 400 (bad request), 401 (auth), 500 (server error)

---

## Rate Limits & Quotas

| Service | Limit | Notes |
|---------|-------|-------|
| Supabase Email | 100/day (free) | Higher on paid plans |
| Supabase PostgREST | 1000 req/sec | Per project |
| Supabase Storage | 1 GB (free) | Per project |
| Edge Functions | 500 ms timeout | Deno runtime limit |
| File uploads | Max 5 MB (default) | Configurable in RLS |

---

**Last updated**: February 24, 2026
