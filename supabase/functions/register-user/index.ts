import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// =====================================================================
// RUNTIME VALIDATION: Check all required environment variables at startup
// =====================================================================

// List of required environment variables
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
  const errorMsg = `[register-user] STARTUP ERROR: Missing required environment variables: ${missingVars.join(", ")}. Configure these in Supabase Edge Functions secrets.`;
  console.error(errorMsg);
  // Exit with error - this prevents the function from being called
  throw new Error(errorMsg);
}

console.log("[register-user] ✓ All required environment variables configured at startup");

// =====================================================================
// CORS Configuration: Allow specific origins (not wildcard)
// =====================================================================
// Allowed origins:
//   - Production: https://ucc-ipo.com, https://www.ucc-ipo.com
//   - Local dev: http://localhost:5173, http://localhost:3000, http://127.0.0.1:*
//   - Bolt preview: https://*.bolt.new, https://*.webcontainer.io, https://*--5173--*
// Uses safe regex matching (no eval), denies by default

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;

  // Static allowed origins (production + common local dev)
  const staticAllowed = [
    "https://ucc-ipo.com",
    "https://www.ucc-ipo.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];
  if (staticAllowed.includes(origin)) return true;

  // Dynamic pattern matching for Bolt preview domains
  // Allow: *.bolt.new, *.webcontainer.io, or any hostname containing "--5173--"
  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".bolt.new")) return true;
    if (hostname.endsWith(".webcontainer.io")) return true;
    if (hostname.includes("--5173--")) return true;
  } catch {
    // Invalid URL, deny
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

  // Only set Access-Control-Allow-Origin if the origin is allowed
  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

interface RegisterUserRequest {
  email: string;
  fullName: string;
  password: string;
  departmentId?: string;
  resend?: boolean;
}

function generatePendingApplicantEmailHtml(
  applicantName: string,
  applicantEmail: string,
  departmentName: string,
  submittedAt: string,
  dashboardUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Pending Applicant for Review</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">UCC IP Office</h1>
      <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Intellectual Property Management System</p>
    </div>
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="color: #1d4ed8; margin: 0; font-size: 14px; font-weight: 600;">&#128276; Action Required</p>
      </div>
      <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">New Pending Applicant for Review</h2>
      <p style="color: #7c3aed; margin: 0 0 24px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Admin Action Required</p>
      <p style="color: #4b5563; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">A new applicant has registered and is awaiting your approval before they can access the system.</p>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Applicant Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Full Name:</strong> <span style="color: #4b5563;">${applicantName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Email:</strong> <span style="color: #4b5563;">${applicantEmail}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Department:</strong> <span style="color: #4b5563;">${departmentName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <strong style="color: #374151;">Submitted:</strong> <span style="color: #4b5563;">${submittedAt}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 15px; line-height: 1.6;">Please review this applicant and approve or reject their account via the admin dashboard.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600;">Review in Admin Dashboard</a>
      </div>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 500;">University Intellectual Property Management System</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; 2025 University Central. All rights reserved.</p>
      </div>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined;
  const corsHeaders = getCorsHeaders(origin);

  // Reject disallowed origins early (except for preflight)
  if (origin && !isOriginAllowed(origin) && req.method !== "OPTIONS") {
    console.warn(`[register-user] Blocked request from disallowed origin: ${origin}`);
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
    console.log(`[register-user] CORS preflight from origin: ${origin}`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    console.warn(`[register-user] Invalid method: ${req.method}`);
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
    console.log("[register-user] === REGISTER USER FUNCTION CALLED ===");
    console.log("[register-user] Request from origin:", origin);

    // Get environment variables (guaranteed to exist from startup validation)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const appUrl = Deno.env.get("APP_URL")!;
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";

    console.log("[register-user] Environment validated. Creating Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestData: RegisterUserRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request format. Please ensure all fields are provided correctly.",
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

    const { email, fullName, password, departmentId, resend } = requestData;

    // Validate input
    if (!email || !fullName || !password) {
      const missingFields = [];
      if (!email) missingFields.push("email");
      if (!fullName) missingFields.push("fullName");
      if (!password) missingFields.push("password");
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required field(s): ${missingFields.join(", ")}`,
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

    // Validate password strength
    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password must be at least 6 characters long",
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

    // Simple check: if user profile already exists in users table, they've registered
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, auth_user_id")
      .eq("email", email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing user:", checkError);
      throw checkError;
    }

    // If user profile exists in users table, account is complete
    if (existingUser) {
      console.log("User already exists:", existingUser.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Account already exists. Please sign in.",
          alreadyExists: true,
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

    // Check if this is a resend request for an unverified auth user
    if (resend) {
      console.log("[register-user] Resend request detected, checking for unverified auth user");

      // Check if auth user exists
      const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.error("[register-user] Error listing auth users:", listError);
      } else {
        const authUser = authUsers?.find(u => u.email === email);

        if (authUser && !authUser.email_confirmed_at) {
          console.log("[register-user] Found unverified auth user, generating new verification link");

          // Generate new email confirmation link
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: "signup",
            email,
            options: {
              redirectTo: `${appUrl}/auth/callback`,
            },
          });

          if (linkError) {
            console.error("[register-user] ERROR: generateLink failed:", linkError);
            throw new Error(`Failed to generate email confirmation link: ${linkError.message}`);
          }

          const actionLink = linkData?.properties?.action_link;

          if (!actionLink) {
            console.error("[register-user] ERROR: action_link missing from response");
            throw new Error("Email confirmation link could not be generated (missing action_link)");
          }

          console.log("[register-user] ✓ New email confirmation link generated");

          // Send verification email
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #1a59a6 0%, #0d3a7a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                  .button { display: inline-block; background: #1a59a6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                  .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; font-size: 13px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Verify Your Email</h1>
                  </div>
                  <div class="content">
                    <h2>Hello ${fullName},</h2>
                    <p>You requested a new verification link for your UCC IP Management System account.</p>

                    <p>To verify your email and activate your account, please click the button below:</p>

                    <center>
                      <a href="${actionLink}" class="button">Verify Email Address</a>
                    </center>

                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; font-size: 12px; color: #6b7280;">
                      ${actionLink}
                    </p>

                    <p style="margin-top: 30px;"><strong>This link expires in 24 hours.</strong></p>

                    <div class="warning">
                      <strong>Security Note:</strong> If you did not request this email, please ignore it. Do not share this link with anyone.
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
            subject: "Verify Your Email - UCC IP Management System",
            html: emailHtml,
          };

          const emailResponse = await fetch(
            "https://api.resend.com/emails",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            }
          );

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("[register-user] ERROR: Resend API error:", errorText);
            throw new Error(`Email service error (HTTP ${emailResponse.status}): ${errorText}`);
          }

          const emailResult = await emailResponse.json();
          console.log("[register-user] ✓ Verification email resent successfully");

          return new Response(
            JSON.stringify({
              success: true,
              message: "Verification email sent. Please check your inbox.",
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
      }
    }

    console.log("[register-user] User does not exist, proceeding with creation");

    // Note: Removed stale auth user cleanup to prevent cascade deletes of user profiles
    // Auth users will be managed through proper lifecycle management

    // Create auth user with email_confirm=false (requires email verification)
    console.log("[register-user] Step: Creating auth user");
    console.log("[register-user] Email:", email);
    console.log("[register-user] Password strength: " + (password.length >= 10 ? "strong" : "medium"));
    console.log("[register-user] Email confirmation required: true");
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        department_id: departmentId || null,
      },
    });

    if (authError) {
      console.error("[register-user] ERROR: auth.createUser failed");
      console.error("[register-user] Auth error message:", authError.message);
      
      // Check if user already exists
      if (authError.message && authError.message.includes("already registered")) {
        console.log("[register-user] User already registered, returning existing account");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Account already exists",
            alreadyExists: true,
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
      
      // Log and return 200 per requirement — do not block registration flow with 4xx/5xx
      console.error("[register-user] Unhandled auth error, returning error to client");
      return new Response(
        JSON.stringify({
          success: false,
          error: "ERR_AUTH: " + (authError.message || "Unknown error"),
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

    if (!authData.user) {
      console.error("[register-user] ERROR: No user returned from createUser");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create account (no user ID)",
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

    console.log("[register-user] ✓ Auth user created successfully");
    console.log("[register-user] User ID:", authData.user.id);
    console.log("[register-user] Email status: awaiting verification");

    // Wait for trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update the profile created by trigger with department_id using service role
    // NEW APPLICANTS: Set is_approved = FALSE (pending admin approval)
    const { data: updateData, error: profileError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        department_id: departmentId && departmentId !== '' ? departmentId : null,
        role: 'applicant',
        is_approved: false
      })
      .eq("auth_user_id", authData.user.id)
      .select();

    if (profileError) {
      console.error("[register-user] Profile update error:", profileError);
      console.error("[register-user] Attempted to update with:", { auth_user_id: authData.user.id, department_id: departmentId, role: 'applicant' });
    } else {
      console.log("[register-user] Profile updated successfully:", updateData);
    }

    // Store temporary registration data
    const { error: tempRegError } = await supabase
      .from("temp_registrations")
      .insert({
        auth_user_id: authData.user.id,
        email,
        full_name: fullName,
        department_id: departmentId || null,
      });

    if (tempRegError) {
      console.error("[register-user] Warning: Could not store temp registration data:", tempRegError);
      // Don't fail - user is created, just tracking is missing
    }

    // Notify admin(s) of new pending applicant — best-effort, never blocks registration
    try {
      const { data: adminUsers, error: adminQueryError } = await supabase
        .from("users")
        .select("email")
        .eq("role", "admin");

      if (adminQueryError) {
        console.error("[register-user] Warning: Could not fetch admin emails for notification:", adminQueryError);
      } else if (adminUsers && adminUsers.length > 0) {
        let departmentName = "Not specified";
        if (departmentId) {
          const { data: deptData } = await supabase
            .from("departments")
            .select("name")
            .eq("id", departmentId)
            .maybeSingle();
          if (deptData?.name) departmentName = deptData.name;
        }

        const submittedAt = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Manila",
          dateStyle: "long",
          timeStyle: "short",
        });
        const adminDashboardUrl = `${appUrl}/admin`;
        const adminEmails = adminUsers.map((a: { email: string }) => a.email);

        const adminEmailPayload = {
          from: `UCC IP Office <${resendFromEmail}>`,
          to: adminEmails,
          subject: "New Pending Applicant for Review - UCC IP System",
          html: generatePendingApplicantEmailHtml(
            fullName,
            email,
            departmentName,
            submittedAt,
            adminDashboardUrl
          ),
        };

        const adminEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(adminEmailPayload),
        });

        if (!adminEmailResponse.ok) {
          const errText = await adminEmailResponse.text();
          console.error("[register-user] Warning: Admin notification email failed:", errText);
        } else {
          const adminEmailResult = await adminEmailResponse.json();
          console.log("[register-user] \u2713 Admin notification email sent. ID:", adminEmailResult.id);
        }
      } else {
        console.log("[register-user] No admin users found, skipping admin notification");
      }
    } catch (adminEmailError: unknown) {
      const msg = adminEmailError instanceof Error ? adminEmailError.message : String(adminEmailError);
      console.error("[register-user] Warning: Admin notification failed (non-blocking):", msg);
    }

    // Generate email confirmation link using signup type
    console.log("[register-user] Step: Generating email confirmation link");
    console.log("[register-user] Action: Using generateLink(type=signup) for email verification");
    console.log("[register-user] Email:", email);
    console.log("[register-user] Redirect URL:", `${appUrl}/auth/callback`);
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (linkError) {
      console.error("[register-user] ERROR: generateLink failed:", linkError);
      console.error("[register-user] Error details:", { code: linkError.status, message: linkError.message });
      throw new Error(`Failed to generate email confirmation link: ${linkError.message}`);
    }

    // Extract the action_link from the response
    const actionLink = linkData?.properties?.action_link;

    if (!actionLink) {
      console.error("[register-user] ERROR: action_link missing from response");
      console.error("[register-user] Response data:", JSON.stringify(linkData));
      throw new Error("Email confirmation link could not be generated (missing action_link)");
    }

    console.log("[register-user] ✓ Email confirmation link generated successfully");
    console.log("[register-user] Link preview:", actionLink.substring(0, 80) + "...");

    // Send verification email with confirmation link via Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a59a6 0%, #0d3a7a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #1a59a6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to UCC IP Management</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Thank you for registering with the University of Caloocan City Intellectual Property Management System.</p>
              
              <p>To complete your registration and activate your account, please click the button below to verify your email:</p>
              
              <center>
                <a href="${actionLink}" class="button">Verify Email Address</a>
              </center>
              
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #6b7280;">
                ${actionLink}
              </p>
              
              <p style="margin-top: 30px;"><strong>This link expires in 24 hours.</strong></p>
              
              <div class="warning">
                <strong>Security Note:</strong> If you did not create this account, please ignore this email. Do not share this link with anyone.
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

    // Send email via Resend API
    console.log("[register-user] Step: Sending verification email via Resend");
    console.log("[register-user] Email to:", email);
    console.log("[register-user] From:", `UCC IP Office <${resendFromEmail}>`);
    console.log("[register-user] Resend API endpoint: https://api.resend.com/emails");
    
    const emailPayload = {
      from: `UCC IP Office <${resendFromEmail}>`,
      to: [email],  // Resend accepts: to: string | string[] (array preferred)
      subject: "Verify Your Email - UCC IP Management System",
      html: emailHtml,
    };

    console.log("[register-user] Sending POST request to Resend API...");
    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      }
    );

    console.log("[register-user] Resend response status:", emailResponse.status, emailResponse.statusText);
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[register-user] ERROR: Resend API returned error");
      console.error("[register-user] Status:", emailResponse.status);
      console.error("[register-user] Status Text:", emailResponse.statusText);
      console.error("[register-user] Response Body:", errorText);
      throw new Error(`Email service error (HTTP ${emailResponse.status}): ${errorText}`);
    }

    let emailResult;
    try {
      emailResult = await emailResponse.json();
    } catch (parseError) {
      console.error("[register-user] ERROR: Could not parse Resend response as JSON");
      console.error("[register-user] Error:", parseError);
      throw new Error("Email service returned invalid response");
    }

    console.log("[register-user] ✓ Resend API response received");
    console.log("[register-user] Email ID from Resend:", emailResult.id);

    if (!emailResult.id) {
      console.error("[register-user] ERROR: No message ID in Resend response");
      console.error("[register-user] Response data:", JSON.stringify(emailResult));
      throw new Error("Email service did not confirm delivery (no message ID)");
    }

    console.log("[register-user] ✓ Email sent successfully to:", email);
    console.log("[register-user] Message ID:", emailResult.id);

    // Return success to frontend
    console.log("[register-user] ✓ REGISTRATION COMPLETE");
    console.log("[register-user] Summary: User created, email sent, awaiting verification");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully. Check your email for the verification link.",
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
    console.error("[register-user] ❌ REGISTRATION FAILED");
    console.error("[register-user] Error message:", error.message);
    console.error("[register-user] Error type:", error.name);
    console.error("[register-user] Error stack:", error.stack);
    
    // Return 500 for configuration/system errors (NOT user input errors)
    // This helps distinguish between client errors and server problems
    const statusCode = error.message?.includes("not configured") ? 500 : 400;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Registration failed. Please try again.",
        details: process.env.NODE_ENV === "development" ? error.toString() : undefined,
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

