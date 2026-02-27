# PDF Generation Production Testing Checklist

## Pre-Deployment Verification

### 1. Code Quality Checks ✅

- [ ] Edge Function: Zero Playwright imports
  ```bash
  grep -i "playwright\|chromium\|browser" supabase/functions/generate-full-record-documentation-pdf/index.ts
  # Should return: (no results)
  ```

- [ ] Node server: Playwright properly imported
  ```bash
  grep -i "playwright" server/src/utils/pdfGenerator.ts
  # Should show: import { chromium } from 'playwright' or similar
  ```

- [ ] Shared template exists
  ```bash
  ls -la src/lib/sharedHTMLTemplate.ts
  # Should exist with >100 lines
  ```

- [ ] No syntax errors
  ```bash
  # Run TypeScript compiler
  npm run build
  cd server && npm run build && cd ..
  ```

---

## Pre-Production Deployment Checklist

### 2. Environment Variable Verification ✅

**Frontend** (`.env.production`):
```bash
[ ] VITE_NODE_PDF_SERVER_URL is set to production URL
    [ ] Or left blank to use Edge Function
    [ ] Test value: https://your-pdf-server.com
```

**Edge Function** (Supabase Dashboard):
```bash
[ ] NODE_PDF_SERVER_URL is set
    Value should be: https://your-pdf-server.com
    
[ ] Test via Supabase Functions panel:
    - Click "execute"
    - Provide: {"record_id": "test-id"}  
    - Should NOT error about missing env var
```

**Node Server** (`.env` or environment):
```bash
[ ] SUPABASE_URL is set
[ ] SUPABASE_SERVICE_ROLE_KEY is set
[ ] PORT is set (default 3000)
[ ] NODE_ENV is set to "production"
[ ] FRONTEND_URL is set (for CORS)
```

---

### 3. Node Server Pre-Flight Check ✅

**Start server locally/in staging**:
```bash
cd server
npm install
npm start

# Should see:
# ✅ Connected to Supabase
# ✅ Server running on http://localhost:3000
# ✅ Endpoints configured:
#    - GET /health
#    - POST /api/generate-full-record-pdf
```

**Health endpoint** returns correct structure:
```bash
curl http://localhost:3000/health

# Expected:
{
  "ok": true,
  "environment": "production",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "ucc-ipo-pdf-generator",
  "endpoints": {
    "health": "GET /health",
    "pdf": "POST /api/generate-full-record-pdf"
  }
}
```

---

### 4. PDF Generation Test (Direct Node Server) ✅

**Get a valid JWT token**:
1. Login to application as admin user
2. Open browser DevTools → Network
3. Click any API request
4. Find Authorization header value (copy the Bearer token)

**Test PDF generation**:
```bash
curl -X POST http://localhost:3000/api/generate-full-record-pdf \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "abc123"}'

# Expected on success (200):
{
  "success": true,
  "url": "https://...supabase.co.../certificates/full-record-docs/2024/01/abc123.pdf?token=...",
  "fileName": "UCC_IPO_Record_abc123.pdf",
  "path": "full-record-docs/2024/01/abc123.pdf"
}

# Expected on auth fail (401):
{
  "error": "Not authorized",
  "details": "Missing or invalid JWT"
}

# Expected on admin fail (403):
{
  "error": "Forbidden",
  "details": "User is not an admin"
}
```

---

### 5. Edge Function Proxy Test ✅

**Deploy Edge Function with NODE_PDF_SERVER_URL set**:
```bash
supabase functions deploy generate-full-record-documentation-pdf
```

**Test via Supabase CLI**:
```bash
supabase functions call generate-full-record-documentation-pdf \
  --auth-token YOUR_JWT_HERE \
  --data '{"record_id":"abc123"}'

# Should return same response as Node server
```

**OR via HTTP**:
```bash
curl -X POST https://[project-id].supabase.co/functions/v1/generate-full-record-documentation-pdf \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{"record_id":"abc123"}'

# Logs in Supabase: See [Edge Proxy] entries showing forward to Node server
```

---

## Production Deployment Checklist

### 6. Deploy Node Server ✅

Choose one deployment method:

**Option A: Vercel**
```bash
[ ] Vercel app created
[ ] Environment variables configured in Vercel dashboard
[ ] Deployed via: vercel --prod
[ ] Health endpoint accessible: https://[vercel-url]/health
```

**Option B: Docker/Container**
```bash
[ ] Docker image built: docker build -t pdf-generator .
[ ] Pushed to registry
[ ] Deployed to container platform
[ ] Health check passes: curl https://[container-url]/health
```

**Option C: VPS/Traditional**
```bash
[ ] Node.js 18+ installed on server
[ ] Dependencies installed: npm install --production
[ ] Process manager configured (PM2/systemd)
[ ] Auto-restart on failure enabled
[ ] Health endpoint accessible
```

---

### 7. Deploy Frontend ✅

```bash
[ ] Build with updated .env.production
    npm run build
    
[ ] Verify VITE_NODE_PDF_SERVER_URL is injected
    (check built index.html or build artifacts)
    
[ ] Deploy to production
    npm run deploy  # or your hosting provider
    
[ ] Test "Download HTML" still works
    (to verify HTML template didn't break)
```

---

### 8. Deploy Edge Function ✅

```bash
[ ] NODE_PDF_SERVER_URL environment variable set
    (Supabase Dashboard → Functions → Settings)
    
[ ] Function redeployed:
    supabase functions deploy generate-full-record-documentation-pdf
    
[ ] Logs accessible in Supabase dashboard
    (to monitor proxy activity)
```

---

## Production QA Test Suite

### Test 1: PDF Download from UI ✅

**Setup**:
- [ ] Login as admin user
- [ ] Navigate to any IP record
- [ ] Locate "Download PDF" button

**Execute**:
- [ ] Click "Download PDF"
- [ ] Wait for download to start
- [ ] Note: Should NOT show error toast

**Verify**:
- [ ] PDF file downloaded (check browser downloads)
- [ ] Filename format: `UCC_IPO_Record_[reference_number].pdf`
- [ ] File size: 50-200 KB (reasonable for PDF)

**Open PDF and check**:
- [ ] All text content present
- [ ] Blue border visible on h1 (color preserved ✓)
- [ ] Grid layout intact (2 columns for info items)
- [ ] Tables display correctly
- [ ] Page breaks appropriate (no content cut off)
- [ ] Footer visible: "Generated: [timestamp]"

---

### Test 2: PDF Styling Matches HTML ✅

**Execute**:
- [ ] Click "Download HTML" button
- [ ] Opens HTML version in new tab
- [ ] Note colors, fonts, spacing

- [ ] Click "Download PDF" button
- [ ] Opens PDF in viewer
- [ ] Compare side-by-side styling

**Verify - Title Section**:
- [ ] Blue border (#2563eb) present on h1
- [ ] Same font size and spacing
- [ ] Text alignment matches

**Verify - Info Grid**:
- [ ] Light gray background (#f3f4f6) on items
- [ ] 2-column layout visible
- [ ] Consistent spacing matches HTML

**Verify - Tables**:
- [ ] Header rows gray background
- [ ] Border colors match HTML
- [ ] Text alignment correct

---

### Test 3: Admin-Only Enforcement ✅

**Test Admin Access**:
- [ ] Login as admin user
- [ ] Click "Download PDF"
- [ ] ✅ Should succeed

**Test Non-Admin Access**:
- [ ] Logout
- [ ] Login as regular user (not admin)
- [ ] Navigate to record
- [ ] "Download PDF" button should:
  - [ ] Either be hidden/disabled, OR
  - [ ] Show error: "User is not an admin"
- [ ] ✅ Should NOT allow PDF download

---

### Test 4: Error Handling ✅

**Test 1: Invalid Record ID**
```bash
curl -X POST https://your-node-server/api/generate-full-record-pdf \
  -H "Authorization: Bearer JWT" \
  -d '{"record_id":"nonexistent-id-xyz"}'

[ ] Should return 404 error
[ ] Error message: "Record not found"
```

**Test 2: Missing Authorization**
```bash
curl -X POST https://your-node-server/api/generate-full-record-pdf \
  -d '{"record_id":"abc123"}'

[ ] Should return 401 error
[ ] Error message: "Missing authorization header"
```

**Test 3: Invalid JWT**
```bash
curl -X POST https://your-node-server/api/generate-full-record-pdf \
  -H "Authorization: Bearer invalid-token-123" \
  -d '{"record_id":"abc123"}'

[ ] Should return 401 or 403 error
[ ] Error message: "Not authorized" or "Invalid token"
```

---

### Test 5: Performance ✅

**Measure PDF Generation Time**:
```bash
time curl -X POST https://your-node-server/api/generate-full-record-pdf \
  -H "Authorization: Bearer JWT" \
  -d '{"record_id":"abc123"}'

[ ] Should complete in < 5 seconds
[ ] 2-3 seconds is typical
```

**Generate Multiple PDFs Concurrently**:
- [ ] Open 5 browser tabs
- [ ] Click "Download PDF" simultaneously on each
- [ ] All should complete without timeout/queue issues
- [ ] No "503 Service Unavailable" errors

---

### Test 6: Edge Function Proxy (Optional) ✅

If using Edge Function proxy instead of direct Node calls:

**Test via Supabase Function**:
```bash
supabase functions call generate-full-record-documentation-pdf \
  --auth-token JWT \
  --data '{"record_id":"abc123"}' \
  --region us-east-1  # or your region

[ ] Should return PDF URL
[ ] Logs show [Edge Proxy] entries
```

**Test Fallback**:
- [ ] Temporarily disable Node server
- [ ] Edge Function should return clear error:
  ```
  "Failed to connect to PDF generation server"
  "Check Node server is running: curl /health"
  ```
- [ ] Error message helpful for debugging

---

### Test 7: Storage & Downloads ✅

**Verify PDF Storage**:
1. Open Supabase dashboard
2. Go to **Storage** → **certificates** → **full-record-docs**
3. [ ] See folder structure: `2024/01/...` (year/month)
4. [ ] PDF files listed with correct names
5. [ ] File sizes reasonable (50-200 KB)

**Verify Download Links Work**:
```bash
# Get signed URL from recent PDF download response
curl "https://...supabase.co.../certificates/full-record-docs/2024/01/REF-001.pdf?token=..."

[ ] Should return PDF file (not redirect)
[ ] Status 200 OK
[ ] Content-Type: application/pdf
```

---

### Test 8: Configuration Verification ✅

**Verify Shared Template is Used**:
```bash
# Check frontend uses shared template
grep -r "sharedHTMLTemplate" src/

[ ] Should find imports in:
    - fullRecordDocumentationTemplate.ts
    - Other places using HTML generation

# Check server uses matching template
grep -l "info-grid\|border-bottom.*2563eb" server/src/utils/htmlGenerator.ts

[ ] Should find CSS selectors matching frontend's template
```

**Verify Playwright Settings**:
```bash
grep -A 5 "emulateMedia" server/src/utils/pdfGenerator.ts

[ ] Should show: media: 'screen'  ✅
[ ] NOT: media: 'print' ❌

[ ] Should show: printBackground: true
[ ] Should show: preferCSSPageSize: true
```

---

## Load Testing (Optional for High Traffic)

### Test Load Capacity ✅

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Simulate 10 concurrent users, 100 total requests
ab -n 100 -c 10 -H "Authorization: Bearer JWT" \
  -p payload.json -T application/json \
  https://your-node-server/api/generate-full-record-pdf

# Expected:
# [ ] Requests/sec: > 2 req/s
# [ ] Failed requests: 0
# [ ] Average time per request: < 3000ms
```

---

## Sign-Off

### Pre-Production Checklist Summary

| Item | Status | Notes |
|------|--------|-------|
| Edge Function: No Playwright imports | ✅ | |
| Node Server: Playwright configured | ✅ | |
| Shared HTML template created | ✅ | |
| Environment variables set | ⬜ | |
| Node server deployed | ⬜ | |
| Frontend built with .env | ⬜ | |
| Edge Function redeployed | ⬜ | |
| Health endpoint working | ⬜ | |
| PDF generation test passed | ⬜ | |
| Styling matches HTML download | ⬜ | |
| Admin-only enforcement works | ⬜ | |
| Error handling verified | ⬜ | |
| Performance acceptable | ⬜ | |
| Storage/download links work | ⬜ | |

**Approved for Production**: __________ (date)

**Tested By**: __________ (name)

**Signed**: __________

---

## Post-Production Monitoring

### Daily Checks (First Week)
- [ ] Health endpoint returns 200: `https://your-pdf-server/health`
- [ ] No error spikes in Node server logs
- [ ] PDF storage growing normally
- [ ] Download success rate > 99%

### Weekly Checks
- [ ] Review Node server logs for errors
- [ ] Check storage usage trends
- [ ] Verify performance metrics
- [ ] Confirm CORS working properly

### Monthly Checks
- [ ] Verify backups are working
- [ ] Update dependencies if needed
- [ ] Review security logs
- [ ] Test rollback procedures

---

**Testing Version**: 1.0
**Last Updated**: 2024
**Next Review**: After first week in production
