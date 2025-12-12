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

interface CertificateRequest {
  record_id: number | string;
  user_id: string;
  requester_id?: string;
  requester_role?: string;
}

interface IPRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  applicant_id: string;
  created_at: string;
  tracking_id?: string;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate input payload
function validateCertificateRequest(payload: any): { valid: boolean; error?: string } {
  // record_id can be UUID string or numeric ID
  if (typeof payload.record_id !== 'number' && typeof payload.record_id !== 'string') {
    return { valid: false, error: 'record_id must be a string or number' };
  }

  if (typeof payload.record_id === 'string') {
    // Check if it's a valid UUID or numeric string
    const isUUID = isValidUUID(payload.record_id);
    const isNumeric = !isNaN(parseInt(payload.record_id));
    
    if (!isUUID && !isNumeric) {
      return { valid: false, error: 'record_id must be a valid UUID or number' };
    }
  }

  if (!payload.user_id || typeof payload.user_id !== 'string') {
    return { valid: false, error: 'user_id must be a non-empty string' };
  }

  if (!isValidUUID(payload.user_id)) {
    return { valid: false, error: 'user_id must be a valid UUID' };
  }

  if (payload.requester_id && !isValidUUID(payload.requester_id)) {
    return { valid: false, error: 'requester_id must be a valid UUID' };
  }

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
    // Generate QR code as data URL (works better with pdf-lib)
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

// Get ordinal day
function getOrdinalDay(date: Date): string {
  const day = date.getDate();
  const suffixes = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return day + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Small helpers
function capitalize(s: string | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  // data:image/png;base64,XXXXX
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

// ============================================================
// FIXED centerText() FUNCTION
// ============================================================
function centerText(page: any, text: string, size: number, y: number, color: ReturnType<typeof rgb> = rgb(0, 0, 0), maxWidth?: number): void {
  // pdf-lib supports align option; x should be center
  page.drawText(text, {
    x: page.getWidth() / 2,
    y,
    size,
    color,
    maxWidth,
    align: "center",
  });
}

// Helper to safely move down by a specified amount and return new Y position
function moveDown(currentY: number, amount: number): number {
  return currentY - amount;
}

// ============================================================
// CERTIFICATE PDF GENERATION - ENHANCED PROFESSIONAL DESIGN
// ============================================================

// Generate certificate PDF with professional design, QR code, and UCC logo
async function generateCertificatePDF(
  ipRecord: IPRecord,
  creator: UserData,
  coCreators: Array<{ name: string; role: string }>,
  evaluation: { total_score: number; recommendation: string } | null,
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
  const greenColor = rgb(0.2, 0.52, 0.2); // Deep green for status
  const shadowColor = rgb(0.88, 0.88, 0.88); // Refined shadow
  
  // ============================================================
  // FIXED SPACING & LAYOUT CONSTANTS
  // ============================================================
  const spaceAfterHeader = 48;
  const spaceAfterTitle = 45;
  const spaceAfterDeclaration = 32;
  const spaceAfterName = 28;
  const spaceAfterMainText = 32;
  const spaceAfterIP = 38;
  const spaceAfterDetails = 40;
  const spaceBeforeSignatures = 55;
  const lineHeight = 13;

  // start Y (top area)
  let yPosition = height - 80; // pulls header down from top edge

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
          // Convert to buffer if possible
          let buf: Uint8Array;
          if (typeof (logoData as any).arrayBuffer === "function") {
            const ab = await (logoData as any).arrayBuffer();
            buf = new Uint8Array(ab);
          } else {
            // fallback: try to read as Uint8Array (some runtimes)
            buf = logoData as unknown as Uint8Array;
          }

          const logoImage = await pdfDoc.embedPng(buf);
          const watermarkWidth = 300;
          const watermarkHeight = 300;
          
          // Place watermark in center-bottom area with opacity effect
          page.drawImage(logoImage, {
            x: width / 2 - watermarkWidth / 2,
            y: borderY + 150,
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
  let embeddedLogoImageRef: any = null;
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
          // Convert Blob-like to uint8
          const logoBuffer = await (logoData as any).arrayBuffer();
          const logoUint8Array = new Uint8Array(logoBuffer);
          const logoImage = await pdfDoc.embedPng(logoUint8Array);
          embeddedLogoImageRef = logoImage;

          // Draw logo image
          page.drawImage(logoImage, {
            x: margin + 12,
            y: yPosition - 68,
            width: 62,
            height: 62,
          });
          logoEmbedded = true;
        } else {
          console.warn("No logo data received from storage");
        }
      } catch (logoError) {
        console.error("Logo embedding exception:", logoError);
      }
    } else {
      console.warn("Supabase URL or Service Key not configured");
    }
  } catch (error) {
    console.error("Logo section error:", error);
  }
  
  // Draw fallback if logo not embedded
  if (!logoEmbedded) {
    page.drawRectangle({
      x: margin + 12,
      y: yPosition - 68,
      width: 62,
      height: 62,
      borderColor: accentColor,
      borderWidth: 2,
      color: lightBoxColor,
    });
    
    page.drawText("UCC", {
      x: margin + 22,
      y: yPosition - 48,
      size: 15,
      color: accentColor,
    });
  }

  // Header text (centered block near top)
  centerText(page, "Republic of the Philippines", 9, yPosition, darkColor);
  yPosition = moveDown(yPosition, 12);

  centerText(page, "UNIVERSITY OF CALOOCAN CITY", 22, yPosition, accentColor);
  yPosition = moveDown(yPosition, 18);

  centerText(page, "INTELLECTUAL PROPERTY OFFICE", 12, yPosition, darkColor);
  yPosition = moveDown(yPosition, spaceAfterHeader);

  // ============================================================
  // FIXED TITLE BOX
  // ============================================================
  const titleBoxY = yPosition - 48;
  page.drawRectangle({
    x: margin + 22,
    y: titleBoxY,
    width: contentWidth - 44,
    height: 52,
    color: lightBgColor,
    borderColor: accentColor,
    borderWidth: 3,
  });

  centerText(page, "CERTIFICATE OF INTELLECTUAL", 15, yPosition - 7, accentColor, contentWidth - 44);
  centerText(page, "PROPERTY REGISTRATION", 15, yPosition - 24, accentColor, contentWidth - 44);

  yPosition = moveDown(yPosition, 75);

  // ============================================================
  // DECLARATION OPENING
  // ============================================================
  centerText(page, "BE IT KNOWN THAT", 11, yPosition, darkColor);
  yPosition = moveDown(yPosition, spaceAfterDeclaration);

  // ============================================================
  // RECIPIENT NAME - HIGHLIGHT
  // ============================================================
  page.drawRectangle({
    x: margin + 42,
    y: yPosition - 22,
    width: contentWidth - 84,
    height: 28,
    color: lightBgColor,
  });
  centerText(page, creator.full_name.toUpperCase(), 19, yPosition - 5, accentColor, contentWidth - 84);

  yPosition = moveDown(yPosition, spaceAfterName + 6);

  centerText(page, "of the University of Caloocan City", 10, yPosition, darkColor);
  yPosition = moveDown(yPosition, spaceAfterName);

  // ============================================================
  // MAIN DECLARATION BODY
  // ============================================================
  const declarations = [
    "has duly registered with the Intellectual Property Office",
    "of the University of Caloocan City the following intellectual property",
    "which has been evaluated and approved:",
  ];

  const declTextX = margin + 45;
  for (const declaration of declarations) {
    page.drawText(declaration, { x: declTextX, y: yPosition, size: 10, color: darkColor, maxWidth: contentWidth - 90 });
    yPosition = moveDown(yPosition, lineHeight);
  }
  
  yPosition = moveDown(yPosition, spaceAfterMainText);

  // ============================================================
  // IP TITLE - STYLED BOX
  // ============================================================
  page.drawRectangle({
    x: margin + 38,
    y: yPosition - 26,
    width: contentWidth - 76,
    height: 34,
    color: lightBoxColor,
    borderColor: accentColor,
    borderWidth: 2,
  });

  centerText(page, `"${ipRecord.title}"`, 13, yPosition - 7, accentColor, contentWidth - 76);
  yPosition = moveDown(yPosition, 60);

  // ============================================================
  // DETAILS TABLE - STYLED BOX
  // ============================================================
  const tableHeight = 80;

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
  page.drawText(capitalize(ipRecord.category), { x: leftColStart + 80, y: yPosition - 12, size: 9, color: darkColor });

  page.drawText("Registration Date:", { x: rightColStart, y: yPosition - 12, size: 9, color: accentColor });
  page.drawText(formatDate(ipRecord.created_at), { x: rightColStart + 115, y: yPosition - 12, size: 9, color: darkColor });

  // Row 2
  page.drawText("Status:", { x: leftColStart, y: yPosition - 32, size: 9, color: accentColor });
  page.drawText("APPROVED", { x: leftColStart + 80, y: yPosition - 32, size: 9, color: greenColor });

  page.drawText("Tracking ID:", { x: rightColStart, y: yPosition - 32, size: 9, color: accentColor });
  page.drawText(trackingId, { x: rightColStart + 115, y: yPosition - 32, size: 9, color: darkColor });

  // Row 3
  page.drawText("Evaluation Score:", { x: leftColStart, y: yPosition - 52, size: 9, color: accentColor });
  page.drawText(`${evaluation?.total_score || 0}/50`, { x: leftColStart + 80, y: yPosition - 52, size: 9, color: darkColor });

  if (coCreators && coCreators.length > 0) {
    const coCreatorText = coCreators.map((c) => c.name).join(", ");
    page.drawText("Co-Creators:", { x: rightColStart, y: yPosition - 52, size: 9, color: accentColor });
    page.drawText(coCreatorText, { x: rightColStart + 80, y: yPosition - 52, size: 8, color: darkColor, maxWidth: 160 });
  }

  yPosition = moveDown(yPosition, tableHeight + spaceAfterDetails);

  // ============================================================
  // DECORATIVE SEPARATOR
  // ============================================================
  page.drawRectangle({
    x: margin + 52,
    y: yPosition,
    width: contentWidth - 104,
    height: 2.5,
    color: goldColor,
  });
  
  yPosition = moveDown(yPosition, 22);

  // ============================================================
  // LEGAL STATEMENT
  // ============================================================
  const legalLines = [
    "This certificate confirms the official registration of this intellectual property with the",
    "University of Caloocan City Intellectual Property Office. All rights and protections afforded",
    "by University Policy apply from the date of registration.",
  ];

  const legalTextX = margin + 50;
  for (const line of legalLines) {
    page.drawText(line, { x: legalTextX, y: yPosition, size: 8, color: darkColor, maxWidth: contentWidth - 100 });
    yPosition = moveDown(yPosition, 11);
  }
  
  yPosition = moveDown(yPosition, 16);

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
    x: margin + 50,
    y: yPosition,
    size: 9,
    color: darkColor,
    maxWidth: contentWidth - 100,
  });
  
  yPosition = moveDown(yPosition, spaceBeforeSignatures);

  // ============================================================
  // SIGNATURE BLOCK
  // ============================================================
  const sigLineLength = 150;
  const sigLineY = yPosition;

  const sig1X = width * 0.10;
  const sig2X = width * 0.38;
  const sig3X = width * 0.66;

  // Signature lines
  page.drawLine({ start: { x: sig1X, y: sigLineY }, end: { x: sig1X + sigLineLength, y: sigLineY }, thickness: 1.5, color: darkColor });
  page.drawLine({ start: { x: sig2X, y: sigLineY }, end: { x: sig2X + sigLineLength, y: sigLineY }, thickness: 1.5, color: darkColor });
  page.drawLine({ start: { x: sig3X, y: sigLineY }, end: { x: sig3X + sigLineLength, y: sigLineY }, thickness: 1.5, color: darkColor });

  // Signature titles
  page.drawText("Director", { x: sig1X + 40, y: sigLineY - 14, size: 9, color: darkColor });
  page.drawText("Dean", { x: sig2X + 48, y: sigLineY - 14, size: 9, color: darkColor });
  page.drawText("President", { x: sig3X + 38, y: sigLineY - 14, size: 9, color: darkColor });

  yPosition = moveDown(yPosition, 24);

  // Department/office info
  page.drawText("IP Office", { x: sig1X + 15, y: yPosition - 6, size: 7, color: darkColor });
  page.drawText("College of Computer Studies", { x: sig2X - 5, y: yPosition - 6, size: 7, color: darkColor });
  page.drawText("Office of the President", { x: sig3X + 20, y: yPosition - 6, size: 7, color: darkColor });

  yPosition = moveDown(yPosition, 18);

  // ============================================================
  // QR CODE FOR VERIFICATION (fixed & consolidated)
  // ============================================================
  try {
    const verificationUrl = `https://${Deno.env.get("SITE_URL") || "ucc-ipo.com"}/verify/${trackingId}`.replace(/\/\//g, "/").replace("https:/", "https://");
    const qrCodeDataUrl = await generateQRCodeImage(verificationUrl);
    const qrBytes = dataUrlToUint8Array(qrCodeDataUrl);
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 100;
    const qrX = width - margin - qrSize - 8;
    const qrY = margin + 14;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // QR code label
    page.drawText("Verify Certificate", {
      x: qrX - 2,
      y: qrY - 12,
      size: 7,
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
    y: margin + 10,
    width: contentWidth,
    height: 2,
    color: goldColor,
  });

  let footerY = margin + 4;

  page.drawText(
    `Verify at: ucc-ipo.com/verify/${trackingId}`,
    {
      x: margin,
      y: footerY,
      size: 8,
      color: accentColor,
    }
  );

  footerY = moveDown(footerY, 12);

  page.drawText(
    `Certificate #: ${trackingId} | Issued: ${formatDate(new Date().toISOString())}`,
    {
      x: margin,
      y: footerY,
      size: 7,
      color: rgb(0.6, 0.6, 0.6),
    }
  );

  footerY = moveDown(footerY, 10);

  page.drawText(
    `Caloocan City, Philippines | UCC Intellectual Property Office`,
    {
      x: margin,
      y: footerY,
      size: 7,
      color: rgb(0.6, 0.6, 0.6),
    }
  );

  // ============================================================
  // SAVE PDF
  // ============================================================
  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
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
    const siteUrl =
      Deno.env.get("SITE_URL") || "https://university-intellect-dqt4.bolt.host";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestData: CertificateRequest;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error('[generate-certificate] JSON parse error:', String(e));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body. Please provide valid JSON.",
          details: { parseError: String(e) },
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

    // Validate input payload
    const validation = validateCertificateRequest(requestData);
    if (!validation.valid) {
      console.error('[generate-certificate] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed",
          details: { validation: validation.error },
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

    const record_id = typeof requestData.record_id === 'string' 
      ? requestData.record_id  // Keep UUID strings as-is, don't try to parse as int
      : String(requestData.record_id);
    const { user_id, requester_id, requester_role } = requestData;

    // Determine the actual requester (either requester_id if provided, or user_id)
    const actualRequesterId = requester_id || user_id;
    const actualRequesterRole = requester_role || 'applicant';

    console.log(`[generate-certificate] Generating certificate for record ${record_id}`, {
      record_id,
      user_id,
      requester_id,
      requester_role,
      actualRequesterId,
      actualRequesterRole,
      timestamp: new Date().toISOString(),
    });

    // Authorization check: Only applicants, supervisors, evaluators, and admins can generate certificates
    // If requester_id is different from user_id, verify the requester has permission
    if (requester_id && requester_id !== user_id) {
      // Verify requester has authorization
      const { data: requesterUser, error: requesterError } = await supabase
        .from("users")
        .select("role")
        .eq("id", requester_id)
        .single();

      if (requesterError || !requesterUser) {
        console.error('[generate-certificate] Requester not found:', requester_id);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Requester user not found",
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

      // Only supervisors, evaluators, and admins can generate on behalf of applicants
      const allowedRoles = ["supervisor", "evaluator", "admin"];
      if (!allowedRoles.includes(requesterUser.role)) {
        console.error('[generate-certificate] Unauthorized access attempt', {
          requester_id,
          role: requesterUser.role,
          record_id,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "You do not have permission to generate certificates for this record",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    // Fetch IP record
    const { data: ipRecord, error: ipError } = await supabase
      .from("ip_records")
      .select("*")
      .eq("id", record_id)
      .single();

    if (ipError || !ipRecord) {
      console.error('[generate-certificate] IP record fetch error', {
        record_id,
        error: ipError?.message || "Record not found",
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "IP record not found",
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

    // Get the latest status from process_tracking table (most recent status change)
    const { data: latestTracking, error: trackingError } = await supabase
      .from("process_tracking")
      .select("status")
      .eq("ip_record_id", record_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Use latest tracking status if available, otherwise fall back to ip_records.status
    const currentStatus = latestTracking?.status || ipRecord.status;
    const validStatuses = ["evaluator_approved", "ready_for_filing", "preparing_legal", "completed"];

    if (!validStatuses.includes(currentStatus)) {
      console.error('[generate-certificate] Invalid status for certificate generation', {
        record_id,
        currentStatus,
        validStatuses,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot generate certificate for this record",
          details: {
            message: "Only records with approved status can generate certificates",
            validStatuses: validStatuses,
            currentStatus: currentStatus,
          },
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch creator details
    const { data: creator, error: creatorError } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("id", ipRecord.applicant_id)
      .single();

    if (creatorError || !creator) {
      console.error('[generate-certificate] Creator fetch error', {
        applicant_id: ipRecord.applicant_id,
        error: creatorError?.message || "Creator not found",
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Creator user not found",
          details: {
            message: "The creator profile for this record could not be found",
            userId: ipRecord.applicant_id,
          },
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

    // Fetch co-creators
    const { data: coCreators, error: coCreatorsError } = await supabase
      .from("ip_authors")
      .select("name, role")
      .eq("record_id", record_id)
      .eq("role", "co_author");

    if (coCreatorsError) {
      console.warn("Warning: Error fetching co-creators:", coCreatorsError);
    }

    // Fetch evaluation
    const { data: evaluation, error: evaluationError } = await supabase
      .from("ip_evaluations")
      .select("total_score, recommendation")
      .eq("record_id", record_id)
      .single();

    if (evaluationError) {
      console.warn("Warning: No evaluation found for this record");
    }

    // Generate or use existing tracking ID
    let trackingId = (ipRecord as IPRecord).tracking_id;
    if (!trackingId) {
      const year = new Date(ipRecord.created_at).getFullYear();
      trackingId = `UCC-${year}-${String(record_id).padStart(5, "0")}`;

      // Update record with tracking ID
      await supabase
        .from("ip_records")
        .update({ tracking_id: trackingId })
        .eq("id", record_id);
    }

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF(
      ipRecord as IPRecord,
      creator as UserData,
      (coCreators || []) as Array<{ name: string; role: string }>,
      (evaluation as { total_score: number; recommendation: string }) || {
        total_score: 0,
        recommendation: "",
      },
      trackingId
    );

    // Calculate checksum
    const checksum = await generateChecksum(pdfBuffer);

    // Upload to Supabase Storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const fileName = `${trackingId}.pdf`;
    const filePath = `${year}/${month}/${fileName}`;

    console.log(`Uploading PDF to storage: ${filePath}`);

    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload certificate: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("certificates")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Check if a certificate already exists for this record
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id")
      .eq("ip_record_id", record_id)
      .maybeSingle();

    let insertError;
    if (existingCert) {
      // Update existing certificate
      const { error: updateError } = await supabase
        .from("certificates")
        .update({
          certificate_number: trackingId,
          pdf_url: publicUrl,
          file_path: filePath,
          issued_by: actualRequesterId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCert.id);
      insertError = updateError;
    } else {
      // Insert new certificate record
      const { error } = await supabase
        .from("certificates")
        .insert({
          ip_record_id: record_id,
          certificate_number: trackingId,
          applicant_id: ipRecord.applicant_id,
          title: ipRecord.title,
          category: ipRecord.category,
          pdf_url: publicUrl,
          file_path: filePath,
          issued_by: actualRequesterId,
          evaluation_score: evaluation?.total_score?.toString(),
          co_creators: coCreators?.map((c: any) => c.name).join(", "),
        });
      insertError = error;
    }

    if (insertError) {
      throw new Error(
        `Failed to record certificate metadata: ${insertError.message}`
      );
    }

    console.log(`Certificate generated successfully: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Certificate generated successfully",
        certificateNumber: trackingId,
        publicUrl,
        fileSize: pdfBuffer.length,
        checksum,
        filePath,
        record: {
          id: ipRecord.id,
          title: ipRecord.title,
          creator: creator.full_name,
          evaluationScore: evaluation?.total_score || 0,
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
    console.error("Certificate generation error:", error);
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
