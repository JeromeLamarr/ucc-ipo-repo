import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// =====================================================================
// RUNTIME VALIDATION: Check all required environment variables at startup
// =====================================================================

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_URL",
];

// Validate all required variables are set
const missingVars: string[] = [];
for (const varName of REQUIRED_ENV_VARS) {
  const value = Deno.env.get(varName);
  if (!value || value.trim() === "") {
    missingVars.push(varName);
  }
}

// If any required vars are missing, log and fail startup
if (missingVars.length > 0) {
  const errorMsg = `[verify-password-reset-code] STARTUP ERROR: Missing required environment variables: ${missingVars.join(", ")}. Configure these in Supabase Edge Functions secrets.`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

console.log("[verify-password-reset-code] ✓ All required environment variables configured at startup");

// =====================================================================
// CORS Configuration: Reuse same pattern as register-user
// =====================================================================

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;

  const staticAllowed = [
    "https://ucc-ipo.com",
    "https://www.ucc-ipo.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];
  if (staticAllowed.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".bolt.new")) return true;
    if (hostname.endsWith(".webcontainer.io")) return true;
    if (hostname.includes("--5173--")) return true;
  } catch {
    return false;
  }

  return false;
}

function getCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

interface VerifyPasswordResetRequest {
  email: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined;
  const corsHeaders = getCorsHeaders(origin);

  // Reject disallowed origins (except preflight)
  if (origin && !isOriginAllowed(origin) && req.method !== "OPTIONS") {
    console.warn(`[verify-password-reset-code] Blocked request from disallowed origin: ${origin}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Origin not allowed",
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

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[verify-password-reset-code] CORS preflight from origin: ${origin}`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    console.warn(`[verify-password-reset-code] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
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
    console.log("[verify-password-reset-code] === FUNCTION CALLED ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestData: VerifyPasswordResetRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request format.",
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

    const { email, code } = requestData;

    // Validate inputs
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code.",
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

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code.",
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

    // Hash the provided code using SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    console.log(`[verify-password-reset-code] Looking up code for email: ${email}`);

    // Find latest unused non-expired code
    const { data: codes, error: queryError } = await supabase
      .from("password_reset_codes")
      .select("id, code_hash, expires_at, used_at, auth_user_id")
      .eq("email", email.toLowerCase())
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (queryError) {
      console.error("[verify-password-reset-code] Query error:", queryError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code.",
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

    if (!codes || codes.length === 0) {
      console.log(`[verify-password-reset-code] No code found for email: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code.",
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

    const record = codes[0];

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(record.expires_at);
    if (now > expiresAt) {
      console.log(`[verify-password-reset-code] Code expired for email: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code.",
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

    // Verify code hash
    if (record.code_hash !== codeHash) {
      console.log(`[verify-password-reset-code] Code hash mismatch for email: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code.",
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

    console.log(`[verify-password-reset-code] Code verified for email: ${email}`);

    // Mark code as used
    await supabase
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id);

    // Generate magic link to authenticate user and redirect to settings
    console.log(`[verify-password-reset-code] Generating magic link for email: ${email}`);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${appUrl}/dashboard/settings?tab=password`,
      },
    });

    if (linkError) {
      console.error("[verify-password-reset-code] generateLink error:", linkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate authentication link.",
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

    const actionLink = linkData?.properties?.action_link;

    if (!actionLink) {
      console.error("[verify-password-reset-code] action_link missing from response");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate authentication link.",
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

    console.log("[verify-password-reset-code] ✓ Authentication link generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        actionLink: actionLink,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[verify-password-reset-code] === CRITICAL ERROR ===");
    console.error("[verify-password-reset-code] Error type:", error?.constructor?.name);
    console.error("[verify-password-reset-code] Error message:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error("[verify-password-reset-code] Error stack:", error.stack);
    }
    console.error("[verify-password-reset-code] Full error:", error);
    
    // Include error message in response for better debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage || "An error occurred. Please try again later.",
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
