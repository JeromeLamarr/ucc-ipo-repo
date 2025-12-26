import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    const statusMessages: Record<string, { subject: string; message: string; icon: string }> = {
      submitted: {
        subject: "✓ Submission Received Successfully",
        message: "Thank you for your submission! We have successfully received your IP submission and it is now in our system.",
        icon: "✓",
      },
      waiting_supervisor: {
        subject: "📋 Submission Under Supervisor Review",
        message: "Your submission is now being reviewed by a supervisor. We will notify you once the review is complete.",
        icon: "📋",
      },
      supervisor_approved: {
        subject: "✓ Supervisor Approved Your Submission",
        message: "Great news! Your submission has been approved by the supervisor and is now in the evaluation stage.",
        icon: "✓",
      },
      supervisor_revision: {
        subject: "🔄 Revision Requested by Supervisor",
        message: "The supervisor has reviewed your submission and requested revisions. Please review the comments and resubmit.",
        icon: "🔄",
      },
      waiting_evaluation: {
        subject: "📋 Submission In Evaluation",
        message: "Your submission is now being evaluated by our technical expert team. We will notify you once the evaluation is complete.",
        icon: "📋",
      },
      evaluator_approved: {
        subject: "✓ Evaluation Complete - Approved!",
        message: "Congratulations! Your submission has been approved by the evaluator and is approved for legal filing.",
        icon: "✓",
      },
      evaluator_revision: {
        subject: "🔄 Revision Requested by Evaluator",
        message: "The evaluator has reviewed your submission and requested revisions. Please review the comments and resubmit.",
        icon: "🔄",
      },
      rejected: {
        subject: "✗ Submission Decision",
        message: "After careful review, your submission has been declined. Please review the comments for more information.",
        icon: "✗",
      },
      completed: {
        subject: "✓ Process Completed",
        message: "Your IP submission process has been completed and is ready for filing!",
        icon: "✓",
      },
    };

    const statusInfo = statusMessages[payload.newStatus] || {
      subject: "Status Update",
      message: "Your submission status has been updated.",
      icon: "•",
    };

    console.log("Processing status notification request:", {
      applicantEmail: payload.applicantEmail,
      newStatus: payload.newStatus,
      recordTitle: payload.recordTitle,
      referenceNumber: payload.referenceNumber,
      timestamp: new Date().toISOString(),
    });

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

    // Determine status color based on decision
    let statusColor = "#667eea";
    let statusBgColor = "#f0f4ff";
    
    if (payload.newStatus.includes("approved")) {
      statusColor = "#10b981"; // green
      statusBgColor = "#ecfdf5";
    } else if (payload.newStatus.includes("revision") || payload.newStatus.includes("rejected")) {
      statusColor = "#ef4444"; // red
      statusBgColor = "#fef2f2";
    }

    const remarksSection = payload.remarks ? `
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Reviewer Comments</p>
        <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">${payload.remarks}</p>
      </div>
    ` : '';

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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">UCC IP Office</h1>
      <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Intellectual Property Management System</p>
    </div>

    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <!-- Status Badge -->
      <div style="background-color: ${statusBgColor}; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="color: ${statusColor}; margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Status Update</p>
        <h2 style="color: ${statusColor}; margin: 8px 0 0 0; font-size: 18px; font-weight: 700;">${statusInfo.subject}</h2>
      </div>

      <p style="color: #4b5563; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">${statusInfo.message}</p>

      <!-- Submission Details -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Submission Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Submission Title:</strong> <span style="color: #4b5563;">${payload.recordTitle}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Reference Number:</strong> <span style="color: #4b5563;">${payload.referenceNumber}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Current Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${payload.currentStage}</span>
              </td>
            </tr>
            ${payload.actorName ? `
            <tr>
              <td style="padding: 12px 0;">
                <strong style="color: #374151;">Reviewed By:</strong> <span style="color: #4b5563;">${payload.actorName} (${payload.actorRole || 'Reviewer'})</span>
              </td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      ${remarksSection}

      <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 500;">University Intellectual Property Management System</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 University Central. All rights reserved.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `${statusInfo.subject}\n\n${statusInfo.message}\n\nSubmission: ${payload.recordTitle}\nReference: ${payload.referenceNumber}\nStatus: ${payload.currentStage}${payload.remarks ? '\n\nComments:\n' + payload.remarks : ''}`,
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
      console.error("Email sending failed:", {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: emailResult,
        to: payload.applicantEmail,
        newStatus: payload.newStatus,
        recordTitle: payload.recordTitle,
        referenceNumber: payload.referenceNumber,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send notification",
          details: emailResult.message || emailResult.error,
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

    console.log("Email sent successfully:", {
      to: payload.applicantEmail,
      newStatus: payload.newStatus,
      recordTitle: payload.recordTitle,
      emailId: emailResult.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Status notification sent successfully",
        data: {
          emailId: emailResult.id,
          to: payload.applicantEmail,
          subject: statusInfo.subject,
          newStatus: payload.newStatus,
        },
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