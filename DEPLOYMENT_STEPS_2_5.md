# ✅ Document Generation Deployment - Steps 2-5

## ✅ STEP 1: COMPLETE ✓
**Edge Functions Deployed Successfully!**
- ✓ generate-documentation deployed
- ✓ generate-disclosure deployed

---

## STEP 2: Create Storage Bucket

### Option A: Using SQL (Recommended - Fastest)

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard/projects
   - Select your project: `bolt-native-database-60230247`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run the SQL**
   - Open file: `CREATE_STORAGE_BUCKET.sql` in your project
   - Copy all the SQL code
   - Paste into Supabase SQL Editor
   - Click "Run" (▶ button)
   - You should see: "Success. No rows returned"

**What this does:**
- Creates `generated-documents` bucket
- Sets up RLS (Row Level Security) policies
- Allows users to access their own documents
- Allows edge functions to upload files

### Option B: Using Supabase Dashboard (UI)

1. Go to Storage tab
2. Click "Create New Bucket"
3. Name: `generated-documents`
4. Choose: Public or Private (Private recommended for security)
5. Click "Create bucket"
6. Then run the SQL above to add RLS policies

**Status**: Should complete in < 1 minute

---

## STEP 3: Run Database Migration

### Create submission_documents Table

1. **Go to Supabase SQL Editor** (same as Step 2)
2. **Create New Query**
3. **Copy and paste this SQL**:

```sql
-- Create submission_documents table
CREATE TABLE IF NOT EXISTS submission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  generated_file_path TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submission_documents_ip_record_id 
  ON submission_documents(ip_record_id);

-- Enable Row Level Security
ALTER TABLE submission_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for their submissions
CREATE POLICY "Users can view their submission documents"
  ON submission_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = submission_documents.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor', 'evaluator')
  );

-- Policy: Users can insert documents for their submissions
CREATE POLICY "Users can create documents for their submissions"
  ON submission_documents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM ip_records
        WHERE ip_records.id = submission_documents.ip_record_id
        AND ip_records.applicant_id = auth.uid()
      ) OR
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  );

-- Policy: Admins can update any document
CREATE POLICY "Admins can update documents"
  ON submission_documents
  FOR UPDATE
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
```

4. **Click "Run"**
5. You should see: "Success. No rows returned"

**What this does:**
- Creates the submission_documents table
- Sets up all columns for tracking documents
- Adds indexes for performance
- Enables Row Level Security
- Creates policies so users only see their own documents

**Status**: Should complete in < 1 minute

---

## STEP 4: Test Document Generation

### Prerequisites:
- ✓ Edge functions deployed
- ✓ Storage bucket created
- ✓ Database table created

### Test with a Real Submission

**Step 4.1: Find a Test Submission**
1. Go to your application at: `http://localhost:5173` (or your deployed URL)
2. Log in as an **applicant**
3. Go to "My Submissions" or "Dashboard"
4. Find a submission or create a new test one

**Step 4.2: Navigate to Submission Detail**
1. Click on a submission to open its detail page
2. Scroll down to find the **"Document Generator"** section
3. You should see:
   - "Generate Full Documentation" button
   - "Generate Full Disclosure" button
   - "Previously Generated Documents" area (empty at first)

**Step 4.3: Generate Full Documentation**
1. Click **"Generate Full Documentation"** button
2. **Wait** 2-3 seconds for processing
3. You should see a **success message** (green notification)
4. The document should appear in the "Previously Generated Documents" list

**Step 4.4: Generate Full Disclosure**
1. Click **"Generate Full Disclosure"** button
2. **Wait** 2-3 seconds for processing
3. You should see a **success message**
4. Second document should appear in the list

**What you should see:**
```
Document Generator
─────────────────────────────────────────
[Generate Full Documentation] [Generate Full Disclosure]

Previously Generated Documents:
✓ Full Documentation (Dec 16, 2024, 2:15 PM)
  [Download]

✓ Full Disclosure (Dec 16, 2024, 2:18 PM)
  [Download]
```

**If something goes wrong:**
→ See Troubleshooting section below

---

## STEP 5: Download & Verify Generated Documents

### Step 5.1: Download Documents

1. **Click the "Download" button** next to each document
2. Files will download as HTML files:
   - Example: `[recordId]_full_documentation_timestamp.html`
   - Example: `[recordId]_full_disclosure_timestamp.html`

### Step 5.2: Open & Verify in Browser

1. **Double-click** the downloaded HTML file
2. Should open in your default browser
3. Verify content includes:

**For Full Documentation:**
- ✓ Title of your submission
- ✓ Your name (applicant)
- ✓ Department
- ✓ Abstract
- ✓ Description
- ✓ Keywords
- ✓ All uploaded documents listed
- ✓ Professional formatting and colors
- ✓ Page breaks if needed

**For Full Disclosure:**
- ✓ "IP Disclosure Form" header
- ✓ Your information
- ✓ Invention title and description
- ✓ Technical details
- ✓ Signature blocks (blank - need to be filled)
- ✓ Legal acknowledgment language
- ✓ Professional legal formatting

### Step 5.3: Verify in Database

1. **Go to Supabase Dashboard**
2. **Click "SQL Editor"**
3. **Run this query**:

```sql
SELECT * FROM submission_documents 
ORDER BY created_at DESC 
LIMIT 5;
```

4. You should see your generated documents with:
   - ✓ `ip_record_id` matching your submission
   - ✓ `document_type` ('full_documentation' or 'full_disclosure')
   - ✓ `status` ('completed')
   - ✓ `generated_file_path` pointing to storage file
   - ✓ `generated_at` timestamp (recent)

### Step 5.4: Verify in Storage

1. **Go to Supabase Dashboard**
2. **Click "Storage"** in left sidebar
3. **Click "generated-documents"** bucket
4. You should see folders: `{recordId}/` 
5. Inside each folder: `{recordId}_full_documentation_timestamp.html` files

---

## 🎉 Success Checklist

After completing all steps:

- [ ] Both edge functions deployed (Step 1)
- [ ] Storage bucket created (Step 2)
- [ ] Database table created (Step 3)
- [ ] Generated document visible in UI (Step 4)
- [ ] Downloaded and verified documents (Step 5)
- [ ] Document records in database (Step 5.3)
- [ ] Files visible in storage bucket (Step 5.4)

---

## 🆘 Troubleshooting

### Issue: "Failed to generate documentation" error

**Check:**
1. Are edge functions deployed?
   - Go to Supabase Dashboard → Functions
   - Should see: ✓ generate-documentation
   - Should see: ✓ generate-disclosure
   
2. Check edge function logs:
   - Click on function name
   - Scroll to "Logs" section
   - Look for error messages

**Fix:**
- Redeploy: `supabase functions deploy generate-documentation --project-ref mqfftubqlwiemtxpagps`
- Redeploy: `supabase functions deploy generate-disclosure --project-ref mqfftubqlwiemtxpagps`

---

### Issue: "Download not working" error

**Check:**
1. Is storage bucket created?
   - Go to Supabase Dashboard → Storage
   - Should see: ✓ generated-documents

2. Are files in the bucket?
   - Go to generated-documents bucket
   - Click on recordId folder
   - Should see HTML files

**Fix:**
- Make sure you generated a document first
- Try generating again
- Check browser console (F12) for errors

---

### Issue: Document not appearing in list after generation

**Check:**
1. Refresh the page (F5)
2. Check browser console (F12) for JavaScript errors
3. Wait a few seconds - generation takes 2-3 seconds

**Fix:**
- Check edge function logs for errors
- Make sure database table was created
- Make sure RLS policies are configured

---

### Issue: Can't see documents in storage bucket

**Check:**
1. Did you run the CREATE_STORAGE_BUCKET.sql?
2. Is the bucket actually created?

**Fix:**
```sql
-- Check if bucket exists
SELECT id, name, public FROM storage.buckets WHERE name = 'generated-documents';

-- Should return: generated-documents | generated-documents | false
```

---

## 📋 Quick Reference

**Edge Functions URL:**
- Documentation: `https://[PROJECT].functions.supabase.co/generate-documentation`
- Disclosure: `https://[PROJECT].functions.supabase.co/generate-disclosure`

**Database Tables:**
- `submission_documents` - Tracks generated documents
- `ip_records` - Existing submissions
- `users` - User info

**Storage Bucket:**
- `generated-documents` - Stores all HTML files

---

## Next: Test All User Roles

Once basic testing works, try:

1. **As Applicant**
   - Generate documents for own submission
   - Download and verify

2. **As Admin**
   - View any submission
   - Generate documents
   - See all submissions' documents

3. **As Supervisor**
   - View assigned submissions
   - Generate documents for review

4. **As Evaluator**
   - View assigned submissions
   - Download evaluation documents

---

**All done! Your document generation system is now live.** 🚀
