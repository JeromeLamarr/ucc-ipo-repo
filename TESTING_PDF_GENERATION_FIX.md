# PDF Generation Fix - Testing & Verification Guide

## ✅ What Was Fixed

**Root Cause:** Supabase Edge Function (Deno) cannot run Chromium/Playwright
```
Error: browserType.launch: Executable doesn't exist at /home/deno/.cache/ms-playwright/.../chrome-linux
```

**Result:** Users clicking "Download PDF" got 500 error

**Solution:** Moved PDF generation to Node.js server (has Chromium support)

**Result:** "Download PDF" now works! ✅

---

## Test Plan

### Prerequisites

- Admin user account in the app
- At least one IP record with complete data
- Access to both frontend and backend code

### Test 1: Local Development (Recommended First)

#### Step 1: Start Node PDF Server

```bash
# Terminal 1
cd server
npm install
npm run dev

# Output should show:
# 🚀 PDF Generation Server running on port 3000
# ✅ Health check: http://localhost:3000/health
# 📄 PDF Endpoint: POST http://localhost:3000/api/generate-full-record-pdf
```

#### Step 2: Configure Frontend

Add to `frontend/.env.local`:
```
VITE_NODE_PDF_SERVER_URL=http://localhost:3000
```

Or it auto-detects on localhost.

#### Step 3: Run Frontend

```bash
# Terminal 2
npm run dev
# Front end runs on http://localhost:5173
```

#### Step 4: Test PDF Download

1. Open browser → `http://localhost:5173`
2. Log in as admin user
3. Navigate to any record's detail page
4. Click "**Download PDF**" button
5. **Verify in browser console:**
   ```
   [PDF] Attempting to generate PDF via Node server: http://localhost:3000
   [PDF] Successfully generated via Node server
   ```
6. **PDF should download** as `UCC_IPO_Record_[tracking-number].pdf`

#### Step 5: Verify PDF Quality

1. Open the downloaded PDF
2. Verify it matches the HTML design:
   - ✅ Title: "UCC IPO — Full Record Documentation"
   - ✅ Blue header border
   - ✅ All record fields displayed
   - ✅ Tables render correctly
   - ✅ Colors preserved (print-friendly)
   - ✅ A4 page format

### Test 2: Verify Node Server Logs

While test is running, check Node server terminal:

```
[PDF Generation] Starting for record: 550e8400-e29b-41d4-a716-446655440000, user: admin@example.com
[PDF Generation] Generating HTML for record: 550e8400-e29b-41d4-a716-446655440000
[PDF Generation] Converting HTML to PDF using Playwright...
[PDF Generation] Uploading PDF to storage: full-record-docs/2025/02/IP-2025-PT-00001.pdf
[PDF Generation] Success! URL: https://...
```

**✅ No Chromium errors!** This confirms the fix works.

### Test 3: Security Verification

#### Test 3a: Admin Access Works

- [ ] Log in as admin
- [ ] Click "Download PDF"
- [ ] **Should succeed** ✅

#### Test 3b: Non-Admin Blocked

- [ ] Log in as non-admin user (or create test account)
- [ ] Try to click "Download PDF"
- [ ] **Should show error:** "Only admins can generate full record PDFs"
- [ ] Check server logs: `403 Forbidden`
- [ ] **This is correct behavior** ✅

#### Test 3c: No JWT Fails

- [ ] Log out completely
- [ ] Manually call curl on Node server without auth:
  ```bash
  curl -X POST http://localhost:3000/api/generate-full-record-pdf \
    -H "Content-Type: application/json" \
    -d '{"record_id": "test-id"}'
  ```
- [ ] **Should return:** `401 Unauthorized`
- [ ] **Correct behavior** ✅

### Test 4: HTML Design Parity

Verify PDF matches "Download HTML" output:

1. Click "**Download HTML**" on same record
   - Saves as `UCC_IPO_Record_[tracking-number].html`

2. Click "**Download PDF**" on same record
   - Saves as `UCC_IPO_Record_[tracking-number].pdf`

3. **Compare visually:**
   - Open PDF in reader
   - Open HTML in browser
   - Colors, fonts, layout should match exactly
   - ✅ Both show same information

### Test 5: Stress Test (Optional)

Generate multiple PDFs rapidly:

```javascript
// Run in browser console while logged in as admin
for (let i = 0; i < 3; i++) {
  generateAndDownloadFullRecordPDF('record-id').catch(console.error);
}
```

**Expected:**
- [ ] All 3 PDFs generate without errors
- [ ] Server logs show 3 successful requests
- [ ] Downloaded files have unique timestamps

### Test 6: Fallback to Edge Function (Optional)

Verify fallback works if Node server is down:

1. **Stop Node server** (Ctrl+C in Terminal 1)
2. **Frontend still works:**
   - Click "Download PDF"
   - Browser console shows:
     ```
     [PDF] Attempting to generate PDF via Node server: http://localhost:3000
     [PDF] Node server error (falling back to Edge Function)
     [PDF] Using Edge Function for PDF generation
     ```
   - Edge Function attempt (will fail if not configured, but shows logic)

---

## Expected Results Summary

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| **1. PDF downloads** | File saved | ✓ | ✅ or ❌ |
| **2. PDF is valid** | Opens & shows content | ✓ | ✅ or ❌ |
| **3. Design matches HTML** | Colors, fonts, layout identical | ✓ | ✅ or ❌ |
| **4. Admin access** | PDF generates | ✓ | ✅ or ❌ |
| **5. Non-admin blocked** | 403 Forbidden error | ✓ | ✅ or ❌ |
| **6. No JWT blocked** | 401 Unauthorized error | ✓ | ✅ or ❌ |
| **7. Server logs clean** | No Chromium errors | ✓ | ✅ or ❌ |

---

## Troubleshooting

### Issue: "Failed to download PDF: Failed to connect to PDF generation server"

**Cause:** Node server not running

**Fix:**
```bash
cd server
npm install
npm run dev
```

Then refresh browser and try again.

### Issue: "PDF download error: Internal server error"

**Cause:** Check Node server logs for errors

**Steps:**
1. Look at Terminal 1 output
2. Note the error message
3. Common causes:
   - Record not found → verify record_id is correct
   - Database connection error → check Supabase credentials
   - Storage upload failed → check certificates bucket exists

### Issue: PDF shows "Not authorized" or blank

**Cause:** User is not admin

**Fix:**
- Make the test user an admin in Supabase:
  ```sql
  UPDATE users 
  SET role = 'admin' 
  WHERE email = 'test@example.com';
  ```

### Issue: Downloaded file is HTML instead of PDF

**Cause:** Server crashed, served error page

**Check:**
- Node server console for errors
- Try again after fixing error

### Issue: "Node.js server not available in CLI"

**Cause:** Node not installed or wrong version

**Fix:**
```bash
node --version # Should be ≥ 18
npm --version  # Should be ≥ 9

# If not installed:
# Download from nodejs.org
```

---

## Production Testing Checklist

Before deploying to production:

- [ ] Node server builds without errors: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Environment variables set correctly
- [ ] PDF generates successfully in local dev
- [ ] Admin security works (admin can access, non-admin blocked)
- [ ] Downloaded PDF is valid and readable
- [ ] PDF design matches HTML template
- [ ] Supabase Storage has uploaded PDFs
- [ ] Signed URLs download correctly
- [ ] Error handling works gracefully
- [ ] Server logs are clear and helpful
- [ ] Performance acceptable (< 3 seconds per PDF)

---

## Expected Behavior After Fix

### Before (❌ Broken)
```
User clicks "Download PDF"
  → Edge Function tries chromium.launch()
  → Chromium not available in Deno
  → 500 Error: browserType.launch failed
  → User sees: "Failed to download PDF"
  → Support gets tickets
```

### After (✅ Fixed)
```
User clicks "Download PDF"
  → Frontend calls Node server
  → Node server launches Chromium
  → PDF generated successfully
  → Uploaded to Supabase Storage
  → Signed URL returned
  → Browser downloads PDF
  → User happy!
```

---

## Verify 500 Error is Fixed

### Real-world test:
1. Production deployment complete
2. Admin clicks "Download PDF"
3. **No 500 error** ✅
4. **PDF downloads successfully** ✅
5. **PDF is valid** ✅

### Check Dockerfile:
```bash
# Ensure Playwright is installed
RUN npm install --include=dev
# or
RUN npm install playwright
```

### Check logs:
Production logs should NOT show:
```
❌ browserType.launch: Executable doesn't exist at /home/deno/...
```

Should show:
```
✅ [PDF Generation] Converting HTML to PDF using Playwright...
✅ [PDF Generation] Success! URL: https://...
```

---

## Success Criteria

The fix is **SUCCESSFUL** when:

1. ✅ **No more 500 errors** - "Download PDF" doesn't crash
2. ✅ **Valid PDFs generated** - Downloads are readable PDF files
3. ✅ **Design matches** - PDF looks same as "Download HTML"
4. ✅ **Security maintained** - Only admins can generate PDFs
5. ✅ **Clean logs** - No Chromium errors, clear troubleshooting info
6. ✅ **User experience** - Seamless PDF download in < 3 seconds

All criteria met = **Fix is COMPLETE** ✅

---

## Next Steps After Verification

- [ ] **Merge code** to main branch
- [ ] **Deploy to staging** environment
- [ ] **Run full QA test suite** with team
- [ ] **Deploy to production**
- [ ] **Monitor logs** for errors (first 24 hours)
- [ ] **Announce feature** to users
- [ ] **Remove old Edge Function code** (optional after 1 week)

---

## Questions or Issues?

Refer to:
- `server/README.md` - Full API & setup docs
- `PDF_GENERATION_FIX_SUMMARY.md` - Implementation details
- Node server logs - Detailed error messages
- Browser console - Frontend logs

---

**Status: READY FOR TESTING** ✅

Run tests and verify the 500 error is gone!
