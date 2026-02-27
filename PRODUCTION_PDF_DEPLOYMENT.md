# Production PDF Generation Deployment Guide

## Overview

The PDF generation system has been moved from Supabase Edge Functions (which cannot run Chromium) to a Node.js server that supports Playwright for PDF generation.

**Architecture**:
- Frontend → calls Node.js server directly OR Edge Function (optional proxy)
- Node.js server → generates PDF using Playwright → uploads to Supabase Storage
- Edge Function → optional thin proxy layer (forwards requests to Node server)

## Critical Fact

❌ **Supabase Edge Functions (Deno runtime) CANNOT run Chromium/Playwright**

This is a platform limitation, not a bug. Deno does not support native binaries.

✅ **Solution**: Node.js server with Playwright (already deployed at `/server`)

---

## Environment Variables

### 1. Frontend Configuration

**File**: `.env.local` or `.env.production`

```bash
# Node.js PDF Server URL (optional - if configured, frontend calls Node directly)
VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com

# OR for local development/testing:
# VITE_NODE_PDF_SERVER_URL=http://localhost:3000
```

**Usage**: When set, frontend tries calling Node server first, falls back to Edge Function.

---

### 2. Supabase Edge Function Configuration

**File**: Supabase Dashboard → Functions → `generate-full-record-documentation-pdf`

**Environment Variables** (set in Edge Function settings):

```bash
# REQUIRED for production
NODE_PDF_SERVER_URL=https://your-pdf-server.com

# Optional: Improve logging
EDGE_ENV=production
```

**Behavior**:
- ✅ If `NODE_PDF_SERVER_URL` is set: Edge Function acts as proxy, forwards requests to Node server
- ❌ If `NODE_PDF_SERVER_URL` is NOT set: Edge Function returns 503 error with helpful message

**Access**: Edge Function is still callable via `supabase.functions.invoke()` but recommended to call Node server directly.

---

### 3. Node.js Server Configuration

**File**: `/server/.env` or environment variables

```bash
# Database
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Server
PORT=3000
NODE_ENV=production

# Optional: CORS configuration
FRONTEND_URL=https://your-frontend.com
```

**Required**:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (needed for database access and signed URLs)
- `PORT`: Where Node server listens

**Optional**:
- `NODE_ENV=production` or `development`
- `FRONTEND_URL`: For CORS (defaults to `*` in dev, must be set in production)

---

## Deployment Checklist

### Step 1: Deploy Node.js Server

**Option A: Vercel (Recommended)**
```bash
npm install -g vercel
cd server
vercel --prod
```

This automatically sets environment variables from `.env.production` or through Vercel dashboard.

**Option B: Docker/Container**
```bash
cd server
docker build -t pdf-generator .
docker run -p 3000:3000 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  -e NODE_ENV=production \
  pdf-generator
```

**Option C: Traditional VPS (Ubuntu/Debian)**
```bash
cd server
npm install --production
npm start  # Ensure PM2 or systemd manages the process
```

**Verify Node Server is Running**:
```bash
curl https://your-pdf-server.com/health

# Expected response:
# {
#   "ok": true,
#   "environment": "production",
#   "service": "ucc-ipo-pdf-generator",
#   "endpoints": {
#     "health": "GET /health",
#     "pdf": "POST /api/generate-full-record-pdf"
#   }
# }
```

---

### Step 2: Configure Frontend

**File**: `frontend/.env.local` (development) or `.env.production` (production)

```bash
# Enable Node PDF server (optional - if you want direct calls)
VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com

# OR leave blank to use Edge Function
# (requires Edge Function to have NODE_PDF_SERVER_URL set)
```

**Rebuild frontend**:
```bash
npm run build
npm run deploy  # or your deployment method
```

---

### Step 3: Configure Edge Function

**Via Supabase Dashboard**:

1. Go to **Functions** → **generate-full-record-documentation-pdf**
2. Click **Settings** (⚙️ icon)
3. Add environment variable:
   - Key: `NODE_PDF_SERVER_URL`
   - Value: `https://your-pdf-server.com`
4. Save

**OR via Supabase CLI**:
```bash
supabase secrets set NODE_PDF_SERVER_URL=https://your-pdf-server.com
```

**Redeploy Edge Function**:
```bash
supabase functions deploy generate-full-record-documentation-pdf
```

---

## Production Verification

### Test 1: Node Server Health

```bash
curl -v https://your-pdf-server.com/health
# Should return status 200 with {"ok": true, ...}
```

### Test 2: PDF Generation (Direct Node Call)

```bash
curl -X POST https://your-pdf-server.com/api/generate-full-record-pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "test-record-id"}'

# Expected response (on success):
# {
#   "success": true,
#   "url": "https://..../certificates/..../document.pdf",
#   "fileName": "UCC_IPO_Record_REF-001.pdf",
#   "path": "full-record-docs/2024/01/REF-001.pdf"
# }

# Expected response (on error):
# {
#   "error": "Not authorized",
#   "details": "User is not an admin"
# }
```

### Test 3: Edge Function Proxy

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-full-record-documentation-pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "test-record-id"}'

# Should return same response as Node server
```

### Test 4: Frontend Download PDF Button

1. Login as admin user
2. Navigate to a record
3. Click "Download PDF"
4. ✅ PDF should download successfully
5. Open PDF and verify styling matches "Download HTML" output

---

## Troubleshooting

### Issue: "500 error when clicking Download PDF"

**Check**: Is the Node server running?
```bash
curl https://your-pdf-server.com/health
# If status != 200: Node server is down
```

**Fix**: 
- Restart Node server
- Check logs: `npm start` (or `docker logs` / `journalctl -u service-name`)

---

### Issue: Edge Function returns 503

**Check message**:
```bash
# If response contains "NODE_PDF_SERVER_URL not configured":
```

**Fix**:
1. Set `NODE_PDF_SERVER_URL` in Edge Function environment
2. Redeploy: `supabase functions deploy`

---

### Issue: PDF generated but styles don't match HTML

**Check**: Is Playwright using correct media emulation?

**Verify in server logs**:
```bash
# Should see: [PDF] Using 'screen' media for color preservation
```

**If showing 'print'**: Update `/server/src/utils/pdfGenerator.ts`
```typescript
// Line ~45
await page.emulateMedia({ media: 'screen' });  // ✅ Correct
// NOT: await page.emulateMedia({ media: 'print' });
```

---

### Issue: "User is not an admin" error

**Check**: Is the user actually an admin?
```sql
SELECT id, email, role FROM users WHERE email = 'user@example.com';
-- Should show role = 'admin'
```

**Fix**: Update user role in database or Supabase Auth admin panel

---

## File Structure Reference

```
project/
├── server/                          # Node.js PDF Generation Server
│   ├── src/
│   │   ├── server.ts               # Express app entry point
│   │   ├── routes/
│   │   │   └── pdf.ts             # POST /api/generate-full-record-pdf
│   │   └── utils/
│   │       ├── htmlGenerator.ts    # HTML template (matches frontend)
│   │       ├── pdfGenerator.ts     # Playwright HTML → PDF conversion
│   │       └── supabaseClient.ts   # Supabase initialization
│   ├── .env.example                # Template (copy to .env)
│   ├── package.json                # Dependencies
│   └── Dockerfile                  # For container deployment
│
├── src/lib/
│   └── sharedHTMLTemplate.ts       # Shared HTML/CSS template (exports interfaces)
│
├── src/utils/
│   ├── generateFullRecordPDF.ts    # Frontend service (calls Node or Edge Function)
│   └── fullRecordDocumentationTemplate.ts  # Wrapper (uses sharedHTMLTemplate)
│
└── supabase/functions/
    └── generate-full-record-documentation-pdf/
        └── index.ts                # Edge Function (proxy only, NO Playwright)
```

---

## Key Concepts

### Shared HTML Template

File: `src/lib/sharedHTMLTemplate.ts`

- **Purpose**: Single source of truth for HTML/CSS
- **Used by**: 
  - Frontend "Download HTML" feature
  - Node server PDF generation (via copy in `/server/src/utils/htmlGenerator.ts`)
- **CSS includes**: Print color preservation, A4 page format, styling
- **Exports**: `generateHTMLContent()`, `RecordData`, `DetailData` interfaces

### Playwright Settings

File: `server/src/utils/pdfGenerator.ts`

```typescript
// CORRECT for color-accurate PDFs:
await page.emulateMedia({ media: 'screen' });  // Preserves colors better than 'print'
await page.pdf({
  format: 'A4',
  printBackground: true,           // Enables background colors in PDF
  preferCSSPageSize: true,         // Respects @page rules in CSS
  margin: { top: '16mm', ... }    // A4 margins
});
```

---

## Monitoring & Logging

### Node Server Logs

Look for `[PDF]` prefix in logs:
```
[PDF] PDF request for record: abc-123
[PDF] Using 'screen' media for color preservation
[PDF] Successfully generated PDF
[PDF] Uploading to Supabase Storage...
```

### Health Endpoint

Monitor server availability:
```bash
# Check every 60 seconds
watch -n 60 'curl -s https://your-pdf-server.com/health | jq'
```

### Supabase Storage

Monitor PDF uploads in Supabase dashboard:
- Go to **Storage** → **certificates** → **full-record-docs/**
- PDFs organized by year/month
- Check file sizes (should be 50-200KB typically)

---

## Security Notes

1. **JWT Validation**: Both Node and Edge Function validate JWT
2. **Admin-Only**: Only users with `role = 'admin'` can generate PDFs
3. **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret (use environment variables, not hardcoded)
4. **CORS**: Configure `FRONTEND_URL` in production to restrict cross-origin calls

---

## Rollback Plan

If PDF generation breaks in production:

1. **Immediate**: Revert to old Edge Function (doesn't work, will show error)
2. **Better**: Restart Node server: `pm2 restart pdf-generator`
3. **Ultimate**: Deploy previous version: `git revert HEAD && npm run deploy`

---

## Monitoring Dashboard URLs

- **Vercel**: https://vercel.com/dashboard
- **Supabase**: https://app.supabase.com/project/[project-id]/functions
- **Node Server Health**: https://your-pdf-server.com/health
- **Supabase Storage**: https://app.supabase.com/project/[project-id]/storage

---

## Contact & Escalation

If production PDF generation is down:

1. Check Node server status: `/health` endpoint
2. Check Supabase status: https://status.supabase.com
3. Review Node server logs for `[PDF]` errors
4. Verify `SUPABASE_SERVICE_ROLE_KEY` hasn't been rotated
5. Restart Node server if needed

---

**Last Updated**: 2024
**Version**: 1.0 - Production Ready
