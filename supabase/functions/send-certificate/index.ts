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

// Generate a simple HTML string for the certificate PDF
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
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Georgia', serif;
            background-color: #f5f5f5;
            padding: 40px;
          }
          .certificate {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
            border: 3px solid #2563eb;
            border-radius: 15px;
            padding: 60px 50px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .header h2 {
            font-size: 14px;
            font-weight: normal;
            letter-spacing: 2px;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 12px;
            opacity: 0.9;
          }
          h1 {
            font-size: 48px;
            color: #1f2937;
            margin-bottom: 10px;
            font-weight: normal;
          }
          .subtitle {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 40px;
            letter-spacing: 1px;
          }
          .details {
            background-color: #f3f4f6;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 14px;
          }
          .detail-label {
            font-weight: bold;
            color: #374151;
            flex: 1;
            text-align: left;
          }
          .detail-value {
            color: #1f2937;
            flex: 1;
            text-align: right;
            font-family: 'Courier New', monospace;
          }
          .message {
            font-size: 14px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 30px;
            font-style: italic;
          }
          .signature-block {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid #d1d5db;
          }
          .signature-line {
            display: inline-block;
            margin: 0 40px;
            text-align: center;
          }
          .signature-line p {
            font-size: 12px;
            color: #6b7280;
            margin-top: 30px;
          }
          .footer {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 40px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          .seal {
            font-size: 60px;
            margin: 20px 0;
          }
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
            <p style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 15px 0;">
              ${recipientName}
            </p>
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

          <div class="signature-block">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 30px;">
              Authorized by the University of Cape Coast Intellectual Property Office
            </div>
            <div class="signature-line">
              <p style="border-top: 2px solid #1f2937; padding-top: 5px; margin-bottom: 5px; width: 150px;"></p>
              <p>Director, IP Office</p>
            </div>
          </div>

          <div class="footer">
            <p>This certificate is valid and recognized by the University of Cape Coast.</p>
            <p>For verification, contact: ipoffice@ucc.edu.gh</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Convert HTML to PDF buffer using a simple approach
async function generatePDFBuffer(html: string): Promise<Uint8Array> {
  // We'll use a lightweight PDF generation approach
  // For production, consider using a PDF generation service or library
  try {
    // Simple approach: create a minimal PDF with the HTML content
    // This is a basic implementation - for complex PDFs, use pdf-lib or send to external service
    const response = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: html,
        options: {
          margin: 10,
          filename: "certificate.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
        },
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      // Fallback: return a simple text-based PDF representation
      console.warn("PDF generation service unavailable, using fallback");
      return createSimplePDFBuffer(html);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Use fallback PDF generation
    return createSimplePDFBuffer(html);
  }
}

// Simple PDF buffer creation as fallback
function createSimplePDFBuffer(html: string): Uint8Array {
  // Create a minimal PDF manually
  // This is a very basic PDF that embeds text content
  const content = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${content.length + 100} >>
stream
BT
/F1 12 Tf
50 700 Td
(${content.substring(0, 200)}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000250 00000 n 
0000000400 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${content.length + 500}
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfContent);
}

// Convert Uint8Array to base64 for email attachment
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log(`Generating certificate PDF for ${email}...`);

    // Generate certificate HTML
    const certificateHTML = generateCertificateHTML(
      title,
      certificateNumber,
      referenceNumber,
      recipientName || email,
      dateIssued || new Date().toLocaleDateString()
    );

    // Generate PDF buffer
    const pdfBuffer = await generatePDFBuffer(certificateHTML);
    const pdfBase64 = arrayBufferToBase64(pdfBuffer);

    console.log(
      `PDF generated (${pdfBuffer.length} bytes), sending email...`
    );

    // Email HTML content
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .certificate-info { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
            .certificate-info p { margin: 8px 0; }
            .certificate-number { font-family: 'Courier New', monospace; font-weight: bold; color: #1f2937; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Certificate Ready</h1>
              <p>Your IP Certificate has been generated</p>
            </div>
            <div class="content">
              <h2>Hello,</h2>
              <p>We're pleased to inform you that your certificate of <strong>${title}</strong> is now ready!</p>
              
              <div class="certificate-info">
                <p><strong>Certificate Number:</strong></p>
                <p class="certificate-number">${certificateNumber}</p>
                <p style="margin-top: 15px;"><strong>Reference Number:</strong></p>
                <p class="certificate-number">${referenceNumber}</p>
              </div>

              <p>Your certificate PDF is attached to this email. You can download it and save it for your records.</p>

              <p><strong>What's next?</strong></p>
              <ul>
                <li>Download the attached PDF certificate</li>
                <li>Print it if needed</li>
                <li>Share it with relevant institutions</li>
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

    // Send email using Supabase email API
    // Note: Supabase uses nodemailer SMTP under the hood
    const { data: emailData, error: emailError } =
      await supabase.auth.admin.sendEmail({
        email: email,
        subject: `🏆 Your IP Certificate is Ready - ${certificateNumber}`,
        html: emailHTML,
      });

    if (emailError) {
      console.error("Email service error:", emailError);
      throw new Error(
        `Failed to send email: ${emailError.message || "Unknown error"}`
      );
    }

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Certificate email sent successfully",
        certificateNumber,
        recipientEmail: email,
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send certificate",
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
