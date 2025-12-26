import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ucc-ipo.com",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StatusNotificationPayload {
  applicantEmail: string;
  applicantName: string;
  recordTitle: string;
  referenceNumber: string;
  oldStatus: string;
  newStatus: string;
  currentStage: string;
  remarks?: string;
  actorName?: string;
  actorRole?: string;
}

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
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing Supabase configuration",
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: StatusNotificationPayload = await req.json();

    if (!payload.applicantEmail || !payload.newStatus) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
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

    const statusMessages: Record<string, { subject: string; message: string }> = {
      submitted: {
        subject: "Submission Received Successfully",
        message: "Thank you for your submission! We have successfully received your IP submission.",
      },
      waiting_supervisor: {
        subject: "Submission Under Supervisor Review",
        message: "Your submission is now being reviewed by a supervisor.",
      },
      supervisor_approved: {
        subject: "Supervisor Approved Your Submission",
        message: "Great news! Your submission has been approved by the supervisor.",
      },
      supervisor_revision: {
        subject: "Revision Requested by Supervisor",
        message: "The supervisor has requested revisions to your submission.",
      },
      waiting_evaluation: {
        subject: "Submission In Evaluation",
        message: "Your submission is now being evaluated by our technical team.",
      },
      evaluator_approved: {
        subject: "Evaluation Complete - Approved!",
        message: "Congratulations! Your submission has been approved by the evaluator.",
      },
      evaluator_revision: {
        subject: "Revision Requested by Evaluator",
        message: "The evaluator has requested revisions to your submission.",
      },
      rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined.",
      },
      completed: {
        subject: "Process Completed",
        message: "Your IP submission process has been completed!",
      },
    };

    const statusInfo = statusMessages[payload.newStatus] || {
      subject: "Status Update",
      message: "Your submission status has been updated.",
    };

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: payload.applicantEmail,
        subject: statusInfo.subject,
        message: statusInfo.message,
        title: statusInfo.subject,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send notification",
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Status notification sent successfully",
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