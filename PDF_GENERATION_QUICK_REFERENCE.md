#  PDF Generation - Quick Reference Card

## Problem → Solution

| Issue | Fix |
|-------|-----|
| 500 error on PDF download | PDF generation moved to Node.js server |
| Chrome not available in Edge Function | Deno can't run Chromium → Use Node |
| PDF doesn't match HTML styling | Shared template + screen media emulation |

---

## Deployment Quick Start

### 1️⃣ Deploy Node Server

```bash
# Vercel
cd server && vercel --prod

# Docker
docker build -t pdf-generator . && docker run -p 3000:3000 ...

# Traditional
cd server && npm install --production && npm start
```

### 2️⃣ Set Environment Variables

**Node Server** (`.env`):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
```

**Edge Function** (Supabase Dashboard):
```
NODE_PDF_SERVER_URL=https://your-pdf-server.com
```

**Frontend** (`.env.production`):
```
VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com
```

### 3️⃣ Build & Deploy Frontend

```bash
npm run build && npm run deploy
```

### 4️⃣ Deploy Edge Function

```bash
supabase functions deploy generate-full-record-documentation-pdf
```

---

## Verification

### ✅ Health Check
```bash
curl https://your-pdf-server.com/health
# Expected: {"ok": true, ...}
```

### ✅ PDF Generation
```bash
curl -X POST https://your-pdf-server.com/api/generate-full-record-pdf \
  -H "Authorization: Bearer JWT" \
  -d '{"record_id":"test-id"}'

# Expected: {"success": true, "url": "...", ...}
```

### ✅ UI Test
1. Login as admin
2. Click "Download PDF"
3. Verify PDF downloads
4. Open & verify styling matches HTML download

---

## Critical Files

| Path | Purpose | Size |
|------|---------|------|
| `src/lib/sharedHTMLTemplate.ts` | Shared HTML/CSS | 360+ lines |
| `server/src/utils/pdfGenerator.ts` | Playwright settings | 50 lines |
| `supabase/functions/.../index.ts` | Proxy (no Playwright!) | 160 lines |
| `src/utils/generateFullRecordPDF.ts` | Frontend service | 40 lines |

---

## Key Settings

### Playwright (Must be 'screen', not 'print')
```typescript
await page.emulateMedia({ media: 'screen' });  // ✅ Preserves colors
```

### CSS Color Preservation
```css
-webkit-print-color-adjust: exact !important;
print-color-adjust: exact !important;
```

### HTML Template Location
```
src/lib/sharedHTMLTemplate.ts  ← Shared by frontend & Node server
```

---

## Common Issues & Fixes

| Error | Fix |
|-------|-----|
| "Executable doesn't exist" | Edge Function trying Playwright (wrong). Ensure NODE_PDF_SERVER_URL set |
| "NODE_PDF_SERVER_URL not configured" | ✅ Expected if not using proxy. Set in Edge Function env to enable proxy |
| "Not authorized" / 403 | User is not admin. Check database role = 'admin' |
| PDF colors wrong | Make sure Playwright uses `media: 'screen'` not `media: 'print'` |
| No PDF button in UI | Check admin role enforcement, may be hidden for non-admin |

---

## Monitoring Dashboard URLs

- **Health**: https://your-pdf-server.com/health
- **Supabase Functions**: https://app.supabase.com/project/[id]/functions
- **Supabase Storage**: https://app.supabase.com/project/[id]/storage/certificates

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                            │
│ • Download PDF Button                                       │
│ • generateFullRecordPDF() service                           │
│ • Shared HTML template library                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌──────────────┐      ┌──────────────────┐
│ Node Server  │      │ Edge Function    │
│ :3000        │      │ (PROXY ONLY)     │
│              │      │                  │
│ • Validates  │      │ • Validates      │
│   JWT/Admin  │◄─────┤   JWT/Admin      │
│ • Generates  │      │ • Forwards to    │
│   HTML       │      │   Node Server    │
│ • Playwright │      │ • NO Playwright  │
│   → PDF      │      │ • NO Chromium    │
│ • Uploads to │      │                  │
│   Storage    │      │ ✅ Proper Proxy  │
│              │      │                  │
│ ✅ Works!    │      │ ⚠️ Optional      │
└──────┬───────┘      └──────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Supabase Storage             │
│ /certificates/full-record... │
│ /2024/01/REF-001.pdf         │
└──────────────────────────────┘
```

---

## Testing Checklist (Quick)

- [ ] `curl /health` returns 200 ✅
- [ ] PDF generation endpoint responds
- [ ] Downloaded PDF opens in viewer
- [ ] Blue border (#2563eb) visible in PDF
- [ ] Grid layout (2 columns) intact
- [ ] Admin-only: admin = works, non-admin = 403
- [ ] Multiple downloads don't timeout

---

## Emergency Procedures

### Server Down?
```bash
# 1. Check status
curl https://your-pdf-server.com/health

# 2. Restart service
systemctl restart pdf-generator
# OR pm2 restart pdf-generator
# OR docker restart pdf-generator

# 3. Check logs
tail -f /var/log/pdf-generator.log | grep ERROR
```

### PDFs in Wrong Format?
```bash
# Check Playwright media setting
grep "emulateMedia" server/src/utils/pdfGenerator.ts
# Should show: media: 'screen'  ← CORRECT
```

### Edge Function Not Working?
```bash
# Ensure:
# 1. NODE_PDF_SERVER_URL is set in Edge Function env
# 2. Redeploy: supabase functions deploy ...
# 3. Node server is accessible
# 4. Check logs: supabase functions logs
```

---

## Key Takeaways

1. **Architecture**: Frontend → Node server → PDF + Storage
2. **Why Node**: Deno Edge Functions can't run Chromium/Playwright
3. **Styling Parity**: Shared template + `emulateMedia('screen')`
4. **Admin-Only**: Enforced at both Node and Edge Function
5. **Error Handling**: Clear messages for configuration issues
6. **Health Endpoint**: Monitor via `/health`

---

## Documentation Files

| File | Purpose |
|------|---------|
| `PDF_GENERATION_IMPLEMENTATION_SUMMARY.md` | Complete overview |
| `PRODUCTION_PDF_DEPLOYMENT.md` | Deployment guide |
| `PDF_GENERATION_TESTING_CHECKLIST.md` | QA procedures |
| **THIS FILE** | Quick reference |

---

## SOS: When Something Breaks

```bash
# 1. Check everything is accessible
curl https://your-pdf-server.com/health
curl https://your-project.supabase.co/auth/v1/health

# 2. Check env vars are set correctly
env | grep SUPABASE
env | grep NODE_PDF

# 3. Check Node server logs
tail -f server.log | grep "\\[PDF\\]"

# 4. Test PDF generation directly
curl -X POST https://your-pdf-server.com/api/generate-full-record-pdf \
  -H "Authorization: Bearer VALID_JWT" \
  -d '{"record_id":"TEST_ID"}'

# 5. Redeploy if config was changed
vercel --prod
supabase functions deploy ...
npm run deploy

# 6. If all else fails, restart
systemctl restart pdf-generator
```

---

**Version**: 1.0 Production
**Last Updated**: 2024
**Status**: ✅ Ready to Deploy
