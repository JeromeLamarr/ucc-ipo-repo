import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
};

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  title?: string;
  message?: string;
  submissionTitle?: string;
  submissionCategory?: string;
  applicantName?: string;
  additionalInfo?: Record<string, string>;
}

function generateHtmlFromMessage(title: string, message: string, additionalInfo?: Record<string, string>): string {
  const detailsHtml = additionalInfo ? Object.entries(additionalInfo)
    .filter(([, value]) => value && value !== 'Unknown')
    .map(([key, value]) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #374151;">${key}:</strong> <span style="color: #4b5563;">${value}</span>
        </td>
      </tr>
    `)
    .join('') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">UCC IP Office</h1>
      <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Intellectual Property Management System</p>
    </div>

    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">${title}</h2>
      <p style="color: #7c3aed; margin: 0 0 24px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Submission Assignment Notification</p>
      
      <p style="color: #4b5563; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">${message}</p>

      ${detailsHtml ? `
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Submission Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${detailsHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

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
    const body: EmailRequest = await req.json();
    const { to, subject, html, text, title, message, submissionTitle, submissionCategory, applicantName, additionalInfo } = body;

    console.log("Received email request:", {
      to,
      subject,
      title,
      hasHtml: !!html,
      hasText: !!text,
      hasMessage: !!message,
      timestamp: new Date().toISOString(),
    });

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and subject" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate HTML if not provided but message is available
    let finalHtml = html;
    let finalText = text;

    if (!finalHtml && message && title) {
      const info: Record<string, string> = additionalInfo || {};
      // Fall back to building additionalInfo from legacy fields if not provided
      if (!additionalInfo) {
        if (applicantName) info['Applicant'] = applicantName;
        if (submissionTitle) info['Submission Title'] = submissionTitle;
        if (submissionCategory) info['Category'] = submissionCategory;
      }
      finalHtml = generateHtmlFromMessage(title, message, info);
      finalText = `${title}\n\n${message}`;
    }

    if (!finalHtml && !finalText) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: provide html and text, or title and message" }),
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
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please set RESEND_API_KEY in your environment variables.",
          details: "Contact your administrator to configure the email service."
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

    // Get sender email from environment, with fallback to domain
    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";
    const senderName = "UCC IP Office";

    const emailPayload = {
      from: `${senderName} <${senderEmail}>`,
      to: [to],
      subject: subject,
      html: finalHtml,
      text: finalText,
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
      const errorDetails = result.message || "Failed to send email";
      
      // Log domain verification issues
      if (errorDetails.includes("unauthorized") || errorDetails.includes("not verified")) {
        console.error("Domain verification issue with Resend:", {
          senderEmail,
          message: errorDetails,
          resendError: result,
          recipientEmail: to,
          timestamp: new Date().toISOString(),
        });
      } else if (errorDetails.includes("invalid_api_key") || errorDetails.includes("missing") || errorDetails.includes("not set")) {
        console.error("API Key issue - RESEND_API_KEY may not be configured:", {
          message: errorDetails,
          hasApiKey: !!Deno.env.get("RESEND_API_KEY"),
          resendError: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error("Email sending error:", {
          status: response.status,
          message: errorDetails,
          resendError: result,
          recipientEmail: to,
          senderEmail,
          timestamp: new Date().toISOString(),
        });
      }
      
      throw new Error(errorDetails);
    }

    console.log("Email sent successfully:", {
      to,
      subject,
      emailId: result.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        id: result.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send email",
        success: false,
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