# PDF Generation - Production Deployment Test Checklist

## Pre-Deployment Testing (Local Development)

### Environment Setup
- [ ] `server/.env` created with valid SUPABASE_URL and SUPABASE_SERVICE_KEY
- [ ] `.env.local` exists in project root for frontend
- [ ] `server/node_modules` has `playwright` installed
- [ ] `node_modules` has `@supabase/supabase-js` in both frontend and server

### Node Server Tests (Local)

```bash
# In one terminal:
cd server
npm run dev

# In another terminal (run these commands):
```

#### Test 1: Health Endpoint ✅
```bash
curl http://localhost:3000/health
```

**Expected**: 
```json
{
  "ok": true,
  "environment": "development",
  "service": "ucc-ipo-pdf-generator",
  "endpoints": { ... }
}
```

**Status**: [ ] Pass / [ ] Fail

#### Test 2: Requires Authentication ⚠️
```bash
curl -X POST http://localhost:3000/api/generate-full-record-pdf \
  -H "Content-Type: application/json" \
  -d '{"record_id": "test"}'
```

**Expected**: 403 Forbidden or 401 Unauthorized
**Status**: [ ] Pass / [ ] Fail

#### Test 3: PDF Generation (with valid token)

Get a valid JWT from your logged-in session:
```bash
# In browser console (on your app):
const { data } = await supabase.auth.getSession();
console.log(data.session.access_token);
# Copy the token
```

Then:
```bash
curl -X POST http://localhost:3000/api/generate-full-record-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"record_id": "real-record-id-from-your-db"}'
```

**Expected**: 
```json
{
  "success": true,
  "type": "pdf",
  "url": "https://...",
  "fileName": "UCC_IPO_Record_*.pdf",
  "contentType": "application/pdf"
}
```

**Status**: [ ] Pass / [ ] Fail

### Frontend Tests (Local)

#### Test 4: Frontend Calls Edge Function
1. Start dev server: `npm run dev`
2. Log in as admin user
3. Navigate to a record page
4. Click **Download PDF** button
5. Check browser console for logs:
   ```
   [PDF] Calling Edge Function for PDF generation
   [PDF] Successfully generated via Edge Function
   ```

**Expected**: 
- [ ] No console errors
- [ ] PDF file downloads
- [ ] File size > 10KB (not empty)
- [ ] File opens in PDF reader

**Status**: [ ] Pass / [ ] Fail

#### Test 5: HTML Fallback (when Node is down)

1. Ensure `NODE_PDF_SERVER_URL` is NOT set in Supabase Edge Function
2. Try downloading a PDF
3. Check response is error message

**Expected**: 
- [ ] Edge Function returns 503 or 500 error
- [ ] Frontend shows error message to user
- [ ] No PDF downloads

**Status**: [ ] Pass / [ ] Fail

---

## Deployment Testing (After Vercel Deploy)

### Prerequisites
- [ ] Node server deployed to Vercel (or your hosting)
- [ ] Deployed URL obtained (e.g., `https://your-pdf-server.vercel.app`)
- [ ] `NODE_PDF_SERVER_URL` set in Supabase Edge Function secrets
- [ ] Edge Function redeployed

### Deployment Test 1: Node Server Health Check ✅

```bash
curl https://YOUR_DEPLOYED_URL/health
```

**Expected**: 200 OK with health JSON
**Status**: [ ] Pass / [ ] Fail

#### Diagnosis (if fails):
```bash
# Check Vercel deployment status
vercel status

# View Vercel logs
vercel logs your-pdf-server --prod

# Check environment variables in Vercel dashboard
```

### Deployment Test 2: Edge Function Can Reach Node Server 🌐

```bash
# Get your Supabase credentials
# SUPABASE_URL from Supabase dashboard
# JWT_TOKEN from your logged-in session
# RECORD_ID from your database

curl -X POST https://YOUR_SUPABASE_URL/functions/v1/generate-full-record-documentation-pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "YOUR_RECORD_ID"}'
```

**Expected**: 
```json
{
  "success": true,
  "type": "pdf",
  "url": "https://your-project.supabase.co/storage/v1/...",
  "fileName": "UCC_IPO_Record_*.pdf",
  "contentType": "application/pdf"
}
```

**Status**: [ ] Pass / [ ] Fail

#### Diagnosis (if fails):
```bash
# Check Edge Function logs
supabase functions list
supabase functions logs generate-full-record-documentation-pdf

# Verify NODE_PDF_SERVER_URL secret is set
supabase secrets list

# Check Node server logs
vercel logs your-pdf-server --prod
```

### Deployment Test 3: Signed URL is Valid 📥

From the response in Test 2, get the `url` and test it:

```bash
curl -I https://your-project.supabase.co/storage/v1/...?token=signed
```

**Expected**: 200 OK, Content-Type: application/pdf, file size correct
**Status**: [ ] Pass / [ ] Fail

### Deployment Test 4: Full UI Download Flow 🎯

1. Log into your production application
2. Navigate to a record page
3. Click **Download PDF** button
4. Verify:
   - [ ] No errors in browser console
   - [ ] PDF downloads with correct filename
   - [ ] File opens in PDF viewer
   - [ ] Content looks correct (images, text, formatting)
   - [ ] Download takes < 5 seconds

**Status**: [ ] Pass / [ ] Fail

### Deployment Test 5: Multiple PDFs Back-to-Back (Stress Test) 🔄

1. Download PDF from 3 different records
2. Verify:
   - [ ] All three PDFs download successfully
   - [ ] No timeout errors
   - [ ] Each PDF has correct record data
   - [ ] Server responds quickly (< 2 sec each)

**Status**: [ ] Pass / [ ] Fail

#### If slow, check:
```bash
# Node server logs for performance issues
vercel logs your-pdf-server --prod

# Supabase storage limits
# Check dashboard for rate limiting
```

### Deployment Test 6: Error Handling ⚠️

#### Test 6a: Invalid Record ID
```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/generate-full-record-documentation-pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "invalid-id-that-doesnt-exist"}'
```

**Expected**: 404 Not Found error
**Status**: [ ] Pass / [ ] Fail

#### Test 6b: Missing Authorization
```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/generate-full-record-documentation-pdf \
  -H "Content-Type: application/json" \
  -d '{"record_id": "some-id"}'
```

**Expected**: 401 Unauthorized
**Status**: [ ] Pass / [ ] Fail

#### Test 6c: Non-Admin User
1. Log in as a non-admin user (if possible)
2. Try to download PDF
3. Verify: [ ] Access denied error

**Status**: [ ] Pass / [ ] Fail

---

## Performance & Monitoring Checkpoint

### Response Times

Run multiple tests and measure timing:

```bash
# Measure Node server PDF generation time
time curl -X POST https://YOUR_DEPLOYED_URL/api/generate-full-record-pdf \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "YOUR_RECORD_ID"}' > /dev/null
```

**Expected**:
- [ ] First request: < 5 seconds (Playwright startup overhead)
- [ ] Subsequent requests: < 2 seconds
- [ ] Average across 5 requests: < 3 seconds

### Resource Usage

Check Vercel dashboard:
- [ ] CPU usage: < 50% during requests
- [ ] Memory: < 512MB (Playwright can be memory-intensive)
- [ ] Request queue: No backlog
- [ ] Error rate: < 1%

**Status**: [ ] Acceptable / [ ] Needs optimization

---

## Sign-Off Checklist

### All Tests Passed ✅
- [ ] Pre-deployment tests (local) all green
- [ ] Deployment tests (production) all green
- [ ] Performance metrics within acceptable range
- [ ] Error handling works correctly
- [ ] Multiple concurrent downloads work

### Documentation Complete ✅
- [ ] Deployment guide accessible to team
- [ ] Environment variables documented
- [ ] Troubleshooting guide written
- [ ] Runbooks created for common issues

### Production Ready ✅
- [ ] No sensitive credentials in code
- [ ] Environment variables properly stored
- [ ] Logging configured for monitoring
- [ ] Rollback plan documented
- [ ] Team trained on deployment process

### Final Approval
- **Tested by:** [Your Name]
- **Date:** [Date]
- **Status:** [ ] APPROVED / [ ] NEEDS FIXES
- **Known Issues:** (if any)

---

## Quick Reference: Common Issues During Testing

| Issue | Symptom | Diagnosis | Fix |
|-------|---------|-----------|-----|
| Node not listening | Connection refused | Check server started | `npm run dev` in server/ |
| JWT invalid | 401 error | Token expired | Get new token from session |
| Wrong record ID | 404 error | Record doesn't exist | Use valid record ID from DB |
| NODE_PDF_SERVER_URL not set | 503 error from Edge | Secret not configured | Set in Supabase settings |
| Playwright crash | 500 error, HTML/CSS error | Rendering issue | Check htmlTemplate for invalid CSS |
| Storage upload fails | Error but no PDF | Bucket doesn't exist | Create `certificates` bucket |
| Signed URL expired | 403 Forbidden | URL older than 1 hour | Generate new PDF |
| CORS blocked | Browser console error | Frontend/Node origin mismatch | Update CORS in server config |

---

## After Tests Pass: Next Steps

1. **Notify Team**
   - [ ] Slack: "PDF deployment complete, all tests green ✅"
   - [ ] Email: Deployment completed, ready for use
   
2. **Monitor Production**
   - [ ] Set up daily health check monitoring
   - [ ] Configure error alerts
   - [ ] Track PDF download metrics
   
3. **Document for Future**
   - [ ] Save this checklist for next deployment
   - [ ] Record any customizations made
   - [ ] Note any issues encountered

---

## Test Summary Template

Copy & paste when finished:

```
PDF Deployment Test Summary
============================

Date: [DATE]
Deployed URL: [YOUR_URL]
Tester: [YOUR_NAME]

Pre-Deployment: [X/5 tests passed]
Deployment: [X/6 tests passed]
Performance: [ACCEPTABLE/NEEDS_WORK]
Error Handling: [X/3 tests passed]

Overall Status: [READY_FOR_PRODUCTION / NEEDS_FIXES]

Notes:
[Your notes here]
```
