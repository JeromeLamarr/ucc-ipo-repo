# Legacy IP Records Feature Implementation

## Overview
A new ADMIN-ONLY feature called "Legacy IP Records" has been added to the Admin > All IP Records page. This feature allows admins to manually encode old/historical IP records without mixing them with active workflow submissions.

## What Was Implemented

### 1. Database Migration
**File:** `supabase/migrations/20251229000000_add_legacy_records_support.sql`

Added the following columns to the `ip_records` table:
- `is_legacy_record` (BOOLEAN, DEFAULT false) - Identifies whether a record is legacy
- `legacy_source` (TEXT) - Source of the legacy record (Physical Archive, Email, Old System, Database Migration, Manual Entry, Other)
- `digitized_at` (TIMESTAMPTZ) - When the record was digitized/added
- `created_by_admin_id` (UUID) - References the admin who created the legacy record

Added the following:
- Indexes for efficient querying:
  - `idx_ip_records_is_legacy` - For filtering by legacy status
  - `idx_ip_records_legacy_source` - For filtering by source
  - `idx_ip_records_created_by_admin` - For tracking admin-created records

- Constraint `check_legacy_fields_consistency` - Ensures that legacy fields are only set when `is_legacy_record = true`

- Views for convenience:
  - `workflow_ip_records` - Shows only workflow records (is_legacy_record = false)
  - `legacy_ip_records` - Shows only legacy records (is_legacy_record = true)

- RLS (Row-Level Security) Policies:
  - `admins_can_create_legacy_records` - Only admins can create legacy records
  - `admins_can_update_legacy_records` - Only the admin who created the record can update it
  - `admins_can_delete_legacy_records` - Only admins can delete legacy records
  - `anyone_can_view_legacy_records` - Everyone can view legacy records (read-only for non-admins)

### 2. Frontend Components

#### A. AddLegacyRecordModal Component
**File:** `src/components/AddLegacyRecordModal.tsx`

A two-step modal form for creating legacy records:

**Step 1: IP Information**
- IP Title (required)
- Category (Patent, Copyright, Trademark, Industrial Design, Utility Model, Other)
- Abstract / Description
- Inventors / Authors section:
  - Name (required)
  - Affiliation
  - Contribution
  - Ability to add/remove multiple inventors
- Document Upload:
  - Support for PDF, DOC, DOCX, Images
  - File upload to Supabase Storage
  - Document tracking in database

**Step 2: Legacy Record Details** (Admin-only fields)
- Record Source (dropdown):
  - Physical Archive
  - Email
  - Old System
  - Database Migration
  - Manual Entry
  - Other
- Original Filing Date (required, date picker)
- IPOPHIL Application No. (optional)
- Remarks / Notes (optional)

Features:
- Form validation at each step
- Error handling and user feedback
- Automatic file uploads to Supabase Storage (`ip_documents` bucket)
- Document metadata tracking (file name, path, mime type, size)
- Sets `is_legacy_record = true` and `status = 'completed'` automatically
- No email notifications sent
- No workflow triggers

#### B. LegacyRecordBadge Component
**File:** `src/components/LegacyRecordBadge.tsx`

A reusable badge component that displays on legacy record rows:
- Visual indicator: `[🔖 LEGACY RECORD]`
- Amber/gold styling to distinguish from workflow records
- Tooltip on hover: "This record was manually digitized by the IP Office."
- Optional source information in tooltip

### 3. Updated AllRecordsPage
**File:** `src/pages/AllRecordsPage.tsx`

Complete restructuring into two separate sections:

#### SECTION A: Workflow IP Records
- **Header:** "Workflow IP Records"
- **Subheader:** "Applicant-submitted IP records with workflow status tracking"
- **Filters:** Independent for this section
  - Search bar (by title or applicant)
  - Status filter (All Statuses, Submitted, Waiting Supervisor, etc.)
  - Category filter (Patent, Copyright, Trademark, etc.)
- **Columns:**
  - Title
  - Applicant (with email)
  - Category
  - Status (with colored badges)
  - Supervisor
  - Evaluator
  - Created Date
  - Actions (View)
- **Features:**
  - Export to CSV
  - Shows count: "Workflow: X of Y"
  - Only displays records where `is_legacy_record = false`

#### SECTION B: Legacy / Historical IP Records
- **Header:** "Legacy / Historical IP Records"
- **Subheader:** "Manually digitized historical IP submissions from archives, emails, and legacy systems"
- **Disclaimer Box:**
  - Icon: 📋
  - Message: "Legacy records are historical IP submissions digitized for record-keeping purposes only. These records do not follow the standard workflow process."
- **Button:** "+ Add Legacy Record" (Opens the AddLegacyRecordModal)
- **Filters:** Independent for this section
  - Search bar (by title or inventor name)
  - Category filter
  - Source filter (Physical Archive, Email, Old System, Database Migration, Manual Entry, Other)
- **Columns:**
  - Title (with Legacy Record Badge)
  - Inventor / Author
  - Category
  - Original Filing Date
  - IPOPHIL Application No.
  - Source
  - Actions (View)
- **Features:**
  - Export to CSV (separate from workflow records)
  - Shows count: "Legacy: X of Y"
  - Only displays records where `is_legacy_record = true`
  - Visual distinction with amber/orange background gradient

### 4. Key Features

#### Data Separation
- Workflow records and legacy records are completely separated in the UI
- Each section has independent:
  - Search functionality
  - Filters
  - Pagination (if added later)
  - Export functionality

#### Security
- Row-Level Security (RLS) policies ensure:
  - Only admins can create legacy records
  - Only admins can edit/delete legacy records
  - All users can view legacy records (read-only)
- `created_by_admin_id` field tracks who created each legacy record

#### Workflow Protection
- Legacy records do NOT:
  - Trigger applicant workflows
  - Send email notifications
  - Affect evaluator assignments
  - Impact approval analytics or workflow counts
- Legacy records automatically set `status = 'completed'` when created

#### User Experience
- Legacy Record Badge clearly identifies each legacy record
- Tooltip provides context: "This record was manually digitized by the IP Office."
- Disclaimer text explains the purpose of legacy records
- Separate sections with different visual styling (amber/gold for legacy)
- "+ Add Legacy Record" button is easily accessible
- All fields are clearly labeled as "Admin-only" in the form

## Usage Instructions

### For Admins: Creating a Legacy Record

1. Navigate to Admin Dashboard → All IP Records
2. Scroll to the "Legacy / Historical IP Records" section
3. Click "+ Add Legacy Record"
4. **Step 1:** Fill in IP Information
   - Enter IP Title
   - Select Category
   - Add Abstract/Description (optional)
   - Add Inventor(s) with their details
   - Upload supporting documents (optional)
5. **Step 2:** Fill in Legacy Record Details
   - Select Record Source
   - Enter Original Filing Date
   - Enter IPOPHIL Application No. (optional)
   - Add Remarks (optional)
6. Click "Create Record"

### For Admins: Viewing Legacy Records

1. Navigate to Admin Dashboard → All IP Records
2. Scroll to the "Legacy / Historical IP Records" section
3. Use filters to find specific records:
   - Search by title or inventor name
   - Filter by category
   - Filter by source
4. Click "View" to see full record details
5. Use "Export CSV" to export legacy records

### For All Users

- Legacy records are visible in the "Legacy / Historical IP Records" section
- All legacy records display the [LEGACY RECORD] badge
- Legacy records are read-only (cannot be edited or deleted by non-admins)

## Technical Details

### Database Queries

Separate views are available for queries:
```sql
-- Get all workflow records
SELECT * FROM workflow_ip_records;

-- Get all legacy records
SELECT * FROM legacy_ip_records;

-- Get legacy records by source
SELECT * FROM legacy_ip_records WHERE legacy_source = 'Physical Archive';
```

### API Integration

The feature uses existing Supabase APIs:
- `ip_records` table for CRUD operations
- `ip_documents` storage bucket for file uploads
- RLS policies for access control

### Files Created/Modified

**Created:**
1. `supabase/migrations/20251229000000_add_legacy_records_support.sql` - Database migration
2. `src/components/AddLegacyRecordModal.tsx` - Legacy record creation form
3. `src/components/LegacyRecordBadge.tsx` - Badge component
4. `LEGACY_IP_RECORDS_IMPLEMENTATION.md` - This documentation

**Modified:**
1. `src/pages/AllRecordsPage.tsx` - Split into two sections

## Future Enhancements

Potential improvements for future iterations:
1. Bulk upload of legacy records via CSV
2. Edit functionality for legacy records
3. Legacy record deletion with audit trail
4. Archived records section
5. Legacy record search/advanced filtering
6. Bulk operations (delete, export) for selected records
7. Integration with document OCR for automatic data extraction

## Testing Checklist

- [ ] Database migration applies successfully
- [ ] Admin can create a legacy record
- [ ] Legacy record appears in the Legacy section (not Workflow)
- [ ] Workflow records and legacy records are properly separated
- [ ] Search filters work independently for each section
- [ ] Category filter works for legacy records
- [ ] Source filter works for legacy records
- [ ] Legacy Record Badge displays correctly
- [ ] Tooltip shows on badge hover
- [ ] Files can be uploaded and downloaded
- [ ] CSV export works for both sections
- [ ] Non-admins cannot create legacy records
- [ ] Legacy records are read-only for non-admins
- [ ] Disclaimer text displays correctly
- [ ] "+ Add Legacy Record" button opens modal
- [ ] Modal validation works correctly
- [ ] Page counts update correctly

## Notes

- The feature is fully backward compatible with existing workflow records
- Legacy records use the same `ip_records` table but are filtered using the `is_legacy_record` flag
- The constraint `check_legacy_fields_consistency` ensures data integrity
- All legacy records automatically get a digitization timestamp
- The feature respects existing RLS policies while adding new admin-only policies
