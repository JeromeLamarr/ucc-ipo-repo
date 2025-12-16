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

    const { recordId, documentType } = await req.json();

    if (!recordId || !documentType) {
      return new Response(
        JSON.stringify({ error: "Missing recordId or documentType" }),
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

    // Generate HTML content based on document type
    let htmlContent = "";

    if (documentType === "full_documentation") {
      htmlContent = generateFullDocumentationHTML(record);
    } else if (documentType === "full_disclosure") {
      htmlContent = generateFullDisclosureHTML(record);
    }

    // Convert HTML to PDF
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await convertHTMLToPDF(htmlContent, pdfDoc);

    // Save as PDF file
    const fileName = `${recordId}_${documentType}_${Date.now()}.pdf`;
    const filePath = `${recordId}/${fileName}`;

    // Upload the generated document
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
        message: `${documentType} generated successfully`,
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

function generateFullDocumentationHTML(record: any): string {
  const applicant = record.applicant || {};
  const details = record.details || {};
  const documents = record.documents || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Submission Documentation - ${record.reference_number}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
    h1 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .field { margin-bottom: 10px; }
    .field-label { font-weight: bold; color: #0066cc; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background-color: #0066cc; color: white; }
    .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>IP Submission Full Documentation</h1>
  <p>Reference Number: <strong>${record.reference_number}</strong></p>
  <p>Generated: <strong>${new Date().toLocaleString()}</strong></p>

  <div class="section metadata">
    <h2>Submission Information</h2>
    <div class="field">
      <span class="field-label">Title:</span> ${record.title}
    </div>
    <div class="field">
      <span class="field-label">Category:</span> ${record.category}
    </div>
    <div class="field">
      <span class="field-label">Status:</span> ${record.status}
    </div>
    <div class="field">
      <span class="field-label">Submitted Date:</span> ${new Date(record.created_at).toLocaleString()}
    </div>
    <div class="field">
      <span class="field-label">Applicant:</span> ${applicant.full_name} (${applicant.email})
    </div>
  </div>

  <div class="section">
    <h2>Submission Details</h2>
    <div class="field">
      <span class="field-label">Abstract:</span>
      <p>${record.abstract || 'Not provided'}</p>
    </div>
    <div class="field">
      <span class="field-label">Description:</span>
      <p>${details.description || 'Not provided'}</p>
    </div>
  </div>

  ${details.inventors ? `
  <div class="section">
    <h2>Inventors</h2>
    <table>
      <tr>
        <th>Name</th>
        <th>Affiliation</th>
        <th>Contribution</th>
      </tr>
      ${details.inventors.map((inv: any) => `
        <tr>
          <td>${inv.name}</td>
          <td>${inv.affiliation || '-'}</td>
          <td>${inv.contribution || '-'}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${details.keywords ? `
  <div class="section">
    <h2>Keywords</h2>
    <p>${Array.isArray(details.keywords) ? details.keywords.join(', ') : details.keywords}</p>
  </div>
  ` : ''}

  ${documents.length > 0 ? `
  <div class="section">
    <h2>Uploaded Documents</h2>
    <ul>
      ${documents.map((doc: any) => `<li>${doc.file_name}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="footer">
    <p>This document was automatically generated by the UCC IP Management System.</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}

function generateFullDisclosureHTML(record: any): string {
  const applicant = record.applicant || {};
  const details = record.details || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Disclosure Form - ${record.reference_number}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
    h1 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #0066cc; display: block; margin-bottom: 5px; }
    .field-value { padding: 10px; background: #f9f9f9; border-left: 3px solid #0066cc; }
  </style>
</head>
<body>
  <h1>Complete IP Disclosure</h1>
  <p>Reference Number: <strong>${record.reference_number}</strong></p>
  <p>Disclosure Date: <strong>${new Date(record.created_at).toLocaleDateString()}</strong></p>

  <h2>1. Disclosure Party Information</h2>
  <div class="field">
    <span class="field-label">Name:</span>
    <div class="field-value">${applicant.full_name}</div>
  </div>
  <div class="field">
    <span class="field-label">Email:</span>
    <div class="field-value">${applicant.email}</div>
  </div>
  <div class="field">
    <span class="field-label">Department/Affiliation:</span>
    <div class="field-value">${applicant.affiliation || 'Not provided'}</div>
  </div>

  <h2>2. Invention/IP Description</h2>
  <div class="field">
    <span class="field-label">Title:</span>
    <div class="field-value">${record.title}</div>
  </div>
  <div class="field">
    <span class="field-label">Category:</span>
    <div class="field-value">${record.category}</div>
  </div>
  <div class="field">
    <span class="field-label">Abstract:</span>
    <div class="field-value">${record.abstract || 'Not provided'}</div>
  </div>
  <div class="field">
    <span class="field-label">Detailed Description:</span>
    <div class="field-value">${details.description || 'Not provided'}</div>
  </div>

  <h2>3. Technical Details</h2>
  ${details.technicalField ? `
  <div class="field">
    <span class="field-label">Technical Field:</span>
    <div class="field-value">${details.technicalField}</div>
  </div>
  ` : ''}
  
  ${details.backgroundArt ? `
  <div class="field">
    <span class="field-label">Background Art/Prior Art:</span>
    <div class="field-value">${details.backgroundArt}</div>
  </div>
  ` : ''}

  <h2>4. Inventors and Contributors</h2>
  ${details.inventors && details.inventors.length > 0 ? `
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <tr style="background: #0066cc; color: white;">
      <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Name</th>
      <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Affiliation</th>
      <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Contribution</th>
    </tr>
    ${details.inventors.map((inv: any) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${inv.name}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${inv.affiliation || '-'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${inv.contribution || '-'}</td>
    </tr>
    `).join('')}
  </table>
  ` : '<p>No inventors listed</p>'}

  <h2>5. Commercial Potential</h2>
  ${details.commercialPotential ? `
  <div class="field-value">${details.commercialPotential}</div>
  ` : '<p>Not provided</p>'}

  <h2>6. Acknowledgment and Declaration</h2>
  <p>The undersigned hereby disclose the above-described invention/intellectual property to the University for review and processing in accordance with applicable university policies and procedures.</p>
  <p style="margin-top: 30px;">___________________________ _______________</p>
  <p>Signature of Discloser Date</p>

  <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>This disclosure document was generated by the UCC IP Management System</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}

// Simple HTML to PDF conversion using pdf-lib
async function convertHTMLToPDF(htmlContent: string, pdfDoc: PDFDocument): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  // Extract text from HTML (simple approach)
  const textContent = htmlContent
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .filter(line => line.trim())
    .join('\n');

  const fontSize = 11;
  const margin = 40;
  const maxWidth = page.getWidth() - 2 * margin;
  
  let yPosition = page.getHeight() - margin;

  // Split text into lines that fit within the page width
  const lines = textContent.split('\n');
  
  for (const line of lines) {
    if (yPosition < margin) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getHeight() - margin;
    }

    // Draw text
    page.drawText(line.substring(0, 100), {
      x: margin,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    yPosition -= fontSize + 5;
  }

  return await pdfDoc.save();
}
