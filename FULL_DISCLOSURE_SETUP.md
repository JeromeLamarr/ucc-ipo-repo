# Full Disclosure System - Setup & Testing Guide

## Next Steps to Activate

### Step 1: Apply Database Migration (REQUIRED)
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Open file: `supabase/migrations/20251227_create_full_disclosures_table.sql`
5. Copy all SQL content
6. Paste into Supabase SQL Editor
7. Click **Run**
8. Verify success - you should see confirmation messages

### Step 2: Create Storage Bucket (REQUIRED)
1. Go to Supabase Dashboard > **Storage** > **Buckets**
2. Click **New Bucket**
3. Name: `disclosures`
4. Toggle **Public bucket** ON (needed for PDF download links)
5. Click **Create**

Optional: Set file size limits if desired

### Step 3: Verify Integration
Check that the component appears in your submission detail page:
- Navigate to any IP submission in "ready_for_filing" or "completed" status
- You should see both:
  - **Certificate Manager** section (existing)
  - **Full Disclosure Manager** section (new)
- Both should have similar styling and layout

## Testing Full Workflow

### Test 1: Generate Disclosure (Admin/Supervisor)
1. Go to a completed/filed submission
2. Scroll to "Full Disclosure" section
3. Click **Generate Disclosure** button
4. Wait for generation to complete
5. Verify success message appears

### Test 2: Verify PDF Quality
1. After generation, click **Download** button
2. Open the PDF in your browser or PDF reader
3. Check these elements:
   - ✅ Professional gold border with corner ornaments
   - ✅ Red "FULL DISCLOSURE RECORD" header
   - ✅ Blue-accented title box
   - ✅ All applicant information
   - ✅ All IP details (title, category, status, etc)
   - ✅ Evaluation summary section
   - ✅ Confidentiality notice at bottom
   - ✅ QR code in bottom right
   - ✅ Issue date and reference number in footer
   - ✅ UCC logo watermark (subtle, background)

### Test 3: Regenerate Disclosure
1. Click **Regenerate** button
2. Confirm in dialog
3. Wait for regeneration
4. Verify timestamp updated
5. Download and compare with previous PDF

### Test 4: Email Notification
1. Generate or regenerate disclosure
2. Click **Email to Applicant** button
3. Check applicant's email inbox
4. Verify professional email with disclosure link/notification

### Test 5: Applicant Download
1. Log in as the applicant (IP creator)
2. Navigate to their submission
3. Scroll to "Full Disclosure" section
4. Should see "Full Disclosure Available" card
5. Click **Download** button
6. Verify PDF downloads

## Debugging Tips

### If PDF doesn't generate:
- Check browser console for errors (F12 > Console)
- Check Supabase Function Logs:
  - Go to Supabase > Functions > generate-full-disclosure
  - Look at recent logs for error messages
- Verify storage bucket `disclosures` exists and is public
- Check that database migration was applied correctly

### If QR code doesn't appear:
- Verify QRCode library is available in edge function runtime
- Check console logs for "Could not embed QR code" warning
- PDF still generates fine, QR is optional

### If watermark doesn't appear:
- Verify `ucc_logo.png` exists in `assets` storage bucket
- Check function logs for watermark loading errors
- This is optional - PDF generates fine without it

### If email doesn't send:
- Check if `send-notification-email` edge function is working
- Verify applicant email is correct in database
- Check Resend dashboard for email delivery status

## Performance Notes

### File Size
- Typical PDF: 100-200 KB (small, fast download)
- Depends on evaluation count and content length

### Generation Time
- Usually < 5 seconds
- Slower if server is under heavy load
- UI shows loading spinner during generation

### Storage
- Recommend monthly cleanup of old disclosures
- Can set Supabase storage lifecycle policies

## Security Reminders

- PDFs contain sensitive disclosure information
- Only store in private applications
- RLS policies restrict access to authenticated users
- QR verification link goes to public page
- Consider adding password protection for extra security

## Comparison with Certificates

| Feature | Certificates | Full Disclosure |
|---------|-------------|-----------------|
| Purpose | Recognition | Transparency |
| Access | Admin generate, Applicant view | Admin generate, Applicant view |
| Content | Achievement details | Compliance details |
| Banner | Gold decorative | Red confidential |
| QR Code | ✅ Yes | ✅ Yes |
| Watermark | ✅ Yes | ✅ Yes |
| Email Send | ✅ Yes | ✅ Yes |
| Regenerate | ✅ Yes | ✅ Yes |
| Database Track | ✅ certificates table | ✅ full_disclosures table |

## API Endpoints

### Generate Full Disclosure
```
POST /functions/v1/generate-full-disclosure

Request:
{
  "record_id": "uuid-or-id",
  "user_id": "current-user-uuid"
}

Response:
{
  "success": true,
  "disclosure": {
    "pdf_url": "https://...",
    "file_path": "disclosure_...",
    "file_size": 123456
  }
}
```

## File Locations

- **Component:** `src/components/FullDisclosureManager.tsx`
- **Edge Function:** `supabase/functions/generate-full-disclosure/index.ts`
- **Database:** `supabase/migrations/20251227_create_full_disclosures_table.sql`
- **Integration:** `src/pages/SubmissionDetailPage.tsx`
- **Docs:** `FULL_DISCLOSURE_IMPLEMENTATION.md` (this file)

## Support & Troubleshooting

If you encounter issues:
1. Check function logs in Supabase dashboard
2. Verify database migration was applied
3. Verify storage bucket was created
4. Check browser console for client-side errors
5. Review edge function error responses
6. Ensure record status is "ready_for_filing" or "completed"

## Next Features (Optional)

- Add bulk generation for multiple records
- Add PDF signing capability
- Add password protection
- Add archival policies
- Add audit logging
- Add export to Word format
