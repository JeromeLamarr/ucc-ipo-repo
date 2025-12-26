import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
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

    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";
    const senderName = "UCC IP Office";

    const emailPayload = {
      from: `${senderName} <${senderEmail}>`,
      to: [payload.applicantEmail],
      subject: statusInfo.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">UCC IP Office</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Intellectual Property Management System</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">${statusInfo.subject}</h2>
        <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">${statusInfo.message}</p>
        <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 14px;"><strong>Record Title:</strong> ${payload.recordTitle}</p>
        <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 14px;"><strong>Reference:</strong> ${payload.referenceNumber}</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">University Intellectual Property Management System</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
      `,
      text: `${statusInfo.subject}\n\n${statusInfo.message}\n\nRecord: ${payload.recordTitle}\nReference: ${payload.referenceNumber}`,
    };

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email sending failed:", emailResult);
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