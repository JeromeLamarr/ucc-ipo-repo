/**
 * Public IP Record Modal
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays a public-safe IP record summary in an overlay modal.
 * Used by PublicIPSearchPage so users stay on the search page.
 *
 * SAFETY: fetches via publicIPRecordService — reads only approved, non-deleted
 * records and never exposes private/internal fields.
 */

import { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  FileText,
  Hash,
  Info,
  Search,
  Tag,
  Users,
  ExternalLink,
} from 'lucide-react';
import { fetchPublicIPRecord, type PublicIPRecordDetail } from '../services/publicIPRecordService';

// ─── Inner presentational helpers ────────────────────────────────────────────

function DetailRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      {label}
    </span>
  );
}

function CategoryBadge({ label, primaryColor }: { label: string; primaryColor: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
    >
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-6 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-4 bg-gray-100 rounded w-full mt-4" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
      <div className="h-4 bg-gray-100 rounded w-4/6" />
    </div>
  );
}

// ─── Modal component ──────────────────────────────────────────────────────────

interface PublicIPRecordModalProps {
  trackingId: string | null;
  onClose: () => void;
  primaryColor: string;
}

export function PublicIPRecordModal({ trackingId, onClose, primaryColor }: PublicIPRecordModalProps) {
  const [record, setRecord] = useState<PublicIPRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Fetch whenever trackingId changes
  useEffect(() => {
    if (!trackingId) return;

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setRecord(null);

    fetchPublicIPRecord(trackingId).then((result) => {
      if (cancelled) return;
      if (!result) setNotFound(true);
      else setRecord(result);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [trackingId]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (trackingId) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [trackingId]);

  if (!trackingId) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">IP Record Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">University of Caloocan City — IPO</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Open in full page link */}
            {record && (
              <a
                href={`/ip-records/${record.trackingId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
                title="Open in full page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Full page</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && <LoadingSkeleton />}

          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Search className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-gray-700 font-semibold mb-1">Record Not Found</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                This record may not exist, may not be publicly available yet, or the link may be incorrect.
              </p>
            </div>
          )}

          {!loading && record && (
            <div className="p-6 space-y-4">

              {/* Title + badges */}
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <CategoryBadge label={record.categoryLabel} primaryColor={primaryColor} />
                  <StatusBadge label={record.statusLabel} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {record.title}
                </h3>
              </div>

              {/* Detail rows */}
              <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-100">
                <DetailRow icon={<Hash className="h-4 w-4" />} label="Reference Number">
                  <span className="font-mono font-semibold">{record.referenceNumber || '—'}</span>
                </DetailRow>

                <DetailRow icon={<BookOpen className="h-4 w-4" />} label="IP Type">
                  {record.categoryLabel}
                </DetailRow>

                {record.filingYear && (
                  <DetailRow icon={<Calendar className="h-4 w-4" />} label="Year Filed">
                    {record.filingYear}
                  </DetailRow>
                )}

                {record.inventors.length > 0 && (
                  <DetailRow icon={<Users className="h-4 w-4" />} label="Inventors / Authors">
                    <ul className="space-y-0.5">
                      {record.inventors.map((inv, i) => (
                        <li key={i}>{inv.name}</li>
                      ))}
                    </ul>
                  </DetailRow>
                )}

                {record.collaborators.length > 0 && (
                  <DetailRow icon={<Users className="h-4 w-4" />} label="Collaborators">
                    <ul className="space-y-0.5">
                      {record.collaborators.map((c, i) => (
                        <li key={i}>{c.name}</li>
                      ))}
                    </ul>
                  </DetailRow>
                )}
              </div>

              {/* Abstract */}
              {record.abstract && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Abstract / Summary
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {record.abstract}
                  </p>
                </div>
              )}

              {/* Keywords */}
              {record.keywords.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Keywords
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Public notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Public Summary Only.</strong> This shows publicly available information
                  for approved IP records. For official IP filings or legal matters, consult a
                  qualified IP professional.
                </span>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
