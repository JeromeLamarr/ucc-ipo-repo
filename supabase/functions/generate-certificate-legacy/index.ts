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

interface LegacyCertificateRequest {
  record_id: number | string;
  user_id: string;
  requester_id?: string;
  requester_role?: string;
}

interface LegacyIPRecord {
  id: string;
  title: string;
  category: string;
  abstract?: string;
  details: {
    creator_name: string;
    inventors?: Array<{ name: string; affiliation?: string; contribution?: string }>;
    [key: string]: any;
  };
  created_at: string;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
}

// Helper to convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate input payload
function validateRequest(payload: any): { valid: boolean; error?: string } {
  if (!payload.record_id) {
    return { valid: false, error: 'record_id is required' };
  }

  // record_id can be any non-empty value
  if (typeof payload.record_id === 'string' && payload.record_id.trim().length === 0) {
    return { valid: false, error: 'record_id cannot be empty' };
  }

  // That's it - be permissive with other fields
  return { valid: true };
}

// Generate SHA-256 checksum
async function generateChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate QR Code as data URL
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

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

// Helper to center text
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

// Helper to safely move down by a specified amount
function moveDown(currentY: number, amount: number): number {
  return currentY - amount;
}

// Helper to capitalize string
function capitalize(s: string | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Helper to convert data URL to uint8
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

// Get ordinal day
function getOrdinalDay(date: Date): string {
  const day = date.getDate();
  const suffixes = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return day + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Generate legacy certificate PDF - using professional workflow design
async function generateCertificatePDF(
  record: LegacyIPRecord,
  creator: UserData,
  trackingId: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size (210mm x 297mm)

  const { width, height } = page.getSize();
  
  // ============================================================
  // MARGINS & DIMENSIONS
  // ============================================================
  const margin = 40;
  const innerPadding = 20;
  const contentWidth = width - 2 * margin;
  const borderX = margin - innerPadding;
  const borderY = innerPadding + 15;
  const borderWidth = width - 2 * borderX;
  const borderHeight = height - 2 * borderY;
  
  // ============================================================
  // ENHANCED COLOR PALETTE
  // ============================================================
  const goldColor = rgb(0.78, 0.58, 0.05); // Rich gold border
  const accentColor = rgb(0.08, 0.32, 0.65); // Professional UCC Blue
  const darkColor = rgb(0.1, 0.1, 0.1); // Deep charcoal text
  const lightBgColor = rgb(0.94, 0.96, 1.0); // Elegant light blue
  const lightBoxColor = rgb(0.97, 0.99, 1.0); // Almost white light blue
  const shadowColor = rgb(0.88, 0.88, 0.88); // Refined shadow
  
  // ============================================================
  // FIXED SPACING & LAYOUT CONSTANTS
  // ============================================================
  const spaceAfterHeader = 42;
  const spaceAfterTitle = 38;
  const spaceAfterDeclaration = 24;
  const spaceAfterName = 20;
  const spaceAfterMainText = 24;
  const spaceAfterIP = 30;
  const spaceAfterDetails = 30;
  const spaceBeforeSignatures = 45;
  const lineHeight = 12;

  // start Y (top area)
  let yPosition = height - 70; // pulls header down from top edge

  // Decorative corner ornaments
  const cornerSize = 15;
  const cornerThickness = 2;
  const cornerColor = goldColor;
  
  // Top-left corner
  page.drawLine({ start: { x: borderX + 10, y: height - borderY - 10 }, end: { x: borderX + 10 + cornerSize, y: height - borderY - 10 }, thickness: cornerThickness, color: cornerColor });
  page.drawLine({ start: { x: borderX + 10, y: height - borderY - 10 }, end: { x: borderX + 10, y: height - borderY - 10 - cornerSize }, thickness: cornerThickness, color: cornerColor });
  
  // Top-right corner
  page.drawLine({ start: { x: width - borderX - 10, y: height - borderY - 10 }, end: { x: width - borderX - 10 - cornerSize, y: height - borderY - 10 }, thickness: cornerThickness, color: cornerColor });
  page.drawLine({ start: { x: width - borderX - 10, y: height - borderY - 10 }, end: { x: width - borderX - 10, y: height - borderY - 10 - cornerSize }, thickness: cornerThickness, color: cornerColor });
  
  // Bottom-left corner
  page.drawLine({ start: { x: borderX + 10, y: borderY + 10 }, end: { x: borderX + 10 + cornerSize, y: borderY + 10 }, thickness: cornerThickness, color: cornerColor });
  page.drawLine({ start: { x: borderX + 10, y: borderY + 10 }, end: { x: borderX + 10, y: borderY + 10 + cornerSize }, thickness: cornerThickness, color: cornerColor });
  
  // Bottom-right corner
  page.drawLine({ start: { x: width - borderX - 10, y: borderY + 10 }, end: { x: width - borderX - 10 - cornerSize, y: borderY + 10 }, thickness: cornerThickness, color: cornerColor });
  page.drawLine({ start: { x: width - borderX - 10, y: borderY + 10 }, end: { x: width - borderX - 10, y: borderY + 10 + cornerSize }, thickness: cornerThickness, color: cornerColor });

  // ============================================================
  // MAIN BORDER
  // ============================================================
  // Shadow effect (offset rectangle)
  page.drawRectangle({
    x: borderX + 2,
    y: borderY - 2,
    width: borderWidth,
    height: borderHeight,
    color: shadowColor,
    borderWidth: 0,
  });

  // Main border
  page.drawRectangle({
    x: borderX,
    y: borderY,
    width: borderWidth,
    height: borderHeight,
    color: rgb(1, 1, 1), // White background
    borderColor: goldColor,
    borderWidth: 5, // Prominent gold border
  });

  // Subtle inner line for refinement
  page.drawRectangle({
    x: borderX + 5,
    y: borderY + 5,
    width: borderWidth - 10,
    height: borderHeight - 10,
    borderColor: accentColor,
    borderWidth: 1,
  });

  // ============================================================
  // SECTION 0: WATERMARK (UCC Logo - Subtle Background)
  // ============================================================
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      // Fetch logo from storage
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        const { data: logoData, error: logoError } = await supabase.storage
          .from("assets")
          .download("ucc_logo.png");

        if (!logoError && logoData) {
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
          
          // Place watermark in center-bottom area with opacity effect
          page.drawImage(logoImage, {
            x: width / 2 - watermarkWidth / 2,
            y: borderY + 100,
            width: watermarkWidth,
            height: watermarkHeight,
            opacity: 0.08, // very subtle
          });
        }
      } catch (watermarkError) {
        console.warn("Warning: Could not embed watermark:", watermarkError);
      }
    }
  } catch (error) {
    console.warn("Warning: Watermark setup failed:", error);
  }

  // ============================================================
  // SECTION 1: ENHANCED HEADER WITH LOGO
  // ============================================================
  // Logo area with actual UCC logo (65x65 top left)
  let logoEmbedded = false;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        const { data: logoData, error: logoError } = await supabase.storage
          .from("assets")
          .download("ucc_logo.png");

        if (logoError) {
          console.error("Logo download error:", logoError);
        } else if (logoData) {
          const logoBuffer = await (logoData as any).arrayBuffer();
          const logoUint8Array = new Uint8Array(logoBuffer);
          const logoImage = await pdfDoc.embedPng(logoUint8Array);

          // Draw logo image
          page.drawImage(logoImage, {
            x: margin + 10,
            y: yPosition - 48,
            width: 67,
            height: 67,
          });
          logoEmbedded = true;
        }
      } catch (logoError) {
        console.error("Logo embedding exception:", logoError);
      }
    }
  } catch (error) {
    console.error("Logo section error:", error);
  }
  
  // Draw fallback if logo not embedded
  if (!logoEmbedded) {
    page.drawRectangle({
      x: margin + 10,
      y: yPosition - 38,
      width: 67,
      height: 67,
      borderColor: accentColor,
      borderWidth: 2,
      color: lightBoxColor,
    });
    
    page.drawText("UCC", {
      x: margin + 20,
      y: yPosition - 48,
      size: 15,
      color: accentColor,
    });
  }

  // Header text (positioned after logo on the left)
  const headerX = margin + 85;
  page.drawText("Republic of the Philippines", { x: headerX, y: yPosition, size: 8, color: darkColor });
  yPosition = moveDown(yPosition, 18);

  page.drawText("UNIVERSITY OF CALOOCAN CITY", { x: headerX, y: yPosition, size: 18, color: accentColor });
  yPosition = moveDown(yPosition, 14);

  page.drawText("INTELLECTUAL PROPERTY OFFICE", { x: headerX, y: yPosition, size: 11, color: darkColor });
  yPosition = moveDown(yPosition, spaceAfterHeader);

  // ============================================================
  // FIXED TITLE BOX
  // ============================================================
  const titleBoxY = yPosition - 35;

  page.drawRectangle({
    x: margin + 15,
    y: titleBoxY,
    width: contentWidth - 30,
    height: 48,
    color: lightBgColor,
    borderColor: accentColor,
    borderWidth: 3,
  });

  // Center title text in box using box center calculation
  const boxX = margin + 5;
  const boxWidth = contentWidth - 30;
  const boxCenterX = boxX + boxWidth / 2;
  const fontSize = 14;
  const line1 = "INTERNAL CERTIFICATE OF INTELLECTUAL";
  const line2 = "PROPERTY REGISTRATION - LEGACY RECORD";
  
  // Estimate text width (Helvetica: ~4.2pt per character at size 14)
  const approxCharWidth1 = (line1.length * 7.7) / 2;
  const approxCharWidth2 = (line2.length * 7.8) / 2;

  page.drawText(line1, {
    x: boxCenterX - approxCharWidth1,
    y: yPosition - 8,
    size: fontSize,
    color: accentColor,
  });

  page.drawText(line2, {
    x: boxCenterX - approxCharWidth2,
    y: yPosition - 23,
    size: fontSize,
    color: accentColor,
  });

  yPosition = moveDown(yPosition, 60);

  // ============================================================
  // DECLARATION OPENING
  // ============================================================
  page.drawText("BE IT KNOWN THAT", { x: margin + 25, y: yPosition, size: 9, color: darkColor });
  yPosition = moveDown(yPosition, spaceAfterDeclaration);

  // ============================================================
  // RECIPIENT NAME - HIGHLIGHT
  // ============================================================
  page.drawText(creator.full_name.toUpperCase(), { x: margin + 25, y: yPosition - 4, size: 14, color: accentColor });
  yPosition = moveDown(yPosition, spaceAfterName + 4);

  page.drawText("of the University of Caloocan City", { x: margin + 25, y: yPosition, size: 8, color: darkColor });
  yPosition = moveDown(yPosition, spaceAfterName);

  // ============================================================
  // MAIN DECLARATION BODY
  // ============================================================
  const declarations = [
    "has duly registered with the Intellectual Property Office",
    "of the University of Caloocan City the following intellectual property",
    "which has been evaluated and approved:",
  ];

  const declTextX = margin + 25;
  for (const declaration of declarations) {
    page.drawText(declaration, { x: declTextX, y: yPosition, size: 9, color: darkColor, maxWidth: contentWidth - 90 });
    yPosition = moveDown(yPosition, 11);
  }
  
  yPosition = moveDown(yPosition, spaceAfterMainText);

  // ============================================================
  // IP TITLE - STYLED BOX
  // ============================================================
  const ipTitleBoxY = yPosition - 20;
  const ipBoxX = margin + 38;
  const ipBoxWidth = contentWidth - 76;
  const ipBoxCenterX = ipBoxX + ipBoxWidth / 2;

  // Center IP title text in box
  const ipTitle = `"${record.title}"`;
  const ipTitleFontSize = 16;
  const ipTitleCharWidth = (ipTitle.length * 5.0) / 2;

  page.drawText(ipTitle, {
    x: ipBoxCenterX - ipTitleCharWidth,
    y: yPosition - 6,
    size: ipTitleFontSize,
    color: accentColor,
  });

  yPosition = moveDown(yPosition, 30);

  // ============================================================
  // ABSTRACT SECTION
  // ============================================================
  const abstractText = record.abstract || "No abstract provided.";
  const abstractX = margin + 35;
  const abstractMaxWidth = contentWidth - 100;
  
  page.drawText("Abstract:", { x: abstractX, y: yPosition, size: 9, color: accentColor });
  yPosition = moveDown(yPosition, 14);
  
  page.drawText(abstractText, { 
    x: abstractX, 
    y: yPosition, 
    size: 7.5, 
    color: darkColor, 
    maxWidth: abstractMaxWidth,
    lineHeight: 14
  });
  yPosition = moveDown(yPosition, 80);

  // ============================================================
  // DETAILS TABLE - STYLED BOX
  // ============================================================
  const tableHeight = 40;

  page.drawRectangle({
    x: margin + 18,
    y: yPosition - tableHeight,
    width: contentWidth - 36,
    height: tableHeight,
    color: lightBgColor,
    borderColor: accentColor,
    borderWidth: 2,
  });

  const leftColStart = margin + 38;
  const rightColStart = width / 2 + 15;

  // Row 1
  page.drawText("Category:", { x: leftColStart, y: yPosition - 12, size: 9, color: accentColor });
  page.drawText(capitalize(record.category), { x: leftColStart + 80, y: yPosition - 12, size: 9, color: darkColor });

  page.drawText("Registration Date:", { x: rightColStart, y: yPosition - 12, size: 9, color: accentColor });
  page.drawText(formatDate(record.created_at), { x: rightColStart + 115, y: yPosition - 12, size: 9, color: darkColor });

  // Row 2 - Tracking ID
  page.drawText("Tracking ID:", { x: leftColStart, y: yPosition - 32, size: 9, color: accentColor });
  page.drawText(trackingId, { x: leftColStart + 80, y: yPosition - 32, size: 9, color: darkColor });

  page.drawText("Creator:", { x: rightColStart, y: yPosition - 32, size: 9, color: accentColor });
  page.drawText(record.details?.creator_name || "Unknown", { x: rightColStart + 80, y: yPosition - 32, size: 8, color: darkColor, maxWidth: 160 });

  yPosition = moveDown(yPosition, tableHeight + spaceAfterDetails);

  // ============================================================
  // DECORATIVE SEPARATOR
  // ============================================================
  page.drawRectangle({
    x: margin + 48,
    y: yPosition + 5,
    width: contentWidth - 96,
    height: 2,
    color: goldColor,
  });
  
  yPosition = moveDown(yPosition, 28);

  // ============================================================
  // LEGAL STATEMENT
  // ============================================================
  const legalLines = [
    "This certificate confirms the official registration of this intellectual property with the",
    "University of Caloocan City Intellectual Property Office. All rights and protections afforded",
    "by University Policy apply from the date of registration.",
  ];

  const legalTextX = margin + 25;
  for (const line of legalLines) {
    page.drawText(line, { x: legalTextX, y: yPosition, size: 8, color: darkColor, maxWidth: contentWidth - 96 });
    yPosition = moveDown(yPosition, 10);
  }
  
  yPosition = moveDown(yPosition, 14);

  // ============================================================
  // WITNESS CLAUSE
  // ============================================================
  const currentDate = new Date();
  const dayOrdinal = getOrdinalDay(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const witnessText = `IN WITNESS WHEREOF, this certificate has been duly executed on this ${dayOrdinal} day of ${monthYear}.`;
  page.drawText(witnessText, {
    x: margin + 25,
    y: yPosition,
    size: 8,
    color: darkColor,
    maxWidth: contentWidth - 96,
  });
  
  yPosition = moveDown(yPosition, 34);

  // ============================================================
  // SIGNATURE BLOCK
  // ============================================================
  const sigLineLength = 130;
  const sigLineY = yPosition;

  // Align signature blocks with content margins
  const sig1X = margin + 15;
  const sig2X = margin + contentWidth / 3;
  const sig3X = margin + contentWidth * 2 / 3 - 15;

  // Signature lines
  page.drawLine({ start: { x: sig1X, y: sigLineY }, end: { x: sig1X + sigLineLength, y: sigLineY }, thickness: 1.2, color: darkColor });
  page.drawLine({ start: { x: sig2X, y: sigLineY }, end: { x: sig2X + sigLineLength, y: sigLineY }, thickness: 1.2, color: darkColor });
  page.drawLine({ start: { x: sig3X, y: sigLineY }, end: { x: sig3X + sigLineLength, y: sigLineY }, thickness: 1.2, color: darkColor });

  // Signature titles
  page.drawText("Director", { x: sig1X + 53, y: sigLineY - 13, size: 8, color: darkColor });
  page.drawText("Dean", { x: sig2X + 58, y: sigLineY - 13, size: 8, color: darkColor });
  page.drawText("President", { x: sig3X + 50, y: sigLineY - 13, size: 8, color: darkColor });

  yPosition = moveDown(yPosition, 20);

  // Department/office info
  page.drawText("IP Office", { x: sig1X + 53, y: yPosition - 5, size: 6.5, color: darkColor });
  page.drawText("College of Computer Studies", { x: sig2X + 25, y: yPosition - 5, size: 6.5, color: darkColor });
  page.drawText("Office of the President", { x: sig3X + 35, y: yPosition - 5, size: 6.5, color: darkColor });

  yPosition = moveDown(yPosition, spaceAfterMainText);

  // ============================================================
  // QR CODE FOR VERIFICATION
  // ============================================================
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

    // QR code label
    page.drawText("Verify Certificate", {
      x: qrX - 2,
      y: qrY - 11,
      size: 6.5,
      color: accentColor,
    });
  } catch (error) {
    console.warn("Warning: Could not embed QR code:", error);
  }

  // ============================================================
  // FOOTER WITH VERIFICATION LINK
  // ============================================================
  page.drawRectangle({
    x: margin,
    y: margin + 8,
    width: contentWidth,
    height: 1.5,
    color: goldColor,
  });

  let footerY = margin + 2;

  page.drawText(
    `Verify at: https://ucc-ipo.com/verify/${trackingId}`,
    {
      x: margin + 25,
      y: footerY,
      size: 6.5,
      color: accentColor,
    }
  );

  return pdfDoc.save();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body safely with better error recovery
    let requestData: any = {};
    try {
      const body = await req.json();
      requestData = body || {};
      console.log('[generate-certificate-legacy] Body parsed:', requestData);
    } catch (e) {
      console.warn('[generate-certificate-legacy] JSON parse failed:', String(e));
      // Continue with empty body
    }

    // Validate the request
    const record_id = requestData.record_id || requestData.recordId;
    if (!record_id) {
      console.error('[generate-certificate-legacy] Validation failed - no record ID', { requestData });
      return new Response(
        JSON.stringify({
          error: "Missing record_id",
          received: requestData,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { user_id } = requestData;

    console.log('[generate-certificate-legacy] Generating certificate for legacy record', {
      record_id,
      user_id,
      timestamp: new Date().toISOString(),
    });

    // Fetch legacy IP record - ONLY from legacy_ip_records table
    const { data: legacyRecords, error: legacyError } = await supabase
      .from("legacy_ip_records")
      .select("*")
      .eq("id", record_id);

    if (!legacyRecords || legacyRecords.length === 0) {
      console.error('[generate-certificate-legacy] Legacy record not found', {
        record_id,
        error: legacyError?.message,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Legacy IP record not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const record = legacyRecords[0] as LegacyIPRecord;

    console.log('[generate-certificate-legacy] Found legacy record', {
      recordId: record.id,
      title: record.title,
      creatorName: record.details?.creator_name,
    });

    // Get creator info from details
    const creatorName = record.details?.creator_name || 'Unknown Creator';
    const creator: UserData = {
      id: 'legacy',
      full_name: creatorName,
      email: 'legacy@archived',
    };

    // Generate tracking ID
    const year = new Date(record.created_at).getFullYear();
    const trackingId = `LEGACY-${year}-${String(record.id).substring(0, 8).toUpperCase()}`;

    // Generate PDF
    console.log('[generate-certificate-legacy] Starting PDF generation');
    const pdfBuffer = await generateCertificatePDF(record, creator, trackingId);
    console.log('[generate-certificate-legacy] PDF generated, size:', pdfBuffer.length);
    
    const checksum = await generateChecksum(pdfBuffer);
    console.log('[generate-certificate-legacy] Checksum generated:', checksum);

    // Upload to legacy bucket
    const now = new Date();
    const year_num = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const fileName = `${trackingId}.pdf`;
    const filePath = `${year_num}/${month}/${fileName}`;

    console.log('[generate-certificate-legacy] Uploading to storage', {
      bucketName: "legacy-generated-documents",
      filePath,
      fileSize: pdfBuffer.length,
    });

    const { error: uploadError } = await supabase.storage
      .from("legacy-generated-documents")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error('[generate-certificate-legacy] Upload error:', {
        error: uploadError.message,
        errorCode: (uploadError as any).statusCode,
      });
      throw new Error(`Failed to upload certificate: ${uploadError.message}`);
    }

    console.log('[generate-certificate-legacy] Certificate generated successfully', {
      trackingId,
      filePath,
      fileSize: pdfBuffer.length,
    });

    // Save document record to database
    const { error: dbError } = await supabase
      .from("legacy_record_documents")
      .insert({
        record_id: record.id,
        document_type: "certificate",
        file_path: filePath,
        file_name: fileName,
        pdf_data: null,
      });

    if (dbError) {
      console.warn('[generate-certificate-legacy] Database record error (non-critical):', dbError.message);
      // Don't throw - PDF was uploaded successfully, just warn about DB record
    } else {
      console.log('[generate-certificate-legacy] Database record created:', { trackingId });
    }

    // Convert PDF to base64 for download
    const base64Pdf = uint8ArrayToBase64(pdfBuffer);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Legacy certificate generated successfully",
        certificateNumber: trackingId,
        fileSize: pdfBuffer.length,
        checksum,
        filePath,
        pdf_data: base64Pdf,
        record: {
          id: record.id,
          title: record.title,
          creator: creatorName,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[generate-certificate-legacy] Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate certificate",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
