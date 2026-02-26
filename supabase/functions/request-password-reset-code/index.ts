import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// =====================================================================
// RUNTIME VALIDATION: Check all required environment variables at startup
// =====================================================================

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
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
  const errorMsg = `[request-password-reset-code] STARTUP ERROR: Missing required environment variables: ${missingVars.join(", ")}. Configure these in Supabase Edge Functions secrets.`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

console.log("[request-password-reset-code] ✓ All required environment variables configured at startup");

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

interface RequestPasswordResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined;
  const corsHeaders = getCorsHeaders(origin);

  // Reject disallowed origins (except preflight)
  if (origin && !isOriginAllowed(origin) && req.method !== "OPTIONS") {
    console.warn(`[request-password-reset-code] Blocked request from disallowed origin: ${origin}`);
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
    console.log(`[request-password-reset-code] CORS preflight from origin: ${origin}`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    console.warn(`[request-password-reset-code] Invalid method: ${req.method}`);
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
    console.log("[request-password-reset-code] === FUNCTION CALLED ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const appUrl = Deno.env.get("APP_URL")!;
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestData: RequestPasswordResetRequest;
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

    const { email } = requestData;

    // Validate email
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Valid email required.",
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

    // Look up user in users table by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, auth_user_id, email, full_name")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (userError && userError.code !== "PGRST116") {
      console.error("[request-password-reset-code] Database error:", userError);
      throw userError;
    }

    // Always return generic success message (don't leak whether email exists)
    if (!user || !user.auth_user_id) {
      console.log(`[request-password-reset-code] Email not found (or no auth_user_id): ${email}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "If that email exists in our system, a password reset code has been sent.",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[request-password-reset-code] Generated code for ${email}: ${code}`);

    // Hash code using SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Calculate expiry: now + 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete any existing unused codes for this email
    await supabase
      .from("password_reset_codes")
      .delete()
      .eq("email", email.toLowerCase())
      .is("used_at", null);

    // Insert new password reset code
    const { error: insertError } = await supabase
      .from("password_reset_codes")
      .insert({
        email: email.toLowerCase(),
        auth_user_id: user.auth_user_id,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("[request-password-reset-code] Insert error:", insertError);
      throw insertError;
    }

    console.log("[request-password-reset-code] Code inserted successfully");

    // Send email with the code
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a59a6 0%, #0d3a7a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { background: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a59a6; border: 2px dashed #1a59a6; border-radius: 8px; margin: 20px 0; font-family: monospace; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <h2>Hello${user.full_name ? " " + user.full_name : ""},</h2>
              <p>You requested a password reset for your UCC IP Management System account.</p>
              <p>Use the following code to reset your password. This code expires in 5 minutes.</p>
              <div class="code">${code}</div>
              <p>Enter this code in the password reset form on our website.</p>
              <div class="warning">
                <strong>Security Note:</strong> If you did not request this code, please ignore this email. Do not share this code with anyone.
              </div>
            </div>
            <div class="footer">
              <p>University of Caloocan City Intellectual Property Office</p>
              <p><a href="https://ucc-ipo.com" style="color: #1a59a6; text-decoration: none;">ucc-ipo.com</a></p>
              <p>Protecting Innovation, Promoting Excellence</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailPayload = {
      from: `UCC IP Office <${resendFromEmail}>`,
      to: [email],
      subject: "Password Reset Code - UCC IP Management System",
      html: emailHtml,
    };

    console.log("[request-password-reset-code] Sending POST request to Resend API...");
    console.log("[request-password-reset-code] Email to:", email);
    console.log("[request-password-reset-code] From:", `UCC IP Office <${resendFromEmail}>`);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("[request-password-reset-code] Resend response status:", emailResponse.status, emailResponse.statusText);

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[request-password-reset-code] ERROR: Resend API returned error");
      console.error("[request-password-reset-code] Status:", emailResponse.status);
      console.error("[request-password-reset-code] Status Text:", emailResponse.statusText);
      console.error("[request-password-reset-code] Response Body:", errorText);
      throw new Error(`Email service error (HTTP ${emailResponse.status}): ${errorText}`);
    }

    let emailResult;
    try {
      emailResult = await emailResponse.json();
    } catch (parseError) {
      console.error("[request-password-reset-code] ERROR: Could not parse Resend response as JSON");
      console.error("[request-password-reset-code] Error:", parseError);
      throw new Error("Email service returned invalid response");
    }

    console.log("[request-password-reset-code] ✓ Resend API response received");
    console.log("[request-password-reset-code] Email ID from Resend:", emailResult.id);

    if (!emailResult.id) {
      console.error("[request-password-reset-code] ERROR: No message ID in Resend response");
      console.error("[request-password-reset-code] Response data:", JSON.stringify(emailResult));
      throw new Error("Email service did not confirm delivery (no message ID)");
    }

    console.log("[request-password-reset-code] ✓ Email sent successfully to:", email);
    console.log("[request-password-reset-code] Message ID:", emailResult.id);

    // Always return generic success message
    return new Response(
      JSON.stringify({
        success: true,
        message: "If that email exists in our system, a password reset code has been sent. Please check your inbox and spam folder.",
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
    console.error("[request-password-reset-code] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred. Please try again later.",
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
