# 📚 Deployment Step 2: API Integration

## Overview
This document covers integrating the Academic Presentation Materials API into your Supabase-first architecture.

**Architecture:** Supabase Direct + Edge Functions
**Status:** ✅ Components ready for integration

---

## 🏗️ Architecture Overview

Your frontend uses two integration patterns:
```typescript
// Pattern 1: Direct database access (via RLS)
await supabase.from('table_name').select(...);

// Pattern 2: Server logic (via Edge Functions)
await supabase.functions.invoke('function-name', {...});
```

For Academic Materials, we'll use **Pattern 1** (direct access) with RLS policies.

---

## ⚡ Quick Integration (15 minutes)

### Step 1: Update Components for Supabase Client

The `MaterialsSubmissionForm` and `MaterialsRequestAction` components need the Supabase client.

**File:** `src/components/MaterialsSubmissionForm.tsx`

Add Supabase import (already exists, but verify):
```typescript
import { supabase } from '../lib/supabase';
```

### Step 2: Create Helper Service

Create a new file for materials API operations:

**File:** `src/services/materialsService.ts`

```typescript
import { supabase } from '../lib/supabase';

export const materialsService = {
  // Request materials (admin)
  async requestMaterials(ipRecordId: string, adminId: string) {
    const { data, error } = await supabase
      .from('presentation_materials')
      .upsert({
        ip_record_id: ipRecordId,
        status: 'requested',
        materials_requested_at: new Date().toISOString(),
        materials_requested_by: adminId,
      }, {
        onConflict: 'ip_record_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Submit materials (applicant)
  async submitMaterials(ipRecordId: string, applicantId: string, files: {
    posterUrl: string;
    posterName: string;
    posterSize: number;
    paperUrl: string;
    paperName: string;
    paperSize: number;
  }) {
    const { data, error } = await supabase
      .from('presentation_materials')
      .update({
        status: 'submitted',
        materials_submitted_at: new Date().toISOString(),
        submitted_by: applicantId,
        poster_file_url: files.posterUrl,
        poster_file_name: files.posterName,
        poster_file_size: files.posterSize,
        paper_file_url: files.paperUrl,
        paper_file_name: files.paperName,
        paper_file_size: files.paperSize,
      })
      .eq('ip_record_id', ipRecordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get materials status
  async getMaterials(ipRecordId: string) {
    const { data, error } = await supabase
      .from('presentation_materials')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  // Reject materials (admin)
  async rejectMaterials(materialId: string) {
    const { data, error } = await supabase
      .from('presentation_materials')
      .update({
        status: 'requested',
        poster_file_url: null,
        poster_file_name: null,
        poster_file_size: null,
        paper_file_url: null,
        paper_file_name: null,
        paper_file_size: null,
        materials_submitted_at: null,
      })
      .eq('id', materialId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
```

### Step 3: Update Components to Use Service

**File:** `src/components/MaterialsSubmissionForm.tsx`

Update the file upload handler:

```typescript
import { materialsService } from '../services/materialsService';

// In your submit handler:
const handleSubmit = async () => {
  try {
    // Upload files to storage first
    const posterPath = `presentations/${ipRecordId}/poster.${posterFile.name.split('.').pop()}`;
    const paperPath = `presentations/${ipRecordId}/paper.${paperFile.name.split('.').pop()}`;

    // Upload poster
    const { data: posterData, error: posterError } = await supabase.storage
      .from('presentation-materials')
      .upload(posterPath, posterFile, { upsert: true });

    if (posterError) throw posterError;

    // Upload paper
    const { data: paperData, error: paperError } = await supabase.storage
      .from('presentation-materials')
      .upload(paperPath, paperFile, { upsert: true });

    if (paperError) throw paperError;

    // Get public URLs
    const posterUrl = supabase.storage
      .from('presentation-materials')
      .getPublicUrl(posterPath).data.publicUrl;

    const paperUrl = supabase.storage
      .from('presentation-materials')
      .getPublicUrl(paperPath).data.publicUrl;

    // Submit materials
    await materialsService.submitMaterials(ipRecordId, applicantId, {
      posterUrl,
      posterName: posterFile.name,
      posterSize: posterFile.size,
      paperUrl,
      paperName: paperFile.name,
      paperSize: paperFile.size,
    });

    onSuccess?.();
  } catch (error) {
    console.error('Submission error:', error);
    onError?.(error.message);
  }
};
```

**File:** `src/components/MaterialsRequestAction.tsx`

Update the request handler:

```typescript
import { materialsService } from '../services/materialsService';
import { useAuth } from '../contexts/AuthContext';

// In your component:
const { profile } = useAuth();

const handleRequestMaterials = async () => {
  try {
    await materialsService.requestMaterials(ipRecordId, profile!.id);
    onSuccess?.();
  } catch (error) {
    console.error('Request error:', error);
    onError?.(error.message);
  }
};
```

---

## 🔐 RLS Security Check

The migration created these RLS policies. Verify they're active:

```sql
-- These policies should be automatically created by the migration
-- Verify in Supabase dashboard: Authentication → Policies

-- 1. Admins can view all
SELECT * FROM presentation_materials; -- ✓ Works for admins

-- 2. Applicants can view own
SELECT * FROM presentation_materials 
WHERE submitted_by = auth.uid(); -- ✓ Works for applicants

-- 3. Applicants can insert when requested
INSERT INTO presentation_materials (...) 
VALUES (...); -- ✓ Only works when status='requested'

-- 4. Admins can update and delete
UPDATE presentation_materials SET status='requested';
DELETE FROM presentation_materials; -- ✓ Works for admins only
```

---

## 📁 Storage Setup

### Create Storage Bucket

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Storage**
3. Click **New Bucket**
4. Name it: `presentation-materials`
5. Make it **Public** (for URLs to work)

### Configure RLS for Storage

**File paths:** 
- Posters: `presentations/{ipRecordId}/poster.*`
- Papers: `presentations/{ipRecordId}/paper.*`

RLS policies to create:

```sql
-- Policy 1: Admins can upload/delete any
CREATE POLICY "Admins manage materials storage"
  ON storage.objects
  FOR ALL USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    AND bucket_id = 'presentation-materials'
  );

-- Policy 2: Applicants can upload their own
CREATE POLICY "Applicants upload own materials"
  ON storage.objects
  FOR INSERT WITH CHECK (
    auth.uid()::text = (storage.foldername(name))[3]
    AND bucket_id = 'presentation-materials'
  );
```

---

## 📧 Email Notifications (Optional)

If you want email alerts when materials are requested:

### Option A: Trigger-based (Recommended)

Create a Supabase Edge Function to send emails:

**File:** `supabase/functions/send-materials-request/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { ipRecordId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get record and applicant email
    const { data: record } = await supabase
      .from('ip_records')
      .select('id, title, applicant:users!applicant_id(email, full_name)')
      .eq('id', ipRecordId)
      .single();

    // Send email
    await fetch(supabaseUrl + '/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: record.applicant.email,
        subject: `Materials Requested - ${record.title}`,
        html: `<h2>Presentation Materials Requested</h2>
               <p>Please submit your materials within 10 business days.</p>
               <p>Files needed:</p>
               <ul>
                 <li>Scientific Poster (JPG/PNG, 10MB max)</li>
                 <li>IMRaD Short Paper (PDF/DOCX, 5MB max)</li>
               </ul>`,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

Deploy:
```bash
supabase functions deploy send-materials-request
```

### Option B: In-component notification

Alternatively, send email directly from React component:

```typescript
const handleRequestMaterials = async () => {
  await materialsService.requestMaterials(ipRecordId, profile!.id);

  // Send email via Supabase Edge Function
  await supabase.functions.invoke('send-materials-request', {
    body: { ipRecordId }
  });
  
  onSuccess?.();
};
```

---

## 🧪 Testing

### Test 1: Direct Database Access

```typescript
// In browser console:
import { supabase } from './lib/supabase';

// As admin - should see all
await supabase.from('presentation_materials').select('*');

// As applicant - should see only own
await supabase.from('presentation_materials')
  .select('*')
  .eq('submitted_by', userId);
```

### Test 2: Request Materials

```typescript
// As admin
const { data } = await materialsService.requestMaterials(recordId, adminId);
console.log(data); // Should have status='requested'
```

### Test 3: Submit Materials

```typescript
// As applicant
const { data } = await materialsService.submitMaterials(recordId, applicantId, {
  posterUrl: 'https://...',
  posterName: 'poster.png',
  posterSize: 1024,
  paperUrl: 'https://...',
  paperName: 'paper.pdf',
  paperSize: 2048,
});
console.log(data); // Should have status='submitted'
```

---

## 📝 Integration Checklist

- [ ] **Database Migration**
  - [ ] Migration deployed
  - [ ] Table exists
  - [ ] RLS policies active

- [ ] **Storage Bucket**
  - [ ] Created `presentation-materials` bucket
  - [ ] Set to public
  - [ ] RLS policies configured

- [ ] **Service Layer**
  - [ ] Created `src/services/materialsService.ts`
  - [ ] All 4 functions implemented
  - [ ] TypeScript types correct

- [ ] **Components Updated**
  - [ ] `MaterialsRequestAction` imports service
  - [ ] `MaterialsSubmissionForm` imports service
  - [ ] Components use `materialsService` functions
  - [ ] Error handling in place

- [ ] **Testing**
  - [ ] Can request materials (admin)
  - [ ] Can submit materials (applicant)
  - [ ] Files upload to storage
  - [ ] Status updates correctly
  - [ ] RLS blocks unauthorized access

---

## 🔄 Data Flow

```
Admin Dashboard
    ↓
[Request Materials Button]
    ↓
materialsService.requestMaterials()
    ↓
INSERT INTO presentation_materials (status='requested')
    ↓
RLS: Only admin can write
    ↓
Email notification (optional)
    ↓
Applicant email receives notification
    ↓
[Login and navigate to detail page]
    ↓
<MaterialsSubmissionForm />
    ↓
[Upload poster + paper]
    ↓
Files upload to storage bucket
    ↓
materialsService.submitMaterials()
    ↓
UPDATE presentation_materials (status='submitted', file URLs)
    ↓
RLS: Only applicant who owns record can write
    ↓
Admin sees submission in dashboard
    ↓
fetchSubmissionDetails() re-fetches
    ↓
Page reflects new status
```

---

## 💡 Pro Tips

1. **Always use RLS:** Never bypass RLS by using service role key from frontend
2. **Error handling:** Catch "PGRST116" for "no rows" - it's not an error
3. **Storage paths:** Use record ID in path for easy filtering: `presentations/{recordId}/...`
4. **Testing:** Use Supabase SQL editor to test policies directly
5. **Debugging:** Check `service_role_override` is disabled in production

---

## 🚨 Common Issues

### "Permission Denied" when inserting
- Verify user role is 'admin' in users table
- Check RLS policy status='requested' condition
- Ensure authenticated user is same as materials_requested_by

### "File not found" in storage
- Verify bucket is PUBLIC not PRIVATE
- Check file path matches exactly
- Ensure storage RLS policies allow upload

### Components showing old data
- Call `fetchSubmissionDetails()` after success
- Check component props are updating
- Verify Supabase real-time subscriptions if using

---

## 📊 Summary

**Integration Pattern:**
- Frontend: React components + Supabase client
- Database: Direct table access with RLS
- Storage: Supabase Storage bucket
- Security: RLS policies + role-based access
- No backend server needed!

**Next Steps:**
1. ✅ Database migration (already done)
2. ✅ Create service layer
3. ✅ Update components  
4. ✅ Test end-to-end
5. ✅ Deploy to production

---

**Status:** ✅ Ready for Component Integration

**Architecture:** Supabase-first (No Express backend needed)

**Last Updated:** January 20, 2026

**Next:** [Integration Checklist](./ACADEMIC_MATERIALS_IMPLEMENTATION_CHECKLIST.md)
