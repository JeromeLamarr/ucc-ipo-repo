import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import type { RecordDocumentationData } from '../utils/fetchFullRecordDocumentation';
import { generateHTMLContent } from '../utils/fullRecordDocumentationTemplate';
import {
  generateAndDownloadFullRecordPDF,
  downloadPDFFromURL,
} from '../utils/generateFullRecordPDF';

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

  const [pdfLoading, setPdfLoading] = useState(false);
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

  const handleDownloadHTML = () => {
    const htmlContent = generateHTMLContent(record, details, adminEmail);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UCC_IPO_Record_${record.reference_number || record.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);
      const url = await generateAndDownloadFullRecordPDF(record.id);
      await downloadPDFFromURL(
        url,
        `UCC_IPO_Record_${record.reference_number || record.id}.pdf`
      );
    } catch (err: any) {
      alert(`Failed to download PDF: ${err.message}`);
      console.error('PDF download error:', err);
    } finally {
      setPdfLoading(false);
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
        <div className="p-6 space-y-8">
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Download as HTML"
          >
            <Download className="h-4 w-4" />
            Download HTML
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
            title="Download as PDF (server-generated)"
          >
            {pdfLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

