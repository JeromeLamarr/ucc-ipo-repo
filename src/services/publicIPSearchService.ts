/**
 * Public IP Search Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolated, read-only service for the Public IP Search Portal (/ip-search).
 *
 * SAFETY NOTES:
 *  • This file is NEW and does NOT modify any existing service or utility.
 *  • It only reads from ip_records using a narrow, public-safe filter.
 *  • It never exposes draft records, internal notes, or private documents.
 *  • IPOPHL and WIPO results are generated locally — no external scraping.
 */

import { supabase } from '../lib/supabase';

// ─── Official external database links ────────────────────────────────────────
// Update these constants to change where IPOPHL / WIPO cards point.
// Do NOT scrape or proxy these URLs — cards are destination links only.

const OFFICIAL_IP_DATABASE_LINKS = {
  IPOPHL: {
    TRADEMARK:
      'https://wipopublish.ipophil.gov.ph/wipopublish-search/public/trademarks',
    PATENTS_DESIGNS:
      'https://wipopublish.ipophil.gov.ph/wipopublish-search/public/patents',
  },
  WIPO: {
    BRAND_DB: 'https://branddb.wipo.int',
    PATENTSCOPE: 'https://patentscope.wipo.int/search/en/search.jsf',
    DESIGN_DB: 'https://designdb.wipo.int',
  },
};

// ─── Public types ─────────────────────────────────────────────────────────────

export type SearchSource = 'university' | 'ipophil' | 'international';

export type SearchIPType =
  | 'all'
  | 'patent'
  | 'utility_model'
  | 'trademark'
  | 'industrial_design'
  | 'copyright';

export interface PublicSearchResult {
  id: string;
  source: SearchSource;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  url: string;
  actionLabel: string;
  isExternal: boolean;
  /** Optional extras for university cards */
  year?: string;
  department?: string;
  inventors?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Statuses considered "public-safe" (fully approved / ready for filing).
 * Draft, under-review, and rejected records are intentionally excluded.
 */
const PUBLIC_STATUSES: string[] = ['ready_for_filing', 'evaluator_approved'];

/** Minimal shape for the fields we fetch from ip_records (public-safe only). */
interface PublicIPRow {
  id: string;
  title: string;
  abstract: string | null;
  category: string;
  reference_number: string;
  created_at: string;
  tracking_id: string | null;
  details: Record<string, unknown> | null;
}

/** Map from SearchIPType to the ip_records.category value in the database. */
const IP_TYPE_TO_CATEGORY: Partial<Record<SearchIPType, string>> = {
  patent: 'patent',
  utility_model: 'utility_model',
  trademark: 'trademark',
  industrial_design: 'design',
  copyright: 'copyright',
};

/** Human-readable labels for each category */
const CATEGORY_LABELS: Record<string, string> = {
  patent: 'Patent',
  utility_model: 'Utility Model',
  trademark: 'Trademark',
  design: 'Industrial Design',
  copyright: 'Copyright',
  other: 'Other',
};

function trimAbstract(text: string | null, maxLen = 160): string {
  if (!text) return 'No description available.';
  return text.length > maxLen ? text.substring(0, maxLen).trimEnd() + '…' : text;
}

// ─── University search ────────────────────────────────────────────────────────

/**
 * Query UCC IPO public-safe records from Supabase.
 * Only returns records that are NOT deleted and have an approved/ready status.
 */
export async function searchUniversityRecords(
  query: string,
  ipType: SearchIPType,
): Promise<PublicSearchResult[]> {
  let dbQuery = supabase
    .from('ip_records')
    .select(
      'id, title, abstract, category, reference_number, created_at, tracking_id, details',
    )
    .eq('is_deleted', false)
    .in('status', PUBLIC_STATUSES);

  // Apply IP type filter when a specific type is selected
  if (ipType !== 'all') {
    const category = IP_TYPE_TO_CATEGORY[ipType];
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }
  }

  // Full-text keyword filter on title (safe — no internal fields exposed)
  const trimmed = query.trim();
  if (trimmed) {
    dbQuery = dbQuery.ilike('title', `%${trimmed}%`);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false }).limit(20);

  const { data, error } = await dbQuery;
  if (error || !data) {
    if (import.meta.env.DEV) console.warn('[publicIPSearch] Supabase error:', error);
    return [];
  }

  const rows = data as unknown as PublicIPRow[];

  return rows.map((record): PublicSearchResult => {
    const year = record.created_at
      ? new Date(record.created_at).getFullYear().toString()
      : '';

    // Safely read public-safe detail fields — never expose internal notes
    const details = record.details as Record<string, unknown> | null;
    const inventorsRaw = details?.inventors;
    let inventorNames = '';
    if (Array.isArray(inventorsRaw)) {
      inventorNames = (inventorsRaw as Array<{ name?: string }>)
        .map((inv) => inv.name ?? '')
        .filter(Boolean)
        .join(', ');
    }

    const categoryLabel = CATEGORY_LABELS[record.category] ?? record.category;
    const refNum = record.reference_number ?? '';

    return {
      id: record.id,
      source: 'university',
      badge: 'UCC IPO',
      title: record.title,
      subtitle: [categoryLabel, refNum].filter(Boolean).join(' · '),
      description: trimAbstract(record.abstract),
      type: record.category,
      url: record.tracking_id ? `/verify/${record.tracking_id}` : '#',
      actionLabel: 'View Record',
      isExternal: false,
      year,
      inventors: inventorNames,
    };
  });
}

// ─── IPOPHL destination cards ─────────────────────────────────────────────────

interface DestinationCard {
  id: string;
  title: string;
  description: string;
  baseUrl: string;
  queryParam?: string;
}

const IPOPHL_CARDS: DestinationCard[] = [
  {
    id: 'ipophil-trademark',
    title: 'IPOPHL Trademark Search',
    description:
      'Search the official IPOPHL trademark registry for registered and pending trademark applications.',
    baseUrl: OFFICIAL_IP_DATABASE_LINKS.IPOPHL.TRADEMARK,
  },
  {
    id: 'ipophil-patent',
    title: 'IPOPHL Patent, Utility Model & Industrial Design Search',
    description:
      'Search the IPOPHL database for patents, utility model registrations, and industrial designs filed in the Philippines.',
    baseUrl: OFFICIAL_IP_DATABASE_LINKS.IPOPHL.PATENTS_DESIGNS,
  },
  {
    id: 'ipophil-copyright',
    title: 'IPOPHL Copyright Search',
    description:
      'Search voluntarily deposited copyright works registered with the National Library of the Philippines through IPOPHL.',
    baseUrl: 'https://www.ipophil.gov.ph/services/copyright/',
  },
];

/**
 * Return official IPOPHL destination cards.
 * Filtered by IP type when relevant. No external scraping.
 */
export function getIPOPHLCards(
  query: string,
  ipType: SearchIPType,
): PublicSearchResult[] {
  let cards = IPOPHL_CARDS;

  // Filter cards relevant to the selected IP type
  if (ipType === 'trademark') {
    cards = IPOPHL_CARDS.filter((c) => c.id === 'ipophil-trademark');
  } else if (ipType === 'patent' || ipType === 'utility_model' || ipType === 'industrial_design') {
    cards = IPOPHL_CARDS.filter((c) => c.id === 'ipophil-patent');
  } else if (ipType === 'copyright') {
    cards = IPOPHL_CARDS.filter((c) => c.id === 'ipophil-copyright');
  }

  return cards.map(
    (card): PublicSearchResult => ({
      id: card.id,
      source: 'ipophil',
      badge: 'IPOPHL',
      title: card.title,
      subtitle: 'Official IPOPHL Registry',
      description: query.trim()
        ? `${card.description} Search term: "${query.trim()}".`
        : card.description,
      type: 'destination',
      url: card.baseUrl,
      actionLabel: 'Open Official Search',
      isExternal: true,
    }),
  );
}

// ─── WIPO destination cards ───────────────────────────────────────────────────

const WIPO_CARDS: DestinationCard[] = [
  {
    id: 'wipo-patentscope',
    title: 'WIPO PATENTSCOPE',
    description:
      'Search millions of international patent applications filed under the Patent Cooperation Treaty (PCT) and national collections of participating offices.',
    baseUrl: OFFICIAL_IP_DATABASE_LINKS.WIPO.PATENTSCOPE,
    queryParam: 'query',
  },
  {
    id: 'wipo-brand',
    title: 'WIPO Global Brand Database',
    description:
      'Search trademark records from WIPO member states, the Madrid System, and regional offices around the world.',
    baseUrl: OFFICIAL_IP_DATABASE_LINKS.WIPO.BRAND_DB,
    queryParam: 'by=brandName&v',
  },
  {
    id: 'wipo-design',
    title: 'WIPO Global Design Database',
    description:
      'Search industrial designs registered via the Hague System and national offices from over 40 countries.',
    baseUrl: OFFICIAL_IP_DATABASE_LINKS.WIPO.DESIGN_DB,
  },
];

/**
 * Return official WIPO destination cards.
 * Filtered by IP type when relevant. No external scraping.
 */
export function getWIPOCards(query: string, ipType: SearchIPType): PublicSearchResult[] {
  let cards = WIPO_CARDS;

  if (ipType === 'trademark') {
    cards = WIPO_CARDS.filter((c) => c.id === 'wipo-brand');
  } else if (ipType === 'patent' || ipType === 'utility_model') {
    cards = WIPO_CARDS.filter((c) => c.id === 'wipo-patentscope');
  } else if (ipType === 'industrial_design') {
    cards = WIPO_CARDS.filter((c) => c.id === 'wipo-design');
  } else if (ipType === 'copyright') {
    // WIPO does not have a simple copyright search database
    cards = [];
  }

  return cards.map(
    (card): PublicSearchResult => ({
      id: card.id,
      source: 'international',
      badge: 'WIPO',
      title: card.title,
      subtitle: 'International IP Database',
      description: query.trim()
        ? `${card.description} Search term: "${query.trim()}".`
        : card.description,
      type: 'destination',
      url: card.baseUrl,
      actionLabel: 'Open WIPO Database',
      isExternal: true,
    }),
  );
}
