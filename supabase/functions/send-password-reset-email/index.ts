import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendPasswordResetRequest {
  email: string;
}

// Generate a secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

    const { email }: SendPasswordResetRequest = await req.json();

    if (!email || !email.includes('@')) {
      throw new Error("Valid email is required");
    }

    // Find user by email in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Always show success message (prevent email enumeration)
    // But only create token if user exists
    if (user) {
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the token
      const { error: insertError } = await supabase
        .from("password_reset_tokens")
        .insert({
          user_id: user.id,
          token,
          email: user.email,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      // Generate beautiful HTML email using same design as verification
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const resetLink = `${supabaseUrl.replace('/rest/v1', '')}/#/reset-password?token=${token}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f5f7fa;
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px;
              }
              .email-wrapper {
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.07);
                overflow: hidden;
              }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 40px 30px; 
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
              }
              .header p {
                margin: 8px 0 0 0;
                font-size: 14px;
                color: #e0e7ff;
                font-weight: 500;
              }
              .content { 
                background: #ffffff; 
                padding: 40px 30px;
              }
              .content h2 {
                color: #1f2937;
                margin: 0 0 8px 0;
                font-size: 22px;
                font-weight: 700;
              }
              .content .subtitle {
                color: #7c3aed;
                margin: 0 0 24px 0;
                font-size: 13px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .content p {
                color: #4b5563;
                margin: 0 0 16px 0;
                font-size: 15px;
                line-height: 1.6;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 40px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                margin: 24px 0;
                font-size: 16px;
              }
              .cta-button:hover {
                opacity: 0.9;
              }
              .warning {
                background-color: #fef3c7;
                color: #92400e;
                padding: 16px;
                border-radius: 6px;
                border-left: 4px solid #f59e0b;
                margin: 24px 0;
                font-size: 14px;
              }
              .footer {
                text-align: center;
                margin-top: 32px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
              }
              .footer p {
                color: #6b7280;
                font-size: 13px;
                margin: 8px 0;
              }
              .footer-note {
                color: #9ca3af;
                font-size: 12px;
                margin: 4px 0;
              }
              .bottom-footer {
                text-align: center;
                padding: 20px;
                color: #9ca3af;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="email-wrapper">
                <div class="header">
                  <h1>Reset Your Password</h1>
                  <p>UCC Intellectual Property Management System</p>
                </div>

                <div class="content">
                  <h2>Hello ${fullName},</h2>
                  <p class="subtitle">Password Reset Request</p>
                  
                  <p>We received a request to reset the password for your UCC IP Management account.</p>
                  
                  <p><strong>Click the button below to reset your password:</strong></p>
                  
                  <a href="${resetLink}" class="cta-button">Reset My Password</a>
                  
                  <p>Or if you prefer, you can copy and paste this link in your browser:</p>
                  <p style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-size: 12px; color: #374151;">
                    ${resetLink}
                  </p>

                  <div class="warning">
                    <strong>⏰ This link will expire in 1 hour</strong><br>
                    For security reasons, you'll need to complete the password reset within 1 hour.
                  </div>

                  <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account's security.</p>

                  <div class="footer">
                    <p><strong>For Your Security:</strong></p>
                    <p class="footer-note">• Never share this link with anyone</p>
                    <p class="footer-note">• UCC Staff will never ask for your password</p>
                    <p class="footer-note">• Always verify the sender's email address</p>
                  </div>
                </div>

                <div class="footer" style="background-color: #f9fafb;">
                  <p>University Intellectual Property Management System</p>
                  <p class="footer-note">© 2026 University of Caloocan City. All rights reserved.</p>
                </div>
              </div>

              <div class="bottom-footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Send email via send-notification-email function
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
            subject: "Reset Your Password - UCC IP Management",
            html: emailHtml,
          }),
        }
      );

      const emailResult = await emailResponse.json();

      if (!emailResult.success) {
        console.warn("Email service not configured, but token created:", { email, token });
        // This is okay - token is still created even if email fails in development
      } else {
        console.log(`Password reset email sent to ${email}`);
      }
    } else {
      console.log(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If that email exists in our system, a password reset link will be sent shortly.",
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
    console.error("Error sending password reset email:", error);
    
    // Still return success to prevent email enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If that email exists in our system, a password reset link will be sent shortly.",
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
