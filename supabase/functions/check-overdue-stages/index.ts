import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[check-overdue-stages] Starting overdue stage check...");

    // ==========================================
    // 1. FIND OVERDUE ACTIVE STAGES
    // ==========================================
    // Find all ACTIVE stages where due_at < now() and not recently notified
    const { data: overdueStages, error: overdueFetchError } = await supabase
      .from("workflow_stage_instances")
      .select(`
        id,
        ip_record_id,
        stage,
        assigned_user_id,
        due_at,
        extended_until,
        notified_at,
        ip_records!inner(
          id,
          applicant_id,
          supervisor_id,
          evaluator_id,
          title,
          status
        )
      `)
      .eq("status", "ACTIVE")
      .lt("due_at", new Date().toISOString())
      .order("due_at", { ascending: true });

    if (overdueFetchError) {
      throw new Error(`Failed to fetch overdue stages: ${overdueFetchError.message}`);
    }

    console.log(`[check-overdue-stages] Found ${overdueStages?.length || 0} overdue stages`);

    const overdueResults = {
      marked_overdue: 0,
      marked_expired: 0,
      notifications_sent: 0,
      errors: [] as string[],
    };

    // Helper function to format SLA duration and grace period
    const formatSLADetails = (durationDays: number, graceDays: number): string => {
      let details = `Duration: ${durationDays} day${durationDays !== 1 ? 's' : ''}`;
      if (graceDays > 0) {
        details += ` + ${graceDays} day${graceDays !== 1 ? 's' : ''} grace period`;
      }
      return details;
    };

    // ==========================================
    // 2. PROCESS EACH OVERDUE STAGE
    // ==========================================
    for (const stageInstance of overdueStages || []) {
      try {
        const recordId = stageInstance.ip_record_id;
        const stage = stageInstance.stage;
        const applicantId = stageInstance.ip_records?.applicant_id;
        const assignedUserId = stageInstance.assigned_user_id;
        const dueAt = new Date(stageInstance.due_at);
        const extendedUntil = stageInstance.extended_until ? new Date(stageInstance.extended_until) : null;
        const notifiedAt = stageInstance.notified_at;

        // Get SLA policy to check grace period
        const { data: policyData } = await supabase
          .from("workflow_sla_policies")
          .select("grace_days")
          .eq("stage", stage)
          .eq("is_active", true)
          .single();

        const graceDays = policyData?.grace_days || 0;
        const graceDeadline = new Date(extendedUntil || dueAt);
        graceDeadline.setDate(graceDeadline.getDate() + graceDays);
        const now = new Date();

        const isApplicantStage = ["revision_requested", "materials_requested"].includes(stage);
        const isExpired = isApplicantStage && now > graceDeadline;

        // ==========================================
        // 2A. MARK AS OVERDUE OR EXPIRED
        // ==========================================
        const newStatus = isExpired ? "EXPIRED" : "OVERDUE";
        const { error: updateError } = await supabase
          .from("workflow_stage_instances")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", stageInstance.id);

        if (updateError) {
          throw new Error(`Failed to update stage status: ${updateError.message}`);
        }

        if (isExpired) {
          overdueResults.marked_expired++;
          console.log(`[check-overdue-stages] Marked stage ${stageInstance.id} as EXPIRED`);

          // When applicant stage expires, mark record as incomplete/closed
          // Use existing status field - set to "waiting_supervisor" or previous status with a flag
          // Actually, we should NOT change the main status to avoid breaking workflow
          // Instead, we'll just track expiration in stage_instances
        } else {
          overdueResults.marked_overdue++;
          console.log(`[check-overdue-stages] Marked stage ${stageInstance.id} as OVERDUE`);
        }

        // ==========================================
        // 2B. SEND NOTIFICATIONS (RATE LIMITED)
        // ==========================================
        // Only send notification if:
        // 1. Never notified before, OR
        // 2. Last notification was > 24 hours ago (prevent spam)
        const shouldNotify =
          !notifiedAt ||
          new Date(notifiedAt).getTime() + 24 * 60 * 60 * 1000 < now.getTime();

        if (shouldNotify) {
          // Get recipient email based on who owns this stage
          let recipientId = assignedUserId;
          let notificationType = "overdue_stage";

          if (!recipientId && isApplicantStage) {
            // For applicant stages, notify the applicant
            recipientId = applicantId;
          }

          if (recipientId) {
            const { data: userData } = await supabase
              .from("users")
              .select("email, full_name, role")
              .eq("id", recipientId)
              .single();

            if (userData?.email) {
              // Send via existing notification system
              const daysOverdue = Math.ceil(
                (now.getTime() - new Date(extendedUntil || dueAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              // Get SLA policy info for detailed notification
              const slaDetails = {
                duration_days: policyData?.duration_days || 7,
                grace_days: policyData?.grace_days || 0,
              };

              // Format consequence message based on stage type
              let consequence = '';
              if (isExpired) {
                consequence = isApplicantStage
                  ? 'Your submission deadline has expired. Your record may be closed or marked as incomplete. Please contact support immediately.'
                  : 'This deadline has expired. Please contact an administrator.';
              } else {
                consequence = isApplicantStage
                  ? `After the grace period (${slaDetails.grace_days} day${slaDetails.grace_days !== 1 ? 's' : ''}), your submission may be closed or marked as incomplete.`
                  : 'Please complete this review immediately. Overdue work may impact the overall submission timeline.';
              }

              const notificationTitle = isExpired
                ? `Action Required: Deadline Expired - ${stageInstance.ip_records?.title}`
                : `Overdue: ${stage.replace(/_/g, " ")} - ${stageInstance.ip_records?.title}`;

              const notificationMessage = isExpired
                ? `Your deadline for ${stage.replace(/_/g, " ")} (${formatSLADetails(slaDetails.duration_days, slaDetails.grace_days)}) expired ${daysOverdue} days ago.\n\n${consequence}`
                : `Your ${stage.replace(/_/g, " ")} task is ${daysOverdue} days overdue.\n\nSLA Duration: ${formatSLADetails(slaDetails.duration_days, slaDetails.grace_days)}\n\nConsequence: ${consequence}`;

              // Create notification record
              const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                  user_id: recipientId,
                  type: notificationType,
                  title: notificationTitle,
                  message: notificationMessage,
                  payload: {
                    ip_record_id: recordId,
                    stage,
                    days_overdue: daysOverdue,
                    is_expired: isExpired,
                    due_date: (extendedUntil || dueAt).toISOString(),
                    sla_duration_days: slaDetails.duration_days,
                    sla_grace_days: slaDetails.grace_days,
                  },
                });

              if (!notifError) {
                overdueResults.notifications_sent++;
                console.log(
                  `[check-overdue-stages] Sent ${notificationType} notification to user ${recipientId}`
                );
              }

              // Try to send email (best effort)
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${supabaseKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    to: userData.email,
                    subject: notificationTitle,
                    title: notificationTitle,
                    message: notificationMessage,
                    submissionTitle: stageInstance.ip_records?.title,
                    additionalInfo: {
                      'Stage': stage.replace(/_/g, " "),
                      'Status': isExpired ? 'EXPIRED' : 'OVERDUE',
                      'Days Overdue': daysOverdue.toString(),
                      'SLA Duration': `${slaDetails.duration_days} day${slaDetails.duration_days !== 1 ? 's' : ''}`,
                      'Grace Period': `${slaDetails.grace_days} day${slaDetails.grace_days !== 1 ? 's' : ''}`,
                      'Due Date': new Date(extendedUntil || dueAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }),
                    },
                  }),
                });
              } catch (emailError) {
                console.warn(
                  `[check-overdue-stages] Email send attempt failed (non-critical): ${emailError}`
                );
              }
            }

            // Mark as notified to prevent duplicate notifications
            const { error: notifyError } = await supabase
              .from("workflow_stage_instances")
              .update({ notified_at: new Date().toISOString() })
              .eq("id", stageInstance.id);

            if (notifyError) {
              console.warn(`[check-overdue-stages] Failed to update notified_at: ${notifyError.message}`);
            }
          }
        } else {
          console.log(
            `[check-overdue-stages] Skipping notification for stage ${stageInstance.id} (recently notified)`
          );
        }
      } catch (stageError) {
        const errorMsg = `Error processing stage ${stageInstance.id}: ${stageError}`;
        console.error(errorMsg);
        overdueResults.errors.push(errorMsg);
      }
    }

    // ==========================================
    // 3. LOG RESULTS & RETURN SUMMARY
    // ==========================================
    const summary = {
      timestamp: new Date().toISOString(),
      stage_checks_completed: overdueStages?.length || 0,
      ...overdueResults,
      message: `Checked ${overdueStages?.length || 0} overdue stages. Marked ${overdueResults.marked_overdue} as OVERDUE, ${overdueResults.marked_expired} as EXPIRED, sent ${overdueResults.notifications_sent} notifications.`,
    };

    console.log("[check-overdue-stages] Job completed:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[check-overdue-stages] Job failed:", errorMsg);

    return new Response(
      JSON.stringify({
        error: errorMsg,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
