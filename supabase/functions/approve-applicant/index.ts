import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
};

interface ApprovalRequest {
  applicant_user_id: string;
}

interface ApprovalResponse {
  success: boolean;
  message: string;
  applicant_email?: string;
  applicant_name?: string;
  approved_at?: string;
  error?: string;
}

function generateApprovalEmailHtml(applicantName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approval Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">UCC IP Office</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Intellectual Property Management System</p>
    </div>

    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="color: #059669; margin: 0; font-size: 14px; font-weight: 600;">✓ Account Approved</p>
      </div>

      <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">Welcome, ${applicantName}!</h2>
      <p style="color: #10b981; margin: 0 0 24px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Account is Now Active</p>
      
      <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">Great news! Your account has been approved by the University IP Office. You now have full access to the Intellectual Property management system.</p>

      <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What You Can Now Do</h3>
        <ul style="color: #4b5563; margin: 0; padding: 0 0 0 20px; font-size: 14px; line-height: 1.8;">
          <li style="margin-bottom: 8px;">Submit new intellectual property disclosures</li>
          <li style="margin-bottom: 8px;">Upload supporting documents and evidence</li>
          <li style="margin-bottom: 8px;">Track your submissions across the workflow</li>
          <li style="margin-bottom: 8px;">Receive notifications on reviews and approvals</li>
          <li>Access your submission history</li>
        </ul>
      </div>

      <p style="color: #4b5563; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">Log in to the system to get started with your first disclosure submission. If you have any questions, please contact the IP Office.</p>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 500;">University Intellectual Property Management System</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 University Central. All rights reserved.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client to verify auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT token and get admin user ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user is admin (check profile role)
    const { data: adminProfile, error: profileError } = await supabase
      .from("users")
      .select("id, role, email, full_name")
      .eq("auth_user_id", authUser.id)
      .single();

    if (profileError || !adminProfile) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "Could not verify admin status" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin (only admins can approve applicants)
    if (adminProfile.role !== "admin") {
      console.warn(`Unauthorized approval attempt by ${adminProfile.role}:`, adminProfile.id);
      return new Response(
        JSON.stringify({ error: "Only administrators can approve applicant accounts. Contact your admin for assistance." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: ApprovalRequest = await req.json();
    const { applicant_user_id } = body;

    if (!applicant_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: applicant_user_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[approve-applicant] Processing approval for applicant: ${applicant_user_id}, by admin: ${adminProfile.id}`);

    // Fetch applicant info
    const { data: applicant, error: applicantError } = await supabase
      .from("users")
      .select("id, email, full_name, is_approved")
      .eq("id", applicant_user_id)
      .single();

    if (applicantError || !applicant) {
      console.error("Applicant lookup error:", applicantError);
      return new Response(
        JSON.stringify({ error: "Applicant not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already approved
    if (applicant.is_approved) {
      console.warn(`Applicant ${applicant_user_id} is already approved`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Applicant is already approved",
          applicant_email: applicant.email,
          applicant_name: applicant.full_name,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();
    let emailSent = false;
    let emailError: string | null = null;

    // Update users table (MUST succeed for approval to proceed)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_approved: true,
        approved_at: now,
        approved_by: adminProfile.id,
      })
      .eq("id", applicant_user_id);

    if (updateError) {
      console.error("User update error:", updateError);
      throw new Error(`Failed to update applicant: ${updateError.message}`);
    }

    console.log(`[approve-applicant] Updated applicant record: ${applicant_user_id}`);

    // Log activity (best effort - don't fail if this fails)
    const { error: logError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: adminProfile.id,
        action: "approve_applicant",
        details: {
          applicant_id: applicant_user_id,
          applicant_email: applicant.email,
          applicant_name: applicant.full_name,
        },
      });

    if (logError) {
      console.error("Activity log error:", logError);
    } else {
      console.log(`[approve-applicant] Logged approval action for applicant: ${applicant_user_id}`);
    }

    // Send approval email via Resend (best effort - approval succeeds even if email fails)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";

    if (resendApiKey) {
      try {
        const emailPayload = {
          from: `UCC IP Office <${senderEmail}>`,
          to: [applicant.email],
          subject: "Your UCC IP Account is Approved",
          html: generateApprovalEmailHtml(applicant.full_name),
          text: `Your account has been approved. You now have full access to the UCC IP system.`,
        };

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
          emailError = emailResult.message || "Email service returned error";
          console.error("Email sending failed:", {
            status: emailResponse.status,
            message: emailError,
            to: applicant.email,
          });
        } else {
          emailSent = true;
          console.log("Approval email sent successfully:", {
            to: applicant.email,
            emailId: emailResult.id,
          });
        }
      } catch (emailErrorCatch) {
        emailError = emailErrorCatch instanceof Error ? emailErrorCatch.message : "Email send failed";
        console.error("Error sending approval email:", emailErrorCatch);
      }
    } else {
      emailError = "RESEND_API_KEY not configured";
      console.warn("RESEND_API_KEY not configured - email not sent");
    }

    // Build response - approval succeeded, but indicate email status
    const response: any = {
      success: true,
      message: emailSent 
        ? "Applicant approved successfully and email sent"
        : "Applicant approved but email could not be sent: " + emailError,
      applicant_email: applicant.email,
      applicant_name: applicant.full_name,
      approved_at: now,
      email_sent: emailSent,
    };

    if (emailError && !emailSent) {
      response.email_error = emailError;
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in approve-applicant:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to approve applicant",
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
