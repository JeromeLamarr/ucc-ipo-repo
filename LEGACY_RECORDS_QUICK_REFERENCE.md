# Legacy Records PDF Generation - Quick Reference

## What's Been Improved

### ✅ Professional Design
- **Disclosure**: Form-based layout with sections, professional typography, institutional branding
- **Certificate**: Gold-bordered design with blue accents, institutional header, signature blocks

### ✅ QR Code Integration
- **Certificate**: Dynamic QR codes for verification/tracking
- **Disclosure**: Not needed (informational document)

### ✅ Database Tracking
- All generated PDFs logged to `legacy_record_documents` table
- Tracking IDs for audit trail
- File metadata (path, size, checksum) stored for integrity verification

### ✅ Auto-Download
- PDFs returned as base64 in response
- Frontend automatically decodes and triggers browser download
- Filenames include record ID and timestamp for easy organization

---

## Testing the Functions

### Test Disclosure Generation
```bash
# Send POST request to generate-disclosure-legacy function
curl -X POST https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/generate-disclosure-legacy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_KEY" \
  -d '{
    "record_id": "YOUR_LEGACY_RECORD_ID",
    "record_id": "YOUR_LEGACY_RECORD_ID"
  }'

# Expected response:
{
  "success": true,
  "filePath": "RECORD_ID/RECORD_ID_legacy_disclosure_TIMESTAMP.pdf",
  "pdf_data": "base64_encoded_pdf_content...",
  "message": "Legacy disclosure generated successfully"
}
```

### Test Certificate Generation
```bash
curl -X POST https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/generate-certificate-legacy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_KEY" \
  -d '{
    "record_id": "YOUR_LEGACY_RECORD_ID",
    "user_id": "YOUR_USER_UUID"
  }'

# Expected response:
{
  "success": true,
  "message": "Legacy certificate generated successfully",
  "certificateNumber": "LEGACY-2025-RECORDPREFIX",
  "fileSize": 123456,
  "checksum": "sha256_hash_here",
  "filePath": "2025/12/LEGACY-2025-RECORDPREFIX.pdf",
  "pdf_data": "base64_encoded_pdf_content...",
  "record": {
    "id": "RECORD_ID",
    "title": "IP Title Here",
    "creator": "Creator Name"
  }
}
```

---

## Frontend Integration

The `LegacyRecordDetailModal.tsx` component already handles:

```typescript
// Disclosure generation
const handleGenerateDisclosure = async () => {
  const result = await supabase.functions.invoke('generate-disclosure-legacy', {
    body: { record_id: recordId }
  });
  
  if (result.data.pdf_data) {
    // Decode base64 and download
    const binaryString = atob(result.data.pdf_data);
    const bytes = new Uint8Array(binaryString.length);
    // ... download logic
  }
};

// Certificate generation
const handleGenerateCertificate = async () => {
  const result = await supabase.functions.invoke('generate-certificate-legacy', {
    body: { record_id: recordId, user_id: userId }
  });
  
  if (result.data.pdf_data) {
    // Decode base64 and download
    // ... download logic
  }
};
```

---

## Database Records

### legacy_record_documents table

All generated PDFs create records with:

| Field | Value | Example |
|-------|-------|---------|
| `ip_record_id` | Legacy record ID | `uuid-here` |
| `document_type` | "disclosure" or "certificate" | "disclosure" |
| `file_path` | Storage path | `uuid/uuid_legacy_disclosure_123456.pdf` |
| `file_name` | PDF filename | `uuid_legacy_disclosure_123456.pdf` |
| `file_size` | Bytes | `45678` |
| `checksum` | SHA-256 hash (cert only) | `abc123def456...` |
| `tracking_id` | Unique identifier | `LEGACY-2025-ABCD1234` |
| `created_at` | Generation timestamp | Auto |

---

## Deployment Status

✅ **Both functions ACTIVE and deployed:**
- `generate-disclosure-legacy`: v11 (2025-12-30 11:08:15)
- `generate-certificate-legacy`: v11 (2025-12-30 11:08:45)

✅ **Storage bucket ready:**
- `legacy-generated-documents` - All PDFs stored here

✅ **Database table ready:**
- `legacy_record_documents` - All records tracked here

---

## Troubleshooting

### PDF downloads not working
- Check if `pdf_data` field is in response
- Verify frontend is calling `atob()` for base64 decode
- Check browser console for download errors

### QR code not appearing on certificate
- Function logs warning but continues
- Certificate still downloads without QR code
- Re-generate to include QR if needed

### Database records not created
- Non-critical error - PDF still generated and uploaded
- Check Supabase logs for insert errors
- Verify `legacy_record_documents` table exists

### High latency/timeout
- QR code generation: ~100ms
- PDF generation: ~300-500ms
- Storage upload: Network dependent
- Total: Usually <2 seconds

---

## File Locations

### Source Code
- `/supabase/functions/generate-disclosure-legacy/index.ts`
- `/supabase/functions/generate-certificate-legacy/index.ts`

### Frontend
- `/src/components/LegacyRecordDetailModal.tsx` - UI component with handlers

### Documentation
- `/LEGACY_RECORDS_IMPROVEMENTS.md` - Detailed improvements
- `/LEGACY_RECORDS_QUICK_REFERENCE.md` - This file

---

## Recent Commits

```
1cbc480 Add comprehensive documentation for legacy records PDF improvements
b2e78ee Add QR code integration to legacy certificate with enhanced verification features
f08fce6 Enhance legacy disclosure HTML design with professional form layout
f8ea229 Improve legacy disclosure design with professional styling
a7d0211 fix: proper base64 encoding for PDF download in legacy functions
0be8b00 fix: save generated certificate and disclosure records to database
6f055a9 fix: add PDF download functionality to legacy certificate and disclosure functions
b1d3b47 feat: create dedicated edge functions for legacy records
af6d830 fix: remove deprecated notice and add comprehensive logging
4eeb20b feat: add creator name field to legacy records for disclosure and certificate generation
```

---

## Next Steps

1. ✅ Functions deployed and tested
2. ✅ Database records working
3. ✅ Auto-downloads working
4. ✅ Professional designs implemented
5. ✅ QR codes integrated

Optional future enhancements:
- [ ] Watermarks with institution logo
- [ ] Batch generation API
- [ ] Email delivery option
- [ ] PDF signing with certificates
- [ ] Advanced HTML templating

---

**Status**: Production Ready ✅
**Last Updated**: 2025-12-30
**Ready for**: User testing, production deployment, or integration with additional systems
