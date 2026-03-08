/**
 * Public IP Search Portal — /ip-search
 * ─────────────────────────────────────────────────────────────────────────────
 * This is a NEW, isolated public page.
 *  • Does NOT use the CMS page builder.
 *  • Does NOT modify any existing component, service, or workflow.
 *  • Uses the shared PublicNavigation + Footer layout (read-only reuse).
 *  • All search logic is delegated to publicIPSearchService (new, isolated).
 */

import { useState, useCallback } from 'react';
import { Search, ExternalLink, BookOpen, Globe2, Building2, AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { PublicNavigation } from '../components/PublicNavigation';
import { Footer } from '../components/Footer';
import { useBranding } from '../hooks/useBranding';
import {
  searchUniversityRecords,
  getIPOPHLCards,
  getWIPOCards,
  type SearchSource,
  type SearchIPType,
  type PublicSearchResult,
} from '../services/publicIPSearchService';
import { PublicIPRecordModal } from '../components/PublicIPRecordModal';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Source options for the "Search in" dropdown */
const SOURCE_OPTIONS: { value: SearchSource; label: string; icon: typeof Globe2 }[] = [
  { value: 'university', label: 'University IP Search', icon: Building2 },
  { value: 'ipophil', label: 'IPOPHL IP Search', icon: BookOpen },
  { value: 'international', label: 'International IP Search', icon: Globe2 },
];

/** IP type options */
const IP_TYPE_OPTIONS: { value: SearchIPType; label: string }[] = [
  { value: 'all', label: 'All IP Types' },
  { value: 'patent', label: 'Patent' },
  { value: 'utility_model', label: 'Utility Model' },
  { value: 'trademark', label: 'Trademark' },
  { value: 'industrial_design', label: 'Industrial Design' },
  { value: 'copyright', label: 'Copyright' },
];

// ── Custom select (matches existing public-page aesthetic) ────────────────────
interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  primaryColor: string;
}
function StyledSelect<T extends string>({ value, onChange, options, label, primaryColor }: SelectProps<T>) {
  return (
    <div className="relative flex-1 min-w-0">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          title={label}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-800 font-medium text-sm shadow-sm focus:outline-none focus:ring-2 transition-all cursor-pointer"
          style={{ ['--focus-ring-color' as string]: primaryColor }}
          onFocus={(e) => (e.currentTarget.style.borderColor = primaryColor)}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>
    </div>
  );
}

// ── Source badge component ────────────────────────────────────────────────────
function SourceBadge({ source, badge }: { source: SearchSource; badge: string }) {
  const colors: Record<SearchSource, string> = {
    university: 'bg-blue-100 text-blue-700',
    ipophil: 'bg-amber-100 text-amber-700',
    international: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[source]}`}>
      {badge}
    </span>
  );
}

// ── University result card ────────────────────────────────────────────────────
function UniversityResultCard({
  result,
  primaryColor,
  onViewRecord,
}: {
  result: PublicSearchResult;
  primaryColor: string;
  onViewRecord: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <SourceBadge source={result.source} badge={result.badge} />
        {result.year && (
          <span className="text-xs text-gray-400 font-medium">{result.year}</span>
        )}
      </div>

      <div>
        <h3 className="text-gray-900 font-semibold text-base leading-snug mb-1">
          {result.title}
        </h3>
        <p className="text-xs font-medium text-gray-500 mb-2">{result.subtitle}</p>
        {result.inventors && (
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-semibold">Inventors:</span> {result.inventors}
          </p>
        )}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {result.description}
        </p>
      </div>

      <div className="mt-auto pt-1">
        {result.url && result.url !== '#' ? (
          <button
            onClick={onViewRecord}
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: primaryColor }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {result.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-gray-400 italic">Record link unavailable</span>
        )}
      </div>
    </div>
  );
}

// ── Official destination card (IPOPHL / WIPO) ─────────────────────────────────
function OfficialSearchCard({
  result,
  primaryColor,
}: {
  result: PublicSearchResult;
  primaryColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <SourceBadge source={result.source} badge={result.badge} />
        {result.isExternal && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Official Link
          </span>
        )}
      </div>

      <div>
        <h3 className="text-gray-900 font-semibold text-base leading-snug mb-1">
          {result.title}
        </h3>
        <p className="text-xs font-medium text-gray-500 mb-2">{result.subtitle}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{result.description}</p>
      </div>

      <div className="mt-auto pt-1">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 focus:outline-none"
          style={{ backgroundColor: primaryColor }}
        >
          {result.actionLabel}
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

// ── Zero-results panel ────────────────────────────────────────────────────────
function ZeroResultsPanel({
  query,
  onSwitchSource,
}: {
  query: string;
  onSwitchSource: (source: SearchSource) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
      <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
      <h3 className="text-gray-700 font-semibold text-lg mb-2">No university records found</h3>
      <p className="text-gray-500 text-sm mb-6">
        No public UCC IPO records matched{query ? ` "${query}"` : ' your search'}.
      </p>
      <ul className="text-sm text-gray-500 text-left inline-block mb-6 space-y-1.5">
        <li>• Try fewer or broader keywords</li>
        <li>• Try selecting "All IP Types"</li>
        <li>• Check spelling of your search term</li>
        <li>• Search in official external databases</li>
      </ul>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => onSwitchSource('ipophil')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
        >
          <BookOpen className="h-4 w-4" />
          Continue in IPOPHL
        </button>
        <button
          onClick={() => onSwitchSource('international')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
        >
          <Globe2 className="h-4 w-4" />
          Continue in WIPO
        </button>
      </div>
    </div>
  );
}

// ── Disclaimer notice ─────────────────────────────────────────────────────────
function SearchNotice() {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-400" />
      <p className="leading-relaxed">
        <span className="font-semibold">Preliminary Search Only.</span>{' '}
        This tool provides preliminary search guidance only. University results are based on public
        UCC IPO records. External searches redirect to official databases such as IPOPHL and WIPO.
        Absence of results does not guarantee legal availability or non-infringement. Consult a
        qualified IP professional for legal clearance.
      </p>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export function PublicIPSearchPage() {
  const { primaryColor } = useBranding();

  const [source, setSource] = useState<SearchSource>('university');
  const [ipType, setIpType] = useState<SearchIPType>('all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSearchedSource, setLastSearchedSource] = useState<SearchSource | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setLastSearchedSource(source);
    setLastSearchedQuery(query);

    try {
      let searchResults: PublicSearchResult[] = [];

      if (source === 'university') {
        searchResults = await searchUniversityRecords(query, ipType);
      } else if (source === 'ipophil') {
        searchResults = getIPOPHLCards(query, ipType);
      } else {
        searchResults = getWIPOCards(query, ipType);
      }

      setResults(searchResults);
    } catch (err) {
      setErrorMsg('An error occurred while searching. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [source, ipType, query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSwitchSource = (newSource: SearchSource) => {
    setSource(newSource);
    // Maintain the current query when switching sources
    setResults(null);
  };

  const sourceOption = SOURCE_OPTIONS.find((o) => o.value === source);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavigation />

      <div className="pt-16">
        {/* ─── Hero section ──────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden py-16 sm:py-20"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}18 0%, #f8fafc 60%, ${primaryColor}0a 100%)`,
          }}
        >
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${primaryColor}22 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 border"
              style={{
                color: primaryColor,
                borderColor: `${primaryColor}40`,
                backgroundColor: `${primaryColor}10`,
              }}
            >
              <Search className="h-3.5 w-3.5" />
              IP Search Portal
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
              Public IP Search Portal
            </h1>

            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              Perform preliminary searches across UCC IPO university records, the official IPOPHL
              database, and international repositories via WIPO — all in one place.
            </p>
          </div>
        </div>

        {/* ─── Search controls ───────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">

            {/* Row 1: source + type selectors */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <StyledSelect<SearchSource>
                label="Search In"
                value={source}
                onChange={(v) => { setSource(v); setResults(null); }}
                options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                primaryColor={primaryColor}
              />
              <StyledSelect<SearchIPType>
                label="IP Type"
                value={ipType}
                onChange={setIpType}
                options={IP_TYPE_OPTIONS}
                primaryColor={primaryColor}
              />
            </div>

            {/* Row 2: keyword input + search button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    source === 'university'
                      ? 'Search UCC IPO records by title…'
                      : source === 'ipophil'
                      ? 'Enter keyword for IPOPHL search…'
                      : 'Enter keyword for WIPO search…'
                  }
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none transition-all"
                  onFocus={(e) => (e.currentTarget.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching…
                  </span>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Active source indicator */}
            {sourceOption && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <sourceOption.icon className="h-3.5 w-3.5" />
                <span>
                  Searching in:{' '}
                  <span className="font-semibold text-gray-700">{sourceOption.label}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Results panel ─────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-8">

          {/* Error state */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 mb-6 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-400" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Results */}
          {results !== null && !loading && (
            <div className="mb-8">
              {/* Results header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-800 font-semibold text-base">
                  {results.length > 0 ? (
                    <>
                      {lastSearchedSource === 'university'
                        ? `${results.length} public record${results.length !== 1 ? 's' : ''} found`
                        : `${results.length} official search destination${results.length !== 1 ? 's' : ''}`}
                      {lastSearchedQuery && (
                        <span className="text-gray-500 font-normal">
                          {' '}for "{lastSearchedQuery}"
                        </span>
                      )}
                    </>
                  ) : (
                    'No results'
                  )}
                </h2>
                {lastSearchedSource && (
                  <SourceBadge
                    source={lastSearchedSource}
                    badge={
                      lastSearchedSource === 'university'
                        ? 'UCC IPO'
                        : lastSearchedSource === 'ipophil'
                        ? 'IPOPHL'
                        : 'WIPO'
                    }
                  />
                )}
              </div>

              {/* Zero results (university) */}
              {results.length === 0 && lastSearchedSource === 'university' && (
                <ZeroResultsPanel
                  query={lastSearchedQuery}
                  onSwitchSource={handleSwitchSource}
                />
              )}

              {/* Zero results (external) — friendly message */}
              {results.length === 0 && lastSearchedSource !== 'university' && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <Globe2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-600 text-sm">
                    No destination cards available for the selected IP type in this source.
                    Try selecting "All IP Types" or a different search source.
                  </p>
                </div>
              )}

              {/* Result cards grid */}
              {results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {results.map((result) =>
                    result.source === 'university' ? (
                      <UniversityResultCard
                        key={result.id}
                        result={result}
                        primaryColor={primaryColor}
                        onViewRecord={() => {
                          const id = result.url.startsWith('/ip-records/')
                            ? result.url.replace('/ip-records/', '')
                            : null;
                          if (id) setSelectedTrackingId(id);
                        }}
                      />
                    ) : (
                      <OfficialSearchCard
                        key={result.id}
                        result={result}
                        primaryColor={primaryColor}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Initial state — before any search */}
          {results === null && !loading && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center mb-8">
              <Search className="mx-auto h-12 w-12 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium mb-1">Ready to search</p>
              <p className="text-gray-400 text-sm">
                Select a source, choose an IP type, enter keywords, and click Search.
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <SearchNotice />
        </div>
      </div>

      <Footer />

      <PublicIPRecordModal
        trackingId={selectedTrackingId}
        onClose={() => setSelectedTrackingId(null)}
        primaryColor={primaryColor}
      />
    </div>
  );
}
