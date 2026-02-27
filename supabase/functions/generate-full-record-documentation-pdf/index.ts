import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { chromium } from "npm:playwright@latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentRequest {
  record_id: string;
}

// HTML template generator with the same styling as frontend
function generateHTMLContent(record: any, details: any, adminEmail?: string): string {
  const renderField = (val: any): string => {
    if (val === undefined || val === null || val === "" || val === 0) {
      return "—";
    }
    if (Array.isArray(val)) {
      return val.length === 0 ? "—" : val.join(", ");
    }
    return String(val);
  };

  const tableHTML = (rows: any[]): string => {
    return rows
      .map(
        (row) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${renderField(row.name)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${renderField(row.affiliation)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${renderField(row.email)}</td>
      </tr>
    `
      )
      .join("");
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>UCC IPO — Full Record Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1f2937;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    h2 {
      color: #1f2937;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }
    h3 {
      color: #1f2937;
      font-size: 16px;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    .section {
      margin-bottom: 30px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 10px;
      background-color: #f3f4f6;
      border-radius: 4px;
    }
    .info-item label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      display: block;
      margin-bottom: 5px;
    }
    .info-item value {
      color: #1f2937;
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    pre {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
    .empty {
      color: #9ca3af;
      font-style: italic;
    }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    @page {
      size: A4;
      margin: 16mm;
    }
    @media print {
      body {
        padding: 0;
        background-color: white;
      }
      .container {
        box-shadow: none;
        padding: 0;
        background-color: white;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>UCC IPO — Full Record Documentation</h1>
    
    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <label>Tracking Number</label>
          <value>${renderField(record.reference_number)}</value>
        </div>
        <div class="info-item">
          <label>Record ID</label>
          <value style="font-family: monospace;">${record.id}</value>
        </div>
        <div class="info-item">
          <label>Status</label>
          <value>${record.status}</value>
        </div>
        <div class="info-item">
          <label>Current Stage</label>
          <value>${record.current_stage}</value>
        </div>
        <div class="info-item">
          <label>Created</label>
          <value>${new Date(record.created_at).toLocaleString()}</value>
        </div>
        <div class="info-item">
          <label>Updated</label>
          <value>${new Date(record.updated_at).toLocaleString()}</value>
        </div>
      </div>
    </div>

    <h2>Applicant Information</h2>
    <div class="section">
      ${
        record.applicant
          ? `
        <div class="info-grid">
          <div class="info-item">
            <label>Name</label>
            <value>${renderField(record.applicant.full_name)}</value>
          </div>
          <div class="info-item">
            <label>Email</label>
            <value>${renderField(record.applicant.email)}</value>
          </div>
          <div class="info-item">
            <label>Department ID</label>
            <value>${renderField(record.applicant.department_id)}</value>
          </div>
        </div>
      `
          : '<p class="empty">Applicant data not available</p>'
      }
    </div>

    ${
      record.supervisor || record.evaluator
        ? `
    <h2>Assigned Reviewers</h2>
    <div class="section">
      <div class="info-grid">
        ${
          record.supervisor
            ? `
        <div class="info-item" style="background-color: #dbeafe;">
          <label>Supervisor</label>
          <value>${record.supervisor.full_name}</value>
          <value style="font-size: 12px; color: #6b7280;">${record.supervisor.email}</value>
        </div>
        `
            : ''
        }
        ${
          record.evaluator
            ? `
        <div class="info-item" style="background-color: #dcfce7;">
          <label>Evaluator</label>
          <value>${record.evaluator.full_name}</value>
          <value style="font-size: 12px; color: #6b7280;">${record.evaluator.email}</value>
        </div>
        `
            : ''
        }
      </div>
    </div>
    `
        : ''
    }

    <h2>Record Overview</h2>
    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <label>Title</label>
          <value>${renderField(record.title)}</value>
        </div>
        <div class="info-item">
          <label>Category</label>
          <value>${renderField(record.category)}</value>
        </div>
      </div>
      <div class="info-item">
        <label>Abstract</label>
        <value style="white-space: pre-wrap;">${renderField(record.abstract)}</value>
      </div>
    </div>

    <h2>Technical Narrative</h2>
    <div class="section">
      ${[
        { key: 'description', label: 'Description' },
        { key: 'technicalField', label: 'Technical Field' },
        { key: 'backgroundArt', label: 'Background Art' },
        { key: 'problemStatement', label: 'Problem Statement' },
        { key: 'solution', label: 'Solution' },
        { key: 'advantages', label: 'Advantages' },
        { key: 'implementation', label: 'Implementation' },
      ]
        .map(
          (field) => `
        <div class="info-item">
          <label>${field.label}</label>
          <value style="white-space: pre-wrap;">${renderField(details[field.key])}</value>
        </div>
      `
        )
        .join('')}
    </div>

    <h2>Inventors / Collaborators / Co-Creators</h2>
    <div class="section">
      <h3>Inventors</h3>
      ${
        (details.inventors || []).length === 0
          ? '<p class="empty">—</p>'
          : `
        <table>
          <thead><tr><th>Name</th><th>Affiliation</th><th>Email</th></tr></thead>
          <tbody>${tableHTML(details.inventors || [])}</tbody>
        </table>
      `
      }

      <h3>Collaborators</h3>
      ${
        (details.collaborators || []).length === 0
          ? '<p class="empty">—</p>'
          : `
        <table>
          <thead><tr><th>Name</th><th>Affiliation</th><th>Email</th></tr></thead>
          <tbody>${tableHTML(details.collaborators || [])}</tbody>
        </table>
      `
      }

      <h3>Co-Creators</h3>
      ${
        (details.coCreators || []).length === 0
          ? '<p class="empty">—</p>'
          : `
        <table>
          <thead><tr><th>Name</th><th>Affiliation</th><th>Email</th></tr></thead>
          <tbody>${tableHTML(details.coCreators || [])}</tbody>
        </table>
      `
      }
    </div>

    <h2>Prior Art / Keywords / Publications</h2>
    <div class="section">
      <div class="info-item">
        <label>Prior Art</label>
        <value style="white-space: pre-wrap;">${renderField(details.priorArt)}</value>
      </div>
      <div class="info-item">
        <label>Keywords</label>
        <value>${(details.keywords || []).length === 0 ? '—' : (details.keywords || []).join(', ')}</value>
      </div>
      <div class="info-item">
        <label>Related Publications</label>
        <value style="white-space: pre-wrap;">${renderField(details.relatedPublications)}</value>
      </div>
    </div>

    <h2>Commercial Information</h2>
    <div class="section">
      ${[
        { key: 'commercialPotential', label: 'Commercial Potential' },
        { key: 'targetMarket', label: 'Target Market' },
        { key: 'competitiveAdvantage', label: 'Competitive Advantage' },
        { key: 'estimatedValue', label: 'Estimated Value' },
        { key: 'funding', label: 'Funding' },
      ]
        .map(
          (field) => `
        <div class="info-item">
          <label>${field.label}</label>
          <value style="white-space: pre-wrap;">${renderField(details[field.key])}</value>
        </div>
      `
        )
        .join('')}
    </div>

    ${
      details.evaluationScore
        ? `
    <h2>Evaluation</h2>
    <div class="section">
      <pre>${JSON.stringify(details.evaluationScore, null, 2)}</pre>
    </div>
    `
        : ''
    }

    <footer>
      <p>Generated: ${new Date().toLocaleString()}</p>
      ${adminEmail ? `<p>Admin: ${adminEmail}</p>` : ''}
    </footer>
  </div>
</body>
</html>
  `;
}

async function generatePDFFromHTML(htmlContent: string): Promise<Buffer> {
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    // Set HTML content
    await page.setContent(htmlContent, { waitUntil: "networkidle" });

    // Emulate print media for proper CSS rendering
    await page.emulateMedia({ media: "print" });

    // Generate PDF with proper options for styling preservation
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "16mm",
        right: "16mm",
        bottom: "16mm",
        left: "16mm",
      },
    });

    await context.close();

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { record_id } = (await req.json()) as DocumentRequest;

    if (!record_id) {
      return new Response(
        JSON.stringify({ error: "record_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating PDF for record: ${record_id}`);

    // Fetch the IP record
    const { data: record, error: recordError } = await supabase
      .from("ip_records")
      .select("*")
      .eq("id", record_id)
      .single();

    if (recordError || !record) {
      console.error("Record fetch error:", recordError);
      return new Response(
        JSON.stringify({ error: "Record not found", details: recordError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch record details separately
    const { data: detailsData } = await supabase
      .from("record_details")
      .select("*")
      .eq("record_id", record_id);

    const details = detailsData?.[0] || {};

    // Generate HTML content with complete styling
    const htmlContent = generateHTMLContent(record, details);

    // Convert HTML to PDF using Playwright with CSS rendering
    console.log("Converting HTML to PDF using Playwright...");
    const pdfBuffer = await generatePDFFromHTML(htmlContent);

    // Upload to storage
    const fileName = `full-record-docs/${new Date().getFullYear()}/${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}/${record.reference_number || record.id}.pdf`;

    console.log(`Uploading PDF to storage: ${fileName}`);

    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF", details: uploadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedURL, error: urlError } = await supabase.storage
      .from("certificates")
      .createSignedUrl(fileName, 3600);

    if (urlError || !signedURL) {
      console.error("URL generation error:", urlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download URL", details: urlError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("PDF generated and uploaded successfully");

    return new Response(
      JSON.stringify({
        success: true,
        url: signedURL.signedUrl,
        fileName: `UCC_IPO_Record_${record.reference_number || record.id}.pdf`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

Deno.serve(handleRequest);

