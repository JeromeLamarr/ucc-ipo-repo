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

    console.log('[generate-disclosure-legacy] Payload received:', {
      actualRecordId,
      timestamp: new Date().toISOString(),
    });

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
      throw new Error("Legacy record not found");
    }

    const record = legacyRecord[0] as LegacyIPRecord;

    console.log('[generate-disclosure-legacy] Found legacy record', {
      recordId: record.id,
      title: record.title,
      creatorName: record.details?.creator_name,
    });

    // Generate legacy disclosure HTML
    const htmlContent = generateLegacyDisclosureHTML(record);

    // Convert HTML to PDF
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await convertHTMLToPDF(htmlContent, pdfDoc);

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
        ip_record_id: actualRecordId,
        document_type: "disclosure",
        file_path: filePath,
        file_name: fileName,
        file_size: pdfBytes.length,
        tracking_id: `DISCLOSURE-${actualRecordId}-${Date.now()}`,
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
  }
});

function generateLegacyDisclosureHTML(record: LegacyIPRecord): string {
  const details = record.details || {};
  const inventors = details.inventors || [];

  const disclosureHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Disclosure Form - ${record.title}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 18px; }
    .inst-name { font-weight: bold; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; }
    .doc-title { font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 6px 0; }
    .badge { background: #FCD34D; color: #78350F; padding: 2px 6px; font-size: 10px; font-weight: bold; display: inline-block; margin-top: 4px; border-radius: 3px; }
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
    .confidential { background: #000; color: #fff; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; margin: 12px 0; text-transform: uppercase; }
    .footer { font-size: 9px; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: left; }
    th { background: #ccc; font-weight: bold; font-size: 9px; text-transform: uppercase; }
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
    <span class="badge">LEGACY RECORD</span>
    <div class="ref-info"><strong>Date:</strong> ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
  </div>

  <div class="instructions">
    <strong>INSTRUCTIONS:</strong> This is a legacy intellectual property record that has been archived in the University system.
  </div>

  <div class="section">
    <div class="sec-title">I. CREATOR/APPLICANT INFORMATION</div>
    <div class="form-group">
      <div class="field-label">Name of Creator/Applicant</div>
      <div class="field-input">${details.creator_name || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">II. INVENTION/IP DESCRIPTION</div>
    <div class="form-group">
      <div class="field-label">Title of Invention <span class="required">*</span></div>
      <div class="field-input">${record.title || 'N/A'}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Category of IP <span class="required">*</span></div>
      <div class="field-input">${(record.category || 'N/A').toUpperCase()}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Abstract/Summary</div>
      <div class="field-large">${record.abstract || 'N/A'}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Detailed Description</div>
      <div class="field-large">${details.description || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">III. LEGACY INFORMATION</div>
    <div class="form-group">
      <div class="field-label">Source/Origin</div>
      <div class="field-input">${details.legacy_source || 'N/A'}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Original Filing Date</div>
      <div class="field-input">${details.original_filing_date || 'N/A'}</div>
    </div>
    <div class="form-group">
      <div class="field-label">IPOPHIL Application Number</div>
      <div class="field-input">${details.ipophil_application_no || 'N/A'}</div>
    </div>
    <div class="form-group">
      <div class="field-label">Remarks</div>
      <div class="field-large">${details.remarks || 'N/A'}</div>
    </div>
  </div>

  ${inventors.length > 0 ? `
  <div class="section">
    <div class="sec-title">IV. INVENTORS & CONTRIBUTORS</div>
    <table>
      <tr><th>Name</th><th>Affiliation</th><th>Contribution</th></tr>
      ${inventors.map((inv: any) => `<tr><td>${inv.name || ''}</td><td>${inv.affiliation || ''}</td><td>${inv.contribution || ''}</td></tr>`).join('')}
    </table>
  </div>
  ` : ''}

  <div class="confidential">CONFIDENTIAL - FOR UNIVERSITY USE ONLY</div>

  <div class="footer">
    <p>University Confidential Consortium | Intellectual Property Office</p>
    <p>Legacy Record: ${record.id} | Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `;

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
