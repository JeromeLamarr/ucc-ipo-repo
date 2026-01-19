/**
 * Edge function to generate disclosure PDFs for IP records.
 * Supports both regular (ip_records) and legacy (legacy_ip_records) records.
 * 
 * For regular records: Generates full disclosure form with applicant details
 * For legacy records: Generates simplified legacy disclosure with archived data
 */

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

    // Accept both recordId and record_id for compatibility
    const { recordId, record_id } = await req.json();
    const actualRecordId = recordId || record_id;

    if (!actualRecordId) {
      return new Response(
        JSON.stringify({ error: "Missing recordId or record_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the IP record with all details - check both tables
    let record;
    
    console.log('[generate-disclosure] Payload:', {
      actualRecordId,
      timestamp: new Date().toISOString(),
    });

    // First try regular ip_records
    const { data: regularRecord, error: regularError } = await supabase
      .from("ip_records")
      .select(`
        *,
        applicant:users!applicant_id(*),
        supervisor:users!supervisor_id(*),
        evaluator:users!evaluator_id(*),
        documents:ip_documents(*)
      `)
      .eq("id", actualRecordId);

    if (!regularError && regularRecord && regularRecord.length > 0) {
      record = regularRecord[0];
      console.log('[generate-disclosure] Found in ip_records', {
        recordId: record.id,
        hasApplicant: !!record.applicant,
        status: record.status,
      });
    } else {
      // Try legacy_ip_records
      const { data: legacyRecord, error: legacyError } = await supabase
        .from("legacy_ip_records")
        .select("*")
        .eq("id", actualRecordId);

      if (!legacyError && legacyRecord && legacyRecord.length > 0) {
        record = legacyRecord[0];
        console.log('[generate-disclosure] Found in legacy_ip_records', {
          recordId: record.id,
          hasDetails: !!record.details,
          creatorName: record.details?.creator_name,
        });
      } else {
        console.error('[generate-disclosure] Record not found', {
          actualRecordId,
          regularError: regularError?.message,
          legacyError: legacyError?.message,
        });
        throw new Error("Record not found in either ip_records or legacy_ip_records");
      }
    }

    // Check if this is a legacy record
    const isLegacy = !record.applicant && !record.status;

    // Generate appropriate HTML based on record type
    const htmlContent = isLegacy 
      ? generateLegacyDisclosureHTML(record)
      : generateFullDisclosureHTML(record);

    // Convert HTML to PDF
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await convertHTMLToPDF(htmlContent, pdfDoc);

    const fileName = `${actualRecordId}_full_disclosure_${Date.now()}.pdf`;
    const filePath = `${actualRecordId}/${fileName}`;

    // Use appropriate bucket based on record type
    const bucketName = isLegacy ? "legacy-generated-documents" : "generated-documents";

    console.log('[generate-disclosure] Uploading PDF', {
      bucketName,
      filePath,
      fileSize: pdfBytes.length,
      isLegacy,
    });

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error('[generate-disclosure] Upload error:', {
        bucketName,
        filePath,
        error: uploadError.message,
      });
      throw uploadError;
    }

    console.log('[generate-disclosure] PDF uploaded successfully', {
      bucketName,
      filePath,
    });

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

  const disclosureHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Disclosure Form - ${record.reference_number}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 18px; }
    .inst-name { font-weight: bold; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; }
    .doc-title { font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 6px 0; }
    .ref-info { font-size: 11px; margin: 4px 0; }
    .instructions { background: #efefef; border: 1px solid #999; padding: 8px; margin-bottom: 12px; font-size: 10px; line-height: 1.3; }
    .section { margin-bottom: 12px; }
    .sec-title { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
    .form-group { margin-bottom: 8px; }
    .form-row { display: flex; gap: 12px; margin-bottom: 8px; }
    .form-col { flex: 1; }
    .field-label { font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
    .field-input { border: 1px solid #000; padding: 4px; min-height: 18px; font-size: 11px; width: 100%; }
    .field-large { border: 1px solid #000; padding: 4px; min-height: 45px; font-size: 11px; width: 100%; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: left; }
    th { background: #ccc; font-weight: bold; font-size: 9px; text-transform: uppercase; }
    .sig-box { margin-top: 12px; }
    .sig-line { border-top: 1px solid #000; width: 40%; margin: 35px 0 0 0; padding-top: 2px; }
    .sig-label { font-size: 10px; font-weight: bold; margin-top: 2px; }
    .sig-grid { display: flex; gap: 40px; margin-bottom: 12px; }
    .sig-blk { width: auto; }
    .confidential { background: #000; color: #fff; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; margin: 12px 0; text-transform: uppercase; }
    .footer { font-size: 9px; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #000; }
    .required { color: #d00; }
    ul { margin-left: 16px; margin-top: 4px; }
    li { margin-bottom: 3px; font-size: 10px; }
    p { font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="inst-name">University Confidential Consortium</div>
    <div class="inst-name">Intellectual Property Office</div>
    <div class="doc-title">Intellectual Property Disclosure Form</div>
    <div class="ref-info"><strong>Reference:</strong> ${record.reference_number}</div>
    <div class="ref-info"><strong>Date:</strong> ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
  </div>

  <div class="instructions">
    <strong>INSTRUCTIONS:</strong> Complete all sections. Attach supporting documentation. Submit to IP Office. All information is confidential.
  </div>

  <div class="section">
    <div class="sec-title">I. INVENTOR/CREATOR INFORMATION</div>
    <div class="form-group">
      <div class="field-label">Name of Primary Inventor <span class="required">*</span></div>
      <div class="field-input">${applicant.full_name || '_'.repeat(50)}</div>
    </div>
    <div class="form-row">
      <div class="form-col">
        <div class="field-label">Email <span class="required">*</span></div>
        <div class="field-input">${applicant.email || '_'.repeat(30)}</div>
      </div>
      <div class="form-col">
        <div class="field-label">Phone</div>
        <div class="field-input">${applicant.phone || '_'.repeat(20)}</div>
      </div>
    </div>
    <div class="form-group">
      <div class="field-label">Department/Affiliation <span class="required">*</span></div>
      <div class="field-input">${applicant.affiliation || '_'.repeat(50)}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">II. INVENTION/IP DESCRIPTION</div>
    <div class="form-group">
      <div class="field-label">Title of Invention <span class="required">*</span></div>
      <div class="field-input">${record.title || '_'.repeat(60)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Category of IP <span class="required">*</span></div>
      <div class="field-input">${record.category.toUpperCase()}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Abstract/Summary <span class="required">*</span></div>
      <div class="field-large">${record.abstract || '_'.repeat(100)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Detailed Description <span class="required">*</span></div>
      <div class="field-large">${details.description || '_'.repeat(100)}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">III. TECHNICAL FIELD & BACKGROUND</div>
    <div class="form-group">
      <div class="field-label">Technical Field</div>
      <div class="field-input">${details.technicalField || '_'.repeat(50)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Prior Art & Background</div>
      <div class="field-large">${details.backgroundArt || '_'.repeat(100)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Problem Statement</div>
      <div class="field-large">${details.problemStatement || '_'.repeat(100)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Solution Offered</div>
      <div class="field-large">${details.solution || '_'.repeat(100)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Advantages & Benefits</div>
      <div class="field-large">${details.advantages || '_'.repeat(100)}</div>
    </div>
  </div>

  ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
  <div class="section">
    <div class="sec-title">IV. INVENTORS & CONTRIBUTORS</div>
    <table>
      <tr><th>Name</th><th>Affiliation</th><th>Role</th><th>%</th></tr>
      ${details.inventors.map((inv: any) => `<tr><td>${inv.name || ''}</td><td>${inv.affiliation || ''}</td><td>${inv.contribution || ''}</td><td>${inv.percent || ''}</td></tr>`).join('')}
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="sec-title">V. INTELLECTUAL PROPERTY INFORMATION</div>
    <div class="form-row">
      <div class="form-col">
        <div class="field-label">Date of Conception</div>
        <div class="field-input">${details.dateConceived || '__/__/____'}</div>
      </div>
      <div class="form-col">
        <div class="field-label">Date Reduced to Practice</div>
        <div class="field-input">${details.dateReduced || '__/__/____'}</div>
      </div>
    </div>
    <div class="form-group">
      <div class="field-label">Funding Source</div>
      <div class="field-input">${details.funding || '_'.repeat(50)}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">VI. COMMERCIAL POTENTIAL</div>
    <div class="form-group">
      <div class="field-label">Commercial Potential & Market</div>
      <div class="field-large">${details.commercialPotential || '_'.repeat(100)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Target Market</div>
      <div class="field-input">${details.targetMarket || '_'.repeat(50)}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Estimated Value</div>
      <div class="field-input">${details.estimatedValue || '_'.repeat(50)}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">VII. SUPPORTING DOCUMENTS</div>
    ${record.documents && record.documents.length > 0 ? `
    <ul>
      ${record.documents.map((doc: any) => `<li>${doc.file_name}</li>`).join('')}
    </ul>
    ` : '<p style="font-style: italic;">No supporting documents attached</p>'}
  </div>

  <div class="section sig-box">
    <div class="sec-title">VIII. ACKNOWLEDGMENT & SIGNATURE</div>
    <p style="line-height: 1.4; margin-bottom: 8px;">
      I/We hereby disclose the above invention and acknowledge reading the University's IP policies. Disclosure does not guarantee patent filing or IP protection.
    </p>
    <p style="line-height: 1.4; margin-bottom: 8px;">
      I/We declare the information is true and accurate. False information may result in loss of rights.
    </p>
    <div class="sig-grid">
      <div class="sig-blk">
        <div class="sig-line"></div>
        <div class="sig-label">Signature (Inventor)</div>
        <div style="font-size: 9px; margin-top: 2px;">___________________</div>
        <div style="font-size: 9px;">Date</div>
      </div>
      <div class="sig-blk">
        <div class="sig-line"></div>
        <div class="sig-label">Printed Name</div>
      </div>
    </div>
  </div>

  <div class="confidential">CONFIDENTIAL - FOR UNIVERSITY USE ONLY</div>

  <div class="footer">
    <p>University Confidential Consortium | Intellectual Property Office</p>
    <p>Record: ${record.id} | Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `;
  
  return disclosureHTML;
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
      margin: 10px 0;
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
    
    .field { 
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    
    .field-label { 
      font-weight: bold; 
      color: #1a472a; 
      font-size: 11px; 
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    
    .field-value { 
      margin-top: 6px; 
      padding: 12px 14px;
      background: #f8f8f8;
      border-left: 3px solid #1a472a;
      font-size: 11px;
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
    
    .signature-block { 
      margin-top: 50px; 
      padding-top: 30px; 
      border-top: 2px solid #1a472a;
    }
    
    .signature-section {
      margin-top: 35px;
      page-break-inside: avoid;
    }
    
    .signature-line { 
      margin-top: 40px;
      display: inline-block;
      width: 45%;
    }
    
    .sig-line {
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
      width: 200px;
    }
    
    .sig-label {
      font-size: 10px;
      margin-top: 8px;
      font-weight: 500;
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
    
    p { margin-bottom: 12px; font-size: 11px; }
    li { margin-left: 20px; font-size: 11px; margin-bottom: 6px; }
    ul { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="document-header">
    <div class="institution-name">UNIVERSITY CONFIDENTIAL CONSORTIUM</div>
    <div class="institution-name">INTELLECTUAL PROPERTY OFFICE</div>
    <div class="document-title">INTELLECTUAL PROPERTY DISCLOSURE FORM</div>
    <div class="ref-info"><strong>Reference Number:</strong> ${record.reference_number}</div>
    <div class="ref-info"><strong>Disclosure Date:</strong> ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
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
      <div class="field-label">When did you come up with this idea?</div>
      <div class="field-value">${details.dateConceived}</div>
    </div>
    ` : ''}

    ${details.dateReduced ? `
    <div class="field">
      <div class="field-label">When did you start working on it?</div>
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

    <div class="signature-section">
      <div class="signature-line">
        <div class="sig-line"></div>
        <div class="sig-label">Signature of Inventor/Creator</div>
      </div>
      
      <div class="signature-line">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This disclosure form was generated by the University Confidential Consortium Intellectual Property Management System</p>
    <p>Record ID: ${record.id}</p>
    <p>Generated: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <div class="footer-separator">
      <p><strong>CONFIDENTIAL - For University Use Only</strong></p>
    </div>
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

function generateLegacyDisclosureHTML(record: any): string {
  const details = record.details || {};
  const inventors = details.inventors || [];
  const remarks = details.remarks || '';

  const inventorsHTML = inventors.map((inv: any) => `
    <div class="inventor-item">
      <p><strong>Name:</strong> ${inv.name || 'N/A'}</p>
      ${inv.affiliation ? `<p><strong>Affiliation:</strong> ${inv.affiliation}</p>` : ''}
      ${inv.contribution ? `<p><strong>Contribution:</strong> ${inv.contribution}</p>` : ''}
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Legacy IP Record - ${record.title}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.6; color: #000; }
    .header { text-align: center; border-bottom: 3px solid #D97706; padding-bottom: 15px; margin-bottom: 20px; }
    .inst-name { font-weight: bold; font-size: 14px; letter-spacing: 1px; }
    .doc-title { font-weight: bold; font-size: 13px; margin-top: 8px; text-transform: uppercase; }
    .badge { background: #FCD34D; color: #78350F; padding: 2px 6px; font-size: 10px; font-weight: bold; display: inline-block; margin-top: 4px; border-radius: 3px; }
    .section { margin-bottom: 15px; }
    .sec-title { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; border-bottom: 2px solid #D97706; padding-bottom: 4px; }
    .field-group { margin-bottom: 8px; }
    .field-label { font-weight: bold; font-size: 11px; color: #374151; }
    .field-value { margin: 4px 0 0 0; padding: 4px 0; }
    .inventor-item { background: #F3F4F6; padding: 8px; margin-bottom: 6px; border-left: 3px solid #D97706; }
    .inventor-item p { margin: 3px 0; font-size: 11px; }
    .footer { font-size: 10px; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #D1D5DB; color: #6B7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="inst-name">University Confidential Consortium</div>
    <div class="inst-name">Intellectual Property Office</div>
    <div class="doc-title">Legacy IP Record Disclosure</div>
    <span class="badge">🔖 LEGACY RECORD</span>
  </div>

  <div class="section">
    <div class="sec-title">Creator Information</div>
    <div class="field-group">
      <div class="field-label">Creator / Applicant</div>
      <div class="field-value">${details.creator_name || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">IP Information</div>
    <div class="field-group">
      <div class="field-label">Title</div>
      <div class="field-value">${record.title || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Category</div>
      <div class="field-value">${record.category || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Abstract</div>
      <div class="field-value">${record.abstract || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">Legacy Details</div>
    <div class="field-group">
      <div class="field-label">Source</div>
      <div class="field-value">${record.legacy_source || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Original Filing Date</div>
      <div class="field-value">${record.original_filing_date || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">IPOPHIL Application Number</div>
      <div class="field-value">${record.ipophil_application_no || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Remarks</div>
      <div class="field-value">${remarks || 'N/A'}</div>
    </div>
  </div>

  ${inventors.length > 0 ? `
  <div class="section">
    <div class="sec-title">Inventors / Authors</div>
    ${inventorsHTML}
  </div>
  ` : ''}

  <div class="footer">
    <p>This disclosure was generated on ${new Date().toLocaleDateString()} for legacy IP record archival purposes.</p>
  </div>
</body>
</html>
  `;
}
