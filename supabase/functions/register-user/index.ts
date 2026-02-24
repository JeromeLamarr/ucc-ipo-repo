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

    // Store temporary registration data for the trigger to use when email is verified
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
      // Don't fail - user is created, trigger will use metadata as fallback
    }

    // SUCCESS: Supabase automatically sends the confirmation email
    // No need to generate magic link or send custom email
    console.log("[register-user] Registration successful. Supabase will send confirmation email automatically.");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully. Please check your email to verify your account.",
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
    console.error("[register-user] Registration error:", error);
    console.error("[register-user] Error stack:", error.stack);

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
