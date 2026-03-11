/**
 * verify-legacy — Edge function that returns an HTML verification page for
 * legacy IP records (certificates and disclosures). The QR codes embedded in
 * legacy PDFs point here so verification works independently of the frontend.
 *
 * Usage:
 *   GET /functions/v1/verify-legacy?id=<uuid>&type=certificate|disclosure
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Escape HTML to prevent XSS when inserting user data into HTML
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function renderPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — UCC IPO</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#e8edf6 0%,#d0daf0 100%);min-height:100vh;padding:24px 16px;color:#1a1a2e}
    .card{background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);max-width:560px;margin:0 auto;overflow:hidden}
    .header{background:linear-gradient(135deg,#0d3d8a 0%,#1559c1 100%);padding:28px 28px 20px;display:flex;align-items:center;gap:16px}
    .header-text h1{color:#fff;font-size:1.4rem;font-weight:700;margin-bottom:4px}
    .header-text p{color:rgba(255,255,255,.75);font-size:.85rem}
    .status{display:flex;align-items:center;gap:16px;padding:24px 28px;border-bottom:1px solid #eef0f4}
    .status-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0}
    .status-icon.ok{background:#d1fae5}
    .status-icon.err{background:#fee2e2}
    .status-title{font-size:1.25rem;font-weight:700}
    .status-title.ok{color:#047857}
    .status-title.err{color:#dc2626}
    .status-sub{font-size:.88rem;color:#6b7280;margin-top:2px}
    .body{padding:24px 28px}
    .section-title{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:12px}
    .field{margin-bottom:14px}
    .field label{display:block;font-size:.78rem;font-weight:600;color:#6b7280;margin-bottom:3px}
    .field p{font-size:.94rem;color:#111827;font-weight:500}
    .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.74rem;font-weight:600;background:#dbeafe;color:#1d4ed8}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    footer{text-align:center;padding:16px 28px;background:#f9fafb;border-top:1px solid #eef0f4;font-size:.75rem;color:#9ca3af}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-text">
        <h1>University of Caloocan City</h1>
        <p>Intellectual Property Office — Legacy Record Verification</p>
      </div>
    </div>
    ${body}
    <footer>UCC IPO &copy; ${new Date().getFullYear()} &mdash; This verification is provided by the Supabase-hosted verification service.</footer>
  </div>
</body>
</html>`;
}

function renderVerified(record: any, type: string): string {
  const details = record.details || {};
  const creatorName = escapeHtml(details.creator_name || "N/A");
  const creatorEmail = details.creator_email ? escapeHtml(details.creator_email) : null;
  const dept = details.creator_affiliation ? escapeHtml(details.creator_affiliation) : null;
  const docLabel = type === "disclosure" ? "Full Disclosure Statement" : "Certificate of Registration";

  const body = `
    <div class="status">
      <div class="status-icon ok">✓</div>
      <div>
        <div class="status-title ok">Document Verified</div>
        <div class="status-sub">This is an authentic UCC IPO Legacy ${docLabel}</div>
      </div>
    </div>
    <div class="body">
      <div class="section-title">Intellectual Property Details</div>
      <div class="field">
        <label>Title</label>
        <p>${escapeHtml(record.title || "N/A")}</p>
      </div>
      <div class="row">
        <div class="field">
          <label>Category</label>
          <p><span class="badge">${escapeHtml(capitalize(record.category || "N/A"))}</span></p>
        </div>
        <div class="field">
          <label>Registration Date</label>
          <p>${escapeHtml(formatDate(record.created_at))}</p>
        </div>
      </div>
      ${record.abstract ? `<div class="field"><label>Abstract</label><p style="font-size:.85rem;color:#374151">${escapeHtml(record.abstract)}</p></div>` : ""}

      <div class="section-title" style="margin-top:20px">Creator Information</div>
      <div class="field">
        <label>Name</label>
        <p>${creatorName}</p>
      </div>
      ${creatorEmail ? `<div class="field"><label>Email</label><p>${creatorEmail}</p></div>` : ""}
      ${dept ? `<div class="field"><label>Department / Affiliation</label><p>${dept}</p></div>` : ""}

      <div class="section-title" style="margin-top:20px">Record Details</div>
      <div class="row">
        <div class="field"><label>Record ID</label><p style="font-size:.78rem;color:#6b7280">${escapeHtml(record.id)}</p></div>
        <div class="field"><label>Document Type</label><p>${escapeHtml(docLabel)}</p></div>
      </div>
    </div>`;

  return renderPage(`${docLabel} Verified`, body);
}

function renderNotFound(id: string, type: string): string {
  const body = `
    <div class="status">
      <div class="status-icon err">✕</div>
      <div>
        <div class="status-title err">Document Not Found</div>
        <div class="status-sub">No legacy ${type === "disclosure" ? "disclosure" : "certificate"} record matches this QR code. It may be invalid or forged.</div>
      </div>
    </div>
    <div class="body">
      <div class="field"><label>Scanned ID</label><p style="font-size:.78rem;color:#6b7280">${escapeHtml(id)}</p></div>
      <p style="font-size:.85rem;color:#6b7280;margin-top:16px">If you believe this is an error, contact the UCC Intellectual Property Office.</p>
    </div>`;

  return renderPage("Verification Failed", body);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  const type = url.searchParams.get("type") || "certificate";

  if (!id) {
    return new Response(
      renderPage("Invalid Request", `<div class="status"><div class="status-icon err">✕</div><div><div class="status-title err">Missing ID</div><div class="status-sub">No record ID was provided in this verification link.</div></div></div><div class="body"></div>`),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response("Server configuration error", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: record, error } = await supabase
    .from("legacy_ip_records")
    .select("id, title, category, abstract, created_at, details")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[verify-legacy] DB error:", error.message);
    return new Response(
      renderNotFound(id, type),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } }
    );
  }

  if (!record) {
    return new Response(
      renderNotFound(id, type),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } }
    );
  }

  return new Response(
    renderVerified(record, type),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } }
  );
});
