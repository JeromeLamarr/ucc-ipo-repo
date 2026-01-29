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
    // Get the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with auth token (for RLS)
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

    // First verify the draft exists and belongs to current user
    const { data: draftData, error: fetchError } = await supabase
      .from("ip_records")
      .select("id, status, applicant_id")
      .eq("id", draftId)
      .eq("status", "draft")
      .single();

    if (fetchError) {
      console.error("[delete-draft] Error fetching draft:", fetchError);
      return new Response(
        JSON.stringify({ error: "Draft not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!draftData) {
      return new Response(
        JSON.stringify({ error: "Draft not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-draft] Draft found - belongs to user: ${draftData.applicant_id}`);

    // Delete the draft
    const { error: deleteError, data: deletedData } = await supabase
      .from("ip_records")
      .delete()
      .eq("id", draftId)
      .eq("status", "draft")
      .select();

    if (deleteError) {
      console.error("[delete-draft] Database deletion error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete draft", details: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-draft] Successfully deleted draft`);

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
