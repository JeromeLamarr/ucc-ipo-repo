import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RevisionResubmitNotificationPayload {
  supervisorEmail: string;
  supervisorName: string;
  applicantName: string;
  recordTitle: string;
  referenceNumber: string;
  previousStatus: string;
  newStatus: string;
  revisionRequestDate?: string;
  resubmitDate?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: RevisionResubmitNotificationPayload = await req.json();

    // Validate required fields
    if (!payload.supervisorEmail || !payload.supervisorName || !payload.applicantName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: supervisorEmail, supervisorName, applicantName",
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Determine the revision source
    const revisionSource = payload.previousStatus === "supervisor_revision"
      ? "Supervisor"
      : payload.previousStatus === "evaluator_revision"
      ? "Evaluator"
      : "Reviewer";

    const subject = `📤 Revised Submission Resubmitted - ${payload.recordTitle}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .section { margin-bottom: 20px; }
        .section h2 { color: #1f2937; font-size: 16px; margin: 0 0 10px 0; border-bottom: 2px solid #2563EB; padding-bottom: 8px; }
        .section p { margin: 0; font-size: 14px; }
        .info-box { background: #dbeafe; border-left: 4px solid #2563EB; padding: 12px; margin: 10px 0; border-radius: 4px; }
        .info-box strong { color: #1e40af; }
        .highlight { background: #fef3c7; padding: 3px 6px; border-radius: 3px; }
        .button { display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #374151; width: 30%; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .status-waiting { background: #fef3c7; color: #92400e; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📤 Revised Submission Resubmitted</h1>
            <p>An applicant has resubmitted their revised IP submission for your review</p>
        </div>

        <div class="content">
            <div class="section">
                <h2>✅ Resubmission Summary</h2>
                <div class="info-box">
                    <p><strong>Important:</strong> ${payload.applicantName} has resubmitted their IP submission with revisions addressing your previous feedback.</p>
                </div>
                
                <table>
                    <tr>
                        <td class="label">Applicant Name:</td>
                        <td><strong>${payload.applicantName}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">Submission Title:</td>
                        <td><strong>${payload.recordTitle}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">Reference Number:</td>
                        <td><strong>${payload.referenceNumber || "N/A"}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">Original Revision Request:</td>
                        <td>${revisionSource} requested revisions</td>
                    </tr>
                    <tr>
                        <td class="label">Resubmitted On:</td>
                        <td>${payload.resubmitDate ? new Date(payload.resubmitDate).toLocaleDateString("en-US", { 
                            year: "numeric", 
                            month: "long", 
                            day: "numeric", 
                            hour: "2-digit", 
                            minute: "2-digit" 
                        }) : new Date().toLocaleDateString("en-US", { 
                            year: "numeric", 
                            month: "long", 
                            day: "numeric", 
                            hour: "2-digit", 
                            minute: "2-digit" 
                        })}</td>
                    </tr>
                    <tr>
                        <td class="label">Status:</td>
                        <td><span class="status-badge status-waiting">PENDING REVIEW</span></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2>📋 What's Next?</h2>
                <p>Please review the resubmitted materials at your earliest convenience. The applicant has:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Updated the submission with your requested revisions</li>
                    <li>Provided revised documents and supporting materials</li>
                    <li>Resubmitted for your approval or further feedback</li>
                </ul>
                <p style="margin-top: 15px;">
                    <a href="https://${Deno.env.get("APP_URL") || "app.example.com"}/dashboard" class="button">Review Submission</a>
                </p>
            </div>

            <div class="section">
                <h2>ℹ️ Details</h2>
                <p><strong>What changed:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Submission metadata updated</li>
                    <li>Documents added/replaced as per revisions</li>
                    <li>Technical descriptions and details refined</li>
                </ul>
            </div>

            <div class="section" style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 4px; margin-top: 15px;">
                <h2 style="border-bottom-color: #10b981; color: #065f46;">💡 Important Note</h2>
                <p>This submission is ready for your review. You can approve the revisions, request further modifications, or reject the submission.</p>
            </div>
        </div>

        <div class="footer">
            <p>© 2026 UCC IP Office System. All rights reserved.</p>
            <p>This is an automated email notification. Please do not reply to this email.</p>
            <p><strong>Submission Reference:</strong> ${payload.referenceNumber || "N/A"}</p>
        </div>
    </div>
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "notifications@ucc-ipo.com",
        to: payload.supervisorEmail,
        subject: subject,
        html: htmlContent,
        reply_to: "support@ucc-ipo.com",
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API Error:", emailData);
      throw new Error(`Failed to send email: ${emailData.message || "Unknown error"}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Revision resubmission notification sent successfully",
        emailId: emailData.id,
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
    console.error("Error sending revision resubmission notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
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
