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
import { X, Search, ExternalLink } from 'lucide-react';
import { fetchPublicIPRecord, type PublicIPRecordDetail } from '../services/publicIPRecordService';
import { IPRecordSummaryCard } from './IPRecordSummaryCard';

// ─── Loading skeleton ─────────────────────────────────────────────────────────

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
            <div className="p-6">
              <IPRecordSummaryCard
                data={{
                  title: record.title,
                  categoryLabel: record.categoryLabel,
                  statusLabel: record.statusLabel,
                  referenceNumber: record.referenceNumber,
                  filingYear: record.filingYear,
                  inventors: record.inventors,
                  collaborators: record.collaborators,
                  abstract: record.abstract,
                  keywords: record.keywords,
                }}
                primaryColor={primaryColor}
                standalone={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
