import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending emails from queue (max 10 per execution)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("sent", false)
      .lt("attempt_count", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching email queue:", fetchError);
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending emails to process",
          processed: 0,
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

    console.log(`Processing ${pendingEmails.length} pending emails from queue`);

    let successCount = 0;
    let failureCount = 0;

    for (const email of pendingEmails) {
      try {
        // Call the send-status-notification function
        const response = await fetch(
          `${supabaseUrl}/functions/v1/send-status-notification`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(email.payload),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          // Mark email as sent
          await supabase
            .from("email_queue")
            .update({
              sent: true,
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", email.id);

          console.log(`✓ Email sent successfully for record ${email.ip_record_id}`);
          successCount++;
        } else {
          // Mark as failed attempt
          await supabase
            .from("email_queue")
            .update({
              attempt_count: email.attempt_count + 1,
              last_attempt_at: new Date().toISOString(),
              error_message: result.error || "Unknown error",
            })
            .eq("id", email.id);

          console.error(
            `✗ Failed to send email for record ${email.ip_record_id}:`,
            result.error
          );
          failureCount++;
        }
      } catch (emailError: any) {
        // Mark as failed attempt
        await supabase
          .from("email_queue")
          .update({
            attempt_count: email.attempt_count + 1,
            last_attempt_at: new Date().toISOString(),
            error_message: emailError.message || "Unknown error",
          })
          .eq("id", email.id);

        console.error(
          `✗ Error processing email for record ${email.ip_record_id}:`,
          emailError
        );
        failureCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingEmails.length} emails`,
        processed: pendingEmails.length,
        successful: successCount,
        failed: failureCount,
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
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
