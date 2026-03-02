import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyAuth } from '../middleware/auth';
import { generateHTMLContent } from '../lib/sharedHTMLTemplate';
import { generatePDFFromHTML } from '../utils/pdfGenerator';

const router = Router();

let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client (lazy-loaded to ensure env vars are ready)
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

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
      const client = getSupabaseClient();
      const { data: record, error: recordError } = await client
        .from('ip_records')
        .select(
          `
          *,
          applicant:users!applicant_id(id, email, full_name, department_id),
          supervisor:users!supervisor_id(id, email, full_name),
          evaluator:users!evaluator_id(id, email, full_name)
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
      const { data: detailsData, error: detailsError } = await client
        .from('record_details')
        .select('*')
        .eq('record_id', record_id);

      if (detailsError) {
        console.error(`[PDF Generation] Details fetch error:`, detailsError);
      }

      const details = detailsData?.[0] || {};

      // Generate HTML content
      console.log(`[PDF Generation] Generating HTML for record: ${record_id}`);
      const htmlContent = generateHTMLContent(record as any, details as any, req.user?.email);

      // Convert HTML to PDF using Playwright
      console.log(`[PDF Generation] Converting HTML to PDF using Playwright...`);
      const pdfBuffer = await generatePDFFromHTML(htmlContent);

      // Upload to storage
      const fileName = `full-record-docs/${new Date().getFullYear()}/${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}/${record.reference_number || record.id}.pdf`;

      console.log(`[PDF Generation] Uploading PDF to storage: ${fileName}`);

      const { error: uploadError } = await client.storage
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
      const { data: signedURL, error: urlError } = await client.storage
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
        type: 'pdf',
        url: signedURL.signedUrl,
        path: fileName,
        fileName: `UCC_IPO_Record_${record.reference_number || record.id}.pdf`,
        contentType: 'application/pdf',
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
