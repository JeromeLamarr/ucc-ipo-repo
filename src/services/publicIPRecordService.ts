/**
 * Public IP Record Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolated, read-only service for the Public IP Record Detail page (/ip-records/:trackingId).
 *
 * SAFETY NOTES:
 *  • Fetches a single record by tracking_id ONLY (never by internal id).
 *  • Only returns records that are NOT deleted and have an approved/ready status.
 *  • Never exposes: applicant email, phone, department_id, reviewer assignments,
 *    internal workflow fields, SLA data, raw JSON, or private attachments.
 *  • Extracts ONLY public-safe sub-fields from the details JSONB column.
 */

import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Same statuses used by the public search — must stay in sync. */
const PUBLIC_STATUSES: string[] = ['ready_for_filing', 'evaluator_approved'];

const CATEGORY_LABELS: Record<string, string> = {
  patent: 'Patent',
  utility_model: 'Utility Model',
  trademark: 'Trademark',
  design: 'Industrial Design',
  copyright: 'Copyright',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  ready_for_filing: 'Ready for Filing',
  evaluator_approved: 'Evaluator Approved',
};

// ─── Public-safe detail type ──────────────────────────────────────────────────

/**
 * All fields here are intentionally public-safe.
 * Never add: applicant details, reviewer info, internal IDs, or workflow state.
 */
export interface PublicIPRecordDetail {
  trackingId: string;
  referenceNumber: string;
  title: string;
  /** Human-readable category label, e.g. "Patent" */
  categoryLabel: string;
  /** Human-readable status label, e.g. "Ready for Filing" */
  statusLabel: string;
  abstract: string | null;
  keywords: string[];
  /** Inventor names only — no emails, IDs, or contact info */
  inventors: Array<{ name: string }>;
  /** Collaborator names only — no emails, IDs, or contact info */
  collaborators: Array<{ name: string }>;
  /** Year the record was created/submitted */
  filingYear: string;
}

// ─── Internal row shape ───────────────────────────────────────────────────────

/**
 * Minimal projection from ip_records — only columns needed for the public view.
 * Omits: applicant_id, supervisor_id, evaluator_id, id, current_stage, etc.
 */
interface PublicIPRecordRow {
  title: string;
  abstract: string | null;
  category: string;
  reference_number: string;
  status: string;
  created_at: string;
  tracking_id: string;
  details: Record<string, unknown> | null;
}

// ─── Public fetch function ────────────────────────────────────────────────────

/**
 * Fetch a single public-safe IP record by its tracking_id.
 *
 * Returns null if:
 *  - tracking_id does not exist
 *  - record is deleted
 *  - record status is not in the public-safe list
 *  - any database error occurs
 */
export async function fetchPublicIPRecord(
  trackingId: string,
): Promise<PublicIPRecordDetail | null> {
  if (!trackingId || typeof trackingId !== 'string' || trackingId.trim() === '') {
    return null;
  }

  const { data, error } = await supabase
    .from('ip_records')
    .select(
      'title, abstract, category, reference_number, status, created_at, tracking_id, details',
    )
    .eq('tracking_id', trackingId.trim())
    .eq('is_deleted', false)
    .in('status', PUBLIC_STATUSES)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[publicIPRecord] Supabase error:', error);
    }
    return null;
  }

  if (!data) return null;

  const row = data as unknown as PublicIPRecordRow;
  const details = (row.details ?? {}) as Record<string, unknown>;

  // ── Extract inventors (names only) ──────────────────────────────────────────
  const rawInventors = details.inventors;
  const inventors: Array<{ name: string }> = Array.isArray(rawInventors)
    ? (rawInventors as Array<Record<string, unknown>>)
        .map((inv) => ({ name: typeof inv.name === 'string' ? inv.name.trim() : '' }))
        .filter((inv) => inv.name !== '')
    : [];

  // ── Extract collaborators (names only) ──────────────────────────────────────
  const rawCollabs = details.collaborators;
  const collaborators: Array<{ name: string }> = Array.isArray(rawCollabs)
    ? (rawCollabs as Array<Record<string, unknown>>)
        .map((c) => ({ name: typeof c.name === 'string' ? c.name.trim() : '' }))
        .filter((c) => c.name !== '')
    : [];

  // ── Extract keywords ────────────────────────────────────────────────────────
  const rawKeywords = details.keywords;
  const keywords: string[] = Array.isArray(rawKeywords)
    ? (rawKeywords as unknown[])
        .filter((k): k is string => typeof k === 'string' && k.trim() !== '')
        .map((k) => k.trim())
    : [];

  return {
    trackingId: row.tracking_id,
    referenceNumber: row.reference_number ?? '',
    title: row.title,
    categoryLabel: CATEGORY_LABELS[row.category] ?? row.category,
    statusLabel: STATUS_LABELS[row.status] ?? row.status,
    abstract: row.abstract,
    keywords,
    inventors,
    collaborators,
    filingYear: row.created_at ? new Date(row.created_at).getFullYear().toString() : '',
  };
}
