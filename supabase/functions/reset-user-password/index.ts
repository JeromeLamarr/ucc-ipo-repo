import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !adminUser) {
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: adminProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_user_id", adminUser.id)
      .single();

    if (adminProfile?.role !== "admin") {
      throw new Error("Only admins can reset passwords");
    }

    const { userId, newPassword }: ResetPasswordRequest = await req.json();

    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Get the target user's auth_user_id and role
    const { data: targetUserProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("auth_user_id, role")
      .eq("id", userId)
      .single();

    if (profileError || !targetUserProfile) {
      throw new Error("User not found");
    }

    // Only allow password reset for supervisors and evaluators, NOT applicants
    if (targetUserProfile.role === "applicant") {
      throw new Error("Cannot reset password for applicants. Only supervisors and evaluators.");
    }

    // Update auth user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserProfile.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password reset successfully for ${targetUserProfile.role}`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
