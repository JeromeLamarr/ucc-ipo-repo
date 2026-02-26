# Supabase Edge Functions - CORS Configuration

## Overview

All Supabase Edge Functions in this project use dynamic CORS configuration to support multiple environments without weakening production security.

## Allowed Origins

### Production
- `https://ucc-ipo.com`
- `https://www.ucc-ipo.com`

### Local Development
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (alternative port)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

### Bolt Preview (Development/Testing)
- `https://*.bolt.new` - Standard Bolt preview domains
- `https://*.webcontainer.io` - WebContainer domains
- `https://*--5173--*.bolt.new` - Bolt dev server pattern
- `https://*--5173--*.webcontainer.io` - WebContainer dev server pattern

## How It Works

The CORS implementation uses **origin allowlisting** with pattern matching:

1. **Request arrives** → Extract `Origin` header
2. **Check against static list** → Exact match for production/local domains
3. **Check against regex patterns** → Pattern match for Bolt preview domains
4. **If allowed** → Echo back the request origin in `Access-Control-Allow-Origin`
5. **If denied** → Default to production origin `https://ucc-ipo.com`

This approach:
- ✅ **Secure**: Never uses `*` wildcard in production
- ✅ **Flexible**: Supports dynamic Bolt preview URLs
- ✅ **Compliant**: Follows CORS specification (echoes allowed origin)
- ✅ **Debuggable**: Logs origin in console for troubleshooting

## CORS Headers Set

```typescript
{
  "Access-Control-Allow-Origin": "<request-origin-if-allowed>",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400", // 24 hours
}
```

## Preflight (OPTIONS) Handling

All edge functions must handle preflight requests:

```typescript
if (req.method === "OPTIONS") {
  console.log(`[function-name] CORS preflight from origin: ${origin}`);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
```

## Functions Using This Pattern

- ✅ `register-user` - User registration with email verification
- ✅ `send-verification-code` - Email verification codes
- ✅ `verify-code` - Code verification
- ✅ `approve-applicant` - Admin applicant approval
- ✅ `get-pending-applicants` - Admin dashboard widget
- ✅ `submit-presentation-materials` - Materials submission
- ✅ All other edge functions follow the same pattern

## Deployment

Deploy any edge function after making changes:

```bash
# Using Supabase CLI (if available locally)
supabase functions deploy <function-name>

# Using MCP tool (in Bolt/automated environment)
# The deploy tool is called automatically when editing edge functions
```

## Troubleshooting CORS Issues

### Symptom: "Failed to send a request to the Edge Function"

**Check:**
1. Browser console → Look for CORS preflight error
2. Network tab → Check if OPTIONS request fails (status 0 or error)
3. Request origin → Verify it matches one of the allowed patterns

**Common Causes:**
- Origin not in allowlist (add to `isOriginAllowed` function)
- OPTIONS handler missing or not returning 204
- CORS headers missing from error responses

### Symptom: CORS error only in Bolt preview, not localhost

**Solution:**
- Bolt preview URLs are dynamic (e.g., `https://sb1-e4h1yrar--5173--whatever.bolt.new`)
- Our regex patterns handle this: `/^https:\/\/.*--5173--.*\.bolt\.new$/i`
- If still failing, check exact origin in browser DevTools and update pattern

### Symptom: Preflight passes but POST fails with CORS error

**Cause:** CORS headers not included in POST response

**Solution:** Ensure ALL responses (success, error, validation failures) include `corsHeaders`:

```typescript
return new Response(
  JSON.stringify({ success: false, error: "Something failed" }),
  {
    status: 400,
    headers: {
      ...corsHeaders,  // ← MUST include this
      "Content-Type": "application/json",
    },
  }
);
```

## Testing CORS

### Local Test
```bash
curl -X OPTIONS http://localhost:54321/functions/v1/register-user \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected: `204 No Content` with CORS headers

### Production Test
```bash
curl -X OPTIONS https://your-project.supabase.co/functions/v1/register-user \
  -H "Origin: https://ucc-ipo.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected: `204 No Content` with `Access-Control-Allow-Origin: https://ucc-ipo.com`

## Security Notes

⚠️ **Never use `Access-Control-Allow-Origin: *` in production**
- This allows any website to call your edge functions
- Our implementation only allows specific origins

⚠️ **Do not add `Access-Control-Allow-Credentials: true` unless using cookies**
- Not needed for Bearer token authentication
- If added, cannot use `*` wildcard (incompatible)

✅ **Current implementation is secure:**
- Production domains are exact matches
- Bolt preview patterns are restrictive (only `.bolt.new` and `.webcontainer.io`)
- Unknown origins default to production origin (safe fallback)
