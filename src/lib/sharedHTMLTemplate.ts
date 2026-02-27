/**
 * SHARED HTML Template for Full Record Documentation
 * 
 * Used by:
 * - Frontend: Download HTML button
 * - Node Server: PDF generation (Playwright)
 * 
 * This ensures PDF output matches HTML download exactly.
 */

export interface RecordData {
  id: string;
  reference_number: string;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
  title: string;
  category: string;
  abstract: string;
  applicant?: {
    full_name: string;
    email: string;
    department_id: string;
  };
  supervisor?: {
    full_name: string;
    email: string;
  };
  evaluator?: {
    full_name: string;
    email: string;
  };
}

export interface DetailData {
  description?: string;
  technicalField?: string;
  backgroundArt?: string;
  problemStatement?: string;
  solution?: string;
  advantages?: string;
  implementation?: string;
  inventors?: Array<{ name: string; affiliation: string; email: string }>;
  collaborators?: Array<{ name: string; affiliation: string; email: string }>;
  coCreators?: Array<{ name: string; affiliation: string; email: string }>;
  priorArt?: string;
  keywords?: string[];
  relatedPublications?: string;
  commercialPotential?: string;
  targetMarket?: string;
  competitiveAdvantage?: string;
  estimatedValue?: string;
  funding?: string;
  evaluationScore?: any;
}

function renderField(val: any): string {
  if (val === undefined || val === null || val === '' || val === 0) {
    return '—';
  }
  if (Array.isArray(val)) {
    return val.length === 0 ? '—' : val.join(', ');
  }
  return String(val);
}

function tableHTML(rows: any[]): string {
  return rows
    .map(
      (row) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${renderField(row.name)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${renderField(row.affiliation)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${renderField(row.email)}</td>
      </tr>
    `
    )
    .join('');
}

function generateTechnicalNarrativeFields(details: DetailData): string {
  const fields = [
    { key: 'description', label: 'Description' },
    { key: 'technicalField', label: 'Technical Field' },
    { key: 'backgroundArt', label: 'Background Art' },
    { key: 'problemStatement', label: 'Problem Statement' },
    { key: 'solution', label: 'Solution' },
    { key: 'advantages', label: 'Advantages' },
    { key: 'implementation', label: 'Implementation' },
  ];

  return fields
    .map(
      (field) => `
        <div class="info-item">
          <label>${field.label}</label>
          <value style="white-space: pre-wrap;">${renderField((details as any)[field.key])}</value>
        </div>
      `
    )
    .join('');
}

function generateCommercialFields(details: DetailData): string {
  const fields = [
    { key: 'commercialPotential', label: 'Commercial Potential' },
    { key: 'targetMarket', label: 'Target Market' },
    { key: 'competitiveAdvantage', label: 'Competitive Advantage' },
    { key: 'estimatedValue', label: 'Estimated Value' },
    { key: 'funding', label: 'Funding' },
  ];

  return fields
    .map(
      (field) => `
        <div class="info-item">
          <label>${field.label}</label>
          <value style="white-space: pre-wrap;">${renderField((details as any)[field.key])}</value>
        </div>
      `
    )
    .join('');
}

/**
 * Generate HTML for full record documentation
 * 
 * This HTML is used for:
 * 1. Download HTML (browser) - Shows in browser as-is
 * 2. Download PDF (server) - Rendered by Playwright using CSS media queries
 * 
 * CSS Includes:
 * - Print-ready styles with proper color preservation
 * - Media queries for PDF rendering (@media print)
 * - Grid layouts for info cards
 * - Table styles for inventors/collaborators
 * - Color-accurate styling (-webkit-print-color-adjust: exact)
 */
export function generateHTMLContent(record: RecordData, details: DetailData, adminEmail?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UCC IPO — Full Record Documentation</title>
  <style>
    /* ==================== PRINT COLOR PRESERVATION ==================== */
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* ==================== BASE STYLES ==================== */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }

    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* ==================== HEADINGS ==================== */
    h1 {
      color: #1f2937;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 30px;
      font-size: 28px;
    }

    h2 {
      color: #1f2937;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }

    h3 {
      color: #1f2937;
      font-size: 16px;
      margin-top: 15px;
      margin-bottom: 10px;
    }

    /* ==================== SECTIONS & GRIDS ==================== */
    .section {
      margin-bottom: 30px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .info-item {
      padding: 10px;
      background-color: #f3f4f6;
      border-radius: 4px;
    }

    .info-item label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      display: block;
      margin-bottom: 5px;
    }

    .info-item value {
      color: #1f2937;
      display: block;
      font-size: 14px;
    }

    /* ==================== TABLES ==================== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }

    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    /* ==================== CODE & PREFORMATTED ==================== */
    pre {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }

    code {
      font-family: "Courier New", monospace;
      font-size: 12px;
    }

    /* ==================== UTILITY CLASSES ==================== */
    .empty {
      color: #9ca3af;
      font-style: italic;
    }

    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }

    /* ==================== PAGE BREAKS & PRINT ==================== */
    @page {
      size: A4;
      margin: 16mm;
    }

    @media print {
      body {
        padding: 0;
        background-color: white;
      }

      .container {
        box-shadow: none;
        padding: 0;
        background-color: white;
        border-radius: 0;
      }

      /* Prevent page breaks within info-items */
      .info-item {
        page-break-inside: avoid;
      }

      table {
        page-break-inside: avoid;
      }

      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>UCC IPO — Full Record Documentation</h1>
    
    <!-- Record Header Info -->
    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <label>Tracking Number</label>
          <value>${renderField(record.reference_number)}</value>
        </div>
        <div class="info-item">
          <label>Record ID</label>
          <value style="font-family: monospace;">${record.id}</value>
        </div>
        <div class="info-item">
          <label>Status</label>
          <value>${record.status}</value>
        </div>
        <div class="info-item">
          <label>Current Stage</label>
          <value>${record.current_stage}</value>
        </div>
        <div class="info-item">
          <label>Created</label>
          <value>${new Date(record.created_at).toLocaleString()}</value>
        </div>
        <div class="info-item">
          <label>Updated</label>
          <value>${new Date(record.updated_at).toLocaleString()}</value>
        </div>
      </div>
    </div>

    <!-- Applicant Information -->
    <h2>Applicant Information</h2>
    <div class="section">
      ${
        record.applicant
          ? `
        <div class="info-grid">
          <div class="info-item">
            <label>Name</label>
            <value>${renderField(record.applicant.full_name)}</value>
          </div>
          <div class="info-item">
            <label>Email</label>
            <value>${renderField(record.applicant.email)}</value>
          </div>
          <div class="info-item">
            <label>Department ID</label>
            <value>${renderField(record.applicant.department_id)}</value>
          </div>
        </div>
      `
          : '<p class="empty">Applicant data not available</p>'
      }
    </div>

    <!-- Assigned Reviewers -->
    ${
      record.supervisor || record.evaluator
        ? `
    <h2>Assigned Reviewers</h2>
    <div class="section">
      <div class="info-grid">
        ${
          record.supervisor
            ? `
        <div class="info-item" style="background-color: #dbeafe;">
          <label>Supervisor</label>
          <value>${record.supervisor.full_name}</value>
          <value style="font-size: 12px; color: #6b7280;">${record.supervisor.email}</value>
        </div>
        `
            : ''
        }
        ${
          record.evaluator
            ? `
        <div class="info-item" style="background-color: #dcfce7;">
          <label>Evaluator</label>
          <value>${record.evaluator.full_name}</value>
          <value style="font-size: 12px; color: #6b7280;">${record.evaluator.email}</value>
        </div>
        `
            : ''
        }
      </div>
    </div>
    `
        : ''
    }

    <!-- Record Overview -->
    <h2>Record Overview</h2>
    <div class="section">
      <div class="info-grid">
        <div class="info-item">
          <label>Title</label>
          <value>${renderField(record.title)}</value>
        </div>
        <div class="info-item">
          <label>Category</label>
          <value>${renderField(record.category)}</value>
        </div>
      </div>
      <div class="info-item">
        <label>Abstract</label>
        <value style="white-space: pre-wrap;">${renderField(record.abstract)}</value>
      </div>
    </div>

    <!-- Technical Narrative -->
    <h2>Technical Narrative</h2>
    <div class="section">
      ${generateTechnicalNarrativeFields(details)}
    </div>

    <!-- Inventors / Collaborators / Co-Creators -->
    <h2>Inventors / Collaborators / Co-Creators</h2>
    <div class="section">
      <h3>Inventors</h3>
      ${
        (details.inventors || []).length === 0
          ? '<p class="empty">—</p>'
          : `
        <table>
          <thead><tr><th>Name</th><th>Affiliation</th><th>Email</th></tr></thead>
          <tbody>${tableHTML(details.inventors || [])}</tbody>
        </table>
      `
      }

      <h3>Collaborators</h3>
      ${
        (details.collaborators || []).length === 0
          ? '<p class="empty">—</p>'
          : `
        <table>
          <thead><tr><th>Name</th><th>Affiliation</th><th>Email</th></tr></thead>
          <tbody>${tableHTML(details.collaborators || [])}</tbody>
        </table>
      `
      }

      <h3>Co-Creators</h3>
      ${
        (details.coCreators || []).length === 0
          ? '<p class="empty">—</p>'
          : `
        <table>
          <thead><tr><th>Name</th><th>Affiliation</th><th>Email</th></tr></thead>
          <tbody>${tableHTML(details.coCreators || [])}</tbody>
        </table>
      `
      }
    </div>

    <!-- Prior Art / Keywords / Publications -->
    <h2>Prior Art / Keywords / Publications</h2>
    <div class="section">
      <div class="info-item">
        <label>Prior Art</label>
        <value style="white-space: pre-wrap;">${renderField(details.priorArt)}</value>
      </div>
      <div class="info-item">
        <label>Keywords</label>
        <value>${(details.keywords || []).length === 0 ? '—' : (details.keywords || []).join(', ')}</value>
      </div>
      <div class="info-item">
        <label>Related Publications</label>
        <value style="white-space: pre-wrap;">${renderField(details.relatedPublications)}</value>
      </div>
    </div>

    <!-- Commercial Information -->
    <h2>Commercial Information</h2>
    <div class="section">
      ${generateCommercialFields(details)}
    </div>

    <!-- Evaluation Score -->
    ${
      details.evaluationScore
        ? `
    <h2>Evaluation</h2>
    <div class="section">
      <pre>${JSON.stringify(details.evaluationScore, null, 2)}</pre>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <footer>
      <p>Generated: ${new Date().toLocaleString()}</p>
      ${adminEmail ? `<p>Admin: ${adminEmail}</p>` : ''}
    </footer>
  </div>
</body>
</html>
  `;
}
