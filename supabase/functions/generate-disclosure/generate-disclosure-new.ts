// New professional disclosure generator with formal legal document styling

function generateFormalDisclosureHTML(record: any): string {
  const applicant = record.applicant || {};
  const details = record.details || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IP Disclosure Form - ${record.reference_number}</title>
  <style>
    @page {
      size: letter;
      margin: 0.75in 0.75in;
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
    
    /* INSTRUCTIONS */
    .instructions {
      background: #efefef;
      border: 1px solid #999;
      padding: 8px;
      margin-bottom: 12px;
      font-size: 10px;
      line-height: 1.3;
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
    
    .form-group {
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    
    .form-row {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .form-col {
      flex: 1;
    }
    
    .field-label {
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    .field-input {
      border: 1px solid #000;
      padding: 4px 4px;
      min-height: 18px;
      font-size: 11px;
      background: #fff;
      width: 100%;
    }
    
    .field-input-large {
      border: 1px solid #000;
      padding: 4px;
      min-height: 45px;
      font-size: 11px;
      background: #fff;
      width: 100%;
      line-height: 1.3;
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
    
    /* SIGNATURES */
    .signature-box {
      margin-top: 12px;
    }
    
    .sig-line {
      border-top: 1px solid #000;
      width: 40%;
      margin: 35px 0 0 0;
      padding-top: 2px;
    }
    
    .sig-label {
      font-size: 10px;
      font-weight: bold;
      margin-top: 2px;
    }
    
    .sig-grid {
      display: flex;
      gap: 40px;
      margin-bottom: 12px;
    }
    
    .sig-block {
      width: auto;
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
    
    /* UTILITIES */
    .required { color: #d00; }
    ul { margin-left: 16px; margin-top: 4px; }
    li { margin-bottom: 3px; font-size: 10px; }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="institution-name">University Confidential Consortium</div>
    <div class="institution-name">Intellectual Property Office</div>
    <div class="document-title">Intellectual Property Disclosure Form</div>
    <div class="ref-line"><strong>Reference:</strong> ${record.reference_number}</div>
    <div class="ref-line"><strong>Date:</strong> ${new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
  </div>

  <!-- INSTRUCTIONS -->
  <div class="instructions">
    <strong>INSTRUCTIONS:</strong> Complete all sections. Attach supporting documentation. Submit to IP Office. All information is confidential.
  </div>

  <!-- SECTION I -->
  <div class="section">
    <div class="section-title">I. INVENTOR/CREATOR INFORMATION</div>
    
    <div class="form-group">
      <div class="field-label">Name of Primary Inventor <span class="required">*</span></div>
      <div class="field-input">${applicant.full_name || '_'.repeat(50)}</div>
    </div>

    <div class="form-row">
      <div class="form-col">
        <div class="field-label">Email <span class="required">*</span></div>
        <div class="field-input">${applicant.email || '_'.repeat(30)}</div>
      </div>
      <div class="form-col">
        <div class="field-label">Phone</div>
        <div class="field-input">${applicant.phone || '_'.repeat(20)}</div>
      </div>
    </div>

    <div class="form-group">
      <div class="field-label">Department/Unit/Affiliation <span class="required">*</span></div>
      <div class="field-input">${applicant.affiliation || '_'.repeat(50)}</div>
    </div>
  </div>

  <!-- SECTION II -->
  <div class="section">
    <div class="section-title">II. INVENTION/IP DESCRIPTION</div>
    
    <div class="form-group">
      <div class="field-label">Title of Invention <span class="required">*</span></div>
      <div class="field-input">${record.title || '_'.repeat(60)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Category of IP <span class="required">*</span></div>
      <div class="field-input">${record.category.toUpperCase()} ${'_'.repeat(40)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Abstract/Summary <span class="required">*</span></div>
      <div class="field-input-large">${record.abstract || '_'.repeat(100)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Detailed Description <span class="required">*</span></div>
      <div class="field-input-large">${details.description || '_'.repeat(100)}</div>
    </div>
  </div>

  <!-- SECTION III -->
  <div class="section">
    <div class="section-title">III. TECHNICAL FIELD & BACKGROUND</div>
    
    <div class="form-group">
      <div class="field-label">Technical Field</div>
      <div class="field-input">${details.technicalField || '_'.repeat(50)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Prior Art & Background</div>
      <div class="field-input-large">${details.backgroundArt || '_'.repeat(100)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Problem Statement</div>
      <div class="field-input-large">${details.problemStatement || '_'.repeat(100)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Solution Offered</div>
      <div class="field-input-large">${details.solution || '_'.repeat(100)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Advantages & Benefits</div>
      <div class="field-input-large">${details.advantages || '_'.repeat(100)}</div>
    </div>
  </div>

  <!-- SECTION IV - Inventors Table -->
  ${details.inventors && Array.isArray(details.inventors) && details.inventors.length > 0 ? `
  <div class="section">
    <div class="section-title">IV. INVENTORS & CONTRIBUTORS</div>
    <table>
      <tr>
        <th>Name</th>
        <th>Affiliation</th>
        <th>Role</th>
        <th>%</th>
      </tr>
      ${details.inventors.map((inv: any) => `<tr>
        <td>${inv.name || ''}</td>
        <td>${inv.affiliation || ''}</td>
        <td>${inv.contribution || ''}</td>
        <td>${inv.percent || ''}</td>
      </tr>`).join('')}
    </table>
  </div>
  ` : ''}

  <!-- SECTION V -->
  <div class="section">
    <div class="section-title">V. INTELLECTUAL PROPERTY INFORMATION</div>
    
    <div class="form-row">
      <div class="form-col">
        <div class="field-label">Date of Conception</div>
        <div class="field-input">${details.dateConceived || '__/__/____'}</div>
      </div>
      <div class="form-col">
        <div class="field-label">Date Reduced to Practice</div>
        <div class="field-input">${details.dateReduced || '__/__/____'}</div>
      </div>
    </div>

    <div class="form-group">
      <div class="field-label">Funding Source/Grant Information</div>
      <div class="field-input">${details.funding || '_'.repeat(50)}</div>
    </div>
  </div>

  <!-- SECTION VI -->
  <div class="section">
    <div class="section-title">VI. COMMERCIAL POTENTIAL</div>
    
    <div class="form-group">
      <div class="field-label">Commercial Potential & Market</div>
      <div class="field-input-large">${details.commercialPotential || '_'.repeat(100)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Target Market/Applications</div>
      <div class="field-input">${details.targetMarket || '_'.repeat(50)}</div>
    </div>

    <div class="form-group">
      <div class="field-label">Estimated Economic Value</div>
      <div class="field-input">${details.estimatedValue || '_'.repeat(50)}</div>
    </div>
  </div>

  <!-- SECTION VII -->
  <div class="section">
    <div class="section-title">VII. SUPPORTING DOCUMENTS</div>
    ${record.documents && record.documents.length > 0 ? `
    <ul>
      ${record.documents.map((doc: any) => `<li>${doc.file_name}</li>`).join('')}
    </ul>
    ` : '<p style="font-size: 10px; font-style: italic;">No supporting documents attached</p>'}
  </div>

  <!-- SECTION VIII - SIGNATURE -->
  <div class="section signature-box">
    <div class="section-title">VIII. ACKNOWLEDGMENT & SIGNATURE</div>
    
    <p style="font-size: 10px; line-height: 1.4; margin-bottom: 8px;">
      I/We hereby disclose the above invention and acknowledge reading the University's IP policies. Disclosure does not guarantee patent filing or IP protection.
    </p>

    <p style="font-size: 10px; line-height: 1.4; margin-bottom: 8px;">
      I/We declare the information is true and accurate. False information may result in loss of rights.
    </p>

    <div class="sig-grid">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Signature (Inventor)</div>
        <div style="font-size: 9px; margin-top: 2px;">___________________</div>
        <div style="font-size: 9px;">Date</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Printed Name</div>
      </div>
    </div>
  </div>

  <!-- CONFIDENTIAL NOTICE -->
  <div class="confidential">
    CONFIDENTIAL - FOR UNIVERSITY USE ONLY
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

export { generateFormalDisclosureHTML };
