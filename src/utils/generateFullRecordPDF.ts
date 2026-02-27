import { supabase } from '../lib/supabase';

/**
 * PDF generation endpoints:
 * 1. Primary: Node.js server (recommended, has Chromium support)
 * 2. Fallback: Supabase Edge Function (may have limitations)
 */

const NODE_PDF_SERVER_URL = import.meta.env.VITE_NODE_PDF_SERVER_URL || 
                            (typeof window !== 'undefined' && window.location.origin.includes('localhost') 
                              ? 'http://localhost:3000'
                              : undefined);

export async function generateAndDownloadFullRecordPDF(recordId: string): Promise<string> {
  try {
    // Get current user session for auth header
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please log in.');
    }

    // Try Node server first (primary method with full Chromium support)
    if (NODE_PDF_SERVER_URL) {
      console.log('[PDF] Attempting to generate PDF via Node server:', NODE_PDF_SERVER_URL);
      try {
        const response = await fetch(`${NODE_PDF_SERVER_URL}/api/generate-full-record-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ record_id: recordId }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.warn('[PDF] Node server error, falling back to Edge Function:', data);
          // Fall through to Edge Function
        } else {
          if (!data?.success) {
            throw new Error(data?.error || 'Failed to generate PDF');
          }
          console.log('[PDF] Successfully generated via Node server');
          return data.url;
        }
      } catch (nodeError: any) {
        console.warn('[PDF] Node server error (falling back to Edge Function):', nodeError.message);
        // Fall through to Edge Function
      }
    }

    // Fallback: Call edge function
    console.log('[PDF] Using Edge Function for PDF generation');
    const { data, error } = await supabase.functions.invoke(
      'generate-full-record-documentation-pdf',
      {
        body: {
          record_id: recordId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) {
      throw new Error(error.message || 'Failed to generate PDF');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to generate PDF');
    }

    console.log('[PDF] Successfully generated via Edge Function');
    return data.url;
  } catch (err: any) {
    console.error('Error generating full record PDF:', err);
    throw err;
  }
}

export async function downloadPDFFromURL(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    console.error('Error downloading PDF:', err);
    throw err;
  }
}

