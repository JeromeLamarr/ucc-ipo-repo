import React, { useRef, useState } from 'react';
import { X, Download, FileText, FileJson } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import type { RecordDocumentationData } from '../utils/fetchFullRecordDocumentation';

interface FullRecordDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RecordDocumentationData;
  adminEmail?: string;
}

export function FullRecordDocumentationModal({
  isOpen,
  onClose,
  record,
  adminEmail,
}: FullRecordDocumentationModalProps) {
  if (!isOpen) return null;

  const contentRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState<'pdf' | 'docx' | null>(null);

  const details = record.details || {};
  const renderField = (val: any) => {
    if (val === undefined || val === null || val === '' || val === 0) {
      return '—';
    }
    if (Array.isArray(val)) {
      return val.length === 0 ? '—' : val.join(', ');
    }
    return String(val);
  };

  const getFileName = (ext: string) => {
    return `UCC_IPO_Full_Record_${record.reference_number || record.id}.${ext}`;
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateHTMLContent(record, details, adminEmail);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFileName('html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      setExportLoading('pdf');
      
      if (!contentRef.current) {
        alert('Documentation content not found. Please try again.');
        return;
      }

      const element = contentRef.current;
      const opt = {
        margin: 10,
        filename: getFileName('pdf'),
        image: {
          type: 'jpeg',
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
        },
        jsPDF: {
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadDOCX = async () => {
    try {
      setExportLoading('docx');

      if (!contentRef.current) {
        alert('Documentation content not found. Please try again.');
        return;
      }

      // Build document sections from record data
      const sections = [
        new Paragraph({
          text: 'UCC IPO — Full Record Documentation',
          heading: HeadingLevel.HEADING_1,
          thematicBreak: false,
        }),
        
        new Paragraph({
          text: `Tracking Number: ${renderField(record.reference_number)}`,
          thematicBreak: false,
        }),
        new Paragraph({
          text: `Record ID: ${record.id}`,
          thematicBreak: false,
        }),
        new Paragraph({
          text: `Status: ${record.status}`,
          thematicBreak: false,
        }),
        new Paragraph({
          text: `Current Stage: ${record.current_stage}`,
          thematicBreak: false,
        }),
        new Paragraph({
          text: `Created: ${new Date(record.created_at).toLocaleString()}`,
          thematicBreak: false,
        }),
        new Paragraph({
          text: `Updated: ${new Date(record.updated_at).toLocaleString()}`,
          thematicBreak: false,
        }),
        
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Applicant Information',
          heading: HeadingLevel.HEADING_2,
          thematicBreak: false,
        }),
        new Paragraph({
          text: record.applicant
            ? `${record.applicant.full_name} (${record.applicant.email})`
            : 'Applicant data not available',
          thematicBreak: false,
        }),
        
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Record Overview',
          heading: HeadingLevel.HEADING_2,
          thematicBreak: false,
        }),
        new Paragraph({ text: `Title: ${renderField(record.title)}`, thematicBreak: false }),
        new Paragraph({ text: `Category: ${renderField(record.category)}`, thematicBreak: false }),
        new Paragraph({ text: `Abstract: ${renderField(record.abstract)}`, thematicBreak: false }),
        
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Technical Narrative',
          heading: HeadingLevel.HEADING_2,
          thematicBreak: false,
        }),
        new Paragraph({ text: `Description: ${renderField(details.description)}`, thematicBreak: false }),
        new Paragraph({ text: `Technical Field: ${renderField(details.technicalField)}`, thematicBreak: false }),
        new Paragraph({ text: `Background Art: ${renderField(details.backgroundArt)}`, thematicBreak: false }),
        new Paragraph({ text: `Problem Statement: ${renderField(details.problemStatement)}`, thematicBreak: false }),
        new Paragraph({ text: `Solution: ${renderField(details.solution)}`, thematicBreak: false }),
        new Paragraph({ text: `Advantages: ${renderField(details.advantages)}`, thematicBreak: false }),
        new Paragraph({ text: `Implementation: ${renderField(details.implementation)}`, thematicBreak: false }),
        
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Prior Art / Keywords / Publications',
          heading: HeadingLevel.HEADING_2,
          thematicBreak: false,
        }),
        new Paragraph({ text: `Prior Art: ${renderField(details.priorArt)}`, thematicBreak: false }),
        new Paragraph({ 
          text: `Keywords: ${(details.keywords || []).length === 0 ? '—' : (details.keywords || []).join(', ')}`,
          thematicBreak: false,
        }),
        new Paragraph({ text: `Related Publications: ${renderField(details.relatedPublications)}`, thematicBreak: false }),
        
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Commercial Information',
          heading: HeadingLevel.HEADING_2,
          thematicBreak: false,
        }),
        new Paragraph({ text: `Commercial Potential: ${renderField(details.commercialPotential)}`, thematicBreak: false }),
        new Paragraph({ text: `Target Market: ${renderField(details.targetMarket)}`, thematicBreak: false }),
        new Paragraph({ text: `Competitive Advantage: ${renderField(details.competitiveAdvantage)}`, thematicBreak: false }),
        new Paragraph({ text: `Estimated Value: ${renderField(details.estimatedValue)}`, thematicBreak: false }),
        new Paragraph({ text: `Funding: ${renderField(details.funding)}`, thematicBreak: false }),
        
        new Paragraph({ text: '' }),
        new Paragraph({
          text: `Generated: ${new Date().toLocaleString()}`,
          thematicBreak: false,
        }),
        ...(adminEmail ? [new Paragraph({ text: `Admin: ${adminEmail}`, thematicBreak: false })] : []),
      ];

      const doc = new Document({ sections: [{ children: sections }] });
      const blob = await Packer.toBlob(doc);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName('docx');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Failed to generate DOCX. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            UCC IPO — Full Record Documentation
          </h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8" ref={contentRef}>
          {/* Header Info */}
          <div className="border-b border-gray-200 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Tracking Number</p>
                <p className="text-lg font-semibold text-gray-900">
                  {renderField(record.reference_number)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Record ID</p>
                <p className="text-lg font-mono text-gray-900">{record.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">{record.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Current Stage</p>
                <p className="text-lg font-semibold text-gray-900">{record.current_stage}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(record.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(record.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Applicant Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Applicant Information</h2>
            {record.applicant ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-gray-900">{renderField(record.applicant.full_name)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{renderField(record.applicant.email)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Department ID</p>
                  <p className="text-gray-900">{renderField(record.applicant.department_id)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">Applicant data not available</p>
            )}
          </div>

          {/* Supervisor & Evaluator */}
          {(record.supervisor || record.evaluator) && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Assigned Reviewers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {record.supervisor && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-medium text-gray-500 mb-2">Supervisor</p>
                    <p className="font-semibold text-gray-900">{record.supervisor.full_name}</p>
                    <p className="text-sm text-gray-600">{record.supervisor.email}</p>
                  </div>
                )}
                {record.evaluator && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm font-medium text-gray-500 mb-2">Evaluator</p>
                    <p className="font-semibold text-gray-900">{record.evaluator.full_name}</p>
                    <p className="text-sm text-gray-600">{record.evaluator.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Record Overview */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Record Overview</h2>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Title</p>
                <p className="text-gray-900">{renderField(record.title)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-gray-900 capitalize">{renderField(record.category)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Abstract</p>
                <p className="text-gray-900 whitespace-pre-wrap">{renderField(record.abstract)}</p>
              </div>
            </div>
          </div>

          {/* Technical Narrative */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Technical Narrative</h2>
            <div className="space-y-4">
              {[
                { key: 'description', label: 'Description' },
                { key: 'technicalField', label: 'Technical Field' },
                { key: 'backgroundArt', label: 'Background Art' },
                { key: 'problemStatement', label: 'Problem Statement' },
                { key: 'solution', label: 'Solution' },
                { key: 'advantages', label: 'Advantages' },
                { key: 'implementation', label: 'Implementation' },
              ].map((field) => (
                <div key={field.key}>
                  <p className="text-sm font-medium text-gray-500 mb-1">{field.label}</p>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {renderField(details[field.key])}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Inventors / Collaborators / Co-Creators */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Inventors / Collaborators / Co-Creators
            </h2>
            <div className="space-y-4">
              {/* Inventors */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Inventors</h3>
                {(details.inventors || []).length === 0 ? (
                  <p className="text-gray-500 italic">—</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">
                            Affiliation
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(details.inventors || []).map((inv: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{renderField(inv.name)}</td>
                            <td className="px-4 py-2">{renderField(inv.affiliation)}</td>
                            <td className="px-4 py-2">{renderField(inv.email)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Collaborators */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Collaborators</h3>
                {(details.collaborators || []).length === 0 ? (
                  <p className="text-gray-500 italic">—</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">
                            Affiliation
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(details.collaborators || []).map((col: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{renderField(col.name)}</td>
                            <td className="px-4 py-2">{renderField(col.affiliation)}</td>
                            <td className="px-4 py-2">{renderField(col.email)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Co-Creators */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Co-Creators</h3>
                {(details.coCreators || []).length === 0 ? (
                  <p className="text-gray-500 italic">—</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">
                            Affiliation
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(details.coCreators || []).map((co: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{renderField(co.name)}</td>
                            <td className="px-4 py-2">{renderField(co.affiliation)}</td>
                            <td className="px-4 py-2">{renderField(co.email)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prior Art / Keywords / Publications */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Prior Art / Keywords / Publications
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Prior Art</p>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                  {renderField(details.priorArt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Keywords</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">
                  {(details.keywords || []).length === 0
                    ? '—'
                    : (details.keywords || []).join(', ')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Related Publications</p>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                  {renderField(details.relatedPublications)}
                </p>
              </div>
            </div>
          </div>

          {/* Commercial Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Commercial Information</h2>
            <div className="space-y-4">
              {[
                { key: 'commercialPotential', label: 'Commercial Potential' },
                { key: 'targetMarket', label: 'Target Market' },
                { key: 'competitiveAdvantage', label: 'Competitive Advantage' },
                { key: 'estimatedValue', label: 'Estimated Value' },
                { key: 'funding', label: 'Funding' },
              ].map((field) => (
                <div key={field.key}>
                  <p className="text-sm font-medium text-gray-500">{field.label}</p>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {renderField(details[field.key])}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation */}
          {details.evaluationScore && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Evaluation</h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-sm text-gray-900 overflow-x-auto">
                  {JSON.stringify(details.evaluationScore, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-xs text-gray-500">
            <p>Generated: {new Date().toLocaleString()}</p>
            {adminEmail && <p>Admin: {adminEmail}</p>}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={handleDownloadHTML}
            disabled={exportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download as HTML"
          >
            <Download className="h-4 w-4" />
            Download HTML
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={exportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download as PDF"
          >
            {exportLoading === 'pdf' ? (
              <>
                <span className="h-4 w-4 inline-block animate-spin">⚙️</span>
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={handleDownloadDOCX}
            disabled={exportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download as DOCX"
          >
            {exportLoading === 'docx' ? (
              <>
                <span className="h-4 w-4 inline-block animate-spin">⚙️</span>
                Generating...
              </>
            ) : (
              <>
                <FileJson className="h-4 w-4" />
                Download DOCX
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={exportLoading !== null}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function generateHTMLContent(
  record: RecordDocumentationData,
  details: any,
  adminEmail?: string
): string {
  const renderField = (val: any) => {
    if (val === undefined || val === null || val === '' || val === 0) {
      return '—';
    }
    if (Array.isArray(val)) {
      return val.length === 0 ? '—' : val.join(', ');
    }
    return String(val);
  };

  const tableHTML = (rows: any[]) => {
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
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>UCC IPO — Full Record Documentation</title>
  <style>
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
    h1 {
      color: #1f2937;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    h2 {
      color: #1f2937;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }
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
    }
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
    pre {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
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
    @media print {
      body {
        padding: 0;
        background-color: white;
      }
      .container {
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>UCC IPO — Full Record Documentation</h1>
    
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

    <h2>Technical Narrative</h2>
    <div class="section">
      ${[
        { key: 'description', label: 'Description' },
        { key: 'technicalField', label: 'Technical Field' },
        { key: 'backgroundArt', label: 'Background Art' },
        { key: 'problemStatement', label: 'Problem Statement' },
        { key: 'solution', label: 'Solution' },
        { key: 'advantages', label: 'Advantages' },
        { key: 'implementation', label: 'Implementation' },
      ]
        .map(
          (field) => `
        <div class="info-item">
          <label>${field.label}</label>
          <value style="white-space: pre-wrap;">${renderField(details[field.key])}</value>
        </div>
      `
        )
        .join('')}
    </div>

    <h2>Inventors / Collaborators / Co-Creators</h2>
    <div class="section">
      <h3 style="font-size: 16px; margin-top: 15px;">Inventors</h3>
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

      <h3 style="font-size: 16px; margin-top: 15px;">Collaborators</h3>
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

      <h3 style="font-size: 16px; margin-top: 15px;">Co-Creators</h3>
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

    <h2>Commercial Information</h2>
    <div class="section">
      ${[
        { key: 'commercialPotential', label: 'Commercial Potential' },
        { key: 'targetMarket', label: 'Target Market' },
        { key: 'competitiveAdvantage', label: 'Competitive Advantage' },
        { key: 'estimatedValue', label: 'Estimated Value' },
        { key: 'funding', label: 'Funding' },
      ]
        .map(
          (field) => `
        <div class="info-item">
          <label>${field.label}</label>
          <value style="white-space: pre-wrap;">${renderField(details[field.key])}</value>
        </div>
      `
        )
        .join('')}
    </div>

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

    <footer>
      <p>Generated: ${new Date().toLocaleString()}</p>
      ${adminEmail ? `<p>Admin: ${adminEmail}</p>` : ''}
    </footer>
  </div>
</body>
</html>
  `;
}
