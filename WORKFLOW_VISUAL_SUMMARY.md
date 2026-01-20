# 📊 Academic Materials Workflow - Visual Summary

## 🎯 The Complete Workflow at a Glance

```
OVERALL SUBMISSION PROCESS
═════════════════════════════════════════════════════════════════════

Stage 1: SUBMISSION        ✓ COMPLETE
    Applicant submits IP record
         ↓

Stage 2: SUPERVISOR REVIEW ✓ COMPLETE  
    Supervisor approves/rejects
         ↓

Stage 3: EVALUATION        ✓ COMPLETE
    Evaluator assesses
         ↓

Stage 4: ACADEMIC MATERIALS ← YOU ARE HERE (NEW!)
    ┌─────────────────────────────────────────┐
    │ Admin: Request Materials                │
    │ Applicant: Upload Poster + Paper        │
    │ Admin: Review & Complete                │
    └─────────────────────────────────────────┘
         ↓

Stage 5: COMPLETION        ← NEXT
    Generate certificates & complete
         ↓

✓ DONE
```

---

## 🔄 The Four Phases In Detail

### **PHASE 1: ADMIN INITIATES** ⏱️ ~2 minutes
```
ADMIN DASHBOARD
│
├─ [All Records] page
├─ Find approved IP record
├─ Click to open detail
│
└─→ Submission Detail Page
    │
    └─→ ProcessTrackingWizard shows:
        • Submission ✓
        • Supervisor Review ✓
        • Evaluation ✓
        • Academic Presentation Materials ← HERE
        • Completion
    │
    └─→ Scroll down
    │
    └─→ [REQUEST PRESENTATION MATERIALS] section
        │
        ├─ Shows applicant info
        ├─ Shows record title
        │
        └─→ [Request Materials] button
            │
            └─→ CLICK!
                │
                ├─ Button: "Requesting..."
                ├─ Database: INSERT presentation_materials
                ├─ Set: status = 'requested'
                ├─ Set: materials_requested_at = NOW()
                ├─ Set: materials_requested_by = admin_id
                │
                └─→ ✓ Success!
                    ├─ Status: "Materials Requested"
                    ├─ Timestamp: "Jan 20, 2026 @ 2:30 PM"
                    ├─ Button: DISABLED (grayed out)
                    └─ Email: Sent to applicant (optional)
```

### **PHASE 2: APPLICANT RECEIVES** ⏱️ ~5-30 minutes
```
APPLICANT INBOX
│
├─ Email: "Presentation Materials Requested"
│  ├─ Record title
│  ├─ Dashboard link
│  ├─ Required files list
│  ├─ Deadline (10 business days)
│  └─ [View on Dashboard] link
│
└─→ Applicant logs in
    │
    ├─ Dashboard: "My Submissions"
    │  ├─ Sees record with badge: "Awaiting Materials" (yellow)
    │  └─ Clicks record
    │
    └─→ Submission Detail Page
        │
        └─→ Scroll down
        │
        └─→ [UPLOAD PRESENTATION MATERIALS] section
            │
            ├─ Status indicator: "Materials Requested ✓"
            ├─ Deadline: "13 days remaining"
            ├─ What is IMRaD? (info box)
            │
            └─→ Two upload zones:
                ├─ 📊 SCIENTIFIC POSTER (JPG/PNG, 10MB max)
                │  └─ [Drag & Drop or Click to Select]
                │
                └─ 📄 IMRAD SHORT PAPER (PDF/DOCX, 5MB max)
                   └─ [Drag & Drop or Click to Select]
```

### **PHASE 3: APPLICANT UPLOADS** ⏱️ ~5 minutes
```
APPLICANT UPLOADS FILES
│
├─ Clicks Poster zone
│  ├─ File picker opens
│  ├─ Selects: poster.png (2.5MB)
│  │
│  └─→ Validation:
│      ├─ File type: image/png ✓
│      ├─ File size: 2.5MB < 10MB ✓
│      │
│      └─→ File appears:
│          "✓ poster.png - 2.5MB"
│
├─ Clicks Paper zone
│  ├─ File picker opens
│  ├─ Selects: paper.pdf (3.8MB)
│  │
│  └─→ Validation:
│      ├─ File type: application/pdf ✓
│      ├─ File size: 3.8MB < 5MB ✓
│      │
│      └─→ File appears:
│          "✓ paper.pdf - 3.8MB"
│
└─→ Both files selected
    │
    └─→ [Submit Materials] button ENABLES (turns blue)
        │
        └─→ Applicant clicks!
            │
            ├─ Button: "Uploading... 0%"
            ├─ Upload poster to storage
            │  └─ presentations/{record-id}/poster-123.png
            ├─ Upload paper to storage
            │  └─ presentations/{record-id}/paper-456.pdf
            │
            ├─ Progress: "Uploading... 50%"
            ├─ Files uploaded ✓
            │
            ├─ Database UPDATE:
            │  ├─ status = 'submitted'
            │  ├─ materials_submitted_at = NOW()
            │  ├─ submitted_by = applicant_id
            │  ├─ poster_file_url = https://...poster.png
            │  ├─ poster_file_name = poster.png
            │  ├─ poster_file_size = 2621440
            │  ├─ paper_file_url = https://...paper.pdf
            │  ├─ paper_file_name = paper.pdf
            │  └─ paper_file_size = 3981312
            │
            └─→ ✓ Success!
                ├─ Message: "Materials submitted successfully!"
                ├─ Files now show: [Download] links
                ├─ Button: "✓ Submitted" (disabled)
                └─ fetchSubmissionDetails() called
```

### **PHASE 4: ADMIN COMPLETES** ⏱️ ~5 minutes
```
ADMIN DASHBOARD
│
├─ Refreshes page OR
├─ Navigates back to record
│
└─→ Submission Detail Page
    │
    └─→ [REQUEST PRESENTATION MATERIALS] section
        │
        ├─ Status: "Materials Submitted ✓"
        ├─ Submitted: "Jan 20, 2026 @ 3:45 PM"
        ├─ Submitted by: "John Doe"
        │
        ├─ Files:
        │  ├─ ✓ poster.png (2.5MB) [Download]
        │  └─ ✓ paper.pdf (3.8MB) [Download]
        │
        └─ [Request Materials] button: DISABLED
    │
    ├─ Scroll down to [ADMIN ACTIONS]
    │
    └─→ BEFORE materials:
        └─ [Mark as Completed] ← DISABLED (gray)
           └─ ⚠️  Materials must be submitted first
    │
    └─→ AFTER materials:
        └─ [Mark as Completed] ← ENABLED (blue)
           └─ ✓ All materials submitted
    │
    └─→ Admin clicks [Mark as Completed]!
        │
        ├─ Button: "Marking complete..."
        ├─ Update ip_records:
        │  ├─ status = 'completed'
        │  ├─ current_stage = 'completion'
        │  └─ updated_at = NOW()
        ├─ Create activity_logs entry
        ├─ Update process_tracking
        ├─ Email sent to applicant (optional)
        │
        └─→ ✓ Success!
            ├─ Status: "Completed" ✓
            ├─ ProcessTrackingWizard advances
            ├─ Next stage unlocked
            └─ Can generate certificates
```

---

## 📈 Status Progression

```
INITIAL STATE (Not Requested)
└─ No materials record exists
└─ No upload form visible
└─ No request possible yet

        ↓ [Admin clicks Request]

REQUESTED STATE
├─ presentation_materials record created
├─ status = 'requested'
├─ materials_requested_at = timestamp
├─ Admin button: DISABLED
├─ Applicant sees upload form
├─ 10-day deadline timer starts
└─ Email sent to applicant

        ↓ [Applicant uploads & submits]

SUBMITTED STATE
├─ File URLs stored
├─ status = 'submitted'
├─ materials_submitted_at = timestamp
├─ Admin sees files
├─ [Download] links appear
├─ Admin [Mark as Completed] ENABLED
└─ Applicant sees success

        ↓ [Admin marks complete]

COMPLETED STATE
├─ IP record status = 'completed'
├─ current_stage = 'completion'
├─ Workflow advances to next stage
├─ Certificates can be generated
└─ Gating rules satisfied
```

---

## 🔐 Security & Access Control

```
ROLE-BASED ACCESS
═════════════════════════════════════════════

ADMIN USER
├─ Can see: All presentation_materials records
├─ Can do:
│  ├─ Request materials (button available)
│  ├─ View submissions
│  ├─ Download files
│  ├─ Mark as completed
│  └─ Reject/resubmit
└─ Cannot: Upload files as applicant

APPLICANT USER  
├─ Can see: Own presentation_materials only
├─ Can do:
│  ├─ Upload files (when status='requested')
│  ├─ View own deadline
│  └─ Download own files
└─ Cannot: Request from others, modify other records

UNAUTHENTICATED
├─ Can see: Nothing
└─ Cannot: Access any materials
```

---

## 💾 Data Storage

```
DATABASE (Supabase PostgreSQL)
═════════════════════════════════════════════

presentation_materials table:
├─ id: UUID (primary key)
├─ ip_record_id: UUID (foreign key to ip_records)
├─ status: 'not_requested' | 'requested' | 'submitted' | 'rejected'
├─ materials_requested_at: TIMESTAMP
├─ materials_requested_by: UUID (admin)
├─ materials_submitted_at: TIMESTAMP
├─ submitted_by: UUID (applicant)
├─ poster_file_url: STRING
├─ poster_file_name: STRING
├─ poster_file_size: BIGINT
├─ paper_file_url: STRING
├─ paper_file_name: STRING
├─ paper_file_size: BIGINT
├─ created_at: TIMESTAMP
└─ updated_at: TIMESTAMP

STORAGE (Supabase Storage)
═════════════════════════════════════════════

presentation-materials/ (bucket)
├─ presentations/
│  └─ {record-id}/
│     ├─ poster-123456.png
│     └─ paper-123456.pdf
```

---

## 🔄 Data Flow Diagram

```
┌────────────────────────────┐
│   ADMIN UI                 │
│ MaterialsRequestAction     │
└────────┬───────────────────┘
         │
         │ Click "Request Materials"
         ↓
┌────────────────────────────┐
│   materialsService         │
│   requestMaterials()       │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│   Supabase Database        │
│   presentation_materials   │
│   (INSERT/UPDATE)          │
└────────┬───────────────────┘
         │
         ├─→ activity_logs (audit)
         ├─→ process_tracking (stage)
         └─→ ip_records (timestamps)

════════════════════════════════════════════════

┌────────────────────────────┐
│   APPLICANT UI             │
│ MaterialsSubmissionForm    │
└────────┬───────────────────┘
         │
         │ Select files
         ↓
┌────────────────────────────┐
│   Client-side Validation   │
│   - Check file types       │
│   - Check file sizes       │
└────────┬───────────────────┘
         │
         │ Files valid
         ↓
┌────────────────────────────┐
│   Supabase Storage         │
│   Upload to bucket         │
└────────┬───────────────────┘
         │
         │ Files stored
         ↓
┌────────────────────────────┐
│   materialsService         │
│   submitMaterials()        │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│   Supabase Database        │
│   presentation_materials   │
│   (UPDATE with URLs)       │
└────────┬───────────────────┘
         │
         ├─→ activity_logs (audit)
         └─→ ip_records (timestamps)
```

---

## ✅ Complete Testing Checklist

```
PHASE 1: ADMIN REQUEST
□ Admin sees "Request Materials" button
□ Button click works
□ Loading state appears
□ Database record created
□ Status updates to "Requested"
□ Button disables
□ Timestamp shows correctly

PHASE 2: APPLICANT RECEIVES
□ Applicant sees upload form
□ Deadline timer appears
□ IMRaD info displayed
□ Two upload zones visible

PHASE 3: APPLICANT UPLOADS
□ Can select poster file (JPG/PNG)
□ Poster validation works
□ Can select paper file (PDF/DOCX)
□ Paper validation works
□ Submit button enables with both files
□ Upload progress shows
□ Files appear in storage bucket
□ Database updates with file URLs
□ Success message appears

PHASE 4: ADMIN COMPLETES
□ Admin sees submitted files
□ Download links work
□ "Mark as Completed" button now enabled
□ Button click works
□ Status updates to "Completed"
□ Workflow advances to next stage
□ Can generate certificates

SECURITY
□ Applicants only see own records
□ Admins see all records
□ RLS policies enforced
□ File downloads secured

AUDIT & LOGGING
□ activity_logs created for actions
□ process_tracking updated
□ Timestamps recorded
□ User IDs logged
```

---

## 🎬 Real-World Scenario

```
TIMELINE OF REAL SUBMISSION

Jan 20, 2:30 PM
├─ Admin requests materials for "Solar Panel Tech"
└─ Status: requested

Jan 20, 2:35 PM
├─ Applicant receives email
└─ Sees: "Materials requested"

Jan 20, 3:00 PM
├─ Applicant opens dashboard
├─ Clicks on awaiting record
├─ Uploads poster.png
├─ Uploads paper.pdf
└─ Clicks "Submit Materials"

Jan 20, 3:05 PM
├─ Files uploaded to storage
├─ Database updated: status = submitted
└─ Applicant sees: "✓ Submitted"

Jan 20, 3:30 PM
├─ Admin refreshes page
├─ Sees: Files submitted
├─ Reviews files (downloads if needed)
└─ Clicks "Mark as Completed"

Jan 20, 3:32 PM
├─ Status: Completed ✓
├─ Stage progresses to "Completion"
├─ Can generate certificates
└─ Workflow complete!
```

---

## 🚀 Go/No-Go Decision

**READY FOR LIVE TESTING** when:
✅ Components render correctly  
✅ Admin can request  
✅ Applicant can upload  
✅ Files store properly  
✅ Status updates work  
✅ No console errors  
✅ RLS policies enforced  

**READY FOR PRODUCTION** when:
✅ All live tests pass  
✅ Real users tested  
✅ Edge cases handled  
✅ Performance acceptable  
✅ Support trained  
✅ Rollback plan ready  

---

**Status: READY FOR LIVE TESTING** 🚀

Next step: Follow [LIVE_TESTING_QUICK_GUIDE.md](LIVE_TESTING_QUICK_GUIDE.md)
