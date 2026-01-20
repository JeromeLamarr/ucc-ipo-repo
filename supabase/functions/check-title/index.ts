import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

interface CheckTitleRequest {
  title: string;
  excludeDraftId?: string;
}

interface CheckTitleResponse {
  exists: boolean;
  exactMatch: {
    found: boolean;
    title?: string;
    id?: string;
  };
  similarTitles: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
}

// Simple similarity scoring function (Levenshtein distance based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  return costs[s2.length];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept GET requests
  if (req.method !== "GET") {
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
    const url = new URL(req.url);
    const title = url.searchParams.get("title");
    const excludeDraftId = url.searchParams.get("excludeDraftId");

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Title parameter is required",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[check-title] Checking for title:", title);
    console.log("[check-title] Excluding draft:", excludeDraftId);

    // Get all submitted records with titles
    let query = supabase
      .from("ip_records")
      .select("id, title")
      .eq("status", "submitted")
      .not("title", "is", null);

    // Exclude current draft if provided
    if (excludeDraftId) {
      query = query.neq("id", excludeDraftId);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("[check-title] Database error:", error);
      throw error;
    }

    const titleLower = title.toLowerCase().trim();
    let exactMatch = { found: false };
    const similarTitles: Array<{
      id: string;
      title: string;
      similarity: number;
    }> = [];

    // Check for exact match and collect similar titles
    if (records) {
      records.forEach((record: { id: string; title: string }) => {
        const recordTitleLower = record.title.toLowerCase().trim();
        
        // Check for exact match
        if (recordTitleLower === titleLower) {
          exactMatch = {
            found: true,
            title: record.title,
            id: record.id,
          };
        }

        // Calculate similarity for potential matches
        const similarity = calculateSimilarity(title, record.title);
        if (similarity >= 0.7 && similarity < 1) {
          // 70% or more similar but not exact
          similarTitles.push({
            id: record.id,
            title: record.title,
            similarity: Math.round(similarity * 100),
          });
        }
      });
    }

    // Sort similar titles by similarity score (highest first)
    similarTitles.sort((a, b) => b.similarity - a.similarity);

    const response: CheckTitleResponse = {
      exists: exactMatch.found || similarTitles.length > 0,
      exactMatch,
      similarTitles: similarTitles.slice(0, 5), // Return top 5 similar titles
    };

    console.log("[check-title] Response:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[check-title] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
