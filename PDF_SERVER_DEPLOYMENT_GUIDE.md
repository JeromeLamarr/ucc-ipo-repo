# PDF Server Deployment Guide - Production Ready

## Quick Summary

| Step | Time | Command |
|------|------|---------|
| 1. Setup Node env | 5 min | `cp server/.env.example server/.env` |
| 2. Deploy to Vercel | 5 min | `bash deploy/01-deploy-vercel.sh` |
| 3. Configure Edge Function | 3 min | Add `NODE_PDF_SERVER_URL` secret |
| 4. Verify deployment | 2 min | `curl https://deployed-url/health` |
| **Total** | **~15 min** | **End-to-end PDF downloads working** |

---

## Step 1: Prepare Node Server Environment Variables

### Create server/.env

```bash
cd "c:\Users\delag\Desktop\ucc ipo\project"

# Copy template
copy server\.env.example server\.env

# Edit with your Supabase credentials (use any text editor)
notepad server\.env
```

### Required Content

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
NODE_ENV=production
SERVICE_SECRET=your-random-secret-here
```

### Get Supabase Credentials

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Secret** → `SUPABASE_SERVICE_KEY`

**⚠️ Security:** Never commit `server/.env` to git (already in `.gitignore`)

### Verify Locally (Optional)

```bash
cd server

# Install dependencies
npm install

# Start local server
npm run dev

# Test health endpoint in another terminal
curl http://localhost:3000/health
# Should return: {"ok": true, "environment": "development", ...}
```

---

## Step 2: Deploy Node Server to Vercel

### Fastest Method (Recommended): Vercel CLI

```bash
# Ensure you're at project root
cd "c:\Users\delag\Desktop\ucc ipo\project"

# Run deployment script
bash deploy/01-deploy-vercel.sh
```

**What the script does:**
1. Checks Vercel CLI is installed
2. Validates `server/.env` exists
3. Reads Supabase credentials from `server/.env`
4. Deploys `/server` directory to Vercel
5. Returns deployed URL

**Expected output:**
```
✅ Vercel CLI found
🔧 Preparing for Vercel deployment...
📋 Checking environment variables...
✅ server/.env found
🚀 Deploying to Vercel...
✅ Deploy successful!
🌐 Production URL: https://your-pdf-server.vercel.app
📝 Note: URL in production environment variable
```

### Manual Vercel Deployment (If script fails)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from server directory
cd server
vercel deploy --prod

# Set environment variables when prompted:
# SUPABASE_URL = https://your-project.supabase.co
# SUPABASE_SERVICE_KEY = eyJhbGc...
```

### Alternative Deployment Methods

#### Docker (for VPS/Custom Hosting)

```bash
# Build Docker image
docker build -t ucc-ipo-pdf-server server/

# Run container
docker run -d \
  -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_KEY=eyJhbGc... \
  -e NODE_ENV=production \
  ucc-ipo-pdf-server
```

#### Node.js + PM2 (for VPS)

```bash
# On your VPS:
cd /var/www/ucc-ipo

# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server/dist/server.js --name "pdf-server"

# Ensure it restarts on reboot
pm2 startup
pm2 save
```

---

## Step 3: Configure Supabase Edge Function

### Get Your Deployed URL

After deployment, you'll have a URL like:
```
https://your-pdf-server.vercel.app
```

### Add NODE_PDF_SERVER_URL Secret to Edge Function

#### Option A: Via Supabase Dashboard (UI)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions → generate-full-record-documentation-pdf**
4. Click the ⚙️ **Configuration** button
5. Scroll to **Secrets**
6. Click **Add a secret**
7. Fill in:
   - **Name:** `NODE_PDF_SERVER_URL`
   - **Value:** `https://your-pdf-server.vercel.app`
8. Click **Add Secret**
9. The function auto-redeploys

#### Option B: Via Supabase CLI

```bash
# Set the secret
supabase secrets set NODE_PDF_SERVER_URL=https://your-pdf-server.vercel.app

# Deploy the updated function
supabase functions deploy generate-full-record-documentation-pdf
```

---

## Step 4: Verify Deployment

### Test Health Endpoint

```bash
# Replace with your actual URL
curl https://your-pdf-server.vercel.app/health

# Expected response:
# {
#   "ok": true,
#   "environment": "production",
#   "timestamp": "2026-02-28T...",
#   "service": "ucc-ipo-pdf-generator",
#   "endpoints": {
#     "health": "GET /health",
#     "pdf": "POST /api/generate-full-record-pdf"
#   }
# }
```

### Test Edge Function

In your browser console or via curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-full-record-documentation-pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"record_id": "test-record-id"}'

# Expected response (success):
# {"success": true, "type": "pdf", "url": "https://...", "fileName": "..."}
```

### Test Full UI Flow

1. Log into your UCC IPO application
2. Navigate to a record
3. Click **Download PDF**
4. Verify:
   - ✅ PDF downloads successfully
   - ✅ File is a valid PDF (not HTML)
   - ✅ Filename is `UCC_IPO_Record_[ref-number].pdf`

---

## Step 5: Monitor Production

### View Logs

#### Vercel Logs

```bash
# View deployment logs
vercel logs pdf-server --prod

# Watch logs in real-time
vercel logs pdf-server --prod --follow
```

#### Supabase Edge Function Logs

1. Dashboard → **Edge Functions → generate-full-record-documentation-pdf**
2. Click **Logs** tab
3. View recent invocations and errors

### Common Issues & Solutions

#### Issue: "Node server not responding"

**Check:**
```bash
curl https://your-deployed-url/health
```

**If fails:**
1. Verify server deployed to correct URL
2. Check Vercel deployment status
3. View Vercel logs for startup errors

**Fix:**
1. Redeploy: `vercel deploy --prod`
2. Check environment variables in Vercel dashboard

#### Issue: "PDF generation fails / PDF is empty"

**Check Node server logs:**
```bash
vercel logs your-pdf-server --prod
```

**Look for errors like:**
- "Cannot connect to Supabase"
- "certificates bucket not found"
- "Playwright launch failed"

**Fix:**
1. Verify SUPABASE_SERVICE_KEY is correct
2. Verify `certificates` bucket exists in Supabase Storage
3. Verify PDF content is valid (check htmlGenerator.ts output)

#### Issue: "403 Unauthorized"

**Cause:** JWT token expired or missing admin role

**Fix:**
1. Ensure user is logged in (valid JWT)
2. Ensure user has admin role (check role in Supabase auth)
3. Verify auth middleware is not too restrictive

---

## Deployment Complete! 

### What You've Done

- ✅ Node.js server deployed to Vercel with Playwright/Chromium
- ✅ Edge Function configured as proxy to Node server
- ✅ Supabase Storage bucket receiving PDF uploads
- ✅ Signed URLs generated for 1-hour downloads
- ✅ Frontend calling Edge Function with automatic proxying

### Current Architecture

```
Frontend (React)
    ↓ GET /api/download-pdf
Browser Dashboard
    ↓ POST to Edge Function
Supabase Edge Function (generate-full-record-documentation-pdf)
    ↓ Proxy request (if NODE_PDF_SERVER_URL configured)
Node.js Server (Vercel)
    ├─ Validate JWT + admin role
    ├─ Fetch record from Supabase
    ├─ Generate HTML (shared template)
    ├─ Render to PDF (Playwright/Chromium)
    ├─ Upload to Supabase Storage
    ├─ Generate signed URL (1 hour)
    ├─ Return URL to Edge Function
    └─ Return to Frontend
Frontend
    ↓ Download PDF from signed URL
Downloaded PDF ✅
```

### Next Steps (If You Want More Control)

1. **Scale:** Add caching for frequently generated PDFs
2. **Monitor:** Set up error alerts in Vercel/Supabase
3. **Optimize:** Cache Playwright browser for faster generation
4. **Customize:** Modify HTML template to match branding
5. **Backup:** Set up PDF archival for long-term storage

---

## Troubleshooting

### "NODE_PDF_SERVER_URL not configured"

**Error message on PDF download:** "PDF generation service not configured"

**Fix:**
```bash
# Verify edge function has the secret
supabase secrets list

# Should show: NODE_PDF_SERVER_URL = https://your-deployed-url

# If missing, set it:
supabase secrets set NODE_PDF_SERVER_URL=https://your-deployed-url

# Redeploy:
supabase functions deploy generate-full-record-documentation-pdf
```

### "Failed to connect to PDF generation server"

**Error in Edge Function logs:** "Failed to connect to Node server"

**Fix:**
1. Verify Node server is running:
   ```bash
   curl https://your-deployed-url/health
   ```
2. Verify `NODE_PDF_SERVER_URL` matches exactly (including https://)
3. Check firewall allows external connections
4. Redeploy Edge Function

### "CORS Error"

**Error in browser console:** "Cross-Origin Request Blocked"

**Fix:**
- CORS is already configured in Node server
- Ensure frontend URL matches CORS whitelist in [server/src/server.ts](server/src/server.ts)

### "PDF is corrupted or empty"

**Downloaded file is invalid or opens showing wrong content**

**Debug:**
1. Check Node server PDF generation logs
2. Verify `shareHTMLTemplate.ts` has valid CSS/HTML
3. Test locally: `npm run dev` in server directory
4. Try uploading a new record with fresh PDF generation

---

## Support

For detailed reference, see:
- [PDF_GENERATION_ENVIRONMENT_SETUP.md](PDF_GENERATION_ENVIRONMENT_SETUP.md) - Env var reference
- [server/README.md](server/README.md) - Node server technical details
- [PRODUCTION_PDF_DEPLOYMENT.md](PRODUCTION_PDF_DEPLOYMENT.md) - Architecture reference
