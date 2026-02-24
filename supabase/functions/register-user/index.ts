import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

interface RegisterUserRequest {
  email: string;
  fullName: string;
  password: string;
  departmentId?: string;
  resend?: boolean;
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
    console.log("[register-user] === REGISTER USER FUNCTION CALLED ===");
    console.log("[register-user] Request method:", req.method);
    console.log("[register-user] Request headers:", Object.fromEntries(req.headers.entries()));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[register-user] Missing Supabase environment variables");
      throw new Error("Missing Supabase configuration");
    }

    console.log("[register-user] Supabase configured:", !!supabaseUrl);

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

    const { email, fullName, password, departmentId } = requestData;

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

    console.log("[register-user] User does not exist, proceeding with creation");

    // Note: Removed stale auth user cleanup to prevent cascade deletes of user profiles
    // Auth users will be managed through proper lifecycle management

    // Create auth user with email_confirm=false (requires email verification)
    console.log("[register-user] Creating auth user for email:", email);
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
      // Check if user already exists
      if (authError.message && authError.message.includes("already registered")) {
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
      console.error("[register-user] auth.createUser error:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "ERR_AUTH: " + (authError.message || "Unknown"),
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create account",
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

    console.log("[register-user] Auth user created:", authData.user.id);
    console.log("[register-user] Auth user created successfully:", authData.user.id);

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

    // Generate magic link
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${supabaseUrl.replace('/rest/v1', '')}/auth/v1/callback?type=magiclink`,
      },
    });

    if (signInError) {
      console.error("[register-user] Generate link error:", signInError);
      // Even if magic link fails, continue - email can still be sent with basic link
      console.warn("[register-user] Continuing with email send despite magic link generation failure");
    }

    // The magic link is in signInData
    const magicLink = signInData?.properties?.action_link;

    if (!magicLink) {
      console.error("[register-user] Failed to create magic link - magicLink is:", magicLink);
      console.error("[register-user] signInData:", signInData);
      // Continue anyway - we have alternative email flow
      console.warn("[register-user] Continuing despite no magic link");
    }

    // Send verification email
    const emailHtml = magicLink ? `
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
              
              <p>To complete your registration and activate your account, please click the button below:</p>
              
              <center>
                <a href="${magicLink}" class="button">Verify Email Address</a>
              </center>
              
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #6b7280;">
                ${magicLink}
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
    ` : `
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
              
              <p>Your account has been created successfully. You will be able to log in shortly after your email is verified. Our system will send you a verification link shortly.</p>
              
              <p style="margin-top: 30px;">If you don't receive a verification email within 5 minutes, please check your spam folder or contact support.</p>
              
              <div class="warning">
                <strong>Security Note:</strong> If you did not create this account, please ignore this email.
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

    // Send email via Resend API directly
    let emailSent = false;
    let emailError: string | null = null;

    try {
      console.log("[register-user] Sending verification email to:", email);
      
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";
      
      if (!resendApiKey) {
        console.error("[register-user] RESEND_API_KEY not configured");
        emailError = "Email service not configured";
      } else {
        const emailResponse = await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `UCC IP Office <${resendFromEmail}>`,
              to: [email],
              subject: "Verify Your Email - UCC IP Management System",
              html: emailHtml,
            }),
          }
        );

        console.log("[register-user] Email response status:", emailResponse.status);
        
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("[register-user] Email service HTTP error:", {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            body: errorText,
          });
          emailError = `HTTP ${emailResponse.status}: ${emailResponse.statusText}`;
        } else {
          try {
            const emailResult = await emailResponse.json();
            console.log("[register-user] Email service response:", emailResult);

            // Check if the response indicates success
            if (emailResult.id) {
              console.log("[register-user] Email sent successfully with ID:", emailResult.id);
              emailSent = true;
            } else if (emailResult.error) {
              console.error("[register-user] Email service returned error:", emailResult.error);
              emailError = emailResult.error;
            } else {
              // Unexpected response format, but no explicit error
              console.log("[register-user] Email service response format unexpected:", emailResult);
              emailSent = true; // Assume success if no error field
            }
          } catch (jsonError) {
            console.error("[register-user] Failed to parse email response JSON:", jsonError);
            emailError = "Invalid response from email service";
          }
        }
      }
    } catch (emailNetworkError: any) {
      console.error("[register-user] Failed to call email service:", emailNetworkError);
      emailError = emailNetworkError.message || "Network error calling email service";
    }

    // Even if email failed, user is created - return success with appropriate message
    if (emailSent) {
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
    } else {
      // Email failed but user exists
      console.error("[register-user] Email delivery failed:", emailError);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully. However, we encountered an issue sending the verification email.",
          warning: `Email delivery issue: ${emailError || "Unknown error"}. Please use the 'Resend Email' option on the login page.`,
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
  } catch (error: any) {
    console.error("[register-user] Registration error:", error);
    console.error("[register-user] Error stack:", error.stack);
    
    // Return 200 with error details instead of 500 to prevent "non-2xx status code" errors
    // The frontend will check the success field
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Registration failed. Please try again.",
        details: error.toString(),
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
});

