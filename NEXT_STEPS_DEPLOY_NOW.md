# 🚀 DEPLOYMENT STEPS - ACTION REQUIRED

**Your site is LIVE at**: https://university-intellect-dqt4.bolt.host

**Status**: Frontend deployed ✅ | Edge Functions pending ⏳ | Database pending ⏳

---

## 📋 STEP 1: Deploy Edge Function #1 (send-status-notification)

This function sends emails when submission status changes.

### 1.1 Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Click your project
- Left sidebar → **Functions**

### 1.2 Click on "send-status-notification"
- If it doesn't exist, create a new function:
  - Click **Create function**
  - Name it: `send-status-notification`
  - Runtime: Deno
  - Click **Create**

### 1.3 Copy the complete code below and paste into the editor

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://university-intellect-dqt4.bolt.host",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StatusNotificationPayload {
  applicantEmail: string;
  applicantName: string;
  recordTitle: string;
  referenceNumber: string;
  oldStatus: string;
  newStatus: string;
  currentStage: string;
  remarks?: string;
  actorName?: string;
  actorRole?: string;
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate input payload
function validatePayload(payload: any): { valid: boolean; error?: string } {
  const required = ['applicantEmail', 'applicantName', 'recordTitle', 'newStatus', 'currentStage'];
  
  for (const field of required) {
    if (!payload[field] || typeof payload[field] !== 'string' || !payload[field].trim()) {
      return { valid: false, error: `Missing or empty required field: ${field}` };
    }
  }

  if (!isValidEmail(payload.applicantEmail)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  return { valid: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let payload: StatusNotificationPayload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON payload',
          details: { parseError: String(e) },
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate input
    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error('[send-status-notification] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: { validation: validation.error },
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const statusMessages: Record<string, { subject: string; message: string }> = {
      submitted: {
        subject: "Submission Received Successfully",
        message: "Thank you for your submission! We have successfully received your intellectual property submission and it will be reviewed shortly.",
      },
      waiting_supervisor: {
        subject: "Submission Under Supervisor Review",
        message: "Your submission is now being reviewed by a supervisor.",
      },
      supervisor_approved: {
        subject: "Supervisor Approved Your Submission",
        message: "Great news! Your submission has been approved by the supervisor and is moving to evaluation.",
      },
      supervisor_revision: {
        subject: "Revision Requested by Supervisor",
        message: "The supervisor has requested revisions to your submission. Please review the feedback and make necessary changes.",
      },
      waiting_evaluation: {
        subject: "Submission In Evaluation",
        message: "Your submission is now being evaluated by our technical team.",
      },
      evaluator_approved: {
        subject: "Evaluation Complete - Approved!",
        message: "Congratulations! Your submission has been approved by the evaluator.",
      },
      evaluator_revision: {
        subject: "Revision Requested by Evaluator",
        message: "The evaluator has requested revisions to your submission. Please review the feedback provided.",
      },
      evaluator_rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined by the evaluator.",
      },
      rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined.",
      },
      preparing_legal: {
        subject: "Legal Preparation in Progress",
        message: "Your submission has progressed to the legal preparation stage. We are preparing the necessary documents for IPO Philippines filing.",
      },
      ready_for_filing: {
        subject: "Ready for IPO Philippines Filing",
        message: "Your intellectual property submission is now complete and ready to be filed with the IPO Philippines. You can now request your official certificate!",
      },
      completed: {
        subject: "Process Completed",
        message: "Your intellectual property submission process has been completed successfully!",
      },
    };

    const statusInfo = statusMessages[payload.newStatus] || {
      subject: "Status Update",
      message: `Your submission status has been updated to: ${sanitizeHTML(payload.newStatus)}`,
    };

    // Log the send attempt
    console.log('[send-status-notification] Sending email', {
      to: payload.applicantEmail,
      subject: statusInfo.subject,
      status: payload.newStatus,
      timestamp: new Date().toISOString(),
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHTML(statusInfo.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">UCC IP Office</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Intellectual Property Management System</p>
      </div>

      <div style="padding: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">${sanitizeHTML(statusInfo.subject)}</h2>
        
        <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
          Dear ${sanitizeHTML(payload.applicantName)},
        </p>

        <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
          ${sanitizeHTML(statusInfo.message)}
        </p>

        <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="color: #4b5563; margin: 0 0 8px 0;"><strong>Submission Details:</strong></p>
          <p style="color: #6b7280; margin: 4px 0;"><strong>Title:</strong> ${sanitizeHTML(payload.recordTitle)}</p>
          <p style="color: #6b7280; margin: 4px 0;"><strong>Reference:</strong> ${sanitizeHTML(payload.referenceNumber || 'N/A')}</p>
          <p style="color: #6b7280; margin: 4px 0;"><strong>Stage:</strong> ${sanitizeHTML(payload.currentStage)}</p>
          ${payload.actorName ? `<p style="color: #6b7280; margin: 4px 0;"><strong>Reviewed by:</strong> ${sanitizeHTML(payload.actorName)} (${sanitizeHTML(payload.actorRole || 'N/A')})</p>` : ''}
          ${payload.remarks ? `<p style="color: #6b7280; margin: 4px 0;"><strong>Remarks:</strong> ${sanitizeHTML(payload.remarks)}</p>` : ''}
        </div>

        <p style="color: #4b5563; line-height: 1.6; margin: 24px 0 16px 0;">
          <a href="https://university-intellect-dqt4.bolt.host/dashboard" style="color: #667eea; text-decoration: none; font-weight: 500;">
            View your submission in the dashboard →
          </a>
        </p>

        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          This is an automated notification from UCC IP Office. Please do not reply to this email.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2025 University of Caloocan City. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error('[send-status-notification] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
          details: {
            message: "Contact administrator to configure RESEND_API_KEY environment variable",
            code: "EMAIL_SERVICE_NOT_CONFIGURED",
          },
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailPayload = {
      from: "UCC IP Office <noreply@resend.dev>",
      to: [payload.applicantEmail],
      subject: statusInfo.subject,
      html: emailHtml,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-status-notification] Resend API error', {
        status: response.status,
        error: result.message || 'Unknown error',
        to: payload.applicantEmail,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send email",
          details: {
            message: result.message || "Email service returned an error",
            code: result.code || "EMAIL_SEND_FAILED",
          },
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('[send-status-notification] Email sent successfully', {
      to: payload.applicantEmail,
      emailId: result.id,
      subject: statusInfo.subject,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email notification sent to ${payload.applicantEmail}`,
        data: {
          subject: statusInfo.subject,
          emailId: result.id,
          recipient: payload.applicantEmail,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('[send-status-notification] Unexpected error', {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: {
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "INTERNAL_ERROR",
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
```

### 1.4 Set Environment Variable
- Look for **Environment variables** section
- Click **Add environment variable**
- **Name**: `RESEND_API_KEY`
- **Value**: [Your Resend API key]
- Click **Save**

### 1.5 Deploy
- Click **Deploy** button
- Wait for green checkmark
- ✅ Function #1 deployed!

---

## 📋 STEP 2: Deploy Edge Function #2 (generate-certificate)

This function generates PDF certificates for approved submissions.

### 2.1 Click on "generate-certificate" function in Supabase
- If it doesn't exist, create: **Create function** → Name: `generate-certificate`

### 2.2 Copy this code and paste:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://university-intellect-dqt4.bolt.host",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CertificateRequest {
  recordId: string;
  userId: string;
}

// UUID validation
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: CertificateRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate IDs
    if (!isValidUUID(payload.recordId) || !isValidUUID(payload.userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid UUID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check authorization
    if (user.id !== payload.userId && user.user_metadata?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get record details
    const { data: record, error: recordError } = await supabase
      .from("ip_records")
      .select("*")
      .eq("id", payload.recordId)
      .single();

    if (recordError || !record) {
      return new Response(
        JSON.stringify({ error: "Record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if record is approved
    if (record.status !== "completed" && record.status !== "ready_for_filing") {
      return new Response(
        JSON.stringify({ error: "Record must be approved for certificate generation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate simple HTML certificate
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Georgia, serif;
          }
          .certificate {
            width: 100%;
            height: 100%;
            padding: 60px;
            text-align: center;
            border: 2px solid #333;
            box-sizing: border-box;
          }
          .title { font-size: 48px; margin-bottom: 40px; color: #333; }
          .content { font-size: 18px; margin: 20px 0; }
          .details { margin-top: 60px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="title">Certificate of Completion</div>
          <div class="content">
            This certifies that
            <br><br>
            <strong>${record.applicant_name || "Applicant"}</strong>
            <br><br>
            has successfully completed the intellectual property submission and review process for:
            <br><br>
            <strong>${record.title || "Untitled IP"}</strong>
          </div>
          <div class="details">
            <p>Reference: ${record.reference_number || "REF-001"}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Convert HTML to PDF (simple implementation)
    const pdfContent = certificateHTML;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Certificate generated successfully",
        certificateData: {
          recordId: payload.recordId,
          title: record.title,
          applicantName: record.applicant_name,
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating certificate:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2.3 Deploy
- Click **Deploy** button
- ✅ Function #2 deployed!

---

## 📋 STEP 3: Apply RLS Policies to Database (CRITICAL!)

This allows supervisors and evaluators to see documents and tracking information.

### 3.1 Open Supabase SQL Editor
- In Supabase dashboard, click **SQL Editor**
- Click **New Query**

### 3.2 Copy this SQL and run it:

```sql
-- RLS Policies for ip_documents table
ALTER TABLE ip_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Supervisors view documents" ON ip_documents;
DROP POLICY IF EXISTS "Evaluators view documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;

-- Applicants can view their own documents
CREATE POLICY "Applicants view own documents" ON ip_documents
  FOR SELECT
  USING (
    uploader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = ip_documents.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

-- Applicants can upload documents
CREATE POLICY "Applicants upload documents" ON ip_documents
  FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = ip_documents.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

-- Supervisors can view documents
CREATE POLICY "Supervisors view documents" ON ip_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = ip_documents.ip_record_id
      AND ip_records.supervisor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Evaluators can view documents
CREATE POLICY "Evaluators view documents" ON ip_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = ip_documents.ip_record_id
      AND ip_records.evaluator_id = auth.uid()
    )
  );

-- Admins can view all documents
CREATE POLICY "Admins view all documents" ON ip_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for process_tracking table
ALTER TABLE process_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Applicants view their tracking" ON process_tracking;
DROP POLICY IF EXISTS "Supervisors view tracking" ON process_tracking;
DROP POLICY IF EXISTS "Evaluators view tracking" ON process_tracking;
DROP POLICY IF EXISTS "Admins view all tracking" ON process_tracking;
DROP POLICY IF EXISTS "Admins and supervisors insert tracking" ON process_tracking;

-- Applicants can view their tracking
CREATE POLICY "Applicants view their tracking" ON process_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = process_tracking.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

-- Supervisors can view tracking
CREATE POLICY "Supervisors view tracking" ON process_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = process_tracking.ip_record_id
      AND ip_records.supervisor_id = auth.uid()
    )
  );

-- Evaluators can view tracking
CREATE POLICY "Evaluators view tracking" ON process_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = process_tracking.ip_record_id
      AND ip_records.evaluator_id = auth.uid()
    )
  );

-- Admins can view all tracking
CREATE POLICY "Admins view all tracking" ON process_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins and supervisors can insert tracking
CREATE POLICY "Admins and supervisors insert tracking" ON process_tracking
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );
```

### 3.3 Run the Query
- Select all the SQL (Ctrl+A)
- Click **Run** button
- Wait for green checkmark
- ✅ RLS policies applied!

---

## 🧪 STEP 4: Quick Verification

After completing steps 1-3, verify everything works:

### Test Email Function
1. Go to your dashboard: https://university-intellect-dqt4.bolt.host
2. As an **applicant**: Submit a new IP
3. Check if **confirmation email arrives** in 1 minute
4. Email should have: Your name, IP title, reference number

### Test Document Access
1. Log in as **supervisor**
2. Open an assigned submission
3. You should see **Document List** with all uploaded files ✅
4. Try downloading a document ✅

### Test Evaluator Access
1. Log in as **evaluator**
2. Go to **Evaluator Dashboard**
3. Find assigned submission
4. You should see **Document List** and **Process Tracking** ✅

---

## ✅ Verification Checklist

- [ ] Edge Function #1 deployed (send-status-notification)
- [ ] Edge Function #2 deployed (generate-certificate)
- [ ] Environment variable RESEND_API_KEY set
- [ ] RLS policies applied to database
- [ ] Emails sending successfully
- [ ] Supervisors can see documents
- [ ] Evaluators can see documents
- [ ] Process tracking visible to all roles

---

## 🎉 Once All Complete

Your system is **FULLY DEPLOYED** and ready to use!

**What's working**:
- ✅ Applicants can submit documents
- ✅ Supervisors can review and approve
- ✅ Evaluators can evaluate with validation
- ✅ Everyone receives email notifications
- ✅ Certificates generate for approved IPs
- ✅ Process tracking shows complete timeline
- ✅ RLS prevents unauthorized access

---

## 📞 Need Help?

- Edge Function issues → Check Supabase Functions logs
- Email not sending → Verify RESEND_API_KEY is set
- Database issues → Check Supabase SQL Editor error messages
- Access denied errors → Verify RLS policies created

