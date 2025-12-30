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

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate input payload
function validateRequest(payload: any): { valid: boolean; error?: string } {
  if (typeof payload.record_id !== 'number' && typeof payload.record_id !== 'string') {
    return { valid: false, error: 'record_id must be a string or number' };
  }

  if (typeof payload.record_id === 'string') {
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
function centerText(page: any, text: string, size: number, y: number, color: ReturnType<typeof rgb> = rgb(0, 0, 0)): void {
  page.drawText(text, {
    x: page.getWidth() / 2,
    y,
    size,
    color,
    align: "center",
  });
}

// Generate legacy certificate PDF
async function generateCertificatePDF(
  record: LegacyIPRecord,
  creator: UserData,
  trackingId: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size

  const { width, height } = page.getSize();
  const margin = 40;
  const innerPadding = 20;
  const borderX = margin - innerPadding;
  const borderY = innerPadding + 15;
  const borderWidth = width - 2 * borderX;
  const borderHeight = height - 2 * borderY;
  
  const goldColor = rgb(0.78, 0.58, 0.05);
  const accentColor = rgb(0.08, 0.32, 0.65);
  const darkColor = rgb(0.1, 0.1, 0.1);
  const shadowColor = rgb(0.88, 0.88, 0.88);
  
  let yPosition = height - 70;

  // Shadow effect
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
    color: rgb(1, 1, 1),
    borderColor: goldColor,
    borderWidth: 5,
  });

  // Inner line
  page.drawRectangle({
    x: borderX + 5,
    y: borderY + 5,
    width: borderWidth - 10,
    height: borderHeight - 10,
    borderColor: accentColor,
    borderWidth: 1,
  });

  // Header
  yPosition -= 30;
  centerText(page, "University Confidential Consortium", 11, yPosition, darkColor);
  yPosition -= 20;
  centerText(page, "IP CERTIFICATE OF RECORD", 14, yPosition, darkColor);
  yPosition -= 25;
  centerText(page, "LEGACY RECORD", 10, yPosition, goldColor);
  yPosition -= 40;

  // Certificate content
  page.drawText("This is to certify that the following Intellectual Property has been", {
    x: margin,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 18;
  page.drawText("recorded and archived in the University system:", {
    x: margin,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 35;

  // Title
  page.drawText("Title of IP:", {
    x: margin,
    y: yPosition,
    size: 10,
    color: accentColor,
  });
  yPosition -= 15;
  page.drawText(record.title, {
    x: margin + 20,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 25;

  // Category
  page.drawText("Category:", {
    x: margin,
    y: yPosition,
    size: 10,
    color: accentColor,
  });
  yPosition -= 15;
  page.drawText((record.category || 'N/A').toUpperCase(), {
    x: margin + 20,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 25;

  // Creator
  page.drawText("Creator / Applicant:", {
    x: margin,
    y: yPosition,
    size: 10,
    color: accentColor,
  });
  yPosition -= 15;
  page.drawText(record.details?.creator_name || 'Unknown', {
    x: margin + 20,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 35;

  // Tracking ID and dates
  page.drawText("Tracking ID: " + trackingId, {
    x: margin,
    y: yPosition,
    size: 10,
    color: darkColor,
  });
  yPosition -= 18;
  page.drawText("Date Recorded: " + formatDate(record.created_at), {
    x: margin,
    y: yPosition,
    size: 10,
    color: darkColor,
  });
  yPosition -= 18;
  page.drawText("Issued: " + formatDate(new Date().toISOString()), {
    x: margin,
    y: yPosition,
    size: 10,
    color: darkColor,
  });
  yPosition -= 40;

  // Signature line
  yPosition -= 20;
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: margin + 150, y: yPosition },
    thickness: 1,
    color: darkColor,
  });
  page.drawText("University Representative", {
    x: margin,
    y: yPosition - 20,
    size: 9,
    color: darkColor,
  });

  // Footer
  page.drawText("This certificate confirms the archival of intellectual property records.", {
    x: margin,
    y: 50,
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(`Certificate #${trackingId} | Generated: ${new Date().toLocaleDateString()}`, {
    x: margin,
    y: 35,
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
  });

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

    // Parse request body
    let requestData: LegacyCertificateRequest;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error('[generate-certificate-legacy] JSON parse error:', String(e));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body. Please provide valid JSON.",
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
    const validation = validateRequest(requestData);
    if (!validation.valid) {
      console.error('[generate-certificate-legacy] Validation failed:', validation.error);
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
      ? requestData.record_id
      : String(requestData.record_id);
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
    const pdfBuffer = await generateCertificatePDF(record, creator, trackingId);
    const checksum = await generateChecksum(pdfBuffer);

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

    // Convert PDF to base64 for download
    const base64Pdf = btoa(String.fromCharCode.apply(null, Array.from(pdfBuffer)));

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
