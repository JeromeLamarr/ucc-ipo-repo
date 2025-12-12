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
  abstract?: string;
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
            x: margin + 10,
            y: yPosition - 48,
            width: 67,
            height: 67,
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
  const fontSize = 12;
  const line1 = "CERTIFICATE OF INTELLECTUAL";
  const line2 = "PROPERTY REGISTRATION";
  
  // Estimate text width (Helvetica: ~4.2pt per character at size 14)
  const approxCharWidth1 = (line1.length * 7.4) / 2;
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
  

    // ============================================================
  // IP TITLE - STYLED BOX
  // ============================================================
  const ipTitleBoxY = yPosition - 20;
  const ipBoxX = margin + 38;
  const ipBoxWidth = contentWidth - 76;
  const ipBoxCenterX = ipBoxX + ipBoxWidth / 2;


  // Center IP title text in box
  const ipTitle = `"${ipRecord.title}"`;
  const ipTitleFontSize = 12;
  // Estimate text width (Helvetica: ~5pt per character at size 12)
  const ipTitleCharWidth = (ipTitle.length * 5.0) / 2;

  page.drawText(ipTitle, {
    x: ipBoxCenterX - ipTitleCharWidth,
    y: yPosition - 6,
    size: ipTitleFontSize,
    color: accentColor,
  });

  yPosition = moveDown(yPosition, spaceAfterMainText);
  // ============================================================
  // ABSTRACT SECTION
  // ============================================================
  const abstractText = ipRecord.abstract || "No abstract provided.";
  const abstractX = margin + 25;
  const abstractMaxWidth = contentWidth - 50;
  
  page.drawText("Abstract:", { x: abstractX, y: yPosition, size: 9, color: accentColor });
  yPosition = moveDown(yPosition, 12);
  
  page.drawText(abstractText, { 
    x: abstractX, 
    y: yPosition, 
    size: 8, 
    color: darkColor, 
    maxWidth: abstractMaxWidth 
  });
  yPosition = moveDown(yPosition, spaceAfterMainText);

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
  page.drawText(capitalize(ipRecord.category), { x: leftColStart + 80, y: yPosition - 12, size: 9, color: darkColor });

  page.drawText("Registration Date:", { x: rightColStart, y: yPosition - 12, size: 9, color: accentColor });
  page.drawText(formatDate(ipRecord.created_at), { x: rightColStart + 115, y: yPosition - 12, size: 9, color: darkColor });

  // Row 2 - Tracking ID and Co-Creators
  page.drawText("Tracking ID:", { x: leftColStart, y: yPosition - 32, size: 9, color: accentColor });
  page.drawText(trackingId, { x: leftColStart + 80, y: yPosition - 32, size: 9, color: darkColor });

  if (coCreators && coCreators.length > 0) {
    const coCreatorText = coCreators.map((c) => c.name).join(", ");
    page.drawText("Co-Creators:", { x: rightColStart, y: yPosition - 32, size: 9, color: accentColor });
    page.drawText(coCreatorText, { x: rightColStart + 80, y: yPosition - 32, size: 8, color: darkColor, maxWidth: 160 });
  }

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
  
  yPosition = moveDown(yPosition, spaceAfterMainText);

  // ============================================================
  // SIGNATURE BLOCK
  // ============================================================
  const sigLineLength = 135;
  const sigLineY = yPosition;

  // Align signature blocks with content margins
  const sig1X = margin + 25;
  const sig2X = margin + contentWidth / 3;
  const sig3X = margin + contentWidth * 2 / 3 - 30;

  // Signature lines
  page.drawLine({ start: { x: sig1X, y: sigLineY }, end: { x: sig1X + sigLineLength, y: sigLineY }, thickness: 1.2, color: darkColor });
  page.drawLine({ start: { x: sig2X, y: sigLineY }, end: { x: sig2X + sigLineLength, y: sigLineY }, thickness: 1.2, color: darkColor });
  page.drawLine({ start: { x: sig3X, y: sigLineY }, end: { x: sig3X + sigLineLength, y: sigLineY }, thickness: 1.2, color: darkColor });

  // Signature titles
  page.drawText("Director", { x: sig1X + 40, y: sigLineY - 13, size: 8, color: darkColor });
  page.drawText("Dean", { x: sig2X + 45, y: sigLineY - 13, size: 8, color: darkColor });
  page.drawText("President", { x: sig3X + 35, y: sigLineY - 13, size: 8, color: darkColor });

  yPosition = moveDown(yPosition, 20);

  // Department/office info
  page.drawText("IP Office", { x: sig1X + 40, y: yPosition - 5, size: 6.5, color: darkColor });
  page.drawText("College of Computer Studies", { x: sig2X + 10, y: yPosition - 5, size: 6.5, color: darkColor });
  page.drawText("Office of the President", { x: sig3X + 35, y: yPosition - 5, size: 6.5, color: darkColor });

  yPosition = moveDown(yPosition, spaceAfterMainText);

  // ============================================================
  // QR CODE FOR VERIFICATION (fixed & consolidated)
  // ============================================================
  try {
    const verificationUrl = `https://${Deno.env.get("SITE_URL") || "ucc-ipo.com"}/verify/${trackingId}`.replace(/\/\//g, "/").replace("https:/", "https://");
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

  let footerY = margin + 4;

  page.drawText(
    `Verify at: ucc-ipo.com/verify/${trackingId}`,
    {
      x: margin,
      y: footerY,
      size: 7,
      color: accentColor,
    }
  );

  footerY = moveDown(footerY, 15);

  page.drawText(
    `Certificate #: ${trackingId} | Issued: ${formatDate(new Date().toISOString())}`,
    {
      x: margin,
      y: footerY,
      size: 6,
      color: rgb(0.6, 0.6, 0.6),
    }
  );

  footerY = moveDown(footerY, 12);

  page.drawText(
    `Caloocan City, Philippines | UCC Intellectual Property Office`,
    {
      x: margin,
      y: footerY,
      size: 6,
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
