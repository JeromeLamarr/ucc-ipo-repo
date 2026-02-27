import { chromium } from 'playwright';

/**
 * Generate PDF from HTML content using Playwright
 * 
 * This is why a Node.js server is needed - Deno Edge Functions cannot run Chromium.
 * 
 * Settings optimized for PDF styling match:
 * - Uses "screen" media emulation (not "print") for proper color rendering
 * - Enables printBackground for colors
 * - Proper print-color-adjust: exact in CSS
 * - A4 format with standard margins
 */
export async function generatePDFFromHTML(htmlContent: string): Promise<Buffer> {
  let browser;
  try {
    console.log('[PDF] Launching Playwright browser...');
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    // Set HTML content with network idle wait
    console.log('[PDF] Setting page content...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    // Use "screen" media to render colors properly
    // (print media can reduce colors/saturations)
    console.log('[PDF] Emulating screen media for color preservation...');
    await page.emulateMedia({ media: 'screen' });

    // Generate PDF with full styling
    console.log('[PDF] Generating PDF with Playwright...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Enable background colors
      preferCSSPageSize: true, // Respect @page CSS rules
      margin: {
        top: '16mm',
        right: '16mm',
        bottom: '16mm',
        left: '16mm',
      },
    });

    await context.close();
    console.log('[PDF] PDF generated successfully');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[PDF] PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('[PDF] Error closing browser:', err);
      }
    }
  }
}
