import { useState, useRef } from 'react';
import { X, Download, Upload, CheckCircle, AlertCircle, FileText, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';


const VALID_CATEGORIES = [
  'patent', 'trademark', 'copyright', 'utility_model',
  'industrial_design', 'trade_secret',
];
const VALID_SOURCES = ['old_system', 'physical_archive', 'manual_entry', 'email'];

// Normalize a category value: lowercase, collapse spaces/hyphens to underscores
const CATEGORY_ALIASES: Record<string, string> = {
  'patent': 'patent',
  'trademark': 'trademark',
  'trade mark': 'trademark',
  'trade-mark': 'trademark',
  'copyright': 'copyright',
  'copy right': 'copyright',
  'copy-right': 'copyright',
  'utilitymodel': 'utility_model',
  'utility model': 'utility_model',
  'utility-model': 'utility_model',
  'utility_model': 'utility_model',
  'industrialdesign': 'industrial_design',
  'industrial design': 'industrial_design',
  'industrial-design': 'industrial_design',
  'industrial_design': 'industrial_design',
  'tradesecret': 'trade_secret',
  'trade secret': 'trade_secret',
  'trade-secret': 'trade_secret',
  'trade_secret': 'trade_secret',
};
function normalizeCategory(raw: string): string {
  const lower = raw.trim().toLowerCase();
  // Try direct alias lookup first
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  // Fallback: collapse all whitespace/hyphens to underscore and try again
  const collapsed = lower.replace(/[\s\-]+/g, '_');
  return CATEGORY_ALIASES[collapsed] ?? collapsed;
}

// Alias map: normalized header string -> canonical field name
const HEADER_ALIASES: Record<string, string> = {
  'inventor_author': 'inventor_author',
  'inventor/author': 'inventor_author',
  'inventor author': 'inventor_author',
  'inventorauthor': 'inventor_author',
  'ipophil_application_no': 'ipophil_application_no',
  'ipophl_application_no': 'ipophil_application_no',
  'ipophl app no': 'ipophil_application_no',
  'ipophl app no.': 'ipophil_application_no',
  'ipophl application no': 'ipophil_application_no',
  'ipophl application no.': 'ipophil_application_no',
  'ipophil application no': 'ipophil_application_no',
  'ipophil application no.': 'ipophil_application_no',
  'original_filing_date': 'original_filing_date',
  'original filing date': 'original_filing_date',
  'filing_date': 'original_filing_date',
  'filing date': 'original_filing_date',
};

function normalizeHeader(raw: string): string {
  // Trim and lowercase
  const lower = raw.trim().toLowerCase();
  // Remove characters that are not alphanumeric, spaces, slashes, underscores, dots
  const cleaned = lower.replace(/[^a-z0-9\s\/_\.]/g, '');
  // Check alias on cleaned version (preserves spaces/slashes for alias lookup)
  if (HEADER_ALIASES[cleaned]) return HEADER_ALIASES[cleaned];
  // Convert spaces and slashes to underscores
  const underscored = cleaned.replace(/[\s\/]+/g, '_').replace(/\.+$/, '');
  // Check alias on underscored version
  if (HEADER_ALIASES[underscored]) return HEADER_ALIASES[underscored];
  return underscored;
}

// Robust CSV parser -- handles quoted fields, embedded commas, CRLF/LF, BOM
// Parse one CSV/TSV/SSV line respecting quoted fields
function parseDelimitedLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break; }
    if (line[i] === '"') {
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; } // closing quote
        } else { field += line[i++]; }
      }
      fields.push(field.trim());
      if (i < line.length && line[i] === delim) i++;
      else break;
    } else {
      const delimIdx = line.indexOf(delim, i);
      if (delimIdx === -1) { fields.push(line.slice(i).trim()); break; }
      else { fields.push(line.slice(i, delimIdx).trim()); i = delimIdx + 1; }
    }
  }
  return fields;
}

function parseCSVToRows(rawText: string): string[][] {
  // Strip BOM (UTF-8 and UTF-16 LE/BE)
  const text = rawText.startsWith('\uFEFF') ? rawText.slice(1)
    : rawText.startsWith('\uFFFE') ? rawText.slice(1)
    : rawText;

  // Split on CRLF, CR, or LF -- covers all Excel save-as variants
  const lines = text.split(/\r\n|\r|\n/);
  const nonEmpty = lines.filter(l => l.trim() !== '');
  if (nonEmpty.length === 0) return [];

  // Auto-detect delimiter from the header line (tab wins over semicolon wins over comma)
  const headerLine = nonEmpty[0];
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  const semiCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const delim = tabCount > 0 && tabCount >= commaCount && tabCount >= semiCount ? '\t'
    : semiCount > commaCount ? ';'
    : ',';

  return nonEmpty.map(line => parseDelimitedLine(line, delim));
}

interface ParsedRow {
  rowNum: number;
  title: string;
  inventor_author: string;
  category: string;
  source: string;
  abstract: string;
  keywords: string;
  ipophil_application_no: string;
  original_filing_date: string;
  remarks: string;
  isValid: boolean;
  errors: string[];
}

interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  imported: number;
}

interface FileInfo {
  name: string;
  detectedHeaders: string[];
}

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // M/D/YYYY or MM/DD/YYYY (US) — try this first since template has US sample
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // D-M-YYYY or D.M.YYYY
  const eu = raw.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
  if (eu) {
    const [, d, m, y] = eu;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // YYYY/MM/DD
  const iso2 = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (iso2) {
    const [, y, m, d] = iso2;
    return `${y}-${m}-${d}`;
  }
  return raw; // return as-is so the YYYY-MM-DD check below can still report the error
}

function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];

  const title = (raw['title'] || '').trim();
  const inventor_author = (raw['inventor_author'] || '').trim();
  const category = normalizeCategory(raw['category'] || '');
  // Source defaults to 'old_system' when not supplied -- all legacy records are implicitly from the old system
  const source = (raw['source'] || '').trim().toLowerCase() || 'old_system';
  const original_filing_date = normalizeDate((raw['original_filing_date'] || '').trim());

  if (!title) errors.push('title is required');
  if (!inventor_author) errors.push('inventor_author is required');
  if (!category) errors.push('category is required');
  else if (!VALID_CATEGORIES.includes(category))
    errors.push(`invalid category "${category}"  -  must be one of: ${VALID_CATEGORIES.join(', ')}`);
  if (!VALID_SOURCES.includes(source))
    errors.push(`invalid source "${source}"  -  must be one of: ${VALID_SOURCES.join(', ')}`);
  if (original_filing_date && !/^\d{4}-\d{2}-\d{2}$/.test(original_filing_date))
    errors.push(`original_filing_date must be YYYY-MM-DD (got "${original_filing_date}")`);

  return {
    rowNum,
    title,
    inventor_author,
    category,
    source,
    abstract: (raw['abstract'] || '').trim(),
    keywords: (raw['keywords'] || '').trim(),
    ipophil_application_no: (raw['ipophil_application_no'] || '').trim(),
    original_filing_date,
    remarks: (raw['remarks'] || '').trim(),
    isValid: errors.length === 0,
    errors,
  };
}

export function LegacyBulkUploadModal({ onClose, onImportComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'summary'>('upload');
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Download a BOM-prefixed CSV template -- opens cleanly in Excel
  const downloadTemplate = () => {
    const bom = '\uFEFF';
    const headers = 'title,inventor_author,category,source,abstract,keywords,ipophil_application_no,original_filing_date,remarks';
    const sample = '"Method for Efficient Solar Energy Capture","Juan dela Cruz","patent","old_system","A novel method for capturing solar energy using photovoltaic cells","solar,energy,photovoltaic","PAT-2020-001","2020-03-15","Historical patent from old filing system"';
    const blob = new Blob([bom + headers + '\n' + sample + '\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'legacy_records_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');

    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (ext !== 'csv') {
      setParseError('Please upload a CSV file (.csv). If you have an Excel file, open it in Excel and use File > Save As > CSV UTF-8 (Comma delimited).');
      return;
    }

    try {
      const text = await file.text();
      const allRows = parseCSVToRows(text);

      if (allRows.length < 2) {
        setParseError('File must have a header row and at least one data row.');
        return;
      }

      const rawHeaders = allRows[0];
      const normalizedHeaders = rawHeaders.map(normalizeHeader);

      // Warn if none of the required headers were recognised (wrong delimiter, wrong format, etc.)
      const requiredFound = ['title', 'inventor_author', 'category', 'source']
        .every((h) => normalizedHeaders.includes(h));
      if (!requiredFound) {
        setParseError(
          `Required columns not found. Detected columns: ${normalizedHeaders.filter(h => h !== '').join(', ')}. ` +
          'Ensure the first row contains the column headers from the template and save as "CSV UTF-8 (Comma delimited)" from Excel.'
        );
        return;
      }

      const parsed: ParsedRow[] = allRows.slice(1)
        .map((cols, i) => {
          const obj: Record<string, string> = {};
          normalizedHeaders.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
          return validateRow(obj, i + 2);
        })
        .filter((row) => !(row.title === '' && row.inventor_author === '' && row.category === '' && row.source === ''));

      if (parsed.length === 0) {
        setParseError('No data rows found. All rows appear to have empty required fields (title, inventor_author, category, source).');
        return;
      }

      setFileInfo({ name: file.name, detectedHeaders: normalizedHeaders });
      setRows(parsed);
      setStep('preview');
    } catch (err) {
      console.error('File parse error:', err);
      setParseError('Failed to parse the file. Please ensure it is a valid CSV file.');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setParseError('');
    const validRows = rows.filter((r) => r.isValid);
    const batchId = crypto.randomUUID();
    let imported = 0;
    const rowErrors: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated. Please refresh and log in again.');

      // Insert one row at a time -- mirrors exactly how AddLegacyRecordPage works,
      // avoiding any batch-insert RLS or PostgREST edge-cases
      for (const row of validRows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rowError } = await (supabase.from('legacy_ip_records') as any).insert([{
            title: row.title,
            category: row.category,
            abstract: row.abstract || null,
            legacy_source: row.source,
            original_filing_date: row.original_filing_date || null,
            ipophil_application_no: row.ipophil_application_no || null,
            remarks: row.remarks || null,
            details: {
              creator_name: row.inventor_author,
              creator_email: '',
              description: row.abstract || '',
              keywords: row.keywords
                ? row.keywords.split(',').map((k) => k.trim()).filter(Boolean)
                : [],
              technical_field: '',
              prior_art: '',
              problem: '',
              solution: '',
              advantages: '',
              remarks: row.remarks || '',
              bulk_import: true,
              import_batch_id: batchId,
              imported_at: new Date().toISOString(),
            },
            created_by_admin_id: user.id,
            updated_by_admin_id: user.id,
        }]);

        if (rowError) {
          rowErrors.push(`Row ${row.rowNum} ("${row.title}"): ${rowError.message}`);
        } else {
          imported++;
        }
      }

      if (imported === 0 && rowErrors.length > 0) {
        throw new Error(rowErrors[0]);
      }

      setSummary({
        total: rows.length,
        valid: validRows.length,
        invalid: rows.filter((r) => !r.isValid).length,
        imported,
      });
      setStep('summary');
      onImportComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during import.';
      console.error('Bulk import error:', err);
      setParseError(`Import failed: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setRows([]);
    setFileInfo(null);
    setParseError('');
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-amber-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900">Bulk Import Legacy Records</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* â”€â”€ Step: Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 'upload' && (
            <>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Before uploading:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Download the CSV template below. It includes a sample row with the correct column headers.</li>
                    <li>
                      Required columns: <strong>title</strong>, <strong>inventor_author</strong>, <strong>category</strong>{' '}
                      (<strong>source</strong> defaults to <code className="bg-amber-100 px-1 rounded text-xs">old_system</code> if omitted)
                    </li>
                    <li>
                      Valid categories:{' '}
                      <code className="bg-amber-100 px-1 rounded text-xs">
                        patent | trademark | copyright | utility_model | industrial_design | trade_secret
                      </code>
                    </li>
                    <li>
                      Valid sources:{' '}
                      <code className="bg-amber-100 px-1 rounded text-xs">
                        old_system | physical_archive | manual_entry | email
                      </code>
                    </li>
                    <li>Only <strong>.csv</strong> files are supported. If using Excel, go to <strong>File &rarr; Save As &rarr; CSV UTF-8 (Comma delimited)</strong>.</li>
                    <li>Review the preview before confirming the import.</li>
                  </ol>
                </div>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Download CSV Template
              </button>

              <label
                htmlFor="bulk-file-upload"
                className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors block"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-gray-600 font-medium">Click to choose a CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Supported format: .csv</p>
                <input
                  id="bulk-file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                  title="Upload spreadsheet file"
                />
              </label>

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {parseError}
                </div>
              )}
            </>
          )}

          {/* -- Step: Preview ----------------------------- */}
          {step === 'preview' && (
            <>
              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {parseError}
                </div>
              )}
              {/* File info panel */}
              {fileInfo && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <p className="font-semibold mb-1">File Details</p>
                    <p><span className="font-medium">File:</span> {fileInfo.name}</p>
                    <p>
                      <span className="font-medium">Detected columns ({fileInfo.detectedHeaders.length}):</span>{' '}
                      <code className="text-xs bg-blue-100 px-1 rounded break-all">
                        {fileInfo.detectedHeaders.join(' | ')}
                      </code>
                    </p>
                  </div>
                </div>
              )}

              {/* Row summary */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="text-gray-600">Total rows: <strong>{rows.length}</strong></span>
                <span className="text-green-700">Valid: <strong>{validCount}</strong></span>
                {invalidCount > 0 && (
                  <span className="text-red-600">Invalid (will be skipped): <strong>{invalidCount}</strong></span>
                )}
              </div>

              {invalidCount > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Invalid rows will be skipped. Only{' '}
                  <strong>{validCount} valid row{validCount !== 1 ? 's' : ''}</strong> will be imported.
                </p>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventor / Author</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.rowNum} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-3 py-2 text-gray-400 text-xs">{row.rowNum}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate font-medium text-gray-900">
                          {row.title || <span className="text-gray-400 italic text-xs">empty</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.inventor_author || <span className="text-gray-400 italic text-xs">empty</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.category || <span className="text-gray-400 italic text-xs">empty</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.source || <span className="text-gray-400 italic text-xs">empty</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" aria-hidden="true" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-medium w-fit">
                                <AlertCircle className="w-3 h-3" aria-hidden="true" /> Invalid
                              </span>
                              <span className="text-xs text-red-600 mt-0.5">{row.errors.join('; ')}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* â”€â”€ Step: Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 'summary' && summary && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-600" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Rows', value: summary.total, color: 'bg-gray-50 border border-gray-200 text-gray-800' },
                  { label: 'Valid Rows', value: summary.valid, color: 'bg-green-50 border border-green-200 text-green-800' },
                  { label: 'Invalid / Skipped', value: summary.invalid, color: 'bg-red-50 border border-red-200 text-red-800' },
                  { label: 'Successfully Imported', value: summary.imported, color: 'bg-amber-50 border border-amber-200 text-amber-800' },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="text-xs mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
              {summary.invalid > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  {summary.invalid} row{summary.invalid !== 1 ? 's were' : ' was'} skipped due to validation errors.
                  The legacy records list has been refreshed.
                </p>
              )}
              {summary.imported > 0 && summary.invalid === 0 && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  All {summary.imported} record{summary.imported !== 1 ? 's were' : ' was'} imported successfully.
                  The legacy records list has been refreshed.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div>
            {step === 'preview' && (
              <button
                onClick={reset}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                &larr; Upload different file
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'summary' ? (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                {step === 'preview' && validCount > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 transition-colors text-sm font-medium"
                  >
                    {importing
                      ? 'Importing...'
                      : `Import ${validCount} Record${validCount !== 1 ? 's' : ''}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
