# PDF Generation System - Complete Deployment Playbook

## Pre-Deployment Checklist

### Phase 1: Preparation (Local)
- [ ] Clone or pull latest code from repository
- [ ] Verify all files exist:
  - [ ] `src/lib/sharedHTMLTemplate.ts` (shared HTML/CSS template)
  - [ ] `server/src/utils/pdfGenerator.ts` (Playwright PDF generation)
  - [ ] `server/src/server.ts` (Express app)
  - [ ] `supabase/functions/generate-full-record-documentation-pdf/index.ts` (proxy)
  - [ ] `src/utils/generateFullRecordPDF.ts` (frontend service)
- [ ] Run `bash prepare-deployment.sh` (or `.bat` on Windows)
  - [ ] Verifies Node.js installed
  - [ ] Verifies npm/yarn installed
  - [ ] Checks dependencies
  - [ ] Verifies build succeeds

### Phase 2: Environment Variable Configuration

**Step 1: Collect Supabase Credentials**
1. Go to: https://app.supabase.com
2. Select your project
3. Click: **Settings** (gear icon) → **API**
4. Note these values:
   - `SUPABASE_URL`: Copy the "URL" value
   - `SUPABASE_ANON_KEY`: Copy the "anon" key
   - `SUPABASE_SERVICE_ROLE_KEY`: Copy the "service_role" key (⚠️ SECRET!)

**Step 2: Configure Node Server Environment**
1. Copy file: `cp server/.env.template server/.env`
2. Edit `server/.env` and fill in:
   ```
   SUPABASE_URL=<paste your URL>
   SUPABASE_SERVICE_ROLE_KEY=<paste service role key>
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=<your frontend base URL>
   ```

**Step 3: Configure Frontend Environment**
1. Copy file: `cp .env.production.template .env.production`
2. Edit `.env.production` and fill in:
   ```
   VITE_SUPABASE_URL=<paste your URL>
   VITE_SUPABASE_ANON_KEY=<paste anon key>
   VITE_NODE_PDF_SERVER_URL=<your Node server URL - leave blank initially>
   ```

### Phase 3: Node Server Deployment

**Choose ONE deployment method:**

#### Option A: Vercel (Recommended - Fastest)
```bash
bash deploy/01-deploy-vercel.sh
```
- ✅ Serverless, no infrastructure management
- ✅ Auto-scaling
- ✅ Free tier available
- ⏱️ ~5 minutes

**After deployment:**
1. Note the URL provided (e.g., `pdf-generator-xyz.vercel.app`)
2. Update `.env.production`:
   ```
   VITE_NODE_PDF_SERVER_URL=https://pdf-generator-xyz.vercel.app
   ```

#### Option B: Docker (Best for Control)
```bash
bash deploy/02-deploy-docker.sh
```
- ✅ Full control over environment
- ✅ Works anywhere Docker runs
- ⏱️ ~10 minutes

**After deployment:**
1. Note the URL/port
2. Update `.env.production`:
   ```
   VITE_NODE_PDF_SERVER_URL=http://your-server:3000
   ```

#### Option C: Traditional VPS (Best for Size)
```bash
bash deploy/03-deploy-vps.sh
```
- ✅ Cheapest for sustained traffic
- ✅ Full SSH access
- ⏱️ ~15 minutes

**After deployment:**
1. Note the VPS URL
2. Update `.env.production`:
   ```
   VITE_NODE_PDF_SERVER_URL=https://pdf-server.yourdomain.com
   ```

### Phase 4: Verify Node Server

After deploying Node server:
```bash
curl https://your-pdf-server/health
```

Should return:
```json
{
  "ok": true,
  "environment": "production",
  "timestamp": "2024-01-XX...",
  "service": "PDF Generation Server",
  "endpoints": {
    "health": "/health",
    "generate": "/api/generate-pdf"
  }
}
```

- [ ] Health endpoint returns status 200
- [ ] JSON output is valid
- [ ] Environment shows "production"

### Phase 5: Frontend Deployment

1. Update and commit `.env.production` with Node server URL
2. Deploy frontend:
   ```bash
   bash deploy/04-deploy-frontend.sh
   ```
   
   OR

   If using Vercel for frontend:
   ```bash
   npm run deploy
   ```
   
   OR
   
   If using Netlify:
   ```bash
   npm run deploy  # configured in package.json
   ```

**After deployment:**
- [ ] Frontend is accessible at your production URL
- [ ] "Download HTML" button still works
- [ ] No build errors in deployment logs

### Phase 6: Edge Function Deployment

1. Deploy via Supabase CLI:
   ```bash
   bash deploy/05-deploy-edge-function.sh
   ```

2. Set Edge Function environment variable manually:
   - Go to: https://app.supabase.com → Project → Edge Functions
   - Click: `generate-full-record-documentation-pdf`
   - Click: Settings (gear icon) → Environment Variables
   - Add: `NODE_PDF_SERVER_URL=https://your-pdf-server-url`

**Verify deployment:**
```bash
supabase functions list
```

Will show:
```
NAME                                              STATUS  CREATED AT
generate-full-record-documentation-pdf            Active  2024-01-XX...
```

### Phase 7: Smoke Testing

**🔴 Critical Test 1: PDF Download**
1. Log in to application as admin
2. Find a record with full documentation
3. Click "Download PDF"
4. ✅ Should download PDF without 500 error
5. ✅ PDF should have styling (blue border, 2-column layout)
6. ✅ PDF content should match "Download HTML" output

**Test Test 2: Health Check**
```bash
curl https://your-pdf-server/health | jq .
```
- ✅ Returns {"ok": true, ...}
- ✅ Status code 200

**Test 3: Admin-Only Enforcement**
1. Log out
2. Access: `https://your-pdf-server/api/generate-pdf?record_id=123`
3. ✅ Should return 403 Forbidden

**Test 4: Fallback Chain**
1. If Node server is down:
   - ✅ Download PDF should still work via Edge Function
2. If Edge Function environment variable not set:
   - ✅ Edge Function should return helpful error message

## Deployment Coordinates

| Component | Technology | Deployment Time | Recommended |
|-----------|-----------|-----------------|------------|
| Node Server | Vercel | ~5 min | ✅ Yes |
| Node Server | Docker | ~10 min | ⭐ For control |
| Node Server | VPS | ~15 min | 💰 For cost |
| Frontend | Vercel | ~3 min | ✅ Yes |
| Frontend | Netlify | ~3 min | ✅ Yes |
| Edge Function | Supabase CLI | ~2 min | ✅ Built-in |

## Troubleshooting

### PDF Download Returns 500 Error
1. Check Node server is running: `curl https://your-pdf-server/health`
2. Check environment variables:
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` set correctly
   - [ ] `FRONTEND_URL` matches actual frontend
3. Check logs: 
   - Vercel: Dashboard → Deployments → Function logs
   - Docker: `docker logs ucc-ipo-pdf-generator`
   - VPS: `journalctl -u pdf-generator -n 50`

### PDF Styling Doesn't Match HTML
1. Verify `src/lib/sharedHTMLTemplate.ts` is up to date
2. Verify Node and frontend using same template
3. Check Playwright settings (must be `screen` media)
4. Verify CSS color preservation flags present:
   ```css
   html, body {
     -webkit-print-color-adjust: exact !important;
     print-color-adjust: exact !important;
     color-adjust: exact !important;
   }
   ```

### Health Endpoint Returns 503
1. Check environment variables are set in Node process
2. Verify Supabase credentials are correct
3. Check Node server logs for startup errors

### Permission Denied: 403
PDF generation is admin-only. Verify:
1. User has admin role in Supabase
2. JWT token is valid
3. Authorization header is being passed correctly

## Quick Reference Commands

```bash
# Preparation
bash prepare-deployment.sh

# Master deployer (interactive menu)
bash deploy/00-deploy-master.sh

# Individual components
bash deploy/01-deploy-vercel.sh
bash deploy/02-deploy-docker.sh
bash deploy/03-deploy-vps.sh
bash deploy/04-deploy-frontend.sh
bash deploy/05-deploy-edge-function.sh

# Verify deployment
curl https://your-pdf-server/health

# View logs
# Vercel: Open dashboard
# Docker: docker logs ucc-ipo-pdf-generator
# VPS: journalctl -u pdf-generator -n 50

# Redeploy after changes
bash deploy/04-deploy-frontend.sh  # frontend changes
bash deploy/05-deploy-edge-function.sh  # Edge Function changes
```

## Rollback Plan

If deployment fails:

1. **Frontend issues**: Redeploy previous version from your deployment platform
2. **Node server issues**: 
   - Vercel: Redeploy previous version
   - Docker: `docker run` with previous image tag
   - VPS: `git checkout previous-tag && npm install && npm run build`
3. **Edge Function issues**: Redeploy without `NODE_PDF_SERVER_URL` env var (falls back to error state)

## Post-Deployment Monitoring

After going live, monitor:

1. **Error tracking**: Set up error monitoring (Sentry, LogRocket)
2. **Performance**: Monitor PDF generation times (should be <5s)
3. **Uptime**: Monitor health endpoint every 5 minutes
4. **Usage**: Track PDF downloads to ensure system is working

## Success Criteria

✅ Deployment is complete when:
- [ ] Health endpoint returns 200
- [ ] PDF downloads without 500 error
- [ ] PDF styling matches HTML download
- [ ] Non-admin users see 403 permission error
- [ ] All smoke tests pass
- [ ] No errors in production logs

## Support

For issues:
1. Check this guide's Troubleshooting section
2. Review deployment logs (output from bash scripts)
3. Check [PRODUCTION_PDF_DEPLOYMENT.md](../PRODUCTION_PDF_DEPLOYMENT.md)
4. Review [PDF_GENERATION_QUICK_REFERENCE.md](../PDF_GENERATION_QUICK_REFERENCE.md)
