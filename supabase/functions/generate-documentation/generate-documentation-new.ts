// Professional Full Documentation HTML Generator

function generateFormalDocumentationHTML(record: any): string {
  const applicant = record.applicant || {};
  const details = record.details || {};
  const documents = record.documents || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Submission Documentation - ${record.reference_number}</title>
  <style>
    @page {
      size: letter;
      margin: 0.75in;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html, body { 
      width: 100%;
      height: 100%;
    }
    
    body { 
      font-family: 'Times New Roman', Times, serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: white;
    }
    
    /* HEADER */
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    
    .institution-name {
      font-weight: bold;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    .document-title {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 8px 0 6px 0;
    }
    
    .ref-line {
      font-size: 11px;
      margin: 4px 0;
    }
    
    /* METADATA BOX */
    .metadata-box {
      background: #efefef;
      border: 1px solid #999;
      padding: 8px;
      margin-bottom: 12px;
      font-size: 10px;
    }
    
    .metadata-row {
      margin-bottom: 4px;
      display: flex;
    }
    
    .metadata-label {
      font-weight: bold;
      width: 150px;
    }
    
    .metadata-value {
      flex: 1;
    }
    
    /* SECTIONS */
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 6px;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
    }
    
    .content {
      font-size: 11px;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    
    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 10px;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 4px;
      text-align: left;
    }
    
    th {
      background: #ccc;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9px;
    }
    
    /* LISTS */
    ul {
      margin-left: 16px;
      margin-top: 4px;
    }
    
    li {
      margin-bottom: 3px;
      font-size: 10px;
    }
    
    /* CONFIDENTIAL */
    .confidential {
      background: #000;
      color: #fff;
      padding: 6px;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      margin: 12px 0;
      text-transform: uppercase;
    }
    
    /* FOOTER */
    .footer {
      font-size: 9px;
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #000;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="institution-name">University Confidential Consortium</div>
    <div class="institution-name">Intellectual Property Office</div>
    <div class="document-title">IP Submission Documentation</div>
    <div class="ref-line"><strong>Reference:</strong> ${record.reference_number}</div>
    <div class="ref-line"><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
  </div>

  <!-- METADATA -->
  <div class="metadata-box">
    <div class="metadata-row">
      <div class="metadata-label"><strong>Submission Title:</strong></div>
      <div class="metadata-value">${record.title}</div>
    </div>
    <div class="metadata-row">
      <div class="metadata-label"><strong>Category:</strong></div>
      <div class="metadata-value">${record.category}</div>
    </div>
    <div class="metadata-row">
      <div class="metadata-label"><strong>Status:</strong></div>
      <div class="metadata-value">${record.status}</div>
    </div>
    <div class="metadata-row">
      <div class="metadata-label"><strong>Submitted:</strong></div>
      <div class="metadata-value">${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="metadata-row">
      <div class="metadata-label"><strong>Applicant:</strong></div>
      <div class="metadata-value">${applicant.full_name} (${applicant.email})</div>
    </div>
  </div>

  <!-- SECTION I - INVENTION DETAILS -->
  <div class="section">
    <div class="section-title">I. INVENTION DETAILS</div>
    <div class="content">
      <strong>Abstract/Summary:</strong><br/>
      ${record.abstract || 'Not provided'}
    </div>
    <div class="content">
      <strong>Description:</strong><br/>
      ${details.description || 'Not provided'}
    </div>
  </div>

  <!-- SECTION II - TECHNICAL INFORMATION -->
  ${details.technicalField || details.backgroundArt || details.problemStatement || details.solution ? `
  <div class="section">
    <div class="section-title">II. TECHNICAL INFORMATION</div>
    ${details.technicalField ? `<div class="content"><strong>Technical Field:</strong><br/>${details.technicalField}</div>` : ''}
    ${details.backgroundArt ? `<div class="content"><strong>Background:</strong><br/>${details.backgroundArt}</div>` : ''}
    ${details.problemStatement ? `<div class="content"><strong>Problem:</strong><br/>${details.problemStatement}</div>` : ''}
    ${details.solution ? `<div class="content"><strong>Solution:</strong><br/>${details.solution}</div>` : ''}
    ${details.advantages ? `<div class="content"><strong>Advantages:</strong><br/>${details.advantages}</div>` : ''}
  </div>
  ` : ''}

  <!-- SECTION III - INVENTORS -->
  ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
  <div class="section">
    <div class="section-title">III. INVENTORS & CONTRIBUTORS</div>
    <table>
      <tr>
        <th>Name</th>
        <th>Affiliation</th>
        <th>Role</th>
        <th>Contact</th>
      </tr>
      ${details.inventors.map((inv: any) => `<tr>
        <td>${inv.name || ''}</td>
        <td>${inv.affiliation || ''}</td>
        <td>${inv.contribution || ''}</td>
        <td>${inv.email || ''}</td>
      </tr>`).join('')}
    </table>
  </div>
  ` : ''}

  <!-- SECTION IV - KEYWORDS -->
  ${details.keywords ? `
  <div class="section">
    <div class="section-title">IV. KEYWORDS</div>
    <div class="content">
      ${Array.isArray(details.keywords) ? details.keywords.join(', ') : details.keywords}
    </div>
  </div>
  ` : ''}

  <!-- SECTION V - SUPPORTING DOCUMENTS -->
  ${documents.length > 0 ? `
  <div class="section">
    <div class="section-title">V. UPLOADED DOCUMENTS</div>
    <ul>
      ${documents.map((doc: any) => `<li>${doc.file_name}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- CONFIDENTIAL NOTICE -->
  <div class="confidential">
    CONFIDENTIAL - FOR OFFICIAL UNIVERSITY RECORDS
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>University Confidential Consortium | Intellectual Property Office</p>
    <p>Record: ${record.id} | Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `;
}

export { generateFormalDocumentationHTML };
