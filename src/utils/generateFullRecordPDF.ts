import { supabase } from '../lib/supabase';

/**
 * PDF Generation Strategy:
 * 
 * 1. Call Supabase Edge Function endpoint (single source of truth)
 * 2. Edge Function checks NODE_PDF_SERVER_URL:
 *    - If set: proxies to Node server → returns real PDF URL
 *    - If not set: returns HTML for print-to-PDF fallback
 * 3. Frontend checks response:
 *    - If PDF response: downloads directly
 *    - If HTML response: opens in new tab for manual printing
 * 
 * This simplifies frontend logic and centralizes configuration.
 */

export async function generateAndDownloadFullRecordPDF(recordId: string): Promise<{ url: string; fileName: string; type: 'pdf' | 'html' }> {
  try {
    // Get current user session for auth header
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please log in.');
    }

    console.log('[PDF] Calling Edge Function for PDF generation');
    
    // Call Edge Function (proxies to Node if configured)
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
      throw new Error(error.message || 'Failed to generate document');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to generate document');
    }

    const isPDF = data.type === 'pdf' || data.url?.endsWith('.pdf');
    console.log(`[PDF] Successfully generated via Edge Function (type: ${isPDF ? 'PDF' : 'HTML'})`);
    
    return {
      url: data.url,
      fileName: data.fileName || (isPDF ? 'document.pdf' : 'document.html'),
      type: isPDF ? 'pdf' : 'html'
    };
  } catch (err: any) {
    console.error('Error generating document:', err);
    throw err;
  }
}

export async function downloadPDFFromURL(url: string, fileName: string, type: 'pdf' | 'html' = 'pdf'): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // If it's HTML, open in new tab for manual printing
    if (type === 'html') {
      console.log('[PDF] Opening HTML in new tab for manual print → save as PDF');
      window.open(url, '_blank');
      return;
    }

    // Download as PDF
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
    console.error('Error downloading file:', err);
    throw err;
  }
}

