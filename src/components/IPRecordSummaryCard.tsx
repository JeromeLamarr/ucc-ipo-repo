/**
 * IPRecordSummaryCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable UI component that renders a public-safe IP record summary.
 * Used in:
 *   - PublicIPRecordModal  (search portal "View Record" overlay)
 *   - CertificateVerifyPage (section 1 of the verification page)
 *
 * SAFETY: only accepts and renders fields explicitly passed in via
 * IPRecordSummaryData — never touches raw DB rows or internal ids.
 */

import { BookOpen, Calendar, FileText, Hash, Info, Tag, Users } from 'lucide-react';

// ─── Public data shape ────────────────────────────────────────────────────────

export interface IPRecordSummaryData {
  title: string;
  /** Human-readable label, e.g. "Patent" */
  categoryLabel: string;
  /** Human-readable label, e.g. "Ready for Filing" */
  statusLabel: string;
  referenceNumber?: string;
  /** 4-digit year string */
  filingYear?: string;
  inventors?: Array<{ name: string }>;
  collaborators?: Array<{ name: string }>;
  abstract?: string | null;
  keywords?: string[];
}

// ─── Sub-components (module-private) ────────────────────────────────────────

function DetailRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
          {label}
        </p>
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

// ─── Main exported component ──────────────────────────────────────────────────

interface IPRecordSummaryCardProps {
  data: IPRecordSummaryData;
  /** Accent colour for the category badge. Defaults to indigo. */
  primaryColor?: string;
  /** When true, wraps content in a rounded card shell (modal usage).
   *  When false, renders as flat content for embedding (cert page usage). */
  standalone?: boolean;
}

export function IPRecordSummaryCard({
  data,
  primaryColor = '#4f46e5',
  standalone = true,
}: IPRecordSummaryCardProps) {
  const content = (
    <div className="space-y-4">

      {/* ── Title + badges ── */}
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          <CategoryBadge label={data.categoryLabel} primaryColor={primaryColor} />
          <StatusBadge label={data.statusLabel} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 leading-snug">
          {data.title}
        </h3>
      </div>

      {/* ── Detail rows ── */}
      <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-100">
        {data.referenceNumber && (
          <DetailRow icon={<Hash className="h-4 w-4" />} label="Reference Number">
            <span className="font-mono font-semibold">{data.referenceNumber}</span>
          </DetailRow>
        )}

        <DetailRow icon={<BookOpen className="h-4 w-4" />} label="IP Type">
          {data.categoryLabel}
        </DetailRow>

        {data.filingYear && (
          <DetailRow icon={<Calendar className="h-4 w-4" />} label="Year Filed">
            {data.filingYear}
          </DetailRow>
        )}

        {(data.inventors ?? []).length > 0 && (
          <DetailRow icon={<Users className="h-4 w-4" />} label="Inventors / Authors">
            <ul className="space-y-0.5">
              {data.inventors!.map((inv, i) => (
                <li key={i}>{inv.name}</li>
              ))}
            </ul>
          </DetailRow>
        )}

        {(data.collaborators ?? []).length > 0 && (
          <DetailRow icon={<Users className="h-4 w-4" />} label="Collaborators">
            <ul className="space-y-0.5">
              {data.collaborators!.map((c, i) => (
                <li key={i}>{c.name}</li>
              ))}
            </ul>
          </DetailRow>
        )}
      </div>

      {/* ── Abstract ── */}
      {data.abstract && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Abstract / Summary
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {data.abstract}
          </p>
        </div>
      )}

      {/* ── Keywords ── */}
      {(data.keywords ?? []).length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Keywords
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.keywords!.map((kw) => (
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

      {/* ── Public notice ── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Public Summary Only.</strong> This shows publicly available information
          for approved IP records. For official IP filings or legal matters, consult a
          qualified IP professional.
        </span>
      </div>

    </div>
  );

  if (!standalone) return content;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {content}
    </div>
  );
}
