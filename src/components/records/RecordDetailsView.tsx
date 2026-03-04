/**
 * RecordDetailsView — Shared presentation component for IP Submission detail views.
 *
 * Used in:
 *   - SupervisorReviewPage  (inside the detail modal body)
 *   - EvaluatorEvaluationsPage  (inside the detail modal body)
 *   - SubmissionDetailPage  (full page — wraps the read-only view)
 *
 * PURE PRESENTATION: no Supabase calls, no side-effects, no routing.
 * All data and callbacks are provided through props.
 *
 * Layout follows the gold standard established in AllRecordsPage.tsx:
 *   - Cards: bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6
 *   - Grids: grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4
 *   - Headers: flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3
 */

import React from 'react';
import {
  FileText,
  Download,
  User,
  Tag,
  Calendar,
  Mail,
  Hash,
  Briefcase,
  Layers,
} from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../../lib/statusLabels';
import { ProcessTrackingWizard } from '../ProcessTrackingWizard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecordUser {
  id?: string;
  full_name?: string | null;
  email?: string | null;
}

export interface RecordDetailsRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  current_stage?: string | null;
  created_at: string;
  abstract?: string | null;
  reference_number?: string | null;
  details?: Record<string, unknown> | null;
  applicant?: RecordUser | null;
  supervisor?: RecordUser | null;
  evaluator?: RecordUser | null;
}

export interface RecordDetailsDocument {
  id: string;
  file_name: string;
  size_bytes?: number | null;
  created_at: string;
  doc_type?: string | null;
}

export interface RecordDetailsViewProps {
  record: RecordDetailsRecord;
  documents: RecordDetailsDocument[];
  /** Resolves a department UUID to a human-readable name. Defaults to pass-through. */
  getDepartmentName?: (id: string) => string;
  formatDate: (date: string) => string;
  formatFileSize: (bytes: number) => string;
  /** Resolves a doc_type key to a human-readable label (optional). */
  getDocTypeLabel?: (type: string) => string;
  onDownloadDocument: (doc: RecordDetailsDocument) => void | Promise<void>;
  /**
   * Slot rendered at the bottom, inside a sticky action bar.
   * Typically role-specific action buttons:
   *   - Supervisor: Approve / Request Revision / Reject
   *   - Evaluator: Start Evaluation
   *   - Admin: admin actions
   */
  renderActions?: React.ReactNode;
  /**
   * Slot rendered after the Documents card.
   * For page-specific blocks: Evaluations, Materials, Admin Actions,
   * CertificateManager, FullDisclosureManager, etc.
   */
  renderExtraContent?: React.ReactNode;
  /**
   * When true, renders the Supervisor in the header info card.
   * Useful for Evaluator view where the supervisor is relevant context.
   * Default: false
   */
  showSupervisorField?: boolean;
  /**
   * When true, renders the Evaluator in the header info card.
   * Default: false
   */
  showEvaluatorField?: boolean;
}

// ─── Small helper ─────────────────────────────────────────────────────────────

const DetailCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
    <h4 className="text-lg font-bold text-gray-900 mb-3">{title}</h4>
    {children}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function RecordDetailsView({
  record,
  documents,
  getDepartmentName = (id) => id,
  formatDate,
  formatFileSize,
  getDocTypeLabel,
  onDownloadDocument,
  renderActions,
  renderExtraContent,
  showSupervisorField = false,
  showEvaluatorField = false,
}: RecordDetailsViewProps) {
  const details =
    record.details && typeof record.details === 'object'
      ? (record.details as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-6">
      {/* ── Header Info Card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        {/* Title + Status badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 break-words">
              {record.title}
            </h2>
            {record.reference_number && (
              <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {record.reference_number}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 self-start px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor(
              record.status
            )}`}
          >
            {getStatusLabel(record.status)}
          </span>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 text-sm">
          {record.applicant?.full_name && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Applicant
                </p>
                <p className="text-gray-900 font-medium">
                  {record.applicant.full_name}
                </p>
                {record.applicant.email && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />
                    {record.applicant.email}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Category
              </p>
              <p className="text-gray-900 font-medium capitalize">
                {record.category}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Submitted
              </p>
              <p className="text-gray-900">{formatDate(record.created_at)}</p>
            </div>
          </div>

          {showSupervisorField && record.supervisor?.full_name && (
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Supervisor
                </p>
                <p className="text-gray-900 font-medium">
                  {record.supervisor.full_name}
                </p>
              </div>
            </div>
          )}

          {showEvaluatorField && record.evaluator?.full_name && (
            <div className="flex items-start gap-2">
              <Layers className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Evaluator
                </p>
                <p className="text-gray-900 font-medium">
                  {record.evaluator.full_name}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Process Tracking ─────────────────────────────────────────────── */}
      <ProcessTrackingWizard
        ipRecordId={record.id}
        currentStatus={record.status}
        currentStage={record.current_stage ?? ''}
      />

      {/* ── Abstract ─────────────────────────────────────────────────────── */}
      {record.abstract && (
        <DetailCard title="Abstract">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {record.abstract}
          </p>
        </DetailCard>
      )}

      {/* ── Structured Detail Fields ─────────────────────────────────────── */}
      {details && (
        <>
          {details.description && (
            <DetailCard title="Description">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {String(details.description)}
              </p>
            </DetailCard>
          )}

          {details.technicalField && (
            <DetailCard title="Technical Field">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {String(details.technicalField)}
              </p>
            </DetailCard>
          )}

          {details.backgroundArt && (
            <DetailCard title="Background Art">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {String(details.backgroundArt)}
              </p>
            </DetailCard>
          )}

          {details.problemStatement && (
            <DetailCard title="Problem Statement">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {String(details.problemStatement)}
              </p>
            </DetailCard>
          )}

          {details.solution && (
            <DetailCard title="Solution">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {String(details.solution)}
              </p>
            </DetailCard>
          )}

          {details.advantages && (
            <DetailCard title="Advantages">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {String(details.advantages)}
              </p>
            </DetailCard>
          )}

          {details.inventors && Array.isArray(details.inventors) && (
            <DetailCard title="Inventors">
              <div className="space-y-3">
                {(details.inventors as Array<{
                  name?: string;
                  affiliation?: string;
                  contribution?: string;
                }>).map((inv, idx) => (
                  <div
                    key={idx}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <p className="font-semibold text-gray-900">{inv.name}</p>
                    {inv.affiliation && (
                      <p className="text-sm text-gray-600">
                        Affiliation: {getDepartmentName(inv.affiliation as string)}
                      </p>
                    )}
                    {inv.contribution && (
                      <p className="text-sm text-gray-600">
                        Contribution: {inv.contribution}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DetailCard>
          )}
        </>
      )}

      {/* ── Documents ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">
          Documents ({documents.length})
        </h4>
        {documents.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3" />
            <p className="text-sm">No documents uploaded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-7 w-7 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {doc.file_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getDocTypeLabel && doc.doc_type
                        ? `${getDocTypeLabel(doc.doc_type)} • `
                        : ''}
                      {doc.size_bytes ? formatFileSize(doc.size_bytes) : '—'} •{' '}
                      {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDownloadDocument(doc)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors ml-3"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Extra Content Slot ───────────────────────────────────────────── */}
      {renderExtraContent}

      {/* ── Actions Slot ─────────────────────────────────────────────────── */}
      {renderActions && (
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
          {renderActions}
        </div>
      )}
    </div>
  );
}
