import { useState, useRef } from 'react';
import { X, Download, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type LegacyInsert = Database['public']['Tables']['legacy_ip_records']['Insert'];

const VALID_CATEGORIES = [
  'patent', 'trademark', 'copyright', 'utility_model',
  'industrial_design', 'trade_secret', 'software', 'design', 'other',
];
const VALID_SOURCES = ['old_system', 'physical_archive', 'manual_entry', 'email', 'other'];

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

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

// Robust CSV parser — handles quoted fields and embedded commas
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const row: string[] = [];
    while (i < n) {
      if (text[i] === '"') {
        let field = '';
        i++; // skip opening quote
        while (i < n) {
          if (text[i] === '"') {
            if (i + 1 < n && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i++];
          }
        }
        row.push(field.trim());
        if (i < n && text[i] === ',') i++;
      } else {
        let field = '';
        while (i < n && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++];
        }
        row.push(field.trim());
        if (i < n && text[i] === ',') i++;
      }
      if (i >= n || text[i] === '\n' || text[i] === '\r') {
        if (i < n && text[i] === '\r') i++;
        if (i < n && text[i] === '\n') i++;
        break;
      }
    }
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      rows.push(row);
    }
  }
  return rows;
}

function validateRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];

  const title = raw['title']?.trim() || '';
  const inventor_author = (raw['inventor_author'] || raw['inventor/author'] || '').trim();
  const category = raw['category']?.trim().toLowerCase() || '';
  const source = raw['source']?.trim().toLowerCase() || '';
  const original_filing_date = raw['original_filing_date']?.trim() || '';

  if (!title) errors.push('title is required');
  if (!inventor_author) errors.push('inventor_author is required');
  if (!category) errors.push('category is required');
  else if (!VALID_CATEGORIES.includes(category))
    errors.push(`invalid category "${category}" — must be one of: ${VALID_CATEGORIES.join(', ')}`);
  if (!source) errors.push('source is required');
  else if (!VALID_SOURCES.includes(source))
    errors.push(`invalid source "${source}" — must be one of: ${VALID_SOURCES.join(', ')}`);
  if (original_filing_date && !/^\d{4}-\d{2}-\d{2}$/.test(original_filing_date))
    errors.push('original_filing_date must be YYYY-MM-DD');

  return {
    rowNum,
    title,
    inventor_author,
    category,
    source,
    abstract: raw['abstract']?.trim() || '',
    keywords: raw['keywords']?.trim() || '',
    ipophil_application_no: raw['ipophil_application_no']?.trim() || '',
    original_filing_date,
    remarks: raw['remarks']?.trim() || '',
    isValid: errors.length === 0,
    errors,
  };
}

export function LegacyBulkUploadModal({ onClose, onImportComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'summary'>('upload');
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const downloadTemplate = () => {
    const header = 'title,inventor_author,category,source,abstract,keywords,ipophil_application_no,original_filing_date,remarks';
    const example =
      '"Method for Efficient Solar Energy Capture","Juan dela Cruz","patent","old_system","A novel method for capturing solar energy","solar,energy,photovoltaic","PAT-2020-001","2020-03-15","Historical patent from old filing system"';
    const bom = '\uFEFF';
    const blob = new Blob([bom + header + '\n' + example + '\n'], { type: 'text/csv;charset=utf-8' });
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

    const text = await file.text();
    const cleaned = text.startsWith('\uFEFF') ? text.slice(1) : text;
    const rawRows = parseCSV(cleaned);

    if (rawRows.length < 2) {
      setParseError('CSV must have a header row and at least one data row.');
      return;
    }

    const headers = rawRows[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));
    const parsed: ParsedRow[] = rawRows.slice(1).map((cols, i) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
      return validateRow(obj, i + 2);
    });

    setRows(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    setImporting(true);
    const validRows = rows.filter((r) => r.isValid);
    const batchId = crypto.randomUUID();
    let imported = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: LegacyInsert[] = validRows.map((row) => ({
        title: row.title,
        category: row.category,
        abstract: row.abstract || null,
        legacy_source: row.source,
        original_filing_date: row.original_filing_date || null,
        ipophil_application_no: row.ipophil_application_no || null,
        remarks: row.remarks || null,
        details: {
          creator_name: row.inventor_author,
          description: row.abstract || '',
          keywords: row.keywords
            ? row.keywords.split(',').map((k) => k.trim()).filter(Boolean)
            : [],
          bulk_import: true,
          import_batch_id: batchId,
          imported_at: new Date().toISOString(),
        },
        created_by_admin_id: user.id,
        updated_by_admin_id: user.id,
      }));

      // supabase-js 2.57 / PostgrestVersion "12" has a type-inference quirk
      // where a pre-typed array variable is not assignable to the insert overload.
      // Runtime behaviour is identical; we cast the from() result to bypass it.
      const { data, error } = await (supabase.from('legacy_ip_records') as any)
        .insert(insertData)
        .select('id') as { data: { id: string }[] | null; error: Error | null };

      if (error) throw error;
      imported = data?.length || 0;
    } catch (err) {
      console.error('Bulk import error:', err);
    } finally {
      setImporting(false);
    }

    setSummary({
      total: rows.length,
      valid: validRows.length,
      invalid: rows.filter((r) => !r.isValid).length,
      imported,
    });
    setStep('summary');
    onImportComplete();
  };

  const reset = () => {
    setStep('upload');
    setRows([]);
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

          {/* ── Step: Upload ─────────────────────────────── */}
          {step === 'upload' && (
            <>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Before uploading:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Download the CSV template below and fill in your records.</li>
                    <li>
                      Required columns: <strong>title</strong>, <strong>inventor_author</strong>, <strong>category</strong>, <strong>source</strong>
                    </li>
                    <li>
                      Valid categories:{' '}
                      <code className="bg-amber-100 px-1 rounded text-xs">
                        patent · trademark · copyright · utility_model · industrial_design · trade_secret
                      </code>
                    </li>
                    <li>
                      Valid sources:{' '}
                      <code className="bg-amber-100 px-1 rounded text-xs">
                        old_system · physical_archive · manual_entry · email
                      </code>
                    </li>
                    <li>Upload and review the preview before confirming the import.</li>
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
                htmlFor="bulk-csv-upload"
                className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors block"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-gray-600 font-medium">Click to choose a CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Only .csv files are supported</p>
                <input
                  id="bulk-csv-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                  title="Upload CSV file"
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

          {/* ── Step: Preview ────────────────────────────── */}
          {step === 'preview' && (
            <>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="text-gray-600">Total rows: <strong>{rows.length}</strong></span>
                <span className="text-green-700">✓ Valid: <strong>{validCount}</strong></span>
                {invalidCount > 0 && (
                  <span className="text-red-600">✗ Invalid (will be skipped): <strong>{invalidCount}</strong></span>
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

          {/* ── Step: Summary ────────────────────────────── */}
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
                ← Upload different file
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
                      ? 'Importing…'
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
