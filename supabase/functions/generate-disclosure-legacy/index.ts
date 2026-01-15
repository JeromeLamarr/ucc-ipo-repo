/**
 * Edge function to generate disclosure PDFs for LEGACY IP records only.
 * This function handles legacy_ip_records table exclusively.
 * For workflow records, use the standard generate-disclosure function instead.
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

// Helper to convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface LegacyIPRecord {
  id: string;
  title: string;
  category: string;
  abstract?: string;
  details: {
    creator_name: string;
    description?: string;
    inventors?: Array<{ name: string; affiliation?: string; contribution?: string }>;
    [key: string]: any;
  };
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[generate-disclosure-legacy] Missing env vars');
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body safely
    let bodyData: any = {};
    try {
      const body = await req.json();
      bodyData = body || {};
      console.log('[generate-disclosure-legacy] Parsed body:', bodyData);
    } catch (e) {
      console.warn('[generate-disclosure-legacy] JSON parse failed:', String(e));
    }

    // Try to get record_id from body or query params
    const url = new URL(req.url);
    const queryRecordId = url.searchParams.get('record_id');
    const actualRecordId = bodyData.record_id || bodyData.recordId || queryRecordId;

    if (!actualRecordId) {
      console.error('[generate-disclosure-legacy] No record ID found', { bodyData, queryRecordId });
      return new Response(
        JSON.stringify({
          error: "Missing record_id in body or query params",
          received: { body: bodyData, queryRecordId },
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[generate-disclosure-legacy] Processing record:', actualRecordId);

    // Fetch ONLY from legacy_ip_records table
    const { data: legacyRecord, error: legacyError } = await supabase
      .from("legacy_ip_records")
      .select("*")
      .eq("id", actualRecordId);

    if (!legacyRecord || legacyRecord.length === 0) {
      console.error('[generate-disclosure-legacy] Legacy record not found', {
        actualRecordId,
        error: legacyError?.message,
      });
      throw new Error("Legacy record not found: " + actualRecordId);
    }

    const record = legacyRecord[0] as LegacyIPRecord;

    console.log('[generate-disclosure-legacy] Found legacy record', {
      recordId: record.id,
      title: record.title,
      creatorName: record.details?.creator_name,
    });

    // Generate legacy disclosure HTML
    const htmlContent = generateLegacyDisclosureHTML(record);
    console.log('[generate-disclosure-legacy] HTML generated, size:', htmlContent.length);

    // Convert HTML to PDF
    const pdfDoc = await PDFDocument.create();
    console.log('[generate-disclosure-legacy] PDF document created');
    
    const pdfBytes = await convertHTMLToPDF(htmlContent, pdfDoc);
    console.log('[generate-disclosure-legacy] PDF conversion complete, size:', pdfBytes.length);

    const fileName = `${actualRecordId}_legacy_disclosure_${Date.now()}.pdf`;
    const filePath = `${actualRecordId}/${fileName}`;

    console.log('[generate-disclosure-legacy] Uploading to storage', {
      bucketName: "legacy-generated-documents",
      filePath,
      fileSize: pdfBytes.length,
    });

    const { error: uploadError } = await supabase.storage
      .from("legacy-generated-documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error('[generate-disclosure-legacy] Upload error:', {
        error: uploadError.message,
        errorCode: (uploadError as any).statusCode,
      });
      throw uploadError;
    }

    console.log('[generate-disclosure-legacy] Disclosure generated successfully', {
      filePath,
      fileSize: pdfBytes.length,
    });

    // Save document record to database
    const { error: dbError } = await supabase
      .from("legacy_record_documents")
      .insert({
        record_id: actualRecordId,
        document_type: "disclosure",
        file_path: filePath,
        file_name: fileName,
        pdf_data: null,
      });

    if (dbError) {
      console.warn('[generate-disclosure-legacy] Database record error (non-critical):', dbError.message);
      // Don't throw - PDF was uploaded successfully, just warn about DB record
    } else {
      console.log('[generate-disclosure-legacy] Database record created');
    }

    // Convert PDF to base64 for download
    const base64Pdf = uint8ArrayToBase64(pdfBytes);

    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        pdf_data: base64Pdf,
        message: "Legacy disclosure generated successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[generate-disclosure-legacy] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
function generateLegacyDisclosureHTML(record: LegacyIPRecord): string {
  const details = record.details || {};
  const inventors = details.inventors || [];

  const disclosureHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IP Disclosure Form - Legacy Record - ${record.title}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
    }
    
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
      text-transform: uppercase;
    }
    
    .document-title {
      font-size: 18px;
      color: #1a1a1a;
      font-weight: bold;
      margin: 15px 0 10px 0;
      text-transform: uppercase;
    }
    
    .legacy-badge {
      display: inline-block;
      background: #FCD34D;
      color: #78350F;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      margin-bottom: 20px;
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
    
    .sig-line {
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
      width: 200px;
      display: inline-block;
    }
    
    .sig-label {
      font-size: 10px;
      margin-top: 8px;
      font-weight: 500;
    }
    
    .confidential-banner {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 15px;
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      margin: 25px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
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
    
    p { 
      margin-bottom: 12px; 
      font-size: 11px; 
      line-height: 1.7;
    }
    
    li { 
      margin-left: 20px; 
      font-size: 11px; 
      margin-bottom: 6px; 
    }
    
    ul { 
      margin: 10px 0; 
    }
    
    .note {
      font-style: italic;
      color: #666;
      font-size: 10px;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="document-header">
    <div class="institution-name">UNIVERSITY CONFIDENTIAL CONSORTIUM</div>
    <div class="institution-name">INTELLECTUAL PROPERTY OFFICE</div>
    <div class="document-title">INTELLECTUAL PROPERTY DISCLOSURE FORM</div>
    <span class="legacy-badge">LEGACY RECORD</span>
    <div class="ref-info"><strong>Record ID:</strong> ${record.id}</div>
    <div class="ref-info"><strong>Disclosure Date:</strong> ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <div class="section">
    <h2>I. INVENTOR/CREATOR INFORMATION</h2>
    
    <div class="field">
      <div class="field-label">Creator/Applicant Name:</div>
      <div class="field-value">${details.creator_name || 'Not specified'}</div>
    </div>

    ${details.creator_email ? \`
    <div class="field">
      <div class="field-label">Email Address:</div>
      <div class="field-value">\${details.creator_email}</div>
    </div>
    \` : ''}

    ${details.creator_affiliation ? \`
    <div class="field">
      <div class="field-label">Department/Unit:</div>
      <div class="field-value">\${details.creator_affiliation}</div>
    </div>
    \` : ''}
  </div>

  <div class="section">
    <h2>II. INVENTION/IP DESCRIPTION</h2>

    <div class="field">
      <div class="field-label">Title of Invention:</div>
      <div class="field-value">${record.title || 'Not specified'}</div>
    </div>

    <div class="field">
      <div class="field-label">Category of IP:</div>
      <div class="field-value">${record.category ? record.category.toUpperCase() : 'Not specified'}</div>
    </div>

    ${record.abstract ? \`
    <div class="field">
      <div class="field-label">Abstract/Summary:</div>
      <div class="field-value">\${record.abstract}</div>
    </div>
    \` : ''}

    ${details.description ? \`
    <div class="field">
      <div class="field-label">Detailed Description of the Invention:</div>
      <div class="field-value">\${details.description}</div>
    </div>
    \` : ''}
  </div>

  <div class="section">
    <h2>III. TECHNICAL FIELD AND BACKGROUND</h2>

    ${details.technicalField ? \`
    <div class="field">
      <div class="field-label">Technical Field:</div>
      <div class="field-value">\${details.technicalField}</div>
    </div>
    \` : ''}

    ${details.legacy_source ? \`
    <div class="field">
      <div class="field-label">Source/Origin:</div>
      <div class="field-value">\${details.legacy_source}</div>
    </div>
    \` : ''}

    ${details.backgroundArt ? \`
    <div class="field">
      <div class="field-label">Prior Art and Background:</div>
      <div class="field-value">\${details.backgroundArt}</div>
    </div>
    \` : ''}

    ${details.problemStatement ? \`
    <div class="field">
      <div class="field-label">Problem Statement:</div>
      <div class="field-value">\${details.problemStatement}</div>
    </div>
    \` : ''}

    ${details.solution ? \`
    <div class="field">
      <div class="field-label">Solution Offered:</div>
      <div class="field-value">\${details.solution}</div>
    </div>
    \` : ''}

    ${details.advantages ? \`
    <div class="field">
      <div class="field-label">Advantages and Benefits:</div>
      <div class="field-value">\${details.advantages}</div>
    </div>
    \` : ''}
  </div>

  <div class="section">
    <h2>IV. LEGACY INFORMATION</h2>

    ${details.original_filing_date ? \`
    <div class="field">
      <div class="field-label">Original Filing Date:</div>
      <div class="field-value">\${details.original_filing_date}</div>
    </div>
    \` : ''}

    ${details.ipophil_application_no ? \`
    <div class="field">
      <div class="field-label">IPOPHIL Application Number:</div>
      <div class="field-value">\${details.ipophil_application_no}</div>
    </div>
    \` : ''}

    ${details.remarks ? \`
    <div class="field">
      <div class="field-label">Remarks/Notes:</div>
      <div class="field-value">\${details.remarks}</div>
    </div>
    \` : ''}
  </div>

  ${inventors && inventors.length > 0 ? \`
  <div class="section">
    <h2>V. INVENTORS AND CONTRIBUTORS</h2>
    
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Affiliation</th>
          <th>Contribution/Role</th>
          <th>Ownership %</th>
        </tr>
      </thead>
      <tbody>
        \${inventors.map((inv: any) => \`<tr>
          <td>\${inv.name || 'N/A'}</td>
          <td>\${inv.affiliation || 'N/A'}</td>
          <td>\${inv.contribution || 'N/A'}</td>
          <td>\${inv.percent || 'N/A'}</td>
        </tr>\`).join('')}
      </tbody>
    </table>
  </div>
  \` : ''}

  <div class="section signature-block">
    <h2>VI. ACKNOWLEDGMENT AND CERTIFICATION</h2>
    
    <p>
      This legacy intellectual property record has been reviewed, verified, and archived in the University Confidential Consortium system. The information contained herein is subject to the University's intellectual property policies and regulations.
    </p>
    
    <p>
      This disclosure serves as an official record of the intellectual property registration and is maintained for institutional, legal, and archival purposes.
    </p>
    
    <div class="signature-section">
      <p><strong>IP Office Certification:</strong></p>
      <div class="sig-line"></div>
      <div class="sig-label">IP Officer Signature / Date</div>
    </div>
  </div>

  <div class="confidential-banner">
    CONFIDENTIAL - FOR UNIVERSITY USE ONLY
  </div>

  <div class="footer">
    <p>University Confidential Consortium | Intellectual Property Office</p>
    <p>Record ID: ${record.id} | Document Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
    <div class="footer-separator"></div>
    <p class="note">This is an official archival document. For verification or inquiries, contact the IP Office.</p>
  </div>
</body>
</html>
  \`;

  return disclosureHTML;
}

// Simple HTML to PDF conversion using pdf-lib
async function convertHTMLToPDF(htmlContent: string, pdfDoc: PDFDocument): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  
  const margin = 40;
  let yPosition = height - margin;
  const lineHeight = 13;
  const maxWidth = width - 2 * margin;

  // Extract and format text from HTML
  const plainText = htmlContent
    .replace(/<style[^<]*<\/style>/gi, '')
    .replace(/<script[^<]*<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Render header
  page.drawText("IP Disclosure Form - Legacy Record", {
    x: margin,
    y: yPosition,
    size: 13,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 2.5;

  // Draw a horizontal line
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight;

  // Render text lines
  for (const line of plainText.slice(0, 100)) {
    if (yPosition < margin + 20) {
      // Would need page break in production
      break;
    }

    // Wrap long lines
    const words = line.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const textWidth = testLine.length * 2.5; // Approximate character width
      
      if (textWidth > maxWidth - 20) {
        if (currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: 10,
            color: rgb(0, 0, 0),
          });
          yPosition -= lineHeight;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }
  }

  return pdfDoc.save();
}
