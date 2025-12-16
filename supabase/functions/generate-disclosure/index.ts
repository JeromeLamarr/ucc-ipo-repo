import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, PDFPage, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recordId } = await req.json();

    if (!recordId) {
      return new Response(
        JSON.stringify({ error: "Missing recordId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the IP record with all details
    const { data: record, error: recordError } = await supabase
      .from("ip_records")
      .select(`
        *,
        applicant:users!applicant_id(*),
        supervisor:users!supervisor_id(*),
        evaluator:users!evaluator_id(*),
        documents:ip_documents(*)
      `)
      .eq("id", recordId)
      .single();

    if (recordError || !record) {
      throw new Error("Record not found");
    }

    const htmlContent = generateFullDisclosureHTML(record);

    // Convert HTML to PDF
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await convertHTMLToPDF(htmlContent, pdfDoc);

    const fileName = `${recordId}_full_disclosure_${Date.now()}.pdf`;
    const filePath = `${recordId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
      });

    if (uploadError) {
      throw uploadError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        message: "Full disclosure generated successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function generateFullDisclosureHTML(record: any): string {
  const applicant = record.applicant || {};
  const details = record.details || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Full IP Disclosure - ${record.reference_number}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; margin: 40px; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 15px; text-align: center; }
    h2 { color: #0066cc; margin-top: 40px; border-left: 4px solid #0066cc; padding-left: 15px; }
    .header { text-align: center; margin-bottom: 30px; }
    .section { margin-bottom: 40px; page-break-inside: avoid; }
    .field { margin-bottom: 20px; }
    .field-label { font-weight: bold; color: #0066cc; font-size: 14px; text-transform: uppercase; }
    .field-value { margin-top: 5px; padding: 12px; background: #f5f9ff; border-left: 4px solid #0066cc; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
    th { background-color: #0066cc; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .signature-block { margin-top: 50px; padding-top: 30px; border-top: 1px solid #ddd; }
    .signature-line { margin-top: 40px; }
    .footer { margin-top: 60px; border-top: 2px solid #0066cc; padding-top: 20px; text-align: center; font-size: 11px; color: #666; }
    .watermark { opacity: 0.1; font-size: 80px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); z-index: -1; }
  </style>
</head>
<body>
  <div class="watermark">DISCLOSURE</div>
  
  <div class="header">
    <h1>University Confidential Intellectual Property Disclosure Form</h1>
    <p><strong>Reference Number:</strong> ${record.reference_number}</p>
    <p><strong>Disclosure Date:</strong> ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="section">
    <h2>I. INVENTOR/CREATOR INFORMATION</h2>
    
    <div class="field">
      <div class="field-label">Primary Inventor/Creator Name:</div>
      <div class="field-value">${applicant.full_name}</div>
    </div>

    <div class="field">
      <div class="field-label">Email Address:</div>
      <div class="field-value">${applicant.email}</div>
    </div>

    <div class="field">
      <div class="field-label">Department/Unit:</div>
      <div class="field-value">${applicant.affiliation || 'Not specified'}</div>
    </div>
  </div>

  <div class="section">
    <h2>II. INVENTION/IP DESCRIPTION</h2>

    <div class="field">
      <div class="field-label">Title of Invention:</div>
      <div class="field-value">${record.title}</div>
    </div>

    <div class="field">
      <div class="field-label">Category of IP:</div>
      <div class="field-value">${record.category.toUpperCase()}</div>
    </div>

    <div class="field">
      <div class="field-label">Abstract/Summary:</div>
      <div class="field-value">${record.abstract || 'Not provided'}</div>
    </div>

    <div class="field">
      <div class="field-label">Detailed Description of the Invention:</div>
      <div class="field-value">${details.description || 'Not provided'}</div>
    </div>
  </div>

  <div class="section">
    <h2>III. TECHNICAL FIELD AND BACKGROUND</h2>

    ${details.technicalField ? `
    <div class="field">
      <div class="field-label">Technical Field:</div>
      <div class="field-value">${details.technicalField}</div>
    </div>
    ` : ''}

    ${details.backgroundArt ? `
    <div class="field">
      <div class="field-label">Prior Art and Background:</div>
      <div class="field-value">${details.backgroundArt}</div>
    </div>
    ` : ''}

    ${details.problemStatement ? `
    <div class="field">
      <div class="field-label">Problem Statement:</div>
      <div class="field-value">${details.problemStatement}</div>
    </div>
    ` : ''}

    ${details.solution ? `
    <div class="field">
      <div class="field-label">Solution Offered:</div>
      <div class="field-value">${details.solution}</div>
    </div>
    ` : ''}

    ${details.advantages ? `
    <div class="field">
      <div class="field-label">Advantages and Benefits:</div>
      <div class="field-value">${details.advantages}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>IV. INVENTORS AND CONTRIBUTORS</h2>

    ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
    <table>
      <tr>
        <th>Name</th>
        <th>Affiliation/Department</th>
        <th>Contribution Level</th>
      </tr>
      ${details.inventors.map((inv: any, idx: number) => `
      <tr>
        <td>${inv.name || 'N/A'}</td>
        <td>${inv.affiliation || 'N/A'}</td>
        <td>${inv.contribution || 'N/A'}</td>
      </tr>
      `).join('')}
    </table>
    ` : '<p>No additional inventors/contributors listed</p>'}
  </div>

  <div class="section">
    <h2>V. INTELLECTUAL PROPERTY INFORMATION</h2>

    ${details.dateConceived ? `
    <div class="field">
      <div class="field-label">Date of First Conception:</div>
      <div class="field-value">${details.dateConceived}</div>
    </div>
    ` : ''}

    ${details.dateReduced ? `
    <div class="field">
      <div class="field-label">Date First Reduced to Practice:</div>
      <div class="field-value">${details.dateReduced}</div>
    </div>
    ` : ''}

    ${details.funding ? `
    <div class="field">
      <div class="field-label">Funding Source:</div>
      <div class="field-value">${details.funding}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>VI. COMMERCIAL POTENTIAL</h2>

    ${details.commercialPotential ? `
    <div class="field">
      <div class="field-label">Commercial Potential and Market:</div>
      <div class="field-value">${details.commercialPotential}</div>
    </div>
    ` : ''}

    ${details.targetMarket ? `
    <div class="field">
      <div class="field-label">Target Market:</div>
      <div class="field-value">${details.targetMarket}</div>
    </div>
    ` : ''}

    ${details.estimatedValue ? `
    <div class="field">
      <div class="field-label">Estimated Economic Value:</div>
      <div class="field-value">${details.estimatedValue}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>VII. SUPPORTING DOCUMENTS</h2>
    <p>The following documents have been submitted with this disclosure:</p>
    ${record.documents && record.documents.length > 0 ? `
    <ul>
      ${record.documents.map((doc: any) => `<li>${doc.file_name} (${(doc.size_bytes / 1024).toFixed(2)} KB)</li>`).join('')}
    </ul>
    ` : '<p>No supporting documents attached</p>'}
  </div>

  <div class="signature-block">
    <h2>VIII. ACKNOWLEDGMENT AND SIGNATURE</h2>
    
    <p>I/We hereby disclose the above-described invention to the University and acknowledge that I/we have read and understood the University's intellectual property policies. I/We understand that disclosure of this invention does not necessarily mean that the University will file a patent application or otherwise protect this intellectual property.</p>

    <p>I/We further declare that, to the best of my/our knowledge, the information contained in this disclosure is true and accurate.</p>

    <div class="signature-line">
      <p style="border-top: 1px solid #000; padding-top: 5px;">Signature of Inventor/Creator</p>
      <p style="margin-top: 5px; font-size: 12px;">_________________________</p>
      <p style="font-size: 12px;">Date</p>
    </div>
  </div>

  <div class="footer">
    <p>This disclosure form was generated by the University Intellectual Property Management System</p>
    <p>Record ID: ${record.id}</p>
    <p>Generated: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">CONFIDENTIAL - For University Use Only</p>
  </div>
</body>
</html>
  `;
}

// Simple HTML to PDF conversion using pdf-lib
async function convertHTMLToPDF(htmlContent: string, pdfDoc: PDFDocument): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  // Extract clean text from HTML
  const cleanText = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n') // Replace tags with newlines
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\n+/g, '\n') // Remove multiple newlines
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  const fontSize = 10;
  const margin = 30;
  const lineHeight = fontSize + 2;
  const maxLinesPerPage = Math.floor((792 - 2 * margin) / lineHeight);
  
  const lines = cleanText.split('\n');
  let currentPage = page;
  let yPosition = 792 - margin;
  let lineCount = 0;

  for (const line of lines) {
    if (lineCount >= maxLinesPerPage) {
      // Add new page
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = 792 - margin;
      lineCount = 0;
    }

    // Break long lines
    const maxCharsPerLine = 80;
    const wrappedLines = line.match(new RegExp(`.{1,${maxCharsPerLine}}`, 'g')) || [line];
    
    for (const wrappedLine of wrappedLines) {
      if (lineCount >= maxLinesPerPage) {
        currentPage = pdfDoc.addPage([612, 792]);
        yPosition = 792 - margin;
        lineCount = 0;
      }

      currentPage.drawText(wrappedLine, {
        x: margin,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
      lineCount++;
    }
  }

  return await pdfDoc.save();
}
