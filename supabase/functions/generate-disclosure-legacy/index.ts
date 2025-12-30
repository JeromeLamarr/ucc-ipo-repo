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
    const base64Pdf = btoa(String.fromCharCode.apply(null, Array.from(pdfBytes)));

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
      <div class="field-value">${details.legacy_source || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Original Filing Date</div>
      <div class="field-value">${details.original_filing_date || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">IPOPHIL Application Number</div>
      <div class="field-value">${details.ipophil_application_no || 'N/A'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Description</div>
      <div class="field-value">${details.description || 'N/A'}</div>
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
    <p>Record ID: ${record.id} | Generated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}

// Simple HTML to PDF conversion using pdf-lib
async function convertHTMLToPDF(htmlContent: string, pdfDoc: PDFDocument): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { height } = page.getSize();
  
  const margin = 40;
  let yPosition = height - margin;
  const lineHeight = 14;
  const maxWidth = 512; // 612 - 2*50

  // Simple text extraction and rendering
  // In production, consider using a library like html2pdf or puppeteer
  
  page.drawText("Legacy IP Record Disclosure", {
    x: margin,
    y: yPosition,
    size: 14,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 2;

  page.drawText(htmlContent.replace(/<[^>]*>/g, '').substring(0, 500), {
    x: margin,
    y: yPosition,
    size: 10,
    color: rgb(0, 0, 0),
    maxWidth: maxWidth,
  });

  return pdfDoc.save();
}
