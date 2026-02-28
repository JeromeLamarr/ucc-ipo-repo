# PDF Generation Environment Setup Guide

## Overview

The PDF generation system requires specific environment variables at different deployment stages:
- **Node.js Server** (uses Playwright/Chromium)
- **Supabase Edge Function** (proxies to Node server)
- **Frontend** (calls Edge Function or Node directly)

## 1. Node.js Server Environment Variables

### File Location
```
server/.env
```

### Required Variables

```bash
# Supabase Configuration (from Supabase Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server Configuration
PORT=3000
NODE_ENV=production

# Service-to-Service Secret (optional, for Edge Function authentication)
SERVICE_SECRET=your-random-secret-here-min-32-chars
```

### Where to Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings → API**
4. Copy:
   - **URL** → `SUPABASE_URL`
   - **Service Role Secret** → `SUPABASE_SERVICE_KEY` (⚠️ Keep this secret!)

### How to Create server/.env

```bash
# From project root:
cp server/.env.example server/.env

# Edit server/.env with your credentials
nano server/.env  # or open in your editor
```

### Verification

```bash
# Test Node server health endpoint:
curl http://localhost:3000/health
# Expected response: { "ok": true, "environment": "development", ... }
```

## 2. Supabase Edge Function Configuration

### File Location
Edge Function is deployed to Supabase:
```
supabase/functions/generate-full-record-documentation-pdf/
```

### Required Environment Variable

**Variable Name:** `NODE_PDF_SERVER_URL`

**Value:** The URL where your Node PDF server is deployed

**Examples:**
- Local development: `http://localhost:3000`
- Vercel: `https://your-pdf-server.vercel.app`
- Custom VPS: `https://pdf.yourdomain.com`

### How to Set NODE_PDF_SERVER_URL in Supabase

#### Option A: Via Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions → generate-full-record-documentation-pdf**
4. Click **Configuration** (gear icon)
5. Add a new secret:
   - **Name:** `NODE_PDF_SERVER_URL`
   - **Value:** `https://your-node-pdf-server-url.com`
6. Click **Add Secret**
7. Redeploy the Edge Function

#### Option B: Via Supabase CLI

```bash
# Set the secret
supabase secrets set NODE_PDF_SERVER_URL=https://your-node-pdf-server.com

# Deploy the function
supabase functions deploy generate-full-record-documentation-pdf
```

### What Happens Without NODE_PDF_SERVER_URL

If `NODE_PDF_SERVER_URL` is not configured:
- Edge Function returns a **503 Service Unavailable** error
- Frontend receives error and displays message to user
- PDF download fails gracefully

## 3. Frontend Environment Variables

### File Location
```
.env.production  (for production builds)
.env.local       (for local development)
```

### Optional Variables

```bash
# PDF Server (optional - frontend only needs this if calling Node directly)
# Usually NOT needed since frontend calls Edge Function instead
VITE_NODE_PDF_SERVER_URL=http://localhost:3000
```

### Default Behavior

If `VITE_NODE_PDF_SERVER_URL` is not set:
- Frontend calls Supabase Edge Function
- Edge Function proxies to Node server (if NODE_PDF_SERVER_URL is set)
- **Recommended approach** - simplifies configuration

## 4. Storage Bucket Configuration

### Supabase Storage Setup

The Node server uploads PDFs to the **`certificates`** bucket.

**Ensure this bucket exists in Supabase:**

1. Go to **Supabase Dashboard → Storage**
2. Check for a bucket named **`certificates`**
3. If it doesn't exist:
   - Click **New Bucket**
   - Name: `certificates`
   - Make Public: **No** (PDFs are accessed via signed URLs)
   - Create

### Signed URL Configuration

The Node server generates **signed URLs** valid for **1 hour**.

To change expiration time, edit [server/src/routes/pdf.ts](server/src/routes/pdf.ts):
```typescript
// Line ~120: Change 3600 to desired seconds
const { data: signedURL } = await supabase.storage
  .from('certificates')
  .createSignedUrl(fileName, 3600); // seconds = 1 hour
```

## 5. Deployment Checklist

### Before Deploying Node Server

- [ ] Create `server/.env` with SUPABASE_URL and SUPABASE_SERVICE_KEY
- [ ] Test locally: `cd server && npm run dev`
- [ ] Verify `GET /health` returns 200
- [ ] Verify `POST /api/generate-full-record-pdf` works with a test record

### After Deploying Node Server

- [ ] Get deployed Node server URL (e.g., `https://your-pdf-server.vercel.app`)
- [ ] Set `NODE_PDF_SERVER_URL` as Edge Function secret in Supabase
- [ ] Redeploy Edge Function
- [ ] Test health check: `curl https://your-deployed-url.com/health`

### Production Deployment

- [ ] Environment: `NODE_ENV=production`
- [ ] CORS: Ensure FRONTEND_URL matches your actual frontend domain
- [ ] Security: Never commit `.env` files to git (use `.gitignore`)
- [ ] Monitoring: Enable logs in deployment platform (Vercel, etc.)

## 6. Environment Variable Summary Table

| Variable | Location | Required | Example | Purpose |
|----------|----------|----------|---------|---------|
| `SUPABASE_URL` | `server/.env` | ✅ Yes | `https://xxxx.supabase.co` | Node server connects to Supabase |
| `SUPABASE_SERVICE_KEY` | `server/.env` | ✅ Yes | `eyJhbGc...` | Node server auth with Supabase |
| `PORT` | `server/.env` | ⚠️ Optional | `3000` | Node server port (default: 3000) |
| `NODE_ENV` | `server/.env` | ⚠️ Optional | `production` | Environment (default: development) |
| `SERVICE_SECRET` | `server/.env` | ❌ No | `random-secret` | Reserved for future use |
| `NODE_PDF_SERVER_URL` | Supabase Secrets | ✅ Yes | `https://server.com` | Edge Function proxy target |
| `VITE_NODE_PDF_SERVER_URL` | `.env.production` | ❌ No | `https://server.com` | Frontend (not usually needed) |

## 7. Troubleshooting

### "NODE_PDF_SERVER_URL not configured"

**Problem:** Edge Function returns 503 error.

**Solution:**
1. Verify you set `NODE_PDF_SERVER_URL` in Supabase secrets
2. Verify the URL is correct and the Node server is running
3. Redeploy the Edge Function after setting the secret:
   ```bash
   supabase functions deploy generate-full-record-documentation-pdf
   ```

### "Cannot connect to PDF generation server"

**Problem:** Edge Function can reach Supabase but not Node server.

**Solution:**
1. Check Node server is running: `curl https://your-server.com/health`
2. Verify `NODE_PDF_SERVER_URL` matches actual deployed URL
3. Check firewall/CORS settings allow the Edge Function to connect
4. Verify no authentication is blocking the connection

### "SUPABASE_SERVICE_KEY is invalid"

**Problem:** Node server cannot connect to Supabase.

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the latest **Service Role Secret**
3. Update `server/.env` with correct key
4. Restart Node server: `npm run dev`

### PDF Upload Fails

**Problem:** Node server generates PDF but upload to storage fails.

**Solution:**
1. Verify `certificates` bucket exists in Supabase Storage
2. Verify Service Role has permissions to write to bucket
3. Check bucket is not full/quota exceeded
4. Check Supabase Storage isn't rate-limited

## Next Steps

1. **Set up Node server environment variables** → `server/.env`
2. **Deploy Node server** → See [START_DEPLOYMENT_HERE.md](START_DEPLOYMENT_HERE.md)
3. **Configure Edge Function** → Set `NODE_PDF_SERVER_URL` in Supabase
4. **Test PDF generation** → Download a PDF via UI
5. **Monitor production** → Check logs for errors
