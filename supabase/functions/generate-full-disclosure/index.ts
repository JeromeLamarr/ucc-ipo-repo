import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DisclosureRequest {
  record_id: number | string;
  user_id: string;
}

interface IPRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  applicant_id: string;
  created_at: string;
  abstract?: string;
  description?: string;
  details?: any;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
  department?: string;
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function validateDisclosureRequest(payload: any): { valid: boolean; error?: string } {
  if (typeof payload.record_id !== 'number' && typeof payload.record_id !== 'string') {
    return { valid: false, error: 'record_id must be a string or number' };
  }

  if (!payload.user_id || typeof payload.user_id !== 'string') {
    return { valid: false, error: 'user_id must be a non-empty string' };
  }

  if (!isValidUUID(payload.user_id)) {
    return { valid: false, error: 'user_id must be a valid UUID' };
  }

  return { valid: true };
}

async function generateQRCodeImage(text: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 200,
    });
    return qrCodeDataUrl;
  } catch (error: any) {
    console.error("QR Code generation error:", error);
    throw new Error(`Failed to generate QR code: ${error?.message || String(error)}`);
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

function capitalize(s: string | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const base64 = parts[1] || "";
  const binaryString = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function centerText(page: any, text: string, size: number, y: number, color: ReturnType<typeof rgb> = rgb(0, 0, 0), maxWidth?: number): void {
  page.drawText(text, {
    x: page.getWidth() / 2,
    y,
    size,
    color,
    maxWidth,
    align: "center",
  });
}

function moveDown(currentY: number, amount: number): number {
  return currentY - amount;
}

async function generateFullDisclosurePDF(
  ipRecord: IPRecord,
  creator: UserData,
  supervisor: UserData | null,
  evaluations: any[],
  trackingId: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size

  const { width, height } = page.getSize();
  
  const margin = 40;
  const innerPadding = 20;
  const contentWidth = width - 2 * margin;
  const borderX = margin - innerPadding;
  const borderY = innerPadding + 15;
  const borderWidth = width - 2 * borderX;
  const borderHeight = height - 2 * borderY;
  
  // Color palette (matching certificate)
  const goldColor = rgb(0.78, 0.58, 0.05);
  const accentColor = rgb(0.08, 0.32, 0.65);
  const darkColor = rgb(0.1, 0.1, 0.1);
  const lightBgColor = rgb(0.94, 0.96, 1.0);
  const shadowColor = rgb(0.88, 0.88, 0.88);
  const warningColor = rgb(0.92, 0.11, 0.14); // Red for confidential notice

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
  page.drawRectangle({
    x: borderX + 2,
    y: borderY - 2,
    width: borderWidth,
    height: borderHeight,
    color: shadowColor,
    borderWidth: 0,
  });

  page.drawRectangle({
    x: borderX,
    y: borderY,
    width: borderWidth,
    height: borderHeight,
    color: rgb(1, 1, 1),
    borderColor: goldColor,
    borderWidth: 5,
  });

  page.drawRectangle({
    x: borderX + 5,
    y: borderY + 5,
    width: borderWidth - 10,
    height: borderHeight - 10,
    borderColor: accentColor,
    borderWidth: 1,
  });

  // WATERMARK
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        const { data: logoData } = await supabase.storage
          .from("assets")
          .download("ucc_logo.png");

        if (logoData) {
          let buf: Uint8Array;
          if (typeof (logoData as any).arrayBuffer === "function") {
            const ab = await (logoData as any).arrayBuffer();
            buf = new Uint8Array(ab);
          } else {
            buf = logoData as unknown as Uint8Array;
          }

          const logoImage = await pdfDoc.embedPng(buf);
          const watermarkWidth = 400;
          const watermarkHeight = 400;
          
          page.drawImage(logoImage, {
            x: width / 2 - watermarkWidth / 2,
            y: height / 2 - watermarkHeight / 2,
            width: watermarkWidth,
            height: watermarkHeight,
            opacity: 0.08,
          });
        }
      } catch (err) {
        console.warn("Could not load watermark logo:", err);
      }
    }
  } catch (err) {
    console.warn("Watermark setup error:", err);
  }

  // CONFIDENTIAL BANNER
  const bannerHeight = 25;
  page.drawRectangle({
    x: margin,
    y: yPosition - 5,
    width: contentWidth,
    height: bannerHeight,
    color: warningColor,
  });

  page.drawText("FULL DISCLOSURE RECORD", {
    x: margin + 10,
    y: yPosition - 18,
    size: 11,
    color: rgb(1, 1, 1),
    fontStyle: "bold",
  });

  yPosition = moveDown(yPosition, 40);

  // TITLE
  const titleBoxY = yPosition - 20;
  page.drawRectangle({
    x: margin + 15,
    y: titleBoxY,
    width: contentWidth - 30,
    height: 48,
    color: lightBgColor,
    borderColor: accentColor,
    borderWidth: 3,
  });

  const boxX = margin + 5;
  const boxWidth = contentWidth - 30;
  const boxCenterX = boxX + boxWidth / 2;
  const line1 = "INTELLECTUAL PROPERTY";
  const line2 = "FULL DISCLOSURE STATEMENT";
  
  const approxCharWidth1 = (line1.length * 6.5) / 2;
  const approxCharWidth2 = (line2.length * 6.5) / 2;

  page.drawText(line1, {
    x: boxCenterX - approxCharWidth1,
    y: yPosition - 8,
    size: 11,
    color: accentColor,
  });

  page.drawText(line2, {
    x: boxCenterX - approxCharWidth2,
    y: yPosition - 23,
    size: 11,
    color: accentColor,
  });

  yPosition = moveDown(yPosition, 60);

  // Applicant Information
  page.drawText("APPLICANT INFORMATION", { x: margin + 25, y: yPosition, size: 10, color: accentColor, fontStyle: "bold" });
  yPosition = moveDown(yPosition, 14);

  page.drawText(`Name: ${creator.full_name}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 10);
  page.drawText(`Email: ${creator.email}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 10);
  if (creator.department) {
    page.drawText(`Department: ${creator.department}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
    yPosition = moveDown(yPosition, 10);
  }

  yPosition = moveDown(yPosition, 10);

  // IP Title and Details
  page.drawText("INTELLECTUAL PROPERTY DETAILS", { x: margin + 25, y: yPosition, size: 10, color: accentColor, fontStyle: "bold" });
  yPosition = moveDown(yPosition, 14);

  page.drawText(`Title: ${ipRecord.title}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor, maxWidth: contentWidth - 50 });
  yPosition = moveDown(yPosition, 12);
  page.drawText(`Category: ${capitalize(ipRecord.category)}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 12);
  page.drawText(`Status: ${ipRecord.status.replace(/_/g, ' ').toUpperCase()}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 12);
  page.drawText(`Reference Number: ${trackingId}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, 12);
  page.drawText(`Registration Date: ${formatDate(ipRecord.created_at)}`, { x: margin + 25, y: yPosition, size: 9, color: darkColor });

  yPosition = moveDown(yPosition, 20);

  // Abstract
  if (ipRecord.abstract) {
    page.drawText("ABSTRACT", { x: margin + 35, y: yPosition, size: 10, color: accentColor, fontStyle: "bold" });
    yPosition = moveDown(yPosition, 12);
    page.drawText(ipRecord.abstract, { x: margin + 35, y: yPosition, size: 8, color: darkColor, maxWidth: contentWidth - 50, lineHeight: 1.2 });
    yPosition = moveDown(yPosition, 34);
  }

  // Evaluations
  if (evaluations && evaluations.length > 0) {
    page.drawText("EVALUATION SUMMARY", { x: margin + 25, y: yPosition, size: 10, color: accentColor, fontStyle: "bold" });
    yPosition = moveDown(yPosition, 12);

    for (const evaluation of evaluations) {
      const evaluatorName = evaluation.evaluator?.full_name || "Unknown Evaluator";
      page.drawText(`Evaluator: ${evaluatorName}`, { x: margin + 25, y: yPosition, size: 8.5, color: darkColor });
      yPosition = moveDown(yPosition, 9);
      
      if (evaluation.total_score !== null && evaluation.total_score !== undefined) {
        page.drawText(`Score: ${evaluation.total_score}/100`, { x: margin + 25, y: yPosition, size: 8.5, color: darkColor });
        yPosition = moveDown(yPosition, 9);
      }

      if (evaluation.recommendation) {
        page.drawText(`Recommendation: ${evaluation.recommendation}`, { x: margin + 25, y: yPosition, size: 8.5, color: darkColor, maxWidth: contentWidth - 80 });
        yPosition = moveDown(yPosition, 9);
      }

      yPosition = moveDown(yPosition, 6);
    }

    yPosition = moveDown(yPosition, 10);
  }

  // Confidentiality Notice
  yPosition = moveDown(yPosition, 15);
  page.drawRectangle({
    x: margin + 10,
    y: yPosition - 50,
    width: contentWidth - 20,
    height: 50,
    color: rgb(0.99, 0.97, 0.92),
    borderColor: warningColor,
    borderWidth: 2,
  });

  const confidentialText = [
    "CONFIDENTIALITY NOTICE",
    "This document contains confidential and proprietary information belonging to the University of",
    "Caloocan City. Unauthorized access, use, or disclosure is prohibited. This disclosure statement is",
    "intended only for authorized personnel and must be handled according to UCC policies."
  ];

  let confY = yPosition - 10;
  for (const line of confidentialText) {
    page.drawText(line, { x: margin + 20, y: confY, size: 7, color: darkColor, maxWidth: contentWidth - 40 });
    confY = moveDown(confY, 10);
  }

  yPosition = moveDown(yPosition, 60);

  // Issued Date and Verification
  page.drawRectangle({
    x: margin,
    y: margin + 8,
    width: contentWidth,
    height: 1.5,
    color: goldColor,
  });

  const issuedDate = formatDate(new Date().toISOString());
  page.drawText(
    `Document Issued: ${issuedDate} | Reference: ${trackingId}`,
    {
      x: margin + 25,
      y: margin + 2,
      size: 7,
      color: accentColor,
    }
  );

  // QR Code for verification
  try {
    const siteUrl = Deno.env.get("SITE_URL") || "https://ucc-ipo.com";
    const cleanUrl = siteUrl.replace(/\/$/, '').replace(/^https?:\/\//, 'https://');
    const verificationUrl = `${cleanUrl}/verify/${trackingId}`;
    
    const qrCodeDataUrl = await generateQRCodeImage(verificationUrl);
    const qrBytes = dataUrlToUint8Array(qrCodeDataUrl);
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 95;
    const qrX = width - margin - qrSize - 10;
    const qrY = margin + 12;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    page.drawText("Verify Record", {
      x: qrX - 2,
      y: qrY - 11,
      size: 6.5,
      color: accentColor,
    });
  } catch (error) {
    console.warn("Warning: Could not embed QR code:", error);
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
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

    const payload = await req.json();
    const validation = validateDisclosureRequest(payload);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { record_id, user_id } = payload;

    console.log(`[Full Disclosure] Generating for record: ${record_id}, user: ${user_id}`);

    // Fetch IP Record
    const { data: record, error: recordError } = await supabase
      .from("ip_records")
      .select(`
        *,
        applicant:users!applicant_id(*),
        supervisor:users!supervisor_id(*)
      `)
      .eq("id", record_id)
      .single();

    if (recordError || !record) {
      console.error("Record fetch error:", recordError);
      return new Response(
        JSON.stringify({ error: "Record not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch Evaluations
    const { data: evaluations, error: evalError } = await supabase
      .from("evaluations")
      .select(`
        *,
        evaluator:users!evaluator_id(*)
      `)
      .eq("ip_record_id", record_id)
      .order("created_at", { ascending: false });

    if (evalError) {
      console.warn("Evaluations fetch warning:", evalError);
    }

    const trackingId = record.tracking_id || record.id;
    const creator = record.applicant || { id: record.applicant_id, full_name: "Unknown", email: "" };
    const supervisor = record.supervisor || null;

    // Generate PDF
    console.log("[Full Disclosure] Generating PDF...");
    const pdfBytes = await generateFullDisclosurePDF(
      record,
      creator,
      supervisor,
      evaluations || [],
      trackingId
    );

    // Store in Supabase Storage
    const fileName = `disclosure_${record_id}_${Date.now()}.pdf`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from("disclosures")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (storageError) {
      console.error("Storage error:", storageError);
      throw new Error(`Failed to save PDF: ${storageError.message}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/disclosures/${fileName}`;

    // Store disclosure record in database
    const { data: disclosureRecord, error: dbError } = await supabase
      .from("full_disclosures")
      .insert({
        ip_record_id: record_id,
        generated_by: user_id,
        pdf_url: publicUrl,
        file_path: fileName,
        file_size: pdfBytes.length,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Continue even if DB insert fails - PDF was generated successfully
    }

    console.log("[Full Disclosure] PDF generated successfully");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Full disclosure generated successfully",
        disclosure: disclosureRecord || {
          pdf_url: publicUrl,
          file_path: fileName,
          file_size: pdfBytes.length,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Disclosure generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate disclosure" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
