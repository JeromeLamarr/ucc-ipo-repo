import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, PDFPage, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentRequest {
  record_id: string;
}

const COLOR_DARK = rgb(31 / 255, 41 / 255, 55 / 255); // gray-900
const COLOR_GRAY = rgb(107 / 255, 114 / 255, 128 / 255); // gray-600
const COLOR_LIGHT_GRAY = rgb(243 / 255, 244 / 255, 246 / 255); // gray-100
const COLOR_BLUE = rgb(37 / 255, 99 / 255, 235 / 255); // blue-600

function getPageHeight(page: PDFPage): number {
  const { height } = page.getSize();
  return height;
}

function addNewPageIfNeeded(
  doc: PDFDocument,
  currentY: number,
  threshold: number = 100
): { page: PDFPage; y: number } {
  const pageHeight = getPageHeight(doc.getPage(doc.getPageCount() - 1));
  if (currentY < threshold) {
    const newPage = doc.addPage([595, 842]); // A4
    return { page: newPage, y: 780 };
  }
  return { page: doc.getPage(doc.getPageCount() - 1), y: currentY };
}

function drawHeading(page: PDFPage, text: string, x: number, y: number, fontSize: number = 14) {
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    color: COLOR_DARK,
    font: undefined,
  });
  return y - fontSize - 8;
}

function drawLabel(page: PDFPage, label: string, x: number, y: number, fontSize: number = 10) {
  page.drawText(label, {
    x,
    y,
    size: fontSize,
    color: COLOR_GRAY,
    font: undefined,
  });
  return y - fontSize - 4;
}

function drawValue(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  maxWidth: number = 500,
  fontSize: number = 10
) {
  const lines = splitTextToLines(value, maxWidth, fontSize);
  let currentY = y;
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      color: COLOR_DARK,
      maxWidth,
    });
    currentY -= fontSize + 3;
  }
  return currentY - 4;
}

function splitTextToLines(text: string, maxWidth: number, fontSize: number): string[] {
  if (!text || typeof text !== "string") return ["—"];
  const charWidth = fontSize * 0.5; // Approximate character width
  const charsPerLine = Math.floor(maxWidth / charWidth);
  const lines: string[] = [];
  let currentText = text;

  while (currentText.length > 0) {
    if (currentText.length <= charsPerLine) {
      lines.push(currentText);
      break;
    }
    let splitIndex = charsPerLine;
    const lastSpace = currentText.lastIndexOf(" ", charsPerLine);
    if (lastSpace > 0) {
      splitIndex = lastSpace;
    }
    lines.push(currentText.substring(0, splitIndex).trim());
    currentText = currentText.substring(splitIndex).trim();
  }
  return lines;
}

function renderField(val: any): string {
  if (val === undefined || val === null || val === "" || val === 0) {
    return "—";
  }
  if (Array.isArray(val)) {
    return val.length === 0 ? "—" : val.join(", ");
  }
  return String(val);
}

async function generateDocumentationPDF(
  record: any,
  details: any
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 (210mm x 297mm)
  let y = 750;
  const margin = 40;
  const contentWidth = 515;

  // Title
  y = drawHeading(page, "UCC IPO — Full Record Documentation", margin, y, 16);
  y -= 12;

  // Header Info Section
  y = drawHeading(page, "Header Information", margin, y, 12);
  y -= 8;

  const headerFields = [
    { label: "Tracking Number", value: renderField(record.reference_number) },
    { label: "Record ID", value: record.id },
    { label: "Status", value: renderField(record.status) },
    { label: "Current Stage", value: renderField(record.current_stage) },
    { label: "Created", value: new Date(record.created_at).toLocaleString() },
  ];

  for (const field of headerFields) {
    let result = addNewPageIfNeeded(pdfDoc, y, 100);
    page = result.page;
    y = result.y;

    y = drawLabel(page, field.label, margin, y);
    y = drawValue(page, field.value, margin + 10, y, contentWidth - 10);
  }

  y -= 8;

  // Applicant Section
  if (record.applicant) {
    let result = addNewPageIfNeeded(pdfDoc, y, 120);
    page = result.page;
    y = result.y;

    y = drawHeading(page, "Applicant Information", margin, y, 12);
    y -= 8;

    const applicantFields = [
      { label: "Name", value: renderField(record.applicant.full_name) },
      { label: "Email", value: renderField(record.applicant.email) },
      { label: "Department", value: renderField(record.applicant.department_id) },
    ];

    for (const field of applicantFields) {
      let result = addNewPageIfNeeded(pdfDoc, y, 100);
      page = result.page;
      y = result.y;

      y = drawLabel(page, field.label, margin, y);
      y = drawValue(page, field.value, margin + 10, y, contentWidth - 10);
    }
    y -= 8;
  }

  // Record Overview Section
  if (details) {
    let result = addNewPageIfNeeded(pdfDoc, y, 150);
    page = result.page;
    y = result.y;

    y = drawHeading(page, "Record Overview", margin, y, 12);
    y -= 8;

    const overviewFields = [
      { label: "Title", value: renderField(record.title) },
      { label: "Category", value: renderField(record.category) },
      { label: "Description", value: renderField(details.description) },
    ];

    for (const field of overviewFields) {
      let result = addNewPageIfNeeded(pdfDoc, y, 100);
      page = result.page;
      y = result.y;

      y = drawLabel(page, field.label, margin, y);
      y = drawValue(page, field.value, margin + 10, y, contentWidth - 10);
    }
    y -= 8;
  }

  // Technical Narrative Section
  if (details && details.technicalNarrative) {
    let result = addNewPageIfNeeded(pdfDoc, y, 150);
    page = result.page;
    y = result.y;

    y = drawHeading(page, "Technical Narrative", margin, y, 12);
    y -= 8;
    y = drawValue(page, renderField(details.technicalNarrative), margin + 10, y, contentWidth - 10);
    y -= 12;
  }

  // Inventors / Collaborators / Co-Creators
  if (details) {
    const sections = [
      { title: "Inventors", data: details.inventors },
      { title: "Collaborators", data: details.collaborators },
      { title: "Co-Creators", data: details.coCreators },
    ];

    for (const section of sections) {
      if (section.data && Array.isArray(section.data) && section.data.length > 0) {
        let result = addNewPageIfNeeded(pdfDoc, y, 150);
        page = result.page;
        y = result.y;

        y = drawHeading(page, section.title, margin, y, 12);
        y -= 8;

        for (const item of section.data) {
          let result = addNewPageIfNeeded(pdfDoc, y, 80);
          page = result.page;
          y = result.y;

          y = drawLabel(page, "Name", margin + 10, y, 9);
          y = drawValue(page, renderField(item.name), margin + 20, y, contentWidth - 20, 9);

          y = drawLabel(page, "Affiliation", margin + 10, y, 9);
          y = drawValue(page, renderField(item.affiliation), margin + 20, y, contentWidth - 20, 9);

          y = drawLabel(page, "Email", margin + 10, y, 9);
          y = drawValue(page, renderField(item.email), margin + 20, y, contentWidth - 20, 9);
          y -= 4;
        }
        y -= 4;
      }
    }
  }

  // Prior Art / Keywords / Publications
  if (details) {
    let result = addNewPageIfNeeded(pdfDoc, y, 120);
    page = result.page;
    y = result.y;

    y = drawHeading(page, "Prior Art / Keywords / Publications", margin, y, 12);
    y -= 8;

    const priorFields = [
      { label: "Prior Art", value: renderField(details.priorArt) },
      { label: "Keywords", value: renderField(details.keywords) },
      { label: "Related Publications", value: renderField(details.relatedPublications) },
    ];

    for (const field of priorFields) {
      let result = addNewPageIfNeeded(pdfDoc, y, 100);
      page = result.page;
      y = result.y;

      y = drawLabel(page, field.label, margin, y);
      y = drawValue(page, field.value, margin + 10, y, contentWidth - 10);
    }
    y -= 8;
  }

  // Commercial Information
  if (details) {
    let result = addNewPageIfNeeded(pdfDoc, y, 150);
    page = result.page;
    y = result.y;

    y = drawHeading(page, "Commercial Information", margin, y, 12);
    y -= 8;

    const commercialFields = [
      { label: "Commercial Potential", value: renderField(details.commercialPotential) },
      { label: "Target Market", value: renderField(details.targetMarket) },
      {
        label: "Competitive Advantage",
        value: renderField(details.competitiveAdvantage),
      },
      { label: "Estimated Value", value: renderField(details.estimatedValue) },
      { label: "Funding", value: renderField(details.funding) },
    ];

    for (const field of commercialFields) {
      let result = addNewPageIfNeeded(pdfDoc, y, 100);
      page = result.page;
      y = result.y;

      y = drawLabel(page, field.label, margin, y);
      y = drawValue(page, field.value, margin + 10, y, contentWidth - 10);
    }
  }

  // Footer on last page
  page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  let finalY = 30;
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: margin,
    y: finalY,
    size: 8,
    color: COLOR_GRAY,
  });

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
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
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json() as DocumentRequest;
    const { record_id } = body;

    if (!record_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing record_id",
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

    // Fetch IP record with related data
    console.log("[generate-full-record-documentation-pdf] Fetching record", {
      recordId: record_id,
    });

    const { data: recordData, error: recordError } = await supabase
      .from("ip_records")
      .select(
        `
        id,
        reference_number,
        title,
        category,
        status,
        current_stage,
        created_at,
        details,
        applicant_id
      `
      )
      .eq("id", record_id)
      .single();

    if (recordError) {
      console.error("[generate-full-record-documentation-pdf] Record fetch error", {
        error: recordError.message,
        code: recordError.code,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Record fetch failed: ${recordError.message}`,
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

    if (!recordData) {
      console.error("[generate-full-record-documentation-pdf] Record not found", {
        recordId: record_id,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Record not found",
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

    // Build record with minimal applicant info (just use applicant_id, don't fetch separately)
    const recordWithApplicant = {
      ...recordData,
      applicant: recordData.applicant_id ? { id: recordData.applicant_id } : null,
    };

    console.log("[generate-full-record-documentation-pdf] Generating PDF for record", {
      recordId: record_id,
      referenceNumber: recordWithApplicant.reference_number,
    });

    // Generate PDF
    const pdfBuffer = await generateDocumentationPDF(recordWithApplicant, recordWithApplicant.details || {});

    // Upload to Supabase Storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const fileName = `UCC_IPO_Full_Record_${recordWithApplicant.reference_number || recordWithApplicant.id}.pdf`;
    const filePath = `full-record-docs/${year}/${month}/${fileName}`;

    console.log("[generate-full-record-documentation-pdf] Uploading PDF to storage", {
      filePath,
      fileSize: pdfBuffer.length,
      bucket: "certificates",
    });

    // Use "certificates" bucket (proven to work in certificate generator)
    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-full-record-documentation-pdf] Storage upload error", {
        filePath,
        bucket: "certificates",
        errorMessage: uploadError.message,
        errorStatus: (uploadError as any).status,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Storage upload failed: ${uploadError.message}`,
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

    // Get signed URL from certificates bucket
    const { data: urlData, error: urlError } = await supabase.storage
      .from("certificates")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError || !urlData) {
      console.error(
        "[generate-full-record-documentation-pdf] Failed to create signed URL",
        {
          error: urlError?.message,
        }
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create download link: ${urlError?.message || "Unknown error"}`,
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

    console.log("[generate-full-record-documentation-pdf] PDF generation successful", {
      filePath,
      url: urlData.signedUrl.substring(0, 50) + "...",
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.signedUrl,
        filePath,
        fileName,
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
    console.error("[generate-full-record-documentation-pdf] Error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate PDF",
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
