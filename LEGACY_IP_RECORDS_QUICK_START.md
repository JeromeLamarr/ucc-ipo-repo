# Legacy IP Records - Quick Start Guide

## What Was Added?

A new admin-only feature has been added to the **All IP Records** page that allows administrators to manually encode and manage old/historical IP records separately from active workflow submissions.

## Key Features

### Two Separate Sections
The All IP Records page is now split into two distinct sections:

1. **Workflow IP Records** (top section)
   - Shows applicant-submitted IP records
   - Full workflow status tracking (Submitted, Waiting Supervisor, Approved, etc.)
   - Displays supervisor and evaluator assignments
   - Only shows records where `is_legacy_record = false`

2. **Legacy / Historical IP Records** (bottom section)
   - Shows manually added historical records
   - Visually distinguished with amber/orange styling
   - Shows legacy record source and original filing dates
   - Only shows records where `is_legacy_record = true`

### Admin Functions

#### Adding a Legacy Record
1. Scroll to the "Legacy / Historical IP Records" section
2. Click the "+ Add Legacy Record" button
3. Fill out a two-step form:
   - **Step 1:** IP Information (title, category, abstract, inventors, documents)
   - **Step 2:** Legacy Details (source, original filing date, IPOPHIL no., remarks)
4. Click "Create Record"

#### Managing Legacy Records
- **View:** Click "View" to see full record details
- **Filter:** Use independent search and filters for legacy records
- **Export:** Click "Export CSV" to export legacy records
- **Edit/Delete:** Coming soon (admin-only)

### Independent Filtering
Each section has its own:
- **Search bar**
- **Category filter** (Patent, Copyright, Trademark, etc.)
- **Status/Source filters**
- **CSV export**
- **Record count**

### Visual Indicators
- Legacy records display a **[🔖 LEGACY RECORD]** badge
- Hover over the badge to see a tooltip and source information
- Amber/orange color scheme distinguishes legacy section from workflow section

## What Didn't Change

✅ Workflow records are NOT affected
✅ Email notifications are NOT sent for legacy records
✅ Evaluator assignments do NOT apply to legacy records
✅ Approval analytics are NOT impacted
✅ Existing functionality remains unchanged

## Files Created

1. **Database Migration:** `supabase/migrations/20251229000000_add_legacy_records_support.sql`
   - Added 4 new columns: `is_legacy_record`, `legacy_source`, `digitized_at`, `created_by_admin_id`
   - Added database views for filtering
   - Added RLS policies for admin-only access

2. **Components:**
   - `src/components/AddLegacyRecordModal.tsx` - Two-step form for creating legacy records
   - `src/components/LegacyRecordBadge.tsx` - Visual badge for legacy records

3. **Updated Page:**
   - `src/pages/AllRecordsPage.tsx` - Split into two sections with independent filtering

4. **Documentation:**
   - `LEGACY_IP_RECORDS_IMPLEMENTATION.md` - Complete technical documentation
   - `LEGACY_IP_RECORDS_QUICK_START.md` - This file

## How to Apply the Migration

The database migration needs to be applied to enable the feature:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL migration file
```

## Permission Model

- **Admins only:** Can create, edit, delete legacy records
- **All users:** Can view legacy records (read-only)
- **Non-admins:** Cannot create legacy records

## Data Storage

Legacy records use the same `ip_records` table as workflow records, distinguished by:
- `is_legacy_record = true` for legacy records
- `is_legacy_record = false` for workflow records

## Tips for Using Legacy Records

1. **Original Filing Dates:** Use the original date the record was first submitted, not today's date
2. **Sources:** Select the appropriate source (Physical Archive, Email, Old System, etc.)
3. **Remarks:** Add any additional context about the record (e.g., "Scanned from 1998 folder")
4. **Bulk Imports:** Contact IT if you need to bulk import historical records
5. **Document Uploads:** You can upload supporting documents (PDFs, images, etc.)

## Troubleshooting

**Issue:** "Cannot create legacy record" error
- **Solution:** Ensure you're logged in as an admin user

**Issue:** Legacy records aren't showing
- **Solution:** Scroll down to the "Legacy / Historical IP Records" section (it's below the workflow records)

**Issue:** Search/filters not working
- **Solution:** Ensure you're using the correct filters for the section you're searching in (workflow filters are separate from legacy filters)

## Future Enhancements

Planned improvements:
- Bulk upload via CSV
- Edit functionality for existing legacy records
- Delete with audit trail
- Archive section for retired records
- OCR integration for automatic document parsing
- Advanced search with date ranges

## Support

For questions or issues with the Legacy IP Records feature, contact the IT department or refer to the full technical documentation in `LEGACY_IP_RECORDS_IMPLEMENTATION.md`.
