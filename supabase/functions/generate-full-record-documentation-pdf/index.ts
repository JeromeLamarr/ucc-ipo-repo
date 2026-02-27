import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * =============================================================================
 * PDF GENERATION EDGE FUNCTION - PROXY ONLY
 * =============================================================================
 * 
 * ⚠️ CRITICAL: This Edge Function is a PROXY ONLY
 * 
 * It does NOT attempt to generate PDFs itself!
 * Reason: Deno (Edge Function runtime) cannot run Chromium/Playwright
 * Error if attempted:
 *   "browserType.launch: Executable doesn't exist at /home/deno/..."
 * 
 * SOLUTION: Forward to Node.js server that supports Chromium
 * 
 * Deployment:
 * 1. Set NODE_PDF_SERVER_URL env var on this Edge Function
 * 2. Frontend calls this function (OR calls Node server directly)
 * 3. Edge Function proxies to Node server
 * 4. Node server generates PDF and returns signed URL
 * 5. Frontend downloads PDF
 * 
 * Configuration Required:
 * - NODE_PDF_SERVER_URL: https://your-node-pdf-server.com
 *   (or http://localhost:3000 for local development)
 * 
 * =============================================================================
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentRequest {
  record_id: string;
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { record_id } = (await req.json()) as DocumentRequest;

    if (!record_id) {
      return new Response(
        JSON.stringify({ error: "record_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Edge Proxy] PDF request for record: ${record_id}`);

    // Extract authorization header (required for admin validation)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Node server URL from environment
    const nodeServerURL = Deno.env.get("NODE_PDF_SERVER_URL");

    if (!nodeServerURL) {
      // Return helpful error message
      console.error(
        `[Edge Proxy] ERROR: NODE_PDF_SERVER_URL not configured\n` +
        `Set environment variable NODE_PDF_SERVER_URL on this Edge Function`
      );

      return new Response(
        JSON.stringify({
          error: "PDF generation service not configured",
          details: {
            reason: "NODE_PDF_SERVER_URL environment variable not found on Edge Function",
            solution: "Configure NODE_PDF_SERVER_URL in Edge Function settings",
            alternative: "Call Node.js server directly: POST /api/generate-full-record-pdf with same headers",
          },
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward request to Node server
    console.log(`[Edge Proxy] Forwarding to Node server: ${nodeServerURL}`);

    try {
      const nodeResponse = await fetch(`${nodeServerURL}/api/generate-full-record-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          "User-Agent": "Supabase-Edge-Function",
        },
        body: JSON.stringify({ record_id }),
      });

      const nodeData = await nodeResponse.json();

      if (!nodeResponse.ok) {
        console.error(`[Edge Proxy] Node server returned error:`, {
          status: nodeResponse.status,
          error: nodeData.error,
        });

        // Forward error from Node server as-is
        return new Response(JSON.stringify(nodeData), {
          status: nodeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success! Return response from Node server
      console.log(`[Edge Proxy] Successfully forwarded response from Node server`);
      return new Response(JSON.stringify(nodeData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (proxyError: any) {
      console.error(`[Edge Proxy] Failed to connect to Node server`, {
        url: nodeServerURL,
        error: proxyError.message,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to connect to PDF generation server",
          details: {
            server_url: nodeServerURL,
            error_message: proxyError.message,
            possible_causes: [
              "Node server is down or unreachable",
              "Network connectivity issue",
              "Invalid NODE_PDF_SERVER_URL",
            ],
            troubleshooting: [
              "Check Node server is running: curl " + nodeServerURL + "/health",
              "Verify NODE_PDF_SERVER_URL is correct",
              "Check network connectivity to Node server",
            ],
          },
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[Edge Proxy] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

Deno.serve(handleRequest);

