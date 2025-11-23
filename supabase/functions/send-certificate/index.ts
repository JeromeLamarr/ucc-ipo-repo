import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CertificateRequest {
  email: string;
  certificateNumber: string;
  referenceNumber: string;
  title: string;
  recipientName?: string;
  dateIssued?: string;
}

// Generate a professional certificate HTML
function generateCertificateHTML(
  title: string,
  certificateNumber: string,
  referenceNumber: string,
  recipientName: string = "Recipient",
  dateIssued: string = new Date().toLocaleDateString()
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate of ${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; background-color: #f5f5f5; padding: 40px; }
          .certificate {
            width: 100%; max-width: 800px; margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
            border: 3px solid #2563eb; border-radius: 15px; padding: 60px 50px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); text-align: center;
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px;
          }
          .header h2 { font-size: 14px; font-weight: normal; letter-spacing: 2px; margin-bottom: 5px; }
          .header p { font-size: 12px; opacity: 0.9; }
          h1 { font-size: 48px; color: #1f2937; margin-bottom: 10px; font-weight: normal; }
          .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 40px; letter-spacing: 1px; }
          .details { background-color: #f3f4f6; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
          .detail-label { font-weight: bold; color: #374151; flex: 1; text-align: left; }
          .detail-value { color: #1f2937; flex: 1; text-align: right; font-family: 'Courier New', monospace; }
          .message { font-size: 14px; color: #4b5563; line-height: 1.8; margin-bottom: 30px; font-style: italic; }
          .seal { font-size: 60px; margin: 20px 0; }
          .footer { font-size: 11px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <h2>CERTIFICATE OF ${title.toUpperCase()}</h2>
            <p>University of Cape Coast Intellectual Property Office</p>
          </div>
          <h1>Certificate</h1>
          <div class="subtitle">OF ${title.toUpperCase()}</div>
          <div class="message">
            <p>This is to certify that</p>
            <p style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 15px 0;">${recipientName}</p>
            <p>has successfully completed the requirements and is hereby awarded this certificate.</p>
          </div>
          <div class="details">
            <div class="detail-row">
              <div class="detail-label">Certificate Number:</div>
              <div class="detail-value">${certificateNumber}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Reference Number:</div>
              <div class="detail-value">${referenceNumber}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Date Issued:</div>
              <div class="detail-value">${dateIssued}</div>
            </div>
          </div>
          <div class="seal">🏆</div>
          <div class="footer">
            <p>This certificate is valid and recognized by the University of Cape Coast.</p>
            <p>For verification, contact: ipoffice@ucc.edu.gh</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Parse request body
    let requestData: CertificateRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body. Please provide valid JSON.",
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

    const {
      email,
      certificateNumber,
      referenceNumber,
      title,
      recipientName,
      dateIssued,
    } = requestData;

    // Validate required fields
    if (!email || !certificateNumber || !referenceNumber || !title) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing required fields: email, certificateNumber, referenceNumber, title",
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid email address",
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

    console.log(`Generating certificate for ${email}...`);

    // Generate certificate HTML
    const certificateHTML = generateCertificateHTML(
      title,
      certificateNumber,
      referenceNumber,
      recipientName || email,
      dateIssued || new Date().toLocaleDateString()
    );

    // Email HTML content with certificate embedded
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .certificate-info { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
            .certificate-info p { margin: 8px 0; }
            .certificate-number { font-family: 'Courier New', monospace; font-weight: bold; color: #1f2937; }
            .certificate-preview { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Certificate Ready</h1>
              <p>Your IP Certificate has been generated</p>
            </div>
            <div class="content">
              <h2>Hello ${recipientName || "User"},</h2>
              <p>We're pleased to inform you that your certificate of <strong>${title}</strong> is now ready!</p>
              
              <div class="certificate-info">
                <p><strong>Certificate Details:</strong></p>
                <p>Certificate Number: <span class="certificate-number">${certificateNumber}</span></p>
                <p>Reference Number: <span class="certificate-number">${referenceNumber}</span></p>
                <p>Date Issued: ${dateIssued}</p>
              </div>

              <div class="certificate-preview">
                <h3 style="text-align: center; color: #10b981; margin-bottom: 20px;">📄 Certificate Preview</h3>
                ${certificateHTML}
              </div>

              <p>Your certificate has been generated and is ready for use. You can:</p>
              <ul>
                <li>Print this email with the certificate preview above</li>
                <li>Take a screenshot of the certificate for your records</li>
                <li>Contact us if you need a formal PDF copy</li>
              </ul>

              <p style="margin-top: 30px;">If you have any questions about your certificate, please don't hesitate to contact us.</p>

              <p>Best regards,<br><strong>University of Cape Coast Intellectual Property Office</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply directly to this email.</p>
              <p>For support: ipoffice@ucc.edu.gh</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API directly
    console.log("Sending email via Resend...");
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("Email service not configured (RESEND_API_KEY not set)");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UCC IP Office <onboarding@resend.dev>",
        to: email,
        subject: `🏆 Your IP Certificate is Ready - ${certificateNumber}`,
        html: emailHTML,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email service error:", emailResult);
      throw new Error(
        `Failed to send email: ${emailResult.message || "Unknown error"}`
      );
    }

    console.log("Email sent successfully", emailResult.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Certificate email sent successfully",
        certificateNumber,
        recipientEmail: email,
        details: {
          title,
          referenceNumber,
          dateIssued,
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
  } catch (error: any) {
    console.error("Certificate send error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send certificate",
        details: error.message,
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
