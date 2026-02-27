import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '../middleware/auth';
import { generateHTMLContent } from '../utils/htmlGenerator';
import { generatePDFFromHTML } from '../utils/pdfGenerator';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * POST /api/generate-full-record-pdf
 * Generate a full record documentation PDF with Chromium/Playwright
 *
 * Body:
 * - record_id: string
 *
 * Returns:
 * - success: boolean
 * - url: string (signed download URL)
 * - fileName: string
 * - path: string (file path in storage)
 */
router.post(
  '/generate-full-record-pdf',
  verifyAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { record_id } = req.body;

      if (!record_id) {
        res.status(400).json({ error: 'record_id is required' });
        return;
      }

      console.log(`[PDF Generation] Starting for record: ${record_id}, user: ${req.user?.email}`);

      // Fetch the IP record
      const { data: record, error: recordError } = await supabase
        .from('ip_records')
        .select(
          `
          id, reference_number, status, current_stage, created_at, updated_at,
          title, category, abstract,
          applicant:applicants(full_name, email, department_id),
          supervisor:users!ip_records_supervisor_id_fkey(full_name, email),
          evaluator:users!ip_records_evaluator_id_fkey(full_name, email)
        `
        )
        .eq('id', record_id)
        .single();

      if (recordError || !record) {
        console.error(`[PDF Generation] Record fetch error:`, recordError);
        res.status(404).json({
          error: 'Record not found',
          details: recordError?.message || 'Unknown error',
        });
        return;
      }

      // Fetch record details
      const { data: detailsData, error: detailsError } = await supabase
        .from('record_details')
        .select('*')
        .eq('record_id', record_id);

      if (detailsError) {
        console.error(`[PDF Generation] Details fetch error:`, detailsError);
      }

      const details = detailsData?.[0] || {};

      // Generate HTML content
      console.log(`[PDF Generation] Generating HTML for record: ${record_id}`);
      const htmlContent = generateHTMLContent(record, details, req.user?.email);

      // Convert HTML to PDF using Playwright
      console.log(`[PDF Generation] Converting HTML to PDF using Playwright...`);
      const pdfBuffer = await generatePDFFromHTML(htmlContent);

      // Upload to storage
      const fileName = `full-record-docs/${new Date().getFullYear()}/${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}/${record.reference_number || record.id}.pdf`;

      console.log(`[PDF Generation] Uploading PDF to storage: ${fileName}`);

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error(`[PDF Generation] Upload error:`, uploadError);
        res.status(500).json({
          error: 'Failed to upload PDF',
          details: uploadError.message,
        });
        return;
      }

      // Generate signed URL (valid for 1 hour)
      const { data: signedURL, error: urlError } = await supabase.storage
        .from('certificates')
        .createSignedUrl(fileName, 3600);

      if (urlError || !signedURL) {
        console.error(`[PDF Generation] URL generation error:`, urlError);
        res.status(500).json({
          error: 'Failed to generate download URL',
          details: urlError?.message || 'Unknown error',
        });
        return;
      }

      console.log(`[PDF Generation] Success! URL: ${signedURL.signedUrl.substring(0, 50)}...`);

      res.json({
        success: true,
        url: signedURL.signedUrl,
        path: fileName,
        fileName: `UCC_IPO_Record_${record.reference_number || record.id}.pdf`,
      });
    } catch (error: any) {
      console.error('[PDF Generation] Function error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message || String(error),
      });
    }
  }
);

export default router;
