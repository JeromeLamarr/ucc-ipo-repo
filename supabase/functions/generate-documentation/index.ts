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
  
  // Generate professional title with submission title
  const docTitle = `Full Documentation - ${record.title}`;
  const pdfFileName = `${record.reference_number}_Full_Documentation_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const docHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <style>
    @page { 
      size: letter; 
      margin: 0.75in;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
      }
    }
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.6; 
      color: #2c3e50;
      background: #ffffff;
    }
    
    /* HEADER SECTION */
    .document-header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 24px;
      margin-bottom: 28px;
      text-align: center;
    }
    
    .institution-name {
      font-size: 10px;
      color: #2563eb;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .document-title {
      font-size: 20px;
      color: #1e293b;
      font-weight: 700;
      margin: 12px 0 8px 0;
      line-height: 1.3;
    }
    
    .ref-info {
      font-size: 10px;
      color: #64748b;
      margin: 6px 0;
      font-weight: 500;
    }
    
    /* METADATA SECTION */
    .metadata-section {
      background: linear-gradient(to right, #f0f9ff, #f8fafc);
      border-left: 4px solid #2563eb;
      padding: 16px 18px;
      margin-bottom: 24px;
      border-radius: 4px;
    }
    
    .metadata-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .metadata-item {
      page-break-inside: avoid;
    }
    
    .metadata-label {
      font-weight: 700;
      color: #2563eb;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .metadata-value {
      color: #334155;
      font-size: 11px;
      line-height: 1.5;
    }
    
    /* CONTENT SECTIONS */
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-weight: 700;
      font-size: 13px;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
    }
    
    .section-number {
      background: #2563eb;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      margin-right: 10px;
      flex-shrink: 0;
    }
    
    .content-block {
      margin-bottom: 12px;
      line-height: 1.7;
    }
    
    .field-label {
      font-weight: 600;
      color: #2563eb;
      font-size: 10px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .field-value {
      color: #334155;
      font-size: 11px;
      margin-bottom: 8px;
      line-height: 1.6;
    }
    
    /* TABLE STYLING */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10px;
    }
    
    th {
      background: linear-gradient(to right, #2563eb, #1d4ed8);
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
      border: 1px solid #2563eb;
    }
    
    td {
      padding: 9px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
      font-size: 10px;
    }
    
    tr:nth-child(even) {
      background: #f8fafc;
    }
    
    tr:nth-child(odd) {
      background: #ffffff;
    }
    
    /* LIST STYLING */
    ul {
      margin: 10px 0 10px 24px;
      list-style-type: disc;
    }
    
    li {
      margin-bottom: 6px;
      color: #334155;
      font-size: 11px;
      line-height: 1.5;
    }
    
    /* FOOTER SECTION */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #64748b;
    }
    
    .footer-text {
      margin: 4px 0;
      line-height: 1.6;
    }
    
    .confidential-banner {
      background: #fee2e2;
      border: 2px solid #dc2626;
      color: #991b1b;
      padding: 12px;
      text-align: center;
      font-weight: 700;
      font-size: 10px;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 4px;
    }
    
    /* PAGE BREAK */
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="document-header">
    <div class="institution-name">University Confidential Consortium</div>
    <div class="institution-name">Intellectual Property Office</div>
    <div class="document-title">${docTitle}</div>
    <div class="ref-info"><strong>Reference Number:</strong> ${record.reference_number}</div>
    <div class="ref-info"><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>

  <!-- SUBMISSION METADATA -->
  <div class="section">
    <div class="metadata-section">
      <div class="metadata-grid">
        <div class="metadata-item">
          <div class="metadata-label">Submission Title</div>
          <div class="metadata-value">${record.title}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Category</div>
          <div class="metadata-value">${record.category.charAt(0).toUpperCase() + record.category.slice(1)}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Current Status</div>
          <div class="metadata-value">${record.status.replace(/_/g, ' ').toUpperCase()}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Submission Date</div>
          <div class="metadata-value">${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Primary Applicant</div>
          <div class="metadata-value">${applicant.full_name}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Contact Email</div>
          <div class="metadata-value">${applicant.email}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- INVENTION DETAILS -->
  <div class="section">
    <div class="section-title">
      <div class="section-number">1</div>
      Invention Details
    </div>
    <div class="content-block">
      <div class="field-label">Abstract / Summary</div>
      <div class="field-value">${record.abstract || 'Not provided'}</div>
    </div>
    <div class="content-block">
      <div class="field-label">Detailed Description</div>
      <div class="field-value">${details.description || 'Not provided'}</div>
    </div>
  </div>

  <!-- TECHNICAL INFORMATION -->
  ${details.technicalField || details.backgroundArt || details.problemStatement || details.solution || details.advantages ? `
  <div class="section">
    <div class="section-title">
      <div class="section-number">2</div>
      Technical Information
    </div>
    ${details.technicalField ? `
    <div class="content-block">
      <div class="field-label">Technical Field</div>
      <div class="field-value">${details.technicalField}</div>
    </div>
    ` : ''}
    ${details.backgroundArt ? `
    <div class="content-block">
      <div class="field-label">Background & Prior Art</div>
      <div class="field-value">${details.backgroundArt}</div>
    </div>
    ` : ''}
    ${details.problemStatement ? `
    <div class="content-block">
      <div class="field-label">Problem Statement</div>
      <div class="field-value">${details.problemStatement}</div>
    </div>
    ` : ''}
    ${details.solution ? `
    <div class="content-block">
      <div class="field-label">Proposed Solution</div>
      <div class="field-value">${details.solution}</div>
    </div>
    ` : ''}
    ${details.advantages ? `
    <div class="content-block">
      <div class="field-label">Key Advantages</div>
      <div class="field-value">${details.advantages}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- INVENTORS & CONTRIBUTORS -->
  ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
  <div class="section">
    <div class="section-title">
      <div class="section-number">3</div>
      Inventors & Contributors
    </div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Affiliation</th>
          <th>Contribution</th>
          <th>Contact</th>
        </tr>
      </thead>
      <tbody>
        ${details.inventors.map((inv: any) => `
        <tr>
          <td>${inv.name || '-'}</td>
          <td>${inv.affiliation || '-'}</td>
          <td>${inv.contribution || '-'}</td>
          <td>${inv.email || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- KEYWORDS -->
  ${details.keywords ? `
  <div class="section">
    <div class="section-title">
      <div class="section-number">4</div>
      Keywords & Classifications
    </div>
    <div class="field-value">
      ${Array.isArray(details.keywords) ? details.keywords.join(' • ') : details.keywords}
    </div>
  </div>
  ` : ''}

  <!-- UPLOADED DOCUMENTS -->
  ${documents.length > 0 ? `
  <div class="section">
    <div class="section-title">
      <div class="section-number">5</div>
      Supporting Documents
    </div>
    <ul>
      ${documents.map((doc: any) => `<li>${doc.file_name}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- CONFIDENTIAL BANNER -->
  <div class="confidential-banner">
    CONFIDENTIAL - FOR OFFICIAL UNIVERSITY RECORDS ONLY
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-text">This document was automatically generated by the University Confidential Consortium Intellectual Property Management System</div>
    <div class="footer-text">Record ID: ${record.id} | PDF: ${pdfFileName}</div>
    <div class="footer-text">Generated on ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
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
  
  // Generate professional title with submission title
  const docTitle = `IP Disclosure Form - ${record.title}`;
  const pdfFileName = `${record.reference_number}_Disclosure_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <style>
    @page { 
      size: letter; 
      margin: 0.75in;
    }
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.6; 
      color: #2c3e50;
      background: #ffffff;
    }
    
    /* HEADER SECTION */
    .document-header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 24px;
      margin-bottom: 28px;
      text-align: center;
    }
    
    .institution-name {
      font-size: 10px;
      color: #2563eb;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .document-title {
      font-size: 20px;
      color: #1e293b;
      font-weight: 700;
      margin: 12px 0 8px 0;
      line-height: 1.3;
    }
    
    .ref-info {
      font-size: 10px;
      color: #64748b;
      margin: 6px 0;
      font-weight: 500;
    }
    
    /* FORM SECTION */
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-weight: 700;
      font-size: 13px;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
    }
    
    .section-number {
      background: #2563eb;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      margin-right: 10px;
      flex-shrink: 0;
    }
    
    .field {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    
    .field-label {
      font-weight: 600;
      color: #2563eb;
      font-size: 10px;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .field-value {
      background: linear-gradient(to right, #f0f9ff, #f8fafc);
      border-left: 3px solid #2563eb;
      padding: 10px 12px;
      color: #334155;
      font-size: 11px;
      line-height: 1.6;
      border-radius: 2px;
    }
    
    /* TABLE STYLING */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10px;
    }
    
    th {
      background: linear-gradient(to right, #2563eb, #1d4ed8);
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
      border: 1px solid #2563eb;
    }
    
    td {
      padding: 9px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
      font-size: 10px;
    }
    
    tr:nth-child(even) {
      background: #f8fafc;
    }
    
    tr:nth-child(odd) {
      background: #ffffff;
    }
    
    /* SIGNATURE BLOCK */
    .signature-block {
      margin-top: 32px;
      border-top: 2px solid #e2e8f0;
      padding-top: 20px;
    }
    
    .signature-line {
      margin-top: 24px;
      display: flex;
      gap: 40px;
    }
    
    .signature-item {
      flex: 1;
    }
    
    .signature-underline {
      border-bottom: 1px solid #334155;
      height: 30px;
      margin-bottom: 4px;
    }
    
    .signature-label {
      font-size: 9px;
      color: #64748b;
      font-weight: 500;
    }
    
    /* FOOTER SECTION */
    .confidential-banner {
      background: #fee2e2;
      border: 2px solid #dc2626;
      color: #991b1b;
      padding: 12px;
      text-align: center;
      font-weight: 700;
      font-size: 10px;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 4px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #64748b;
    }
    
    .footer-text {
      margin: 4px 0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="document-header">
    <div class="institution-name">University Confidential Consortium</div>
    <div class="institution-name">Intellectual Property Office</div>
    <div class="document-title">${docTitle}</div>
    <div class="ref-info"><strong>Reference Number:</strong> ${record.reference_number}</div>
    <div class="ref-info"><strong>Disclosure Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <!-- DISCLOSER INFORMATION -->
  <div class="section">
    <div class="section-title">
      <div class="section-number">1</div>
      Discloser Information
    </div>
    <div class="field">
      <div class="field-label">Full Name</div>
      <div class="field-value">${applicant.full_name}</div>
    </div>
    <div class="field">
      <div class="field-label">Email Address</div>
      <div class="field-value">${applicant.email}</div>
    </div>
    <div class="field">
      <div class="field-label">Department / Affiliation</div>
      <div class="field-value">${applicant.affiliation || 'Not provided'}</div>
    </div>
  </div>

  <!-- INVENTION DESCRIPTION -->
  <div class="section">
    <div class="section-title">
      <div class="section-number">2</div>
      Invention / IP Description
    </div>
    <div class="field">
      <div class="field-label">Title of Invention</div>
      <div class="field-value">${record.title}</div>
    </div>
    <div class="field">
      <div class="field-label">Category of IP</div>
      <div class="field-value">${record.category.charAt(0).toUpperCase() + record.category.slice(1)}</div>
    </div>
    <div class="field">
      <div class="field-label">Abstract / Summary</div>
      <div class="field-value">${record.abstract || 'Not provided'}</div>
    </div>
    <div class="field">
      <div class="field-label">Detailed Description</div>
      <div class="field-value">${details.description || 'Not provided'}</div>
    </div>
  </div>

  <!-- TECHNICAL INFORMATION -->
  <div class="section">
    <div class="section-title">
      <div class="section-number">3</div>
      Technical Information
    </div>
    ${details.technicalField ? `
    <div class="field">
      <div class="field-label">Technical Field</div>
      <div class="field-value">${details.technicalField}</div>
    </div>
    ` : ''}
    ${details.backgroundArt ? `
    <div class="field">
      <div class="field-label">Background Art / Prior Art</div>
      <div class="field-value">${details.backgroundArt}</div>
    </div>
    ` : ''}
    ${details.problemStatement ? `
    <div class="field">
      <div class="field-label">Problem Statement</div>
      <div class="field-value">${details.problemStatement}</div>
    </div>
    ` : ''}
    ${details.solution ? `
    <div class="field">
      <div class="field-label">Proposed Solution</div>
      <div class="field-value">${details.solution}</div>
    </div>
    ` : ''}
  </div>

  <!-- INVENTORS AND CONTRIBUTORS -->
  ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
  <div class="section">
    <div class="section-title">
      <div class="section-number">4</div>
      Inventors & Contributors
    </div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Affiliation</th>
          <th>Contribution</th>
        </tr>
      </thead>
      <tbody>
        ${details.inventors.map((inv: any) => `
        <tr>
          <td>${inv.name || '-'}</td>
          <td>${inv.affiliation || '-'}</td>
          <td>${inv.contribution || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- COMMERCIAL POTENTIAL -->
  ${details.commercialPotential ? `
  <div class="section">
    <div class="section-title">
      <div class="section-number">5</div>
      Commercial Potential & Advantages
    </div>
    <div class="field">
      <div class="field-value">${details.commercialPotential}</div>
    </div>
  </div>
  ` : ''}

  <!-- SIGNATURE SECTION -->
  <div class="section signature-block">
    <h3 style="font-size: 12px; color: #1e293b; margin-bottom: 12px; font-weight: 700;">
      6. Disclosure Acknowledgment & Declaration
    </h3>
    <p style="font-size: 10px; margin-bottom: 12px; line-height: 1.7;">
      The undersigned hereby disclose the above-described invention/intellectual property to the University for review 
      and processing in accordance with applicable university policies and procedures. I understand that this disclosure 
      is part of the institutional intellectual property management process.
    </p>
    <div class="signature-line">
      <div class="signature-item">
        <div class="signature-underline"></div>
        <div class="signature-label">Discloser Signature</div>
      </div>
      <div class="signature-item">
        <div class="signature-underline"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>
  </div>

  <!-- CONFIDENTIAL BANNER -->
  <div class="confidential-banner">
    CONFIDENTIAL - FOR OFFICIAL UNIVERSITY RECORDS ONLY
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-text">This document was automatically generated by the University Confidential Consortium Intellectual Property Management System</div>
    <div class="footer-text">Record ID: ${record.id} | PDF: ${pdfFileName}</div>
    <div class="footer-text">Generated on ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
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
