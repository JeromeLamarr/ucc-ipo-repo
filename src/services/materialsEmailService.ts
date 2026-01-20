/**
 * Email Service for Academic Presentation Materials
 * Handles sending email notifications when materials are requested
 */

interface MaterialsRequestEmailParams {
  applicantEmail: string;
  applicantName: string;
  ipTitle: string;
  recordId: string;
  adminName: string;
}

export async function sendMaterialsRequestEmail(params: MaterialsRequestEmailParams) {
  const { applicantEmail, applicantName, ipTitle, recordId, adminName } = params;

  const emailContent = {
    to: applicantEmail,
    subject: `Presentation Materials Requested - ${ipTitle}`,
    html: generateMaterialsRequestEmailHTML(applicantName, ipTitle, recordId),
    text: generateMaterialsRequestEmailText(applicantName, ipTitle, recordId),
    metadata: {
      category: 'materials_request',
      record_id: recordId,
      action: 'materials_requested',
    },
  };

  try {
    // Send via Supabase Edge Function
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent),
      }
    );

    if (!response.ok) {
      throw new Error(`Email service error: ${response.statusText}`);
    }

    console.log(`Materials request email sent to ${applicantEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending materials request email:', error);
    throw error;
  }
}

function generateMaterialsRequestEmailHTML(
  applicantName: string,
  ipTitle: string,
  recordId: string
): string {
  const dashboardUrl = `${process.env.VITE_APP_URL || 'https://ucc-ipo.com'}/dashboard/submissions/${recordId}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .section { margin: 20px 0; }
          .section h2 { color: #667eea; font-size: 18px; margin-bottom: 10px; }
          .requirements { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .requirement-item { margin: 10px 0; padding: 10px; background: #f0f4ff; border-radius: 4px; }
          .requirement-item strong { color: #667eea; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin: 20px 0; }
          .button:hover { background: #764ba2; }
          .footer { background: #f0f0f0; padding: 15px; font-size: 12px; color: #666; text-align: center; border-radius: 0 0 8px 8px; }
          .deadline { color: #d9534f; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Presentation Materials Requested</h1>
            <p>Action Required for: <strong>${escapeHtml(ipTitle)}</strong></p>
          </div>
          
          <div class="content">
            <p>Dear ${escapeHtml(applicantName)},</p>
            
            <p>Your intellectual property submission has progressed to the next stage of review. We are now requesting <strong>academic presentation materials</strong> for further evaluation.</p>
            
            <div class="section">
              <h2>📋 Required Materials</h2>
              <div class="requirements">
                <div class="requirement-item">
                  <strong>1. Scientific Poster</strong>
                  <ul>
                    <li>Format: JPG or PNG image</li>
                    <li>Maximum size: 10 MB</li>
                    <li>Description: A visual presentation of your research</li>
                  </ul>
                </div>
                
                <div class="requirement-item">
                  <strong>2. IMRaD Short Paper</strong>
                  <ul>
                    <li>Format: PDF or DOCX (Word)</li>
                    <li>Maximum size: 5 MB</li>
                    <li>Structure: IMRaD format (Introduction, Methods, Results, Discussion)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>📝 What is IMRaD?</h2>
              <p>IMRaD is a standard scientific format:</p>
              <ul>
                <li><strong>Introduction:</strong> Background and problem statement</li>
                <li><strong>Methods:</strong> Methodology and approach</li>
                <li><strong>Results:</strong> Key findings</li>
                <li><strong>Discussion:</strong> Implications and conclusions</li>
              </ul>
            </div>
            
            <div class="section">
              <h2>✅ How to Submit</h2>
              <p>Visit your submission dashboard to upload the materials:</p>
              <center>
                <a href="${dashboardUrl}" class="button">Go to Submission Dashboard</a>
              </center>
              <p style="text-align: center; font-size: 12px; color: #666;">
                Or copy this link: <br>
                <code style="background: #f0f0f0; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 10px;">
                  ${dashboardUrl}
                </code>
              </p>
            </div>
            
            <div class="section" style="background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107;">
              <strong>⏰ Deadline:</strong> <span class="deadline">Please submit materials within 10 business days</span>
            </div>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br>
            <strong>UCC IP Office</strong></p>
          </div>
          
          <div class="footer">
            <p>© University IP Management System. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateMaterialsRequestEmailText(
  applicantName: string,
  ipTitle: string,
  recordId: string
): string {
  const dashboardUrl = `${process.env.VITE_APP_URL || 'https://ucc-ipo.com'}/dashboard/submissions/${recordId}`;

  return `
Presentation Materials Requested for: ${ipTitle}

Dear ${applicantName},

Your intellectual property submission has progressed to the next stage of review. We are now requesting academic presentation materials for further evaluation.

REQUIRED MATERIALS:

1. SCIENTIFIC POSTER
   - Format: JPG or PNG image
   - Maximum size: 10 MB
   - Description: A visual presentation of your research

2. IMRaD SHORT PAPER
   - Format: PDF or DOCX (Word)
   - Maximum size: 5 MB
   - Structure: IMRaD format (Introduction, Methods, Results, Discussion)

IMRAD FORMAT:
- Introduction: Background and problem statement
- Methods: Methodology and approach
- Results: Key findings
- Discussion: Implications and conclusions

HOW TO SUBMIT:
Visit your submission dashboard to upload the materials:
${dashboardUrl}

DEADLINE:
Please submit materials within 10 business days.

If you have any questions or need assistance, please contact our support team.

Best regards,
UCC IP Office

---
© University IP Management System. All rights reserved.
This is an automated message. Please do not reply to this email.
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
