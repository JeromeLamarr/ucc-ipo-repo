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
  affiliation?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, fullName, password, affiliation }: RegisterUserRequest = await req.json();

    // Check if user already exists in profiles table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      throw new Error("An account with this email already exists. Please sign in or use a different email.");
    }

    // Create auth user with email_confirm=false (requires email verification)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        affiliation: affiliation || null,
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Failed to create account");
    }

    // Store temporary registration data
    const { error: tempRegError } = await supabase
      .from("temp_registrations")
      .insert({
        auth_user_id: authData.user.id,
        email,
        full_name: fullName,
        affiliation: affiliation || null,
      });

    if (tempRegError) {
      console.error("Warning: Could not store temp registration data:", tempRegError);
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
      throw new Error("Failed to generate verification link: " + signInError.message);
    }

    // The magic link is already in signInData
    const magicLink = signInData?.properties?.action_link;

    if (!magicLink) {
      throw new Error("Failed to create verification link");
    }

    // Send verification email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
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
              <p>Thank you for registering with the University of Cape Coast Intellectual Property Management System.</p>
              
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
              <p>University of Cape Coast Intellectual Property Office</p>
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
        throw new Error("Failed to send verification email. Please contact support.");
      }
    } catch (emailError: any) {
      console.error("Failed to send email:", emailError);
      throw new Error("Failed to send verification email. Please try again.");
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
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

