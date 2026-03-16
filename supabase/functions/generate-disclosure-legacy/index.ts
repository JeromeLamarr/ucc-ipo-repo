/**
 * Edge function to generate disclosure PDFs for LEGACY IP records only.
 * This function handles legacy_ip_records table exclusively.
 * For workflow records, use the standard generate-disclosure function instead.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.3";

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

// ─── PDF Helpers (mirrors generate-full-disclosure) ────────────────────────
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function moveDown(currentY: number, amount: number): number {
  return currentY - amount;
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  if (!text) return [''];
  const avgCharWidth = fontSize * 0.52;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

async function generateQRCodeImage(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(
      data,
      { errorCorrectionLevel: 'M', type: 'image/png', margin: 1, width: 200 },
      (err: Error | null | undefined, url: string) => {
        if (err) reject(err); else resolve(url);
      }
    );
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

// ─── PDF Generation ─────────────────────────────────────────────────────────
async function generateLegacyDisclosurePDF(record: LegacyIPRecord): Promise<Uint8Array> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

  // Fetch Disclosure Signatory Settings
  let supervisorTitle          = "Supervisor";
  let researchHeadPosition     = "Research Head";
  let presidentName            = "";
  let presidentPosition        = "President";
  let supervisorSignatureUrl: string | null   = null;
  let researchHeadSignatureUrl: string | null = null;
  let presidentSignatureUrl: string | null    = null;

  if (supabase) {
    try {
      const { data: sigSettings } = await supabase
        .from("disclosure_signatories")
        .select("supervisor_title, research_head_position, president_name, president_position, supervisor_signature_url, research_head_signature_url, president_signature_url")
        .limit(1)
        .maybeSingle();
      if (sigSettings) {
        supervisorTitle          = sigSettings.supervisor_title          || supervisorTitle;
        researchHeadPosition     = sigSettings.research_head_position    || researchHeadPosition;
        presidentName            = sigSettings.president_name            || presidentName;
        presidentPosition        = sigSettings.president_position        || presidentPosition;
        supervisorSignatureUrl   = sigSettings.supervisor_signature_url  || null;
        researchHeadSignatureUrl = sigSettings.research_head_signature_url || null;
        presidentSignatureUrl    = sigSettings.president_signature_url   || null;
      }
    } catch (sigErr) {
      console.warn("[generate-disclosure-legacy] Could not fetch signatory settings, using defaults:", sigErr);
    }
  }

  // Helper to fetch signature bytes from a public URL (embed after pdfDoc is created)
  const fetchSigBytes = async (url: string | null): Promise<{ bytes: Uint8Array; isPng: boolean } | null> => {
    if (!url) return null;
    try {
      const cleanUrl = url.split('?')[0];
      const res = await fetch(cleanUrl);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      const isPng = cleanUrl.toLowerCase().endsWith('.png') || buf[0] === 0x89;
      return { bytes: buf, isPng };
    } catch {
      return null;
    }
  };

  const [sigRaw1, sigRaw2, sigRaw3] = await Promise.all([
    fetchSigBytes(supervisorSignatureUrl),
    fetchSigBytes(researchHeadSignatureUrl),
    fetchSigBytes(presidentSignatureUrl),
  ]);

  // Map legacy record to workflow data shapes
  const details = record.details || {};
  const ipRecord = {
    title:      record.title || 'Untitled',
    category:   record.category || 'general',
    abstract:   record.abstract,
    created_at: record.created_at,
  };
  const creator = {
    full_name:  details.creator_name        || 'N/A',
    email:      details.creator_email       || '',
    department: details.creator_affiliation || '',
  };
  const trackingId = record.id;

  // ── PDF Drawing (A4, same layout as generate-full-disclosure) ──────────────
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4

  // Embed signature images now that pdfDoc exists
  const embedRaw = async (raw: { bytes: Uint8Array; isPng: boolean } | null): Promise<any | null> => {
    if (!raw) return null;
    try {
      return raw.isPng ? await pdfDoc.embedPng(raw.bytes) : await pdfDoc.embedJpg(raw.bytes);
    } catch { return null; }
  };
  const [sigImg1, sigImg2, sigImg3] = await Promise.all([
    embedRaw(sigRaw1),
    embedRaw(sigRaw2),
    embedRaw(sigRaw3),
  ]);
  const { width, height } = page.getSize();

  const margin = 40;
  const innerPadding = 20;
  const contentWidth = width - 2 * margin;
  const borderX = margin - innerPadding;
  const borderY = innerPadding + 15;
  const borderWidth = width - 2 * borderX;
  const borderHeight = height - 2 * borderY;

  const goldColor    = rgb(0.78, 0.58, 0.05);
  const accentColor  = rgb(0.08, 0.32, 0.65);
  const darkColor    = rgb(0.1,  0.1,  0.1);
  const lightBgColor  = rgb(0.94, 0.96, 1.0);
  const lightBoxColor = rgb(0.97, 0.99, 1.0);
  const shadowColor   = rgb(0.88, 0.88, 0.88);
  const warningColor  = rgb(0.92, 0.11, 0.14);

  let yPosition = height - 70;

  // Decorative corner ornaments
  const cornerSize = 15;
  const cornerThickness = 2;
  page.drawLine({ start: { x: borderX + 10, y: height - borderY - 10 }, end: { x: borderX + 10 + cornerSize, y: height - borderY - 10 }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: borderX + 10, y: height - borderY - 10 }, end: { x: borderX + 10, y: height - borderY - 10 - cornerSize }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: width - borderX - 10, y: height - borderY - 10 }, end: { x: width - borderX - 10 - cornerSize, y: height - borderY - 10 }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: width - borderX - 10, y: height - borderY - 10 }, end: { x: width - borderX - 10, y: height - borderY - 10 - cornerSize }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: borderX + 10, y: borderY + 10 }, end: { x: borderX + 10 + cornerSize, y: borderY + 10 }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: borderX + 10, y: borderY + 10 }, end: { x: borderX + 10, y: borderY + 10 + cornerSize }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: width - borderX - 10, y: borderY + 10 }, end: { x: width - borderX - 10 - cornerSize, y: borderY + 10 }, thickness: cornerThickness, color: goldColor });
  page.drawLine({ start: { x: width - borderX - 10, y: borderY + 10 }, end: { x: width - borderX - 10, y: borderY + 10 + cornerSize }, thickness: cornerThickness, color: goldColor });

  // Main border
  page.drawRectangle({ x: borderX + 2, y: borderY - 2, width: borderWidth, height: borderHeight, color: shadowColor, borderWidth: 0 });
  page.drawRectangle({ x: borderX, y: borderY, width: borderWidth, height: borderHeight, color: rgb(1, 1, 1), borderColor: goldColor, borderWidth: 5 });
  page.drawRectangle({ x: borderX + 5, y: borderY + 5, width: borderWidth - 10, height: borderHeight - 10, borderColor: accentColor, borderWidth: 1 });

  // WATERMARK
  if (supabase) {
    try {
      const { data: wmLogoData } = await supabase.storage.from("assets").download("ucc_logo.png");
      if (wmLogoData) {
        let buf: Uint8Array;
        if (typeof (wmLogoData as any).arrayBuffer === "function") {
          const ab = await (wmLogoData as any).arrayBuffer();
          buf = new Uint8Array(ab);
        } else {
          buf = wmLogoData as unknown as Uint8Array;
        }
        const wmImage = await pdfDoc.embedPng(buf);
        page.drawImage(wmImage, { x: width / 2 - 200, y: height / 2 - 200, width: 400, height: 400, opacity: 0.08 });
      }
    } catch (err) {
      console.warn("[generate-disclosure-legacy] Could not load watermark:", err);
    }
  }

  // HEADER WITH LOGO
  let logoEmbedded = false;
  if (supabase) {
    try {
      const { data: logoData } = await supabase.storage.from("assets").download("ucc_logo.png");
      if (logoData) {
        const logoBuffer = await (logoData as any).arrayBuffer();
        const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBuffer));
        page.drawImage(logoImage, { x: margin + 10, y: yPosition - 48, width: 67, height: 67 });
        logoEmbedded = true;
      }
    } catch (err) {
      console.warn("[generate-disclosure-legacy] Could not embed logo:", err);
    }
  }

  if (!logoEmbedded) {
    page.drawRectangle({ x: margin + 10, y: yPosition - 48, width: 67, height: 67, borderColor: accentColor, borderWidth: 2, color: lightBoxColor });
    page.drawText("UCC", { x: margin + 20, y: yPosition - 58, size: 15, color: accentColor });
  }

  const headerX = margin + 85;
  page.drawText("Republic of the Philippines", { x: headerX, y: yPosition, size: 8, color: darkColor });
  yPosition = moveDown(yPosition, 18);
  page.drawText("UNIVERSITY OF CALOOCAN CITY", { x: headerX, y: yPosition, size: 18, color: accentColor });
  yPosition = moveDown(yPosition, 14);
  page.drawText("INTELLECTUAL PROPERTY OFFICE", { x: headerX, y: yPosition, size: 11, color: darkColor });
  yPosition = moveDown(yPosition, 60);

  // Title Box
  const titleBoxY = yPosition - 25;
  page.drawRectangle({ x: margin + 10, y: titleBoxY, width: contentWidth - 30, height: 48, color: lightBgColor, borderColor: accentColor, borderWidth: 3 });
  const boxCenterX = (margin + 10) + (contentWidth - 30) / 2;
  const titleLine1 = "INTELLECTUAL PROPERTY";
  const titleLine2 = "FULL DISCLOSURE STATEMENT";
  page.drawText(titleLine1, { x: boxCenterX - (titleLine1.length * 6.5) / 2, y: yPosition, size: 11, color: accentColor });
  page.drawText(titleLine2, { x: boxCenterX - (titleLine2.length * 6.5) / 2, y: yPosition - 12, size: 11, color: accentColor });
  yPosition = moveDown(yPosition, 60);

  // Applicant Information
  page.drawText("APPLICANT INFORMATION", { x: margin + 25, y: yPosition, size: 10, color: accentColor });
  yPosition = moveDown(yPosition, 14);
  page.drawText(`Name: ${creator.full_name}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 10);
  if (creator.email) {
    page.drawText(`Email: ${creator.email}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
    yPosition = moveDown(yPosition, 10);
  }
  if (creator.department) {
    page.drawText(`Department: ${creator.department}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
    yPosition = moveDown(yPosition, 10);
  }
  yPosition = moveDown(yPosition, 10);

  // IP Details
  page.drawText("INTELLECTUAL PROPERTY DETAILS", { x: margin + 25, y: yPosition, size: 10, color: accentColor });
  yPosition = moveDown(yPosition, 14);
  const titleLines = wrapText(`Title: ${ipRecord.title}`, contentWidth - 50, 9);
  for (const tLine of titleLines) {
    page.drawText(tLine, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
    yPosition = moveDown(yPosition, 12);
  }
  yPosition = moveDown(yPosition, 2);
  page.drawText(`Category: ${capitalize(ipRecord.category)}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 14);
  page.drawText(`Status: LEGACY RECORD`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 14);
  page.drawText(`Reference Number: ${trackingId}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 14);
  page.drawText(`Registration Date: ${formatDate(ipRecord.created_at)}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 30);

  // Abstract
  if (ipRecord.abstract) {
    page.drawText("ABSTRACT", { x: margin + 25, y: yPosition, size: 10, color: accentColor });
    yPosition = moveDown(yPosition, 16);
    const abstractLines = wrapText(ipRecord.abstract, contentWidth - 50, 8);
    for (const aLine of abstractLines) {
      page.drawText(aLine, { x: margin + 25, y: yPosition, size: 8, color: darkColor });
      yPosition = moveDown(yPosition, 12);
    }
    yPosition = moveDown(yPosition, 10);
  }

  // Signature Block
  yPosition = moveDown(yPosition, 20);
  page.drawText("AUTHORIZATION AND SIGNATURES", { x: margin + 25, y: yPosition, size: 10, color: accentColor });
  yPosition = moveDown(yPosition, 20);

  const sigLineLength = 175;
  const sigImgH = 36;
  const sigImgW = 90;
  const sigStartX = margin + 25;

  const drawSigBlock = (
    sigImg: any | null,
    label: string,
    nameLine: string | null,
    startX: number,
    currentY: number
  ): number => {
    if (sigImg) {
      page.drawImage(sigImg, {
        x: startX,
        y: currentY + 4,
        width: sigImgW,
        height: sigImgH,
        opacity: 0.9,
      });
    }
    page.drawLine({ start: { x: startX, y: currentY }, end: { x: startX + sigLineLength, y: currentY }, thickness: 1, color: darkColor });
    currentY = moveDown(currentY, 10);
    page.drawText(label, { x: startX, y: currentY, size: 7, color: darkColor });
    if (nameLine) {
      currentY = moveDown(currentY, 10);
      page.drawText(nameLine, { x: startX, y: currentY, size: 7, color: darkColor });
    }
    return moveDown(currentY, 28);
  };

  yPosition = drawSigBlock(sigImg1, `${supervisorTitle} Signature & Date`, null, sigStartX, yPosition);
  yPosition = drawSigBlock(sigImg2, `${researchHeadPosition} Signature & Date`, creator.full_name, sigStartX, yPosition);
  yPosition = drawSigBlock(sigImg3, `${presidentPosition} Signature & Date`, presidentName || null, sigStartX, yPosition);

  // Confidentiality Notice
  yPosition = moveDown(yPosition, 15);
  page.drawRectangle({ x: margin + 10, y: yPosition - 50, width: contentWidth - 20, height: 50, color: rgb(0.99, 0.97, 0.92), borderColor: warningColor, borderWidth: 2 });
  const confLines = [
    "CONFIDENTIALITY NOTICE",
    "This document contains confidential and proprietary information belonging to the University of",
    "Caloocan City. Unauthorized access, use, or disclosure is prohibited. This disclosure statement is",
    "intended only for authorized personnel and must be handled according to UCC policies."
  ];
  let confY = yPosition - 10;
  for (const confLine of confLines) {
    page.drawText(confLine, { x: margin + 20, y: confY, size: 7, color: darkColor, maxWidth: contentWidth - 40 });
    confY = moveDown(confY, 10);
  }
  yPosition = moveDown(yPosition, 60);

  // QR Code for verification
  try {
    const verificationUrl = `https://university-intellect-dqt4.bolt.host/verify-disclosure/${trackingId}`;
    const qrDataUrl = await generateQRCodeImage(verificationUrl);
    const qrBytes = dataUrlToUint8Array(qrDataUrl);
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 95;
    const qrX = width - margin - qrSize - 10;
    const qrY = margin + 12;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    page.drawText("Verify Disclosure", { x: qrX - 2, y: qrY - 11, size: 6.5, color: accentColor });
  } catch (qrErr) {
    console.warn("[generate-disclosure-legacy] Could not embed QR code:", qrErr);
  }

  // Footer
  page.drawRectangle({ x: margin, y: margin + 8, width: contentWidth, height: 1.5, color: goldColor });
  page.drawText(
    `Document Generated: ${formatDate(new Date().toISOString())} | Verify at: https://ucc-ipo.com/verify-disclosure/${trackingId}`,
    { x: margin + 25, y: margin + 2, size: 6.5, color: accentColor }
  );

  return await pdfDoc.save();
}
