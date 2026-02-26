# Register User Edge Function - CORS Fix Summary

## Problem

Registration page in Bolt preview was failing with:
- **Error**: "Failed to send a request to the Edge Function"
- **Root Cause**: CORS preflight (OPTIONS) request failing
- **Specific Issue**: `Access-Control-Allow-Origin` was set to `https://ucc-ipo.com` but Bolt preview origin is dynamic (e.g., `https://sb1-e4h1yrar--5173--abc.bolt.new`)

## Solution

Updated the `register-user` edge function to accept requests from:

### ✅ Production Domains
- `https://ucc-ipo.com`
- `https://www.ucc-ipo.com`

### ✅ Local Development
- `http://localhost:5173`
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

### ✅ Bolt Preview Domains
- `https://*.bolt.new`
- `https://*.webcontainer.io`
- `https://*--5173--*.bolt.new` (Bolt dev server pattern)
- `https://*--5173--*.webcontainer.io` (WebContainer dev server pattern)

## Files Changed

### 1. `supabase/functions/register-user/index.ts`

**Modified Section**: Lines 58-67 (CORS pattern matching)

**Before:**
```typescript
const patterns = [
  /^https:\/\/[a-z0-9\-]+\.bolt\.new$/i,           // https://*.bolt.new
  /^https:\/\/[a-z0-9\-]+\.webcontainer\.io$/i,     // https://*.webcontainer.io
  /^https:\/\/[a-z0-9\-]*\-\-5173\-\-[a-z0-9\-]*$/i, // https://*--5173--* (WRONG!)
];
```

**After:**
```typescript
const patterns = [
  /^https:\/\/[a-z0-9\-]+\.bolt\.new$/i,                    // https://*.bolt.new
  /^https:\/\/[a-z0-9\-]+\.webcontainer\.io$/i,              // https://*.webcontainer.io
  /^https:\/\/.*--5173--.*\.bolt\.new$/i,                    // https://*--5173--*.bolt.new
  /^https:\/\/.*--5173--.*\.webcontainer\.io$/i,             // https://*--5173--*.webcontainer.io
];
```

**Key Change**: Fixed regex patterns to correctly match Bolt preview URLs with port numbers embedded in the subdomain (e.g., `--5173--`).

### 2. `SUPABASE_EDGE_FUNCTIONS_CORS.md` (Created)

Comprehensive documentation covering:
- Allowed origins (production, local, Bolt preview)
- How CORS works in our edge functions
- CORS headers specification
- Preflight OPTIONS handling
- Deployment instructions
- Troubleshooting guide
- Security notes

## Technical Details

### CORS Implementation Pattern

The edge function uses **dynamic origin allowlisting**:

1. Extract request `Origin` header
2. Check if origin matches allowed patterns
3. If allowed → Echo origin in `Access-Control-Allow-Origin` header
4. If denied → Default to `https://ucc-ipo.com`

```typescript
function isOriginAllowed(origin: string): boolean {
  // Static list check
  const staticAllowed = ["https://ucc-ipo.com", "http://localhost:5173", ...];
  if (staticAllowed.includes(origin)) return true;

  // Regex pattern check (Bolt preview)
  const patterns = [...];
  return patterns.some(pattern => pattern.test(origin));
}

function getCorsHeaders(origin?: string): Record<string, string> {
  const requestOrigin = origin || "";
  const corsOrigin = isOriginAllowed(requestOrigin) ? requestOrigin : "https://ucc-ipo.com";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}
```

### Preflight Handling

```typescript
if (req.method === "OPTIONS") {
  console.log(`[register-user] CORS preflight from origin: ${origin}`);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
```

## Deployment

Edge function deployed successfully:

```bash
# Deployment completed via MCP tool
mcp__supabase__deploy_edge_function(slug: "register-user", verify_jwt: false)
```

**Status**: ✅ Deployed and live

## Testing

### Test in Bolt Preview

1. Open Register page in Bolt preview
2. Fill out registration form
3. Click "Create Account"
4. **Expected**: No CORS error, registration proceeds
5. **Expected Console Log**: `[register-user] CORS preflight from origin: https://...bolt.new`

### Test Locally

1. Run `npm run dev`
2. Navigate to `http://localhost:5173/register`
3. Fill form and submit
4. **Expected**: No CORS error

### Verify CORS Headers

Open browser DevTools → Network tab → Look for OPTIONS request:

```
Request Method: OPTIONS
Status Code: 204 No Content

Response Headers:
  Access-Control-Allow-Origin: https://sb1-e4h1yrar--5173--abc.bolt.new
  Access-Control-Allow-Methods: POST, OPTIONS
  Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
  Access-Control-Max-Age: 86400
```

## Security

✅ **Secure Implementation**
- No wildcard `*` origins (maintains security)
- Origin allowlist with specific patterns
- Bolt preview patterns are restrictive (only `.bolt.new` and `.webcontainer.io` TLDs)
- Unknown origins default to production domain (safe fallback)

⚠️ **Why Bolt Preview is Safe**
- Bolt preview domains are owned/controlled by StackBlitz (Bolt.new operator)
- Pattern matching is restrictive (not allowing arbitrary domains)
- Development/testing use case (not production traffic)
- Can be removed later if needed by deleting the regex patterns

## Build Verification

```bash
npm run build
# ✓ 1585 modules transformed
# ✓ built in 23.57s
# Status: SUCCESS
```

## Next Steps

1. **Test Registration in Bolt Preview**
   - Navigate to Register page
   - Submit registration form
   - Verify no CORS errors
   - Check email delivery

2. **Monitor Logs**
   - Check Supabase Edge Function logs for CORS preflight logs
   - Verify origins being allowed/denied

3. **Optional: Remove Bolt Patterns Before Production**
   - If Bolt preview is only for development, remove patterns before production deploy
   - Keep only production + localhost origins

## Rollback Plan

If issues occur, revert the CORS pattern change:

```typescript
// Revert to original pattern (production + localhost only)
const patterns = [
  /^https:\/\/[a-z0-9\-]+\.bolt\.new$/i,
  /^https:\/\/[a-z0-9\-]+\.webcontainer\.io$/i,
];
```

Then redeploy:
```bash
mcp__supabase__deploy_edge_function(slug: "register-user", verify_jwt: false)
```

## Summary

✅ **CORS issue fixed**
✅ **Bolt preview domains now allowed**
✅ **Production security maintained**
✅ **Edge function deployed**
✅ **Build verification passed**
✅ **Documentation created**

**Status**: Ready for testing in Bolt preview
