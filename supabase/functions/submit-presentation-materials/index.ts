import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
};

interface MaterialsSubmissionRequest {
  ip_record_id: string;
  poster_file_name: string;
  poster_file_url: string;
  paper_file_name: string;
  paper_file_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: MaterialsSubmissionRequest = await req.json();
    const { ip_record_id, poster_file_name, poster_file_url, paper_file_name, paper_file_url } = body;

    console.log("Processing materials submission:", {
      ip_record_id,
      poster_file_name,
      paper_file_name,
    });

    // Get IP record details
    const { data: ipRecord, error: recordError } = await supabase
      .from("ip_records")
      .select("*, applicant:users(email, full_name), evaluator:users(email, full_name)")
      .eq("id", ip_record_id)
      .single();

    if (recordError || !ipRecord) {
      throw new Error(`IP record not found: ${recordError?.message}`);
    }

    // Create activity log entry
    await supabase.from("activity_logs").insert({
      user_id: ipRecord.applicant_id,
      ip_record_id: ip_record_id,
      action: "materials_submitted",
      details: {
        poster_file: poster_file_name,
        paper_file: paper_file_name,
        submission_time: new Date().toISOString(),
      },
    });

    // Send notification email to applicant
    if (ipRecord.applicant?.email && resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "UCC IP Office <noreply@ucc-ipo.com>",
            to: [ipRecord.applicant.email],
            subject: "Presentation Materials Submitted Successfully",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Materials Submitted</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">UCC IP Office</h1>
                    <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Intellectual Property Management System</p>
                  </div>

                  <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">Materials Submitted Successfully</h2>
                    <p style="color: #7c3aed; margin: 0 0 24px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Presentation Materials</p>
                    
                    <p style="color: #4b5563; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">
                      Thank you for submitting your presentation materials for IP submission <strong>"${ipRecord.title}"</strong>. We have successfully received:
                    </p>

                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
                      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Submitted Files</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151;">Scientific Poster:</strong> <span style="color: #4b5563;">${poster_file_name}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0;">
                              <strong style="color: #374151;">IMRaD Short Paper:</strong> <span style="color: #4b5563;">${paper_file_name}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                      Your materials are now under review. You will be notified of any feedback or next steps.
                    </p>

                    <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
                      <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 500;">University Intellectual Property Management System</p>
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 University Central. All rights reserved.</p>
                    </div>
                  </div>

                  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });
        console.log("Confirmation email sent to applicant");
      } catch (emailError) {
        console.warn("Failed to send confirmation email:", emailError);
      }
    }

    // Send notification to evaluator/admin if assigned
    if (ipRecord.evaluator?.email && resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "UCC IP Office <noreply@ucc-ipo.com>",
            to: [ipRecord.evaluator.email],
            subject: "Presentation Materials Received - Review Ready",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Materials Ready for Review</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">UCC IP Office</h1>
                    <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Intellectual Property Management System</p>
                  </div>

                  <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                    <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">Presentation Materials Ready for Review</h2>
                    <p style="color: #7c3aed; margin: 0 0 24px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Submission Materials</p>
                    
                    <p style="color: #4b5563; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">
                      The applicant has submitted presentation materials for review on IP submission: <strong>"${ipRecord.title}"</strong>
                    </p>

                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
                      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 14px; font-weight: 700;">Files Submitted</h3>
                      <ul style="margin: 0; padding-left: 20px;">
                        <li style="color: #4b5563; margin: 8px 0;">Scientific Poster: ${poster_file_name}</li>
                        <li style="color: #4b5563; margin: 8px 0;">IMRaD Short Paper: ${paper_file_name}</li>
                      </ul>
                    </div>

                    <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
                      <p style="color: #6b7280; font-size: 13px; margin: 0;">Log in to the UCC IP Office to review the materials.</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });
        console.log("Review notification sent to evaluator");
      } catch (emailError) {
        console.warn("Failed to send review notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Materials submission processed successfully",
        ip_record_id,
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
    console.error("Error processing submission:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
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
