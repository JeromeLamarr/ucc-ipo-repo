# PDF Generation Fix - Quick Start (5 Minutes)

## 🎯 What You Need to Do

The production bug (500 error on "Download PDF") is **FIXED**. Follow these 3 steps:

---

## Step 1: Start Node PDF Server (2 minutes)

```bash
cd server
npm install
npm run dev
```

**Expected Output:**
```
🚀 PDF Generation Server running on port 3000
✅ Health check: http://localhost:3000/health
📄 PDF Endpoint: POST http://localhost:3000/api/generate-full-record-pdf
```

---

## Step 2: Configure Frontend (1 minute)

Create/Edit `src/.env.local`:
```
VITE_NODE_PDF_SERVER_URL=http://localhost:3000
```

Or the frontend auto-detects localhost during development.

---

## Step 3: Test It Works (2 minutes)

```bash
# Terminal 2
npm run dev
# Open http://localhost:5173
# Log in as admin
# Go to any record
# Click "Download PDF"
# ✅ Should download as PDF!
```

---

## ✅ Verify It Works

**In browser console, you should see:**
```
[PDF] Attempting to generate PDF via Node server: http://localhost:3000
[PDF] Successfully generated via Node server
```

**Downloaded file should:**
- Open in PDF reader ✅
- Show all record data ✅
- Match "Download HTML" design ✅

---

## 🚀 For Production

### Option A: Deploy Node Server (Recommended)

```bash
# Build
cd server
npm run build

# Deploy dist/ to your hosting (Vercel, Railway, etc.)
# Set environment variables:
#   SUPABASE_URL=https://...
#   SUPABASE_SERVICE_KEY=xxx
#   NODE_ENV=production
#   PORT=3000
```

### Option B: Quick Docker Deploy

```bash
# From project root
docker build -f server/Dockerfile -t pdf-generator .
docker run -p 3000:3000 \
  -e SUPABASE_URL=https://... \
  -e SUPABASE_SERVICE_KEY=xxx \
  pdf-generator
```

### Update Frontend for Production

Add to `frontend/.env.production`:
```
VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com
```

---

## 📊 Why This Works

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| **500 Error** | Deno (Edge Function) can't run Chromium | Node.js server CAN run Chromium ✅ |
| **PDF Gen Fails** | Platform limitation in Edge Function | Moved to Node where it works |
| **No Alternative?** | Can't use client-side PDF libs (per requirements) | Server-side PDF generation only option |

---

## 🔒 Security

✅ JWT validated on server

✅ Admin-only (role checked)

✅ Same security as rest of app

❌ Can't access without valid token

---

## 📁 What Changed

### New (Server)
- `server/` - Node.js PDF server
- `server/src/server.ts` - Express app
- `server/src/routes/pdf.ts` - PDF endpoint
- `server/README.md` - Full docs

### Modified (Fixes)
- `supabase/functions/.../index.ts` - Now proxies to Node
- `src/utils/generateFullRecordPDF.ts` - Tries Node first

### Unchanged (Works as expected)
- Frontend "Download HTML" button
- HTML template & design
- Admin security model
- All other features

---

## ⚡ Quick Commands

```bash
# Start dev server
cd server && npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Test Node endpoint directly
curl -X POST http://localhost:3000/api/generate-full-record-pdf \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"record_id":"test-id"}'
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| "Can't connect to PDF server" | `npm run dev` in server folder |
| "Only admins can..." | Make user admin in Supabase |
| Download fails | Check Node server logs for errors |
| File not valid PDF | Check server had no Chromium errors |

---

## ✨ What's Better Now

**Before:**
```
❌ Download PDF button: 500 Error
❌ Logs: chromium.launch failed
❌ Users can't download PDFs
```

**After:**
```
✅ Download PDF button: Works!
✅ Logs: Clear & helpful
✅ Users get valid PDFs
```

---

## 📚 Full Documentation

- `server/README.md` - Complete setup & API docs
- `PDF_GENERATION_FIX_SUMMARY.md` - Implementation details
- `TESTING_PDF_GENERATION_FIX.md` - Full test plan

---

## 🎉 Status

**✅ READY TO USE**

1. Start Node server → `npm run dev` (in server folder)
2. Frontend auto-detects → `npm run dev` (in root)
3. Test → Click "Download PDF"
4. Deploy → Follow production steps above

---

**That's it! 🚀 The 500 error is fixed.**
