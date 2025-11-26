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

// Generate QR Code as PNG bytes
async function generateQRCodeImage(text: string): Promise<Uint8Array> {
  try {
    const canvas = await QRCode.toCanvas(text, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 200,
    });
    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer?.();
    if (!pngBuffer) {
      throw new Error("Failed to convert QR code to buffer");
    }
    return new Uint8Array(pngBuffer);
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

// Generate certificate PDF (simplified without images for first version)
async function generateCertificatePDF(
  ipRecord: IPRecord,
  creator: UserData,
  coCreators: Array<{ name: string; role: string }>,
  evaluation: { total_score: number; recommendation: string } | null,
  trackingId: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size

  const { width, height } = page.getSize();
  const margin = 15;
  const contentWidth = width - 2 * margin;

  // Draw borders
  page.drawRectangle({
    x: margin,
    y: margin,
    width: contentWidth,
    height: height - 2 * margin,
    borderColor: rgb(0, 0, 0),
    borderWidth: 3,
  });

  page.drawRectangle({
    x: margin + 8,
    y: margin + 8,
    width: contentWidth - 16,
    height: height - 2 * margin - 16,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });

  let yPosition = height - 60;

  // Helper function to draw centered text
  const drawCenteredText = (text: string, size: number, bold = false) => {
    const font = bold ? "Helvetica-Bold" : "Helvetica";
    page.drawText(text, {
      x: width / 2,
      y: yPosition,
      size,
      align: "center",
      maxWidth: contentWidth - 40,
    });
    yPosition -= size + 8;
  };

  // Header
  drawCenteredText("Republic of the Philippines", 10);
  drawCenteredText("UNIVERSITY OF CALOOCAN CITY", 16, true);
  drawCenteredText("INTELLECTUAL PROPERTY OFFICE", 12, true);
  yPosition -= 10;

  // Title box
  page.drawRectangle({
    x: margin + 50,
    y: yPosition - 20,
    width: contentWidth - 100,
    height: 25,
    borderColor: rgb(0, 0, 0),
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  });

  page.drawText("Certificate of Intellectual Property Registration", {
    x: width / 2,
    y: yPosition - 8,
    size: 11,
    align: "center",
    maxWidth: contentWidth - 100,
  });
  yPosition -= 40;

  // Content
  drawCenteredText("BE IT KNOWN THAT", 10, true);
  yPosition -= 5;
  drawCenteredText(creator.full_name.toUpperCase(), 14, true);
  drawCenteredText("University of Caloocan City", 10);

  const declarationText =
    "has duly registered with the Intellectual Property Office of the University of Caloocan City\nthe following intellectual property which has been evaluated and approved:";
  page.drawText(declarationText, {
    x: margin + 40,
    y: yPosition,
    size: 9,
    align: "center",
    maxWidth: contentWidth - 80,
  });
  yPosition -= 28;

  // IP Title
  page.drawText(`"${ipRecord.title}"`, {
    x: width / 2,
    y: yPosition,
    size: 13,
    align: "center",
    maxWidth: contentWidth - 40,
  });
  yPosition -= 22;

  // Details table
  const detailsX = margin + 50;
  page.drawText(
    `Category: ${ipRecord.category.charAt(0).toUpperCase() + ipRecord.category.slice(1)}`,
    {
      x: detailsX,
      y: yPosition,
      size: 9,
    }
  );
  page.drawText(`Registration Date: ${formatDate(ipRecord.created_at)}`, {
    x: detailsX + 250,
    y: yPosition,
    size: 9,
  });
  yPosition -= 12;

  page.drawText("Status: Approved", {
    x: detailsX,
    y: yPosition,
    size: 9,
  });
  page.drawText(`Tracking ID: ${trackingId}`, {
    x: detailsX + 250,
    y: yPosition,
    size: 9,
  });
  yPosition -= 12;

  if (coCreators && coCreators.length > 0) {
    const coCreatorNames = coCreators.map((c) => c.name).join(", ");
    page.drawText(`Co-Creators: ${coCreatorNames}`, {
      x: detailsX,
      y: yPosition,
      size: 9,
      maxWidth: contentWidth - 100,
    });
    yPosition -= 12;
  }

  page.drawText(
    `Evaluation Score: ${evaluation?.total_score || 0}/50`,
    {
      x: detailsX,
      y: yPosition,
      size: 9,
    }
  );
  yPosition -= 20;

  // Legal text
  const legalText =
    "This certificate confirms the official registration of this intellectual property with the University of Caloocan City\nIntellectual Property Office. All rights and protections afforded by the University's IP Policy apply from the date of registration.";
  page.drawText(legalText, {
    x: margin + 40,
    y: yPosition,
    size: 8,
    align: "center",
    maxWidth: contentWidth - 80,
  });
  yPosition -= 28;

  // Witness
  const currentDate = new Date();
  const dayOrdinal = getOrdinalDay(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const witnessText = `IN WITNESS WHEREOF, this certificate has been duly signed and sealed by the authorized representatives\nof the University of Caloocan City on this ${dayOrdinal} day of ${monthYear}.`;

  page.drawText(witnessText, {
    x: margin + 40,
    y: yPosition,
    size: 8,
    align: "center",
    maxWidth: contentWidth - 80,
  });
  yPosition -= 28;

  // Signature blocks
  const signatureY = yPosition;
  const signatureLineWidth = 120;

  // Director
  page.drawLine({
    start: { x: margin + 30, y: signatureY - 35 },
    end: { x: margin + 30 + signatureLineWidth, y: signatureY - 35 },
    thickness: 1,
  });
  page.drawText("Director", {
    x: margin + 30,
    y: signatureY - 40,
    size: 9,
  });
  page.drawText("INTELLECTUAL PROPERTY OFFICE", {
    x: margin + 30,
    y: signatureY - 50,
    size: 7,
  });
  page.drawText("University of Caloocan City", {
    x: margin + 30,
    y: signatureY - 59,
    size: 7,
  });

  // Dean
  const deanX = width / 2 - 70;
  page.drawLine({
    start: { x: deanX, y: signatureY - 35 },
    end: { x: deanX + signatureLineWidth, y: signatureY - 35 },
    thickness: 1,
  });
  page.drawText("Dean", {
    x: deanX,
    y: signatureY - 40,
    size: 9,
  });
  page.drawText("COLLEGE OF COMPUTER STUDIES", {
    x: deanX,
    y: signatureY - 50,
    size: 7,
  });
  page.drawText("University of Caloocan City", {
    x: deanX,
    y: signatureY - 59,
    size: 7,
  });

  // President
  const presX = width - 30 - signatureLineWidth - 30;
  page.drawLine({
    start: { x: presX, y: signatureY - 35 },
    end: { x: presX + signatureLineWidth, y: signatureY - 35 },
    thickness: 1,
  });
  page.drawText("President", {
    x: presX,
    y: signatureY - 40,
    size: 9,
  });
  page.drawText("UNIVERSITY OF CALOOCAN CITY", {
    x: presX,
    y: signatureY - 50,
    size: 7,
  });
  page.drawText("Office of the President", {
    x: presX,
    y: signatureY - 59,
    size: 7,
  });

  // Bottom registration details
  const bottomY = margin + 20;
  page.drawText(
    `Registration No: ${trackingId} | Issued on: ${formatDate(
      new Date().toISOString()
    )} | At: Caloocan City, Philippines`,
    {
      x: margin + 20,
      y: bottomY,
      size: 7,
    }
  );

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
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload certificate: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("certificates")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update previous certificates to not latest
    await supabase
      .from("ip_generated_files")
      .update({ is_latest: false })
      .eq("record_id", record_id)
      .eq("file_type", "certificate");

    // Insert new certificate record
    const { error: insertError } = await supabase
      .from("ip_generated_files")
      .insert({
        record_id,
        file_type: "certificate",
        file_path: filePath,
        original_name: `Certificate_${trackingId}.pdf`,
        mime_type: "application/pdf",
        file_size: pdfBuffer.length,
        generated_by: user_id,
        is_latest: true,
        checksum,
      });

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
