/**
 * Public IP Record Detail Page — /ip-records/:trackingId
 * ─────────────────────────────────────────────────────────────────────────────
 * NEW, isolated public page. Does NOT modify any existing component or workflow.
 *
 * Shows a public-safe summary of a single approved/public IP record.
 * Fields shown are strictly limited to non-sensitive public information.
 * Never exposes emails, internal IDs, reviewer assignments, or workflow data.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
  Hash,
  Info,
  Search,
  Tag,
  Users,
} from 'lucide-react';
import { PublicNavigation } from '../components/PublicNavigation';
import { Footer } from '../components/Footer';
import { useBranding } from '../hooks/useBranding';
import {
  fetchPublicIPRecord,
  type PublicIPRecordDetail,
} from '../services/publicIPRecordService';

// ─── Small presentational helpers ────────────────────────────────────────────

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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-4 bg-gray-100 rounded w-full mt-4" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
      <div className="h-4 bg-gray-100 rounded w-4/6" />
    </div>
  );
}

// ─── Not-found / error panel ──────────────────────────────────────────────────

function RecordNotFound({ onBackToSearch }: { onBackToSearch: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Record Not Found</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
        This record may not exist, may not be publicly available yet, or the
        link may be incorrect.
      </p>
      <button
        onClick={onBackToSearch}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to IP Search
      </button>
    </div>
  );
}

// ─── Public notice banner ─────────────────────────────────────────────────────

function PublicRecordNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>
        <strong>Public Summary Only.</strong> This page shows publicly available
        information for approved IP records registered with the UCC Intellectual
        Property Office. For official IP filings or legal matters, consult a
        qualified IP professional.
      </span>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export function PublicIPRecordPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const navigate = useNavigate();
  const { primaryColor } = useBranding();

  const [record, setRecord] = useState<PublicIPRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setRecord(null);

      if (!trackingId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const result = await fetchPublicIPRecord(trackingId);

      if (cancelled) return;

      if (!result) {
        setNotFound(true);
      } else {
        setRecord(result);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [trackingId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNavigation />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-10 pb-16">

        {/* Back link */}
        <button
          onClick={() => navigate('/ip-search')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to IP Search
        </button>

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">IP Record Summary</h1>
          <p className="text-sm text-gray-500 mt-1">
            University of Caloocan City — Intellectual Property Office
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <LoadingSkeleton />
          </div>
        ) : notFound ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <RecordNotFound onBackToSearch={() => navigate('/ip-search')} />
          </div>
        ) : record ? (
          <div className="space-y-4">

            {/* Main card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

              {/* Title + badges */}
              <div className="mb-5">
                <div className="flex flex-wrap gap-2 mb-3">
                  <CategoryBadge label={record.categoryLabel} primaryColor={primaryColor} />
                  <StatusBadge label={record.statusLabel} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">
                  {record.title}
                </h2>
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-gray-100">
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
            </div>

            {/* Abstract card */}
            {record.abstract && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Abstract / Summary
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {record.abstract}
                </p>
              </div>
            )}

            {/* Keywords card */}
            {record.keywords.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Keywords
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Public notice */}
            <PublicRecordNotice />

          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
