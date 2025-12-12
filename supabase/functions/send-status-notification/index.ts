import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://university-intellect-dqt4.bolt.host",
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

// Sanitize HTML to prevent XSS
function sanitizeHTML(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate input payload
function validatePayload(payload: any): { valid: boolean; error?: string } {
  const required = ['applicantEmail', 'applicantName', 'recordTitle', 'newStatus', 'currentStage'];
  
  for (const field of required) {
    if (!payload[field] || typeof payload[field] !== 'string' || !payload[field].trim()) {
      return { valid: false, error: `Missing or empty required field: ${field}` };
    }
  }

  if (!isValidEmail(payload.applicantEmail)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  return { valid: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let payload: StatusNotificationPayload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON payload',
          details: { parseError: String(e) },
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

    // Validate input
    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error('[send-status-notification] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: { validation: validation.error },
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
        message: "Thank you for your submission! We have successfully received your intellectual property submission and it will be reviewed shortly.",
      },
      waiting_supervisor: {
        subject: "Submission Under Supervisor Review",
        message: "Your submission is now being reviewed by a supervisor.",
      },
      supervisor_approved: {
        subject: "Supervisor Approved Your Submission",
        message: "Great news! Your submission has been approved by the supervisor and is moving to evaluation.",
      },
      supervisor_revision: {
        subject: "Revision Requested by Supervisor",
        message: "The supervisor has requested revisions to your submission. Please review the feedback and make necessary changes.",
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
        message: "The evaluator has requested revisions to your submission. Please review the feedback provided.",
      },
      evaluator_rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined by the evaluator.",
      },
      rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined.",
      },
      preparing_legal: {
        subject: "Legal Preparation in Progress",
        message: "Your submission has progressed to the legal preparation stage. We are preparing the necessary documents for IPO Philippines filing.",
      },
      ready_for_filing: {
        subject: "Ready for IPO Philippines Filing",
        message: "Your intellectual property submission is now complete and ready to be filed with the IPO Philippines. You can now request your official certificate!",
      },
      completed: {
        subject: "Process Completed",
        message: "Your intellectual property submission process has been completed successfully!",
      },
    };

    const statusInfo = statusMessages[payload.newStatus] || {
      subject: "Status Update",
      message: `Your submission status has been updated to: ${sanitizeHTML(payload.newStatus)}`,
    };

    // Log the send attempt
    console.log('[send-status-notification] Sending email', {
      to: payload.applicantEmail,
      subject: statusInfo.subject,
      status: payload.newStatus,
      timestamp: new Date().toISOString(),
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHTML(statusInfo.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">UCC IP Office</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Intellectual Property Management System</p>
      </div>

      <div style="padding: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">${sanitizeHTML(statusInfo.subject)}</h2>
        
        <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
          Dear ${sanitizeHTML(payload.applicantName)},
        </p>

        <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
          ${sanitizeHTML(statusInfo.message)}
        </p>

        <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="color: #4b5563; margin: 0 0 8px 0;"><strong>Submission Details:</strong></p>
          <p style="color: #6b7280; margin: 4px 0;"><strong>Title:</strong> ${sanitizeHTML(payload.recordTitle)}</p>
          <p style="color: #6b7280; margin: 4px 0;"><strong>Reference:</strong> ${sanitizeHTML(payload.referenceNumber || 'N/A')}</p>
          <p style="color: #6b7280; margin: 4px 0;"><strong>Stage:</strong> ${sanitizeHTML(payload.currentStage)}</p>
          ${payload.actorName ? `<p style="color: #6b7280; margin: 4px 0;"><strong>Reviewed by:</strong> ${sanitizeHTML(payload.actorName)} (${sanitizeHTML(payload.actorRole || 'N/A')})</p>` : ''}
          ${payload.remarks ? `<p style="color: #6b7280; margin: 4px 0;"><strong>Remarks:</strong> ${sanitizeHTML(payload.remarks)}</p>` : ''}
        </div>

        <p style="color: #4b5563; line-height: 1.6; margin: 24px 0 16px 0;">
          <a href="https://university-intellect-dqt4.bolt.host/dashboard" style="color: #667eea; text-decoration: none; font-weight: 500;">
            View your submission in the dashboard →
          </a>
        </p>

        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          This is an automated notification from UCC IP Office. Please do not reply to this email.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2025 University of Caloocan City. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error('[send-status-notification] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
          details: {
            message: "Contact administrator to configure RESEND_API_KEY environment variable",
            code: "EMAIL_SERVICE_NOT_CONFIGURED",
          },
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
      html: emailHtml,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-status-notification] Resend API error', {
        status: response.status,
        error: result.message || 'Unknown error',
        to: payload.applicantEmail,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send email",
          details: {
            message: result.message || "Email service returned an error",
            code: result.code || "EMAIL_SEND_FAILED",
          },
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

    console.log('[send-status-notification] Email sent successfully', {
      to: payload.applicantEmail,
      emailId: result.id,
      subject: statusInfo.subject,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email notification sent to ${payload.applicantEmail}`,
        data: {
          subject: statusInfo.subject,
          emailId: result.id,
          recipient: payload.applicantEmail,
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
  } catch (error) {
    console.error('[send-status-notification] Unexpected error', {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: {
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "INTERNAL_ERROR",
        },
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

    const statusMessages: Record<string, { subject: string; message: string }> = {
      submitted: {
        subject: "Submission Received Successfully",
        message: "Thank you for your submission! We have successfully received your intellectual property submission and it will be reviewed shortly.",
      },
      waiting_supervisor: {
        subject: "Submission Under Supervisor Review",
        message: "Your submission is now being reviewed by a supervisor.",
      },
      supervisor_approved: {
        subject: "Supervisor Approved Your Submission",
        message: "Great news! Your submission has been approved by the supervisor and is moving to evaluation.",
      },
      supervisor_revision: {
        subject: "Revision Requested by Supervisor",
        message: "The supervisor has requested revisions to your submission. Please review the feedback and make necessary changes.",
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
        message: "The evaluator has requested revisions to your submission. Please review the feedback provided.",
      },
      rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined.",
      },
      preparing_legal: {
        subject: "Legal Preparation in Progress",
        message: "Your submission has progressed to the legal preparation stage. We are preparing the necessary documents for IPO Philippines filing.",
      },
      ready_for_filing: {
        subject: "Ready for IPO Philippines Filing",
        message: "Your intellectual property submission is now complete and ready to be filed with the IPO Philippines. You can now request your official certificate!",
      },
      completed: {
        subject: "Process Completed",
        message: "Your intellectual property submission process has been completed successfully!",
      },
    };

    const statusInfo = statusMessages[payload.newStatus] || {
      subject: "Status Update",
      message: "Your submission status has been updated.",
    };

    const emailHtml = `
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

        <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
          Dear ${payload.applicantName},
        </p>

        <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
          ${statusInfo.message}
        </p>

        <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; font-weight: 600;">SUBMISSION DETAILS</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">
            <strong>Title:</strong> ${payload.recordTitle}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">
            <strong>Reference:</strong> ${payload.referenceNumber}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">
            <strong>Current Stage:</strong> ${payload.currentStage}
          </p>
          ${payload.actorName ? `
          <p style="margin: 0; font-size: 14px; color: #1f2937;">
            <strong>Reviewed By:</strong> ${payload.actorName}${payload.actorRole ? ` (${payload.actorRole})` : ''}
          </p>
          ` : ''}
        </div>

        ${payload.remarks ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; font-weight: 600;">REMARKS / FEEDBACK</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">${payload.remarks}</p>
        </div>
        ` : ''}

        <p style="color: #6b7280; margin: 24px 0 0 0; font-size: 14px; line-height: 1.5;">
          This is an automated notification from the UCC IP Office system. Please log in to your account for full details and to take any necessary actions.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          © 2025 UCC IP Office. All rights reserved.
        </p>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
          University College Cork, Cork, Ireland
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          details: "Contact administrator to configure RESEND_API_KEY"
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
      html: emailHtml,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    console.log('Email sent successfully to:', payload.applicantEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email notification sent to ${payload.applicantEmail}`,
        subject: statusInfo.subject,
        emailId: result.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending status notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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