import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteDraftPayload {
  draftId: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the auth header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Create client with auth token to get current user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get current user to verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[delete-draft] Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-draft] User ${user.id} deleting draft`);

    // Parse request body
    const payload: DeleteDraftPayload = await req.json();
    const { draftId } = payload;

    console.log(`[delete-draft] Deleting draft: ${draftId}`);

    if (!draftId) {
      return new Response(
        JSON.stringify({ error: "Missing draftId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the draft exists, belongs to current user, and is a draft
    const { data: draftData, error: fetchError } = await supabaseAdmin
      .from("ip_records")
      .select("id, status, applicant_id")
      .eq("id", draftId)
      .eq("applicant_id", user.id)
      .eq("status", "draft")
      .single();

    if (fetchError) {
      console.error("[delete-draft] Error fetching draft:", fetchError);
      return new Response(
        JSON.stringify({ error: "Draft not found or unauthorized", details: fetchError.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!draftData) {
      return new Response(
        JSON.stringify({ error: "Draft not found or not a draft" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-draft] Draft verified - belongs to user ${draftData.applicant_id}`);

    // Delete the draft using admin client
    const { error: deleteError, data: deletedData } = await supabaseAdmin
      .from("ip_records")
      .delete()
      .eq("id", draftId)
      .eq("applicant_id", user.id)
      .eq("status", "draft")
      .select();

    if (deleteError) {
      console.error("[delete-draft] Database deletion error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete draft", details: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that something was actually deleted
    if (!deletedData || deletedData.length === 0) {
      console.error("[delete-draft] Delete query returned no rows - RLS policy may be blocking deletion");
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete draft - delete query returned no rows",
          details: "RLS policy may be preventing deletion or record no longer exists"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-draft] Successfully deleted draft - ${deletedData.length} row(s) deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Draft deleted successfully",
        deleted: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[delete-draft] Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
