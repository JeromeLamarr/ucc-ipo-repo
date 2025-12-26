import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, PDFPage, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
  "Access-Control-Max-Age": "86400",
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

  const docHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Submission Documentation - ${record.reference_number}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 18px; }
    .inst-name { font-weight: bold; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; }
    .doc-title { font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 6px 0; }
    .ref-info { font-size: 11px; margin: 4px 0; }
    .meta-box { background: #efefef; border: 1px solid #999; padding: 8px; margin-bottom: 12px; font-size: 10px; }
    .meta-row { margin-bottom: 4px; display: flex; }
    .meta-label { font-weight: bold; width: 120px; }
    .meta-value { flex: 1; }
    .section { margin-bottom: 12px; }
    .sec-title { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
    .content { font-size: 11px; line-height: 1.4; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: left; }
    th { background: #ccc; font-weight: bold; font-size: 9px; text-transform: uppercase; }
    ul { margin-left: 16px; margin-top: 4px; }
    li { margin-bottom: 3px; font-size: 10px; }
    .confidential { background: #000; color: #fff; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; margin: 12px 0; text-transform: uppercase; }
    .footer { font-size: 9px; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #000; }
    p { font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="inst-name">University Confidential Consortium</div>
    <div class="inst-name">Intellectual Property Office</div>
    <div class="doc-title">IP Submission Documentation</div>
    <div class="ref-info"><strong>Reference:</strong> ${record.reference_number}</div>
    <div class="ref-info"><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
  </div>

  <div class="meta-box">
    <div class="meta-row"><div class="meta-label"><strong>Title:</strong></div><div class="meta-value">${record.title}</div></div>
    <div class="meta-row"><div class="meta-label"><strong>Category:</strong></div><div class="meta-value">${record.category}</div></div>
    <div class="meta-row"><div class="meta-label"><strong>Status:</strong></div><div class="meta-value">${record.status}</div></div>
    <div class="meta-row"><div class="meta-label"><strong>Submitted:</strong></div><div class="meta-value">${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
    <div class="meta-row"><div class="meta-label"><strong>Applicant:</strong></div><div class="meta-value">${applicant.full_name} (${applicant.email})</div></div>
  </div>

  <div class="section">
    <div class="sec-title">I. INVENTION DETAILS</div>
    <div class="content"><strong>Abstract/Summary:</strong><br/>${record.abstract || 'Not provided'}</div>
    <div class="content"><strong>Description:</strong><br/>${details.description || 'Not provided'}</div>
  </div>

  ${details.technicalField || details.backgroundArt || details.problemStatement || details.solution ? `
  <div class="section">
    <div class="sec-title">II. TECHNICAL INFORMATION</div>
    ${details.technicalField ? `<div class="content"><strong>Technical Field:</strong><br/>${details.technicalField}</div>` : ''}
    ${details.backgroundArt ? `<div class="content"><strong>Background:</strong><br/>${details.backgroundArt}</div>` : ''}
    ${details.problemStatement ? `<div class="content"><strong>Problem:</strong><br/>${details.problemStatement}</div>` : ''}
    ${details.solution ? `<div class="content"><strong>Solution:</strong><br/>${details.solution}</div>` : ''}
    ${details.advantages ? `<div class="content"><strong>Advantages:</strong><br/>${details.advantages}</div>` : ''}
  </div>
  ` : ''}

  ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
  <div class="section">
    <div class="sec-title">III. INVENTORS & CONTRIBUTORS</div>
    <table>
      <tr><th>Name</th><th>Affiliation</th><th>Role</th><th>Contact</th></tr>
      ${details.inventors.map((inv: any) => `<tr><td>${inv.name || ''}</td><td>${inv.affiliation || ''}</td><td>${inv.contribution || ''}</td><td>${inv.email || ''}</td></tr>`).join('')}
    </table>
  </div>
  ` : ''}

  ${details.keywords ? `
  <div class="section">
    <div class="sec-title">IV. KEYWORDS</div>
    <div class="content">${Array.isArray(details.keywords) ? details.keywords.join(', ') : details.keywords}</div>
  </div>
  ` : ''}

  ${documents.length > 0 ? `
  <div class="section">
    <div class="sec-title">V. UPLOADED DOCUMENTS</div>
    <ul>
      ${documents.map((doc: any) => `<li>${doc.file_name}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="confidential">CONFIDENTIAL - FOR OFFICIAL UNIVERSITY RECORDS</div>

  <div class="footer">
    <p>University Confidential Consortium | Intellectual Property Office</p>
    <p>Record: ${record.id} | Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `;
  
  return docHTML;
}

// Simple HTML to PDF conversion using pdf-lib
async function convertHTMLToPDF(htmlContent: string, pdfDoc: PDFDocument): Promise<Uint8Array> {
    * { margin: 0; padding: 0; }
    body { 
      font-family: 'Calibri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.8; 
      color: #1a1a1a; 
      margin: 0;
      padding: 40px 50px;
      background: #ffffff;
    }
    
    .document-header {
      border-bottom: 3px solid #1a472a;
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .institution-name {
      font-size: 12px;
      color: #1a472a;
      font-weight: 600;
      letter-spacing: 1px;
    }
    
    .document-title {
      font-size: 18px;
      color: #1a1a1a;
      font-weight: bold;
      margin: 15px 0 10px 0;
    }
    
    .ref-info {
      font-size: 11px;
      color: #333;
      margin: 8px 0;
      font-weight: 500;
    }
    
    h1 { 
      display: none;
    }
    
    h2 { 
      color: #1a472a;
      margin-top: 35px;
      margin-bottom: 15px;
      border-left: 5px solid #1a472a;
      padding-left: 15px;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section { 
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .metadata { 
      background: #f8f8f8;
      padding: 18px;
      border-left: 5px solid #1a472a;
      margin-bottom: 25px;
    }
    
    .field { 
      margin-bottom: 15px;
      page-break-inside: avoid;
      font-size: 11px;
    }
    
    .field-label { 
      font-weight: bold; 
      color: #1a472a;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
    }
    
    .field-value {
      margin-left: 15px;
      padding: 8px 0;
      line-height: 1.7;
      color: #333;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
      font-size: 11px;
    }
    
    th, td { 
      padding: 11px 12px;
      text-align: left;
      border: 1px solid #ccc;
      font-size: 11px;
    }
    
    th { 
      background-color: #1a472a;
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tr:nth-child(even) { 
      background-color: #f8f8f8;
    }
    
    tr:nth-child(odd) {
      background-color: #ffffff;
    }
    
    .footer { 
      margin-top: 70px; 
      border-top: 2px solid #1a472a;
      padding-top: 25px;
      text-align: center;
      font-size: 10px;
      color: #666;
      line-height: 1.6;
    }
    
    .footer-separator {
      margin: 15px 0;
      border-top: 1px solid #ccc;
      padding-top: 15px;
    }
    
    p { margin-bottom: 10px; font-size: 11px; line-height: 1.7; }
    li { margin-left: 20px; font-size: 11px; margin-bottom: 6px; }
    ul { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="document-header">
    <div class="institution-name">UNIVERSITY CONFIDENTIAL CONSORTIUM</div>
    <div class="institution-name">INTELLECTUAL PROPERTY OFFICE</div>
    <div class="document-title">IP SUBMISSION DOCUMENTATION</div>
    <div class="ref-info"><strong>Reference Number:</strong> ${record.reference_number}</div>
    <div class="ref-info"><strong>Document Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <div class="section metadata">
    <h2>Submission Information</h2>
    <div class="field">
      <div class="field-label">Title of Submission:</div>
      <div class="field-value">${record.title}</div>
    </div>
    <div class="field">
      <div class="field-label">Category of Intellectual Property:</div>
      <div class="field-value">${record.category.toUpperCase()}</div>
    </div>
    <div class="field">
      <div class="field-label">Current Status:</div>
      <div class="field-value">${record.status}</div>
    </div>
    <div class="field">
      <div class="field-label">Submission Date:</div>
      <div class="field-value">${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="field">
      <div class="field-label">Applicant/Inventor:</div>
      <div class="field-value">${applicant.full_name}<br/>${applicant.email}</div>
    </div>
  </div>

  <div class="section">
    <h2>Invention Details</h2>
    <div class="field">
      <div class="field-label">Abstract/Summary:</div>
      <div class="field-value">${record.abstract || 'Not provided'}</div>
    </div>
    <div class="field">
      <div class="field-label">Detailed Description:</div>
      <div class="field-value">${details.description || 'Not provided'}</div>
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
    <p>This document was automatically generated by the University Confidential Consortium Intellectual Property Management System.</p>
    <p>Record ID: ${record.id}</p>
    <p>Generated: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <div class="footer-separator">
      <p><strong>CONFIDENTIAL - For Official University Records</strong></p>
    </div>
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
