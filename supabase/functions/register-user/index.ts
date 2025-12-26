import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestData: RegisterUserRequest;
    try {
      requestData = await req.json();
      console.log("Request data received:", requestData);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
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

    const { email, fullName, password, departmentId } = requestData;
    console.log("Extracted fields - email:", email, "fullName:", fullName, "password:", !!password, "departmentId:", departmentId);

    // Validate input
    if (!email || !fullName || !password) {
      console.error("Validation failed - missing fields:", { email: !!email, fullName: !!fullName, password: !!password });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, fullName, password",
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

    console.log("User does not exist, proceeding with creation");

    // Note: Removed stale auth user cleanup to prevent cascade deletes of user profiles
    // Auth users will be managed through proper lifecycle management

    // Create auth user with email_confirm=false (requires email verification)
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
      console.error("Auth error:", authError);
      console.error("Auth error message:", authError.message);
      console.error("Auth error status:", authError.status);
      console.error("Auth error details:", JSON.stringify(authError, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: authError.message || "Failed to create account",
          details: authError.message
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

    if (!authData.user) {
      console.error("No user returned from auth creation");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create account",
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

    console.log("Auth user created successfully:", authData.user.id);

    // Wait for trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update the profile created by trigger with department_id using service role
    const { data: updateData, error: profileError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        department_id: departmentId && departmentId !== '' ? departmentId : null,
        role: 'applicant'
      })
      .eq("auth_user_id", authData.user.id)
      .select();

    if (profileError) {
      console.error("Profile update error:", profileError);
      console.error("Attempted to update with:", { auth_user_id: authData.user.id, department_id: departmentId, role: 'applicant' });
    } else {
      console.log("Profile updated successfully:", updateData);
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
      console.error("Warning: Could not store temp registration data:", tempRegError);
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
      console.error("Generate link error:", signInError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate verification link. Please try again.",
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

    // The magic link is in signInData
    const magicLink = signInData?.properties?.action_link;

    if (!magicLink) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create verification link",
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
    `;

    // Send email via send-notification-email function
    try {
      const emailResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-notification-email`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: email,
            subject: "Verify Your Email - UCC IP Management System",
            html: emailHtml,
          }),
        }
      );

      const emailResult = await emailResponse.json();

      if (!emailResult.success) {
        console.error("Email service error:", emailResult.error);
        // User is created but email failed - still return success so user can retry
        return new Response(
          JSON.stringify({
            success: true,
            message: "Account created but email delivery failed. Please try resending.",
            warning: "Email delivery issue - you may not receive the verification link",
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
    } catch (emailError: any) {
      console.error("Failed to send email:", emailError);
      // User is created but email failed - still return success
      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created but email delivery failed. Please try resending.",
          warning: "Email service unavailable - you may not receive the verification link",
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
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Registration failed. Please try again.",
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

