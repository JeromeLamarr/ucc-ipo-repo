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

    // Generate legacy disclosure PDF with professional styling
    const pdfBytes = await generateLegacyDisclosurePDF(record);
    console.log('[generate-disclosure-legacy] PDF generated successfully, size:', pdfBytes.length);

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
  }
});

async function generateLegacyDisclosurePDF(record: LegacyIPRecord): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const details = record.details || {};

  let yPosition = height - 40;
  const margin = 40;
  const contentWidth = width - 2 * margin;

  // Helper function to draw text
  const drawText = (
    currentPage: any,
    text: string,
    x: number,
    y: number,
    size: number,
    bold = false
  ) => {
    currentPage.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
      font: bold ? "Helvetica-Bold" : "Helvetica",
    });
  };

  // Header
  drawText(page, "University Confidential Consortium", margin, yPosition, 11, true);
  yPosition -= 14;
  drawText(page, "Intellectual Property Office", margin, yPosition, 11, true);
  yPosition -= 18;
  drawText(page, "INTELLECTUAL PROPERTY DISCLOSURE FORM - LEGACY RECORD", margin, yPosition, 11, true);
  yPosition -= 16;
  page.drawRectangle({
    x: margin,
    y: yPosition - 15,
    width: contentWidth,
    height: 1,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  yPosition -= 20;

  // Legacy Badge
  page.drawRectangle({
    x: margin,
    y: yPosition - 12,
    width: 60,
    height: 14,
    color: rgb(1, 0.804, 0.333), // #FCD34D
  });
  drawText(page, "LEGACY RECORD", margin + 5, yPosition - 10, 9, true);
  yPosition -= 20;

  // Record Info
  drawText(page, `Record ID: ${record.id}`, margin, yPosition, 9);
  yPosition -= 12;
  drawText(page,
    `Date: ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}`,
    margin,
    yPosition,
    9
  );
  yPosition -= 16;

  // Section I: Creator Information
  drawText(page, "I. INVENTOR/CREATOR INFORMATION", margin, yPosition, 10, true);
  yPosition -= 12;
  page.drawRectangle({
    x: margin,
    y: yPosition - 1,
    width: contentWidth,
    height: 1,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  yPosition -= 10;

  drawText(page, "Name of Creator/Applicant:", margin, yPosition, 9, true);
  yPosition -= 11;
  page.drawRectangle({
    x: margin,
    y: yPosition - 15,
    width: contentWidth,
    height: 15,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  drawText(page, details.creator_name || "N/A", margin + 3, yPosition - 8, 9);
  yPosition -= 20;

  if (details.creator_email) {
    drawText(page, "Email:", margin, yPosition, 9, true);
    yPosition -= 11;
    page.drawRectangle({
      x: margin,
      y: yPosition - 15,
      width: contentWidth,
      height: 15,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
    drawText(page, details.creator_email, margin + 3, yPosition - 8, 9);
    yPosition -= 20;
  }

  if (details.creator_affiliation) {
    drawText(page, "Department/Affiliation:", margin, yPosition, 9, true);
    yPosition -= 11;
    page.drawRectangle({
      x: margin,
      y: yPosition - 15,
      width: contentWidth,
      height: 15,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
    drawText(page, details.creator_affiliation, margin + 3, yPosition - 8, 9);
    yPosition -= 20;
  }

  // Check if we need a new page
  if (yPosition < 100) {
    page = pdfDoc.addPage([612, 792]);
    yPosition = height - 40;
  }

  // Section II: Invention/IP Description
  drawText(page, "II. INVENTION/IP DESCRIPTION", margin, yPosition, 10, true);
  yPosition -= 12;
  page.drawRectangle({
    x: margin,
    y: yPosition - 1,
    width: contentWidth,
    height: 1,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  yPosition -= 10;

  drawText(page, "Title of Invention:", margin, yPosition, 9, true);
  yPosition -= 11;
  page.drawRectangle({
    x: margin,
    y: yPosition - 15,
    width: contentWidth,
    height: 15,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  drawText(page, record.title || "N/A", margin + 3, yPosition - 8, 9);
  yPosition -= 20;

  drawText(page, "Category of IP:", margin, yPosition, 9, true);
  yPosition -= 11;
  page.drawRectangle({
    x: margin,
    y: yPosition - 15,
    width: contentWidth,
    height: 15,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  drawText(page, (record.category || "N/A").toUpperCase(), margin + 3, yPosition - 8, 9);
  yPosition -= 20;

  drawText(page, "Abstract/Summary:", margin, yPosition, 9, true);
  yPosition -= 11;
  const abstractLines = wrapText(record.abstract || "N/A", 80);
  const abstractHeight = abstractLines.length * 11 + 10;
  page.drawRectangle({
    x: margin,
    y: yPosition - abstractHeight,
    width: contentWidth,
    height: abstractHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  let abstractY = yPosition - 6;
  for (const line of abstractLines) {
    drawText(page, line, margin + 3, abstractY, 8);
    abstractY -= 11;
  }
  yPosition -= abstractHeight + 10;

  // Confidential Banner
  page.drawRectangle({
    x: margin,
    y: yPosition - 12,
    width: contentWidth,
    height: 12,
    color: rgb(0, 0, 0),
  });
  drawText(page, "CONFIDENTIAL - FOR UNIVERSITY USE ONLY", margin + 5, yPosition - 10, 9, true);
  yPosition -= 18;

  // Footer
  drawText(page, "University Confidential Consortium | Intellectual Property Office", margin, yPosition, 8);
  yPosition -= 10;
  drawText(page,
    `Record ID: ${record.id} | Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
    margin,
    yPosition,
    8
  );

  return await pdfDoc.save();
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
