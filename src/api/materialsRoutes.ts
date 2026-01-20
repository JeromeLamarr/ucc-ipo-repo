/**
 * API Routes for Academic Presentation Materials
 * 
 * Endpoints:
 * POST /api/materials/request - Admin requests materials from applicant
 * POST /api/materials/submit - Applicant submits materials
 * GET /api/materials/:ipRecordId - Get materials status and details
 * DELETE /api/materials/:materialId - Admin rejects submission
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient';
import { authenticateUser, authorizeAdmin } from '../middleware/auth';
import { sendMaterialsRequestEmail } from '../services/emailService';

const router = Router();

/**
 * POST /api/materials/request
 * Admin requests presentation materials from applicant
 */
router.post(
  '/materials/request',
  authenticateUser,
  authorizeAdmin,
  async (req: Request, res: Response) => {
    const { ip_record_id } = req.body;
    const adminId = req.user?.id;

    if (!ip_record_id || !adminId) {
      return res.status(400).json({ error: 'Missing ip_record_id or admin ID' });
    }

    try {
      // Get or create presentation materials record
      const { data: materials, error: createError } = await supabase
        .rpc('get_or_create_presentation_materials', {
          p_ip_record_id: ip_record_id,
        });

      if (createError) throw createError;

      const materialsId = materials;

      // Update materials record
      const { data: updated, error: updateError } = await supabase
        .from('presentation_materials')
        .update({
          status: 'requested',
          materials_requested_at: new Date().toISOString(),
          materials_requested_by: adminId,
        })
        .eq('id', materialsId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get IP record details and applicant info
      const { data: ipRecord, error: fetchError } = await supabase
        .from('ip_records')
        .select('*, users!applicant_id(email, full_name)')
        .eq('id', ip_record_id)
        .single();

      if (fetchError) throw fetchError;

      // Get admin info
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', adminId)
        .single();

      if (adminError) throw adminError;

      // Send email notification to applicant
      await sendMaterialsRequestEmail({
        applicantEmail: ipRecord.users.email,
        applicantName: ipRecord.users.full_name,
        ipTitle: ipRecord.title,
        recordId: ip_record_id,
        adminName: adminData.full_name,
      });

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: adminId,
        ip_record_id,
        action: 'materials_requested',
        details: {
          stage: 'academic_presentation_materials',
          timestamp: new Date().toISOString(),
        },
      });

      // Track in process tracking
      await supabase.from('process_tracking').insert({
        ip_record_id,
        stage: 'academic_presentation_materials',
        status: 'preparing_materials',
        actor_id: adminId,
        action: 'request_materials',
        description: `Materials requested from ${ipRecord.users.full_name}`,
        actor_name: adminData.full_name,
        actor_role: 'admin',
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Materials requested successfully. Email sent to applicant.',
      });
    } catch (error: any) {
      console.error('Error requesting materials:', error);
      return res.status(500).json({
        error: 'Failed to request materials',
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/materials/submit
 * Applicant submits presentation materials
 */
router.post(
  '/materials/submit',
  authenticateUser,
  async (req: Request, res: Response) => {
    const { ip_record_id, poster_file_url, poster_file_name, poster_file_size, paper_file_url, paper_file_name, paper_file_size } = req.body;
    const applicantId = req.user?.id;

    if (!ip_record_id || !applicantId) {
      return res.status(400).json({ error: 'Missing ip_record_id or applicant ID' });
    }

    if (!poster_file_url || !poster_file_name || !paper_file_url || !paper_file_name) {
      return res.status(400).json({ error: 'Both poster and paper are required' });
    }

    try {
      // Verify applicant owns this record
      const { data: ipRecord, error: fetchError } = await supabase
        .from('ip_records')
        .select('applicant_id, title, users!applicant_id(email, full_name)')
        .eq('id', ip_record_id)
        .single();

      if (fetchError || !ipRecord) {
        return res.status(404).json({ error: 'IP record not found' });
      }

      if (ipRecord.applicant_id !== applicantId) {
        return res.status(403).json({ error: 'Unauthorized: You do not own this record' });
      }

      // Get presentation materials record
      const { data: materials, error: getMaterials } = await supabase
        .from('presentation_materials')
        .select('*')
        .eq('ip_record_id', ip_record_id)
        .single();

      if (getMaterials || !materials) {
        return res.status(404).json({ error: 'Presentation materials record not found' });
      }

      if (materials.status !== 'requested') {
        return res.status(400).json({ error: 'Materials have not been requested yet' });
      }

      // Update materials record
      const { data: updated, error: updateError } = await supabase
        .from('presentation_materials')
        .update({
          status: 'submitted',
          materials_submitted_at: new Date().toISOString(),
          submitted_by: applicantId,
          poster_file_name,
          poster_file_url,
          poster_file_size: parseInt(poster_file_size),
          poster_uploaded_at: new Date().toISOString(),
          paper_file_name,
          paper_file_url,
          paper_file_size: parseInt(paper_file_size),
          paper_uploaded_at: new Date().toISOString(),
        })
        .eq('id', materials.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update ip_records
      await supabase
        .from('ip_records')
        .update({
          materials_submitted_at: new Date().toISOString(),
          current_stage: 'Academic Presentation Materials',
          status: 'materials_submitted',
        })
        .eq('id', ip_record_id);

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: applicantId,
        ip_record_id,
        action: 'materials_submitted',
        details: {
          stage: 'academic_presentation_materials',
          timestamp: new Date().toISOString(),
          files: {
            poster: poster_file_name,
            paper: paper_file_name,
          },
        },
      });

      // Get admin/evaluator for notification
      const { data: admin } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (admin?.email) {
        // Send notification to admin that materials are submitted
        try {
          await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adminEmail: admin.email,
              applicantName: ipRecord.users.full_name,
              recordTitle: ipRecord.title,
              action: 'materials_submitted',
              message: `${ipRecord.users.full_name} has submitted presentation materials for review.`,
            }),
          });
        } catch (emailError) {
          console.error('Error sending admin notification:', emailError);
        }
      }

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Materials submitted successfully. Admin has been notified.',
      });
    } catch (error: any) {
      console.error('Error submitting materials:', error);
      return res.status(500).json({
        error: 'Failed to submit materials',
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/materials/:ipRecordId
 * Get materials status and details
 */
router.get('/materials/:ipRecordId', authenticateUser, async (req: Request, res: Response) => {
  const { ipRecordId } = req.params;
  const userId = req.user?.id;

  if (!ipRecordId || !userId) {
    return res.status(400).json({ error: 'Missing ipRecordId or user ID' });
  }

  try {
    // Get materials record
    const { data: materials, error } = await supabase
      .from('presentation_materials')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows" which is fine
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: materials || {
        status: 'not_requested',
        materials_requested_at: null,
        materials_submitted_at: null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    return res.status(500).json({
      error: 'Failed to fetch materials',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/materials/:materialId
 * Admin rejects submission and requests resubmission
 */
router.delete(
  '/materials/:materialId',
  authenticateUser,
  authorizeAdmin,
  async (req: Request, res: Response) => {
    const { materialId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!materialId || !adminId) {
      return res.status(400).json({ error: 'Missing materialId or admin ID' });
    }

    try {
      // Get materials record
      const { data: materials, error: fetchError } = await supabase
        .from('presentation_materials')
        .select('*, ip_records!inner(title, users!applicant_id(email, full_name))')
        .eq('id', materialId)
        .single();

      if (fetchError || !materials) {
        return res.status(404).json({ error: 'Materials not found' });
      }

      // Reset to requested state
      const { data: updated, error: updateError } = await supabase
        .from('presentation_materials')
        .update({
          status: 'requested',
          materials_submitted_at: null,
          submission_notes: reason || 'Submission rejected. Please resubmit.',
          poster_file_name: null,
          poster_file_url: null,
          poster_file_size: null,
          poster_uploaded_at: null,
          paper_file_name: null,
          paper_file_url: null,
          paper_file_size: null,
          paper_uploaded_at: null,
        })
        .eq('id', materialId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: adminId,
        ip_record_id: materials.ip_record_id,
        action: 'materials_rejected',
        details: {
          reason,
          timestamp: new Date().toISOString(),
        },
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Materials rejected. Applicant has been notified to resubmit.',
      });
    } catch (error: any) {
      console.error('Error rejecting materials:', error);
      return res.status(500).json({
        error: 'Failed to reject materials',
        details: error.message,
      });
    }
  }
);

export default router;
