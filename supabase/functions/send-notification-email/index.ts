import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
}

function generateHtmlFromMessage(title: string, message: string, additionalInfo?: Record<string, string>): string {
  const detailsHtml = additionalInfo ? Object.entries(additionalInfo)
    .filter(([, value]) => value)
    .map(([key, value]) => `<p style="margin: 12px 0; color: #4b5563;"><strong>${key}:</strong> ${value}</p>`)
    .join('') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">UCC IP Office</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Intellectual Property Management System</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">${title}</h2>
        <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">${message}</p>
        ${detailsHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">University Intellectual Property Management System</p>
        </div>
      </div>
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
    const { to, subject, html, text, title, message, submissionTitle, submissionCategory, applicantName } = body;

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
      const additionalInfo: Record<string, string> = {};
      if (applicantName) additionalInfo['Applicant'] = applicantName;
      if (submissionTitle) additionalInfo['Submission Title'] = submissionTitle;
      if (submissionCategory) additionalInfo['Category'] = submissionCategory;
      finalHtml = generateHtmlFromMessage(title, message, additionalInfo);
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