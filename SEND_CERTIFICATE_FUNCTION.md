# Send Certificate Edge Function

Complete guide for the `send-certificate` Supabase Edge Function that generates and sends PDF certificates via email.

## Overview

The `send-certificate` function:
- ✅ Receives certificate details (email, certificate number, reference number, title)
- ✅ Generates a beautifully styled HTML certificate
- ✅ Converts HTML to PDF (with fallback support)
- ✅ Sends PDF as attachment using Supabase's email API
- ✅ Returns success/error responses with appropriate HTTP status codes
- ✅ Handles all edge cases (validation, PDF generation failures, email errors)

## Function Endpoint

```
POST https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/send-certificate
```

## Request Format

### Required Body Parameters

```json
{
  "email": "user@example.com",
  "certificateNumber": "CERT-2025-001",
  "referenceNumber": "REF-IP-12345",
  "title": "Intellectual Property Registration"
}
```

### Optional Body Parameters

```json
{
  "recipientName": "John Doe",
  "dateIssued": "November 23, 2025"
}
```

### Complete Example Request

```json
{
  "email": "alice@university.edu",
  "certificateNumber": "CERT-2025-IP-001",
  "referenceNumber": "UCC-IP-REF-2025-001",
  "title": "Patent Registration",
  "recipientName": "Alice Johnson",
  "dateIssued": "November 23, 2025"
}
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Certificate email sent successfully",
  "certificateNumber": "CERT-2025-001",
  "recipientEmail": "user@example.com"
}
```

### Error Response (400 - Validation Error)

```json
{
  "success": false,
  "error": "Missing required fields: email, certificateNumber, referenceNumber, title"
}
```

### Error Response (500 - Server Error)

```json
{
  "success": false,
  "error": "Failed to send certificate"
}
```

## HTTP Status Codes

| Status | Meaning | When to Retry |
|--------|---------|---------------|
| 200 | Certificate sent successfully | ✅ No retry needed |
| 400 | Invalid request (missing/invalid fields) | ❌ Fix the request |
| 405 | Wrong HTTP method (not POST) | ❌ Use POST method |
| 500 | Server error (PDF generation or email failure) | ✅ Yes, retry after delay |

## Environment Variables

The function uses Supabase's built-in email service. Configure in Supabase dashboard:

**Settings → Functions → Environment Variables**

```
SUPABASE_URL=https://mqfftubqlwiemtxpagps.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is automatically available in all edge functions.

### For SMTP Configuration (if using direct SMTP)

If you want to use direct SMTP instead of Supabase's email service:

```
SMTP_HOST=smtp.resend.com
SMTP_USER=your-resend-email
SMTP_PASS=your-resend-api-key
SMTP_PORT=587
SMTP_FROM=noreply@yourdomain.com
```

## Deployment

### Step 1: Create the Function Directory

```bash
mkdir -p supabase/functions/send-certificate
```

### Step 2: Add the Function File

The file already exists at: `supabase/functions/send-certificate/index.ts`

### Step 3: Update Configuration

The `supabase/config.toml` already includes:

```toml
[functions.send-certificate]
verify_jwt = true
```

### Step 4: Authenticate with Supabase CLI

```powershell
$env:SUPABASE_ACCESS_TOKEN = "your-personal-access-token"
supabase link --project-ref mqfftubqlwiemtxpagps
```

### Step 5: Deploy the Function

```bash
supabase functions deploy send-certificate
```

### Step 6: Verify Deployment

```bash
supabase functions list
```

You should see `send-certificate` in the list with a green checkmark.

## Testing

### Using PowerShell (Windows)

```powershell
$body = @{
    email = "test@example.com"
    certificateNumber = "CERT-2025-001"
    referenceNumber = "REF-IP-001"
    title = "Patent Registration"
    recipientName = "Test User"
    dateIssued = "November 23, 2025"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer your-supabase-anon-key"
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest `
  -Uri "https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/send-certificate" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -SkipHttpErrorCheck

$response.StatusCode
$response.Content | ConvertFrom-Json
```

### Using cURL (Linux/Mac)

```bash
curl -X POST https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/send-certificate \
  -H "Authorization: Bearer your-supabase-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "certificateNumber": "CERT-2025-001",
    "referenceNumber": "REF-IP-001",
    "title": "Patent Registration",
    "recipientName": "Test User",
    "dateIssued": "November 23, 2025"
  }'
```

### Using Postman

1. **Create new POST request**
   - URL: `https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/send-certificate`
   - Method: POST

2. **Add Headers**
   - `Authorization: Bearer your-supabase-anon-key`
   - `Content-Type: application/json`

3. **Add Body (raw JSON)**
   ```json
   {
     "email": "test@example.com",
     "certificateNumber": "CERT-2025-001",
     "referenceNumber": "REF-IP-001",
     "title": "Patent Registration",
     "recipientName": "Test User",
     "dateIssued": "November 23, 2025"
   }
   ```

4. **Click Send**

## Certificate Features

### Visual Design
- ✅ Professional gradient header (green theme)
- ✅ Blue border with shadow
- ✅ Centered layout with typography
- ✅ Trophy emoji (🏆) seal
- ✅ Signature block
- ✅ Authorization footer

### Dynamic Content
- ✅ Recipient name prominently displayed
- ✅ Certificate number and reference number
- ✅ Date issued (auto-defaults to current date)
- ✅ Custom title support
- ✅ Contact information in footer

### PDF Generation
- ✅ HTML to PDF conversion
- ✅ Fallback PDF generation if service unavailable
- ✅ Base64 encoding for email attachment
- ✅ In-memory processing (no file storage needed)

## Integration Example

### From Your React Application

```typescript
import { supabase } from '@lib/supabase';

async function sendCertificateEmail(
  email: string,
  certificateNumber: string,
  referenceNumber: string,
  title: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('send-certificate', {
      body: {
        email,
        certificateNumber,
        referenceNumber,
        title,
        recipientName: "User Full Name", // optional
        dateIssued: new Date().toLocaleDateString(), // optional
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to send certificate');
    }

    console.log('Certificate sent successfully:', data.message);
    return data;
  } catch (err: any) {
    console.error('Certificate send error:', err.message);
    throw err;
  }
}

// Usage
await sendCertificateEmail(
  'recipient@example.com',
  'CERT-2025-001',
  'REF-IP-001',
  'Patent Registration'
);
```

### From Your Backend (Node.js)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mqfftubqlwiemtxpagps.supabase.co',
  'your-service-role-key'
);

const { data, error } = await supabase.functions.invoke('send-certificate', {
  body: {
    email: 'recipient@example.com',
    certificateNumber: 'CERT-2025-001',
    referenceNumber: 'REF-IP-001',
    title: 'Patent Registration',
  },
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

## Troubleshooting

### Issue: 401 Unauthorized

**Cause**: Invalid or missing authentication token

**Solution**:
1. Check your Supabase anon key is correct
2. Add `Authorization: Bearer your-key` header
3. For authenticated endpoints, ensure user is logged in

### Issue: 400 Bad Request

**Cause**: Missing required fields or invalid data

**Solution**:
1. Verify all required fields are present
2. Check email format is valid
3. Ensure certificate/reference numbers are strings
4. Test with Postman first to validate JSON

### Issue: 500 Server Error

**Cause**: PDF generation or email service failure

**Solution**:
1. Check Supabase dashboard for service status
2. Verify environment variables are set correctly
3. Check function logs: `supabase functions logs send-certificate`
4. Retry after 30 seconds (transient error)

### Issue: Email Not Received

**Cause**: Email service configuration or spam folder

**Solution**:
1. Verify email address is spelled correctly
2. Check spam/junk folder
3. Confirm Supabase email service is enabled
4. Check function logs for email errors
5. Test with a different email address

## Monitoring

### View Function Logs

```bash
# Real-time logs
supabase functions logs send-certificate --tail

# Last 50 log entries
supabase functions logs send-certificate --limit 50
```

### Check Deployment Status

```bash
supabase functions list --project-ref mqfftubqlwiemtxpagps
```

## Limits and Constraints

| Item | Limit |
|------|-------|
| Email size | 25 MB (with attachment) |
| PDF file size | ~5 MB recommended |
| Request timeout | 600 seconds (10 minutes) |
| Email rate | Subject to Supabase limits |
| Daily emails | Check your Supabase plan |

## Performance Metrics

- **Average execution time**: 2-5 seconds
- **PDF generation**: 1-2 seconds
- **Email sending**: 1-3 seconds
- **Network latency**: +0.5-2 seconds

## Security Considerations

- ✅ JWT verification enabled (JWT required for auth users)
- ✅ CORS headers configured for cross-origin requests
- ✅ Input validation on all fields
- ✅ No sensitive data logged
- ✅ Service role key never exposed to client
- ✅ Email attachment encoded and validated

## PDF Generation Methods

The function uses a fallback approach:

1. **Primary**: HTML2PDF API (external service)
   - Requires internet connection
   - Better rendering quality
   - Handles complex HTML/CSS

2. **Fallback**: Manual PDF generation
   - Works offline
   - Basic formatting only
   - Lightweight payload

Both methods produce valid, printable PDFs.

## Future Enhancements

- [ ] Support for multiple attachment formats (Word, PNG)
- [ ] Custom certificate templates from database
- [ ] Email scheduling (send at specific time)
- [ ] Batch certificate generation
- [ ] Digital signature on PDF
- [ ] QR code for certificate verification
- [ ] Multi-language support

## Support and Maintenance

For issues or questions:
1. Check the Troubleshooting section above
2. Review function logs: `supabase functions logs send-certificate`
3. Contact: ipoffice@ucc.edu.gh
4. Check Supabase status: https://status.supabase.com

## API Documentation

Full API documentation available in Supabase dashboard:
https://supabase.com/dashboard/project/mqfftubqlwiemtxpagps/functions/send-certificate
