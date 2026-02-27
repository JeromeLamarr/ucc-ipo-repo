# PDF Generation Server

A Node.js Express server for generating high-quality PDFs from HTML with Chromium/Playwright support.

## Why This Exists

**Problem:** Supabase Edge Functions (Deno runtime) cannot execute Chromium/Playwright for PDF generation.

```
Error: browserType.launch: Executable doesn't exist at /home/deno/.cache/ms-playwright/.../chrome-linux
```

**Solution:** This dedicated Node.js server handles PDF generation with full Chromium support while the Edge Function acts as a proxy or the frontend calls directly.

---

## Architecture

```
Frontend (React/Vite)
   ↓
   ├─→ Node.js PDF Server (Port 3000)
   │   ├─ Validates JWT
   │   ├─ Fetches record from Supabase
   │   ├─ Generates HTML
   │   ├─ Converts HTML → PDF with Playwright
   │   ├─ Uploads to Supabase Storage
   │   └─ Returns signed URL
   │
   └─→ Supabase Edge Function (optional proxy)
       └─→ Forwards to Node server if configured
```

---

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**.env contents:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
PORT=3000
NODE_ENV=development
SERVICE_SECRET=your-random-secret-here
```

**Getting your keys:**
- `SUPABASE_URL`: From Supabase project settings
- `SUPABASE_SERVICE_KEY`: From Supabase project → API → Service role key (DANGEROUS - use only on server!)

### 3. Run Development Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

Health check: `curl http://localhost:3000/health`

---

## Deployment

### Option A: Self-Hosted (Recommended)

1. Build the server:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Configure frontend to use your server URL:
   ```bash
   # In frontend .env
   VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com
   ```

### Option B: Vercel/Netlify Functions

Convert to serverless function:

1. Update `package.json` to build to `api/` folder
2. Deploy with Vercel/Netlify
3. Endpoint becomes: `https://your-domain.com/api/generate-full-record-pdf`

### Option C: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package* ./
RUN npm ci --only=production
COPY dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## API Endpoints

### `POST /api/generate-full-record-pdf`

Generate a full record documentation PDF.

**Headers:**
```
Authorization: Bearer <supabase-jwt>
Content-Type: application/json
```

**Body:**
```json
{
  "record_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "url": "https://..../signed-url-for-pdf",
  "fileName": "UCC_IPO_Record_IP-2025-PT-00001.pdf",
  "path": "full-record-docs/2025/02/IP-2025-PT-00001.pdf"
}
```

**Error Response (401/403/500):**
```json
{
  "error": "Only admins can generate full record PDFs",
  "details": "..."
}
```

### `GET /health`

Health check endpoint.

---

## Features

✅ **Admin-Only Security:**
- Validates Supabase JWT
- Checks user role (must be `admin`)
- Full row-level security (RLS) compatible

✅ **Matches Frontend Design:**
- Uses exact same HTML template as "Download HTML" button
- Preserves all styling and formatting
- A4 paper size with proper margins

✅ **Production-Ready PDF:**
- Chromium rendering for complex CSS
- Print media emulation
- Proper pagination
- Color-safe styling with `print-color-adjust: exact`

✅ **Automatic Storage Management:**
- Uploads to Supabase Storage (`certificates` bucket)
- Generates signed URLs (1-hour expiry)
- Organized file structure by date

---

## Frontend Integration

The frontend automatically:

1. **Attempts Node server first** (if `VITE_NODE_PDF_SERVER_URL` is configured)
2. **Falls back to Edge Function** (if Node unavailable)
3. **Shows appropriate errors** with troubleshooting hints

```typescript
// src/utils/generateFullRecordPDF.ts
export async function generateAndDownloadFullRecordPDF(recordId: string): Promise<string> {
  // Tries Node server → Falls back to Edge Function
}
```

### Configure Frontend

Add to frontend `.env`:
```
VITE_NODE_PDF_SERVER_URL=http://localhost:3000  # Dev
VITE_NODE_PDF_SERVER_URL=https://your-server.com  # Production
```

---

## Troubleshooting

### "PDF generation service not available"
- Node server isn't running
- `VITE_NODE_PDF_SERVER_URL` not configured
- **Fix:** Start server with `npm run dev`, or set environment variable

### "Only admins can generate full record PDFs"
- User doesn't have `role='admin'` in `users` table
- **Fix:** Update user role in Supabase dashboard

### "Failed to generate PDF: timeout"
- HTML rendering took too long
- **Fix:** Increase timeout in `server/src/utils/pdfGenerator.ts`

### "Failed to upload PDF to storage"
- `certificates` bucket doesn't exist
- **Fix:** Create bucket in Supabase Storage dashboard

---

## Logging

Logs show detailed progress:

```
[PDF Generation] Starting for record: 550e8400-e29b-41d4-a716-446655440000
[PDF Generation] Generating HTML for record: ...
[PDF Generation] Converting HTML to PDF using Playwright...
[PDF Generation] Uploading PDF to storage: full-record-docs/2025/02/IP-2025-PT-00001.pdf
[PDF Generation] Success! URL: https://...
```

---

## Development

### Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build
```

Outputs to `dist/` folder.

---

## Why Not Fixed in Edge Function?

Supabase Edge Functions run on Deno, which:
- Cannot execute Chromium/Puppeteer
- Has no headless browser support
- Has limited system access

The Node server provides native Chromium support via Playwright, which is the only reliable way to generate high-quality PDFs with proper CSS rendering.

---

## Security Notes

- ⚠️ `SUPABASE_SERVICE_KEY` is **private** - never expose in frontend code
- Always validate JWT on server-side
- Use HTTPS in production
- Environment variables are loaded from `.env` (add to `.gitignore`)
- Rate-limiting recommended for production

---

## Support

For issues or questions:
1. Check logs: `npm run dev` shows detailed output
2. Verify environment variables are set
3. Ensure Supabase credentials are correct
4. Check user has admin role
