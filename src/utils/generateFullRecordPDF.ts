import { supabase } from '../lib/supabase';

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

    // Call edge function
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
