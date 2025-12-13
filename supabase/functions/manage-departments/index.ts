import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // PUBLIC: For list-active, allow public access (no auth needed)
    if (req.method === "GET" && action === "list-active") {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Missing Supabase environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase
          .from("departments")
          .select("id, name, description")
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ data: data || [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch departments", 
            details: err instanceof Error ? err.message : String(err) 
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // PROTECTED: For admin operations, require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || userData?.role !== "admin") {
      console.error("User is not admin:", { userError, role: userData?.role });
      return new Response(
        JSON.stringify({ error: "Only admins can manage departments" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role for write operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // GET - List all departments (admin only)
    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabaseAdmin
        .from("departments")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching departments:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch departments", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ data: data || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // POST - Create department
    if (req.method === "POST" && action === "create") {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!body.name) {
        return new Response(
          JSON.stringify({ error: "Department name is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("departments")
        .insert([
          {
            name: body.name,
            description: body.description || null,
            active: body.active !== false,
            created_by: user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Error creating department:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create department", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ data: data?.[0], success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // PUT - Update department
    if (req.method === "PUT" && action === "update") {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!body.id) {
        return new Response(
          JSON.stringify({ error: "Department ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("departments")
        .update({
          name: body.name,
          description: body.description,
          active: body.active,
        })
        .eq("id", body.id)
        .select();

      if (error) {
        console.error("Error updating department:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update department", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ data: data?.[0], success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // DELETE - Delete department
    if (req.method === "DELETE" && action === "delete") {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!body.id) {
        return new Response(
          JSON.stringify({ error: "Department ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabaseAdmin.from("departments").delete().eq("id", body.id);

      if (error) {
        console.error("Error deleting department:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete department", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Department management error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
