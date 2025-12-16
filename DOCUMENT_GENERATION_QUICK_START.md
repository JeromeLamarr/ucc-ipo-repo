# Document Generation Feature - Quick Start Guide

## What You Now Have

Your IP management system now has a fully functional document generation feature in the "Legal Preparation" stage that allows you to automatically generate professional IP documentation from submission data.

## Quick Start - 5 Minute Setup

### Step 1: Deploy Edge Functions (2 minutes)

In your Supabase project, deploy the two edge functions:

**Option A: Using Supabase CLI**
```bash
cd supabase
supabase functions deploy generate-documentation
supabase functions deploy generate-disclosure
```

**Option B: Manual Deployment**
1. Go to Supabase Dashboard → Functions
2. Create new function: `generate-documentation`
   - Copy code from: `supabase/functions/generate-documentation/index.ts`
3. Create new function: `generate-disclosure`
   - Copy code from: `supabase/functions/generate-disclosure/index.ts`

### Step 2: Create Storage Bucket (1 minute)

In Supabase Dashboard:
1. Go to Storage
2. Create new bucket: `generated-documents`
3. Set Public (or configure RLS policies as needed)

### Step 3: Create Database Table (1 minute)

Run this SQL in Supabase SQL Editor:
```sql
CREATE TABLE submission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id),
  document_type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  generated_file_path TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE submission_documents ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own documents
CREATE POLICY "Users can view their submission documents"
  ON submission_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = submission_documents.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

### Step 4: Test It (1 minute)

1. Navigate to any submission detail page
2. Scroll down to find the "Document Generator" section
3. Click "Generate Full Documentation"
4. Wait for success message
5. Click "Download" to get the HTML file

## What Each Document Type Contains

### Full Documentation
**Best for**: Complete record keeping, sharing with stakeholders

Contains:
- ✓ Full applicant information
- ✓ All inventors/collaborators with roles
- ✓ Complete title, abstract, description
- ✓ Keywords as tags
- ✓ All uploaded documents/evidence
- ✓ Complete metadata and timestamps
- ✓ Professional formatting

### Full Disclosure
**Best for**: Legal filing, patent offices, regulatory submission

Contains:
- ✓ Formal disclosure statement header
- ✓ Inventor information with contact details
- ✓ Detailed technical description
- ✓ Technical field and background
- ✓ Problem statement and solution
- ✓ Advantages and commercial potential
- ✓ Date conceived and first reduced to practice
- ✓ Funding information
- ✓ Inventors contribution table
- ✓ Signature blocks
- ✓ Legal acknowledgment language
- ✓ Confidentiality footer

## Common Use Cases

### Use Case 1: Applicant Preparing for Filing
```
1. Submit application
2. Wait for supervisor approval
3. View submission detail page
4. Generate Full Disclosure
5. Download and review
6. Submit to patent office
```

### Use Case 2: Admin Batch Processing
```
1. Go to Admin Dashboard
2. Select multiple approved submissions
3. View each submission details
4. Generate both documents for each
5. Download all for archival
```

### Use Case 3: Legal Review
```
1. Navigate to submission
2. Generate Full Documentation
3. Download and review with legal team
4. Make any needed corrections
5. Re-generate if changes made
6. Archive final version
```

## File Management

### Where Documents Are Stored
All generated documents are stored in Supabase Storage:
```
generated-documents/
├── {submission-id}/
│   ├── {submission-id}_full_documentation_timestamp.html
│   └── {submission-id}_full_disclosure_timestamp.html
```

### How to Access Generated Documents
**Through UI (Easiest)**:
1. Open submission in app
2. Scroll to Document Generator
3. Click Download next to document

**Through Supabase Storage (Advanced)**:
1. Go to Supabase Dashboard → Storage
2. Navigate to `generated-documents` bucket
3. Find your submission ID folder
4. Download HTML files directly

**Through Browser DevTools (Debug)**:
1. Open Document Generator in browser
2. Open DevTools (F12) → Console
3. Look for network requests to storage endpoint
4. Get file URL from response

## Customizing Documents

### Modifying Document Templates

To customize what appears in documents, edit the HTML generation functions:

**For Full Documentation**: 
- File: `supabase/functions/generate-documentation/index.ts`
- Function: `generateFullDocumentationHTML(record)`
- Modify the HTML template returned

**For Full Disclosure**:
- File: `supabase/functions/generate-disclosure/index.ts`
- Function: `generateFullDisclosureHTML(record)`
- Modify the HTML template returned

### Adding Institution Logo/Branding

Edit the HTML templates and add:
```html
<div class="header">
  <img src="your-logo-url" alt="Institution Logo">
  <h1>Your Institution Name</h1>
</div>
```

### Changing Colors

Modify the CSS in the `<style>` section:
```css
/* Change primary color from blue to your color */
h1, h2 { color: #your-color-here; }
th { background-color: #your-color-here; }
```

## Troubleshooting

### "Failed to generate documentation"

**Symptom**: Error message when clicking Generate button

**Fix**:
1. Verify edge functions are deployed: `supabase functions list`
2. Check edge function logs in Supabase Dashboard
3. Ensure storage bucket exists and is accessible

### "Download not working"

**Symptom**: Click Download but nothing happens

**Fix**:
1. Check browser console for errors (F12)
2. Verify storage bucket RLS allows access
3. Try right-click → Save As on download button

### "No documents appearing"

**Symptom**: Generated document doesn't show in list

**Fix**:
1. Check submission_documents table has records
2. Verify RLS policies allow the user to see their records
3. Refresh page manually
4. Check browser console for API errors

### "Generated document looks wrong"

**Symptom**: HTML file has incorrect formatting or missing data

**Fix**:
1. Check that record has complete data (especially details field)
2. Verify inventors array is properly formatted
3. Check CSS styling in edge function
4. Test with different record to isolate issue

## Performance Tips

### For Large Submissions
- Generation typically takes 1-3 seconds
- Larger documents may take longer
- Large file uploads increase processing time

### Optimize For Speed
1. Ensure only essential documents are uploaded
2. Reduce image file sizes before upload
3. Avoid very large text descriptions
4. Regular cleanup of old generated documents

## Security Considerations

### Document Access Control
- Only applicants can see their own documents
- Admins can see all documents
- Evaluators can see assigned submissions
- Change RLS policies as needed

### Storage Security
- Documents stored in private bucket by default
- Consider time-based expiry for sensitive documents
- Archive old documents separately
- Regular backup of important documents

### Sensitive Data
- Documents contain personal information
- Ensure proper access controls
- Consider encryption for sensitive submissions
- Audit document access regularly

## Advanced Features

### Scheduled Generation
To auto-generate documents on approval:
1. Create trigger in PostgreSQL
2. Call edge function via webhook
3. Automatically generate when status changes

Example:
```sql
CREATE TRIGGER auto_generate_documents
AFTER UPDATE ON ip_records
WHEN NEW.status = 'evaluator_approved'
EXECUTE FUNCTION trigger_document_generation();
```

### Batch Download
To download multiple documents:
1. Use API to list documents
2. Download via cloud storage API
3. Create ZIP file on client
4. Download all at once

### Email Integration
To email documents:
1. Use Resend API (already integrated)
2. Create email template
3. Call from edge function
4. Send to applicant automatically

## API Reference

### Generate Documentation Endpoint

**POST** `/functions/v1/generate-documentation`

**Request**:
```json
{
  "recordId": "uuid",
  "documentType": "full_documentation"
}
```

**Response**:
```json
{
  "success": true,
  "filePath": "recordId/recordId_full_documentation_timestamp.html",
  "message": "Full documentation generated successfully"
}
```

### Generate Disclosure Endpoint

**POST** `/functions/v1/generate-disclosure`

**Request**:
```json
{
  "recordId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "filePath": "recordId/recordId_full_disclosure_timestamp.html",
  "message": "Full disclosure generated successfully"
}
```

## Next Steps

1. ✅ Deploy edge functions
2. ✅ Create storage bucket
3. ✅ Run SQL migration
4. ✅ Test document generation
5. ✓ Download and review sample documents
6. ✓ Customize templates if needed
7. ✓ Configure access controls
8. ✓ Train users on feature

## Support Resources

- **Component Code**: `src/components/DocumentGenerator.tsx`
- **Edge Function Code**: `supabase/functions/generate-*/index.ts`
- **Database Schema**: `supabase/migrations/20251216_create_document_system.sql`
- **Full Documentation**: `DOCUMENT_GENERATION_IMPLEMENTATION.md`
- **Visual Guide**: `DOCUMENT_GENERATION_VISUAL_SUMMARY.md`

## Need Help?

Check these files for detailed information:
1. `DOCUMENT_GENERATION_IMPLEMENTATION.md` - Complete technical details
2. `DOCUMENT_GENERATION_VISUAL_SUMMARY.md` - Visual architecture overview
3. Edge function code - Inline comments explain each step
4. Component code - React component with detailed comments

---

**Congratulations!** Your Legal Preparation stage now has professional document generation. Users can generate, download, and archive official IP documentation directly from your system.
