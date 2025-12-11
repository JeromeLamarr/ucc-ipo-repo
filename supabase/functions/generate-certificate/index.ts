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
  id: string;  // UUID, not number
  title: string;
  category: string;
  status: string;
  applicant_id: string;  // Changed from user_id to applicant_id
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
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
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

// ============================================================
// SPACING & LAYOUT UTILITIES
// ============================================================

// Helper function to center text on page
function centerText(
  page: any,
  text: string,
  size: number,
  y: number,
  color: ReturnType<typeof rgb> = rgb(0.15, 0.15, 0.15),
  maxWidth: number = 0
): void {
  page.drawText(text, {
    x: maxWidth > 0 ? (page.getWidth() - maxWidth) / 2 : page.getWidth() / 2,
    y: y,
    size: size,
    align: "center",
    color: color,
    maxWidth: maxWidth > 0 ? maxWidth : undefined,
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
  const page = pdfDoc.addPage([612, 792]); // Letter size (8.5" x 11")

  const { width, height } = page.getSize();
  
  // ============================================================
  // MARGINS & DIMENSIONS
  // ============================================================
  const margin = 40;
  const innerPadding = 20;
  const contentWidth = width - 2 * margin;
  const borderX = margin - innerPadding;
  const borderY = innerPadding + 20;
  const borderWidth = width - 2 * borderX;
  const borderHeight = height - 2 * borderY;
  
  // ============================================================
  // ENHANCED COLOR PALETTE
  // ============================================================
  const goldColor = rgb(0.8, 0.6, 0); // Gold border
  const accentColor = rgb(0.1, 0.35, 0.65); // UCC Blue
  const darkColor = rgb(0.15, 0.15, 0.15); // Dark gray text
  const lightBgColor = rgb(0.95, 0.97, 1.0); // Subtle light blue background
  const lightBoxColor = rgb(0.97, 0.98, 1.0); // Very light blue for boxes
  const greenColor = rgb(0.22, 0.56, 0.22); // Green for approved status
  const shadowColor = rgb(0.85, 0.85, 0.85); // Subtle shadow
  
  // ============================================================
  // IMPROVED SPACING CONSTANTS
  // ============================================================
  const spaceAfterHeader = 30; // More breathing room after header
  const spaceAfterTitle = 35; // Increased title spacing
  const spaceAfterDeclaration = 25;
  const spaceAfterName = 22;
  const spaceAfterMainText = 25;
  const spaceAfterIP = 30;
  const spaceAfterDetails = 30;
  const spaceBeforeSignatures = 40; // More space before signatures
  const lineHeight = 12; // Better line spacing
  
  let yPosition = height - borderY - 40; // Top position with more padding

  // ============================================================
  // DECORATIVE BORDER (Gold with subtle shadow effect)
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
    borderWidth: 6, // Thicker border for prominence
  });

  // Subtle inner line for refinement
  page.drawRectangle({
    x: borderX + 6,
    y: borderY + 6,
    width: borderWidth - 12,
    height: borderHeight - 12,
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
          const logoImage = await pdfDoc.embedPng(logoData);
          const watermarkWidth = 300;
          const watermarkHeight = 300;
          
          // Place watermark in center-bottom area with opacity effect
          page.drawImage(logoImage, {
            x: width / 2 - watermarkWidth / 2,
            y: borderY + 150,
            width: watermarkWidth,
            height: watermarkHeight,
            opacity: 0.1, // Very subtle - 10% opacity
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
  // Logo area with actual UCC logo (60x60 top left)
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        const { data: logoData, error: logoError } = await supabase.storage
          .from("assets")
          .download("ucc_logo.png");

        if (!logoError && logoData) {
          const logoImage = await pdfDoc.embedPng(logoData);
          
          // Draw logo image
          page.drawImage(logoImage, {
            x: margin + 10,
            y: yPosition - 50,
            width: 60,
            height: 60,
          });
        } else {
          // Fallback if logo not found
          page.drawRectangle({
            x: margin + 10,
            y: yPosition - 50,
            width: 60,
            height: 60,
            borderColor: accentColor,
            borderWidth: 1,
            color: lightBoxColor,
          });
          
          page.drawText("UCC", {
            x: margin + 15,
            y: yPosition - 25,
            size: 14,
            color: accentColor,
            font: undefined,
          });
        }
      } catch (logoError) {
        console.warn("Warning: Could not embed logo image:", logoError);
        // Fallback to placeholder
        page.drawRectangle({
          x: margin + 10,
          y: yPosition - 50,
          width: 60,
          height: 60,
          borderColor: accentColor,
          borderWidth: 1,
          color: lightBoxColor,
        });
        
        page.drawText("UCC", {
          x: margin + 15,
          y: yPosition - 25,
          size: 14,
          color: accentColor,
          font: undefined,
        });
      }
    } else {
      // Fallback if no Supabase config
      page.drawRectangle({
        x: margin + 10,
        y: yPosition - 50,
        width: 60,
        height: 60,
        borderColor: accentColor,
        borderWidth: 1,
        color: lightBoxColor,
      });
      
      page.drawText("UCC", {
        x: margin + 15,
        y: yPosition - 25,
        size: 14,
        color: accentColor,
        font: undefined,
      });
    }
  } catch (error) {
    console.warn("Warning: Logo embedding failed:", error);
  }

  // Republic header
  centerText(page, "Republic of the Philippines", 9, yPosition, darkColor);
  yPosition = moveDown(yPosition, 15);

  // University Name - LARGER AND BOLDER
  centerText(page, "UNIVERSITY OF CALOOCAN CITY", 20, yPosition, accentColor);
  yPosition = moveDown(yPosition, 24);

  // IP Office subtitle
  centerText(page, "INTELLECTUAL PROPERTY OFFICE", 12, yPosition, darkColor);
  yPosition = moveDown(yPosition, spaceAfterHeader);

  // ============================================================
  // SECTION 2: CERTIFICATE TITLE BOX - IMPROVED STYLING
  // ============================================================
  const titleBoxY = yPosition - 36;
  const titleBoxHeight = 44;
  
  // Title box background
  page.drawRectangle({
    x: margin + 10,
    y: titleBoxY,
    width: contentWidth - 20,
    height: titleBoxHeight,
    color: lightBgColor,
    borderColor: accentColor,
    borderWidth: 3,
  });

  // Larger, bolder title
  centerText(
    page,
    "CERTIFICATE OF INTELLECTUAL",
    14,
    yPosition - 8,
    accentColor,
    contentWidth - 40
  );
  
  centerText(
    page,
    "PROPERTY REGISTRATION",
    14,
    yPosition - 22,
    accentColor,
    contentWidth - 40
  );
  
  yPosition = moveDown(yPosition, titleBoxHeight + spaceAfterTitle);

  // ============================================================
  // SECTION 3: DECLARATION OPENING
  // ============================================================
  centerText(page, "BE IT KNOWN THAT", 11, yPosition, darkColor);
  yPosition = moveDown(yPosition, spaceAfterDeclaration);

  // ============================================================
  // SECTION 4: RECIPIENT NAME - BOLD AND EMPHASIZED
  // ============================================================
  // Background highlight for name
  page.drawRectangle({
    x: margin + 30,
    y: yPosition - 18,
    width: contentWidth - 60,
    height: 22,
    color: lightBgColor,
  });

  centerText(page, creator.full_name.toUpperCase(), 18, yPosition - 4, accentColor, contentWidth);
  yPosition = moveDown(yPosition, spaceAfterName + 5);

  // Affiliation
  centerText(page, "of the University of Caloocan City", 10, yPosition, darkColor);
  yPosition = moveDown(yPosition, spaceAfterName);

  // ============================================================
  // SECTION 5: MAIN DECLARATION BODY - BETTER SPACING
  // ============================================================
  const declarations = [
    "has duly registered with the Intellectual Property Office",
    "of the University of Caloocan City the following intellectual property",
    "which has been evaluated and approved:",
  ];

  for (const declaration of declarations) {
    centerText(page, declaration, 10, yPosition, darkColor, contentWidth - 50);
    yPosition = moveDown(yPosition, lineHeight);
  }
  
  yPosition = moveDown(yPosition, spaceAfterMainText);

  // ============================================================
  // SECTION 6: IP TITLE - STYLED BOX
  // ============================================================
  const ipTitleBoxY = yPosition - 22;
  const ipTitleBoxHeight = 28;
  
  page.drawRectangle({
    x: margin + 20,
    y: ipTitleBoxY,
    width: contentWidth - 40,
    height: ipTitleBoxHeight,
    color: lightBoxColor,
    borderColor: accentColor,
    borderWidth: 1,
  });

  centerText(page, `"${ipRecord.title}"`, 13, yPosition - 4, accentColor, contentWidth - 60);
  yPosition = moveDown(yPosition, ipTitleBoxHeight + spaceAfterIP);

  // ============================================================
  // SECTION 7: DETAILS TABLE - STYLED INFORMATION BOX
  // ============================================================
  const detailsBoxY = yPosition;
  const detailsPadding = 18;
  const detailsHeight = 65;
  
  // Details background box
  page.drawRectangle({
    x: margin + 10,
    y: detailsBoxY - detailsHeight,
    width: contentWidth - 20,
    height: detailsHeight,
    color: lightBgColor,
    borderColor: accentColor,
    borderWidth: 1,
  });

  const leftColStart = margin + detailsPadding;
  const rightColStart = margin + 290;
  const labelWidth = 70;
  const rowHeight = 15;
  
  // Row 1: Category | Registration Date
  page.drawText("Category:", { x: leftColStart, y: yPosition - 8, size: 9, color: accentColor });
  page.drawText(ipRecord.category.charAt(0).toUpperCase() + ipRecord.category.slice(1), {
    x: leftColStart + labelWidth,
    y: yPosition - 8,
    size: 9,
    color: darkColor,
  });

  page.drawText("Registration Date:", { x: rightColStart, y: yPosition - 8, size: 9, color: accentColor });
  page.drawText(formatDate(ipRecord.created_at), {
    x: rightColStart + 120,
    y: yPosition - 8,
    size: 9,
    color: darkColor,
  });

  // Row 2: Status | Tracking ID
  page.drawText("Status:", { x: leftColStart, y: yPosition - 25, size: 9, color: accentColor });
  page.drawText("APPROVED", {
    x: leftColStart + labelWidth,
    y: yPosition - 25,
    size: 9,
    color: greenColor,
  });

  page.drawText("Tracking ID:", { x: rightColStart, y: yPosition - 25, size: 9, color: accentColor });
  page.drawText(trackingId, {
    x: rightColStart + 120,
    y: yPosition - 25,
    size: 9,
    color: darkColor,
  });

  // Row 3: Evaluation Score | Co-Creators
  page.drawText("Evaluation Score:", { x: leftColStart, y: yPosition - 42, size: 9, color: accentColor });
  page.drawText(`${evaluation?.total_score || 0}/50`, {
    x: leftColStart + labelWidth,
    y: yPosition - 42,
    size: 9,
    color: darkColor,
  });

  if (coCreators && coCreators.length > 0) {
    const coCreatorText = coCreators.map((c) => c.name).join(", ");
    page.drawText("Co-Creators:", { x: rightColStart, y: yPosition - 42, size: 9, color: accentColor });
    page.drawText(coCreatorText, {
      x: rightColStart + 120,
      y: yPosition - 42,
      size: 8,
      color: darkColor,
      maxWidth: 160,
    });
  }
  
  yPosition = moveDown(yPosition, detailsHeight + spaceAfterDetails);

  // ============================================================
  // SECTION 8: DECORATIVE SEPARATOR - ENHANCED
  // ============================================================
  page.drawRectangle({
    x: margin + 50,
    y: yPosition,
    width: contentWidth - 100,
    height: 2,
    color: accentColor,
  });
  
  yPosition = moveDown(yPosition, 22);

  // ============================================================
  // SECTION 9: LEGAL STATEMENT
  // ============================================================
  const legalLines = [
    "This certificate confirms the official registration of this intellectual property with the",
    "University of Caloocan City Intellectual Property Office. All rights and protections afforded",
    "by University Policy apply from the date of registration.",
  ];

  for (const line of legalLines) {
    centerText(page, line, 8, yPosition, darkColor, contentWidth - 50);
    yPosition = moveDown(yPosition, 11);
  }
  
  yPosition = moveDown(yPosition, 16);

  // ============================================================
  // SECTION 10: WITNESS CLAUSE - IMPROVED
  // ============================================================
  const currentDate = new Date();
  const dayOrdinal = getOrdinalDay(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  centerText(
    page,
    `IN WITNESS WHEREOF, this certificate has been duly executed on this ${dayOrdinal} day of ${monthYear}.`,
    9,
    yPosition,
    darkColor,
    contentWidth - 50
  );
  
  yPosition = moveDown(yPosition, spaceBeforeSignatures);

  // ============================================================
  // SECTION 11: ENHANCED SIGNATURE BLOCK
  // ============================================================
  const sigBlockY = yPosition;
  const lineLength = 130;
  const lineThickness = 1.5;
  
  const sig1X = margin + 15;
  const sig2X = width / 2 - lineLength / 2;
  const sig3X = margin + contentWidth - lineLength - 15;

  // Draw signature lines - thicker and more prominent
  page.drawLine({
    start: { x: sig1X, y: sigBlockY },
    end: { x: sig1X + lineLength, y: sigBlockY },
    thickness: lineThickness,
    color: darkColor,
  });

  page.drawLine({
    start: { x: sig2X, y: sigBlockY },
    end: { x: sig2X + lineLength, y: sigBlockY },
    thickness: lineThickness,
    color: darkColor,
  });

  page.drawLine({
    start: { x: sig3X, y: sigBlockY },
    end: { x: sig3X + lineLength, y: sigBlockY },
    thickness: lineThickness,
    color: darkColor,
  });

  yPosition = moveDown(yPosition, 22);

  // Signature titles - bold
  page.drawText("Director", { x: sig1X + 40, y: yPosition, size: 9, color: darkColor });
  page.drawText("Dean", { x: sig2X + 55, y: yPosition, size: 9, color: darkColor });
  page.drawText("President", { x: sig3X + 30, y: yPosition, size: 9, color: darkColor });

  yPosition = moveDown(yPosition, 12);

  // Department names
  page.drawText("IP Office", { x: sig1X + 20, y: yPosition, size: 7, color: darkColor });
  page.drawText("College of Computer Studies", { x: sig2X - 8, y: yPosition, size: 7, color: darkColor });
  page.drawText("Office of the President", { x: sig3X + 25, y: yPosition, size: 7, color: darkColor });

  yPosition = moveDown(yPosition, 11);

  // Institution
  page.drawText("UCC", { x: sig1X + 42, y: yPosition, size: 7, color: darkColor });
  page.drawText("UCC", { x: sig2X + 57, y: yPosition, size: 7, color: darkColor });
  page.drawText("UCC", { x: sig3X + 55, y: yPosition, size: 7, color: darkColor });

  yPosition = moveDown(yPosition, 25);

  // ============================================================
  // SECTION 12: QR CODE FOR VERIFICATION
  // ============================================================
  try {
    // Create verification URL with tracking ID
    const verificationUrl = `https://ucc-ipo.com/verify/${trackingId}`;
    const qrCodeDataUrl = await generateQRCodeImage(verificationUrl);
    
    // Embed QR code on bottom right
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
    const qrSize = 70;
    const qrX = width - margin - qrSize - 20;
    const qrY = margin + 20;
    
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // QR code label
    page.drawText("Verify Certificate", {
      x: qrX - 10,
      y: qrY - 12,
      size: 7,
      color: accentColor,
    });
  } catch (error) {
    console.warn("Warning: Could not embed QR code:", error);
  }

  // ============================================================
  // SECTION 13: ENHANCED FOOTER WITH VERIFICATION LINK
  // ============================================================
  page.drawRectangle({
    x: margin,
    y: yPosition,
    width: contentWidth,
    height: 2,
    color: accentColor,
  });
  
  yPosition = moveDown(yPosition, 16);

  // Verification information
  page.drawText(
    `Verify at: ucc-ipo.com/verify/${trackingId}`,
    {
      x: margin,
      y: yPosition,
      size: 8,
      color: accentColor,
    }
  );

  yPosition = moveDown(yPosition, 10);

  // Footer metadata
  page.drawText(
    `Certificate #: ${trackingId} | Issued: ${formatDate(new Date().toISOString())}`,
    {
      x: margin,
      y: yPosition,
      size: 7,
      color: rgb(0.65, 0.65, 0.65),
    }
  );

  yPosition = moveDown(yPosition, 8);

  page.drawText(
    `Caloocan City, Philippines | UCC Intellectual Property Office`,
    {
      x: margin,
      y: yPosition,
      size: 7,
      color: rgb(0.65, 0.65, 0.65),
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
