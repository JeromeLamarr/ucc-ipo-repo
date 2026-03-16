import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Save, CheckCircle, AlertCircle, PenLine } from 'lucide-react';

interface DisclosureSignatorySettings {
  id?: string;
  research_head_name: string;
  research_head_position: string;
  president_name: string;
  president_position: string;
  supervisor_title: string;
}

const DEFAULTS: DisclosureSignatorySettings = {
  research_head_name: 'Teodoro Macaraeg',
  research_head_position: 'Research Head',
  president_name: 'Atty. Jared',
  president_position: 'President',
  supervisor_title: 'Supervisor',
};

export function DisclosureSignatoriesSettings() {
  const { primaryColor, secondaryColor } = useBranding();
  const [form, setForm] = useState<DisclosureSignatorySettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from('disclosure_signatories')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setForm({
          id: data.id,
          research_head_name:     data.research_head_name     ?? DEFAULTS.research_head_name,
          research_head_position: data.research_head_position ?? DEFAULTS.research_head_position,
          president_name:         data.president_name         ?? DEFAULTS.president_name,
          president_position:     data.president_position     ?? DEFAULTS.president_position,
          supervisor_title:       data.supervisor_title       ?? DEFAULTS.supervisor_title,
        });
      }
      setFetching(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        research_head_name:     form.research_head_name.trim(),
        research_head_position: form.research_head_position.trim(),
        president_name:         form.president_name.trim(),
        president_position:     form.president_position.trim(),
        supervisor_title:       form.supervisor_title.trim(),
        updated_at:             new Date().toISOString(),
      };

      const { data: upsertedId, error } = await supabase.rpc('upsert_disclosure_signatories', {
        p_id:                     form.id ?? null,
        p_research_head_name:     payload.research_head_name,
        p_research_head_position: payload.research_head_position,
        p_president_name:         payload.president_name,
        p_president_position:     payload.president_position,
        p_supervisor_title:       payload.supervisor_title,
      });

      if (error) throw error;

      if (upsertedId && !form.id) {
        setForm((prev) => ({ ...prev, id: upsertedId as string }));
      }

      setMessage({ type: 'success', text: 'Disclosure signatory settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof Omit<DisclosureSignatorySettings, 'id'>,
    hint?: string
  ) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <input
        type="text"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        disabled={fetching}
        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all duration-300 font-medium disabled:bg-gray-50 disabled:text-gray-400"
        style={{ borderColor: `${primaryColor}40`, ['--tw-ring-color' as any]: primaryColor }}
      />
      {hint && <p className="text-xs text-gray-500 mt-1.5 font-medium">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <PenLine className="h-6 w-6" style={{ color: primaryColor }} />
          <h3 className="text-2xl font-bold text-gray-900">Disclosure Signatories</h3>
        </div>
        <p className="text-sm text-gray-600 font-medium">
          Configure the names and titles that appear in the Authorization and Signatures section
          of generated disclosure PDFs. The supervisor name is always fetched dynamically from
          the assigned supervisor per record.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border backdrop-blur-sm ${
            message.type === 'success'
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300/50 text-green-800'
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300/50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div
        className="rounded-2xl p-6 border space-y-6"
        style={{ borderColor: `${primaryColor}30`, background: `linear-gradient(to bottom right, ${primaryColor}05, ${secondaryColor}05)` }}
      >
        {/* Supervisor column */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: primaryColor }}>
            Supervisor Column
          </p>
          <div className="grid grid-cols-1 gap-4">
            {field('Supervisor Title', 'supervisor_title', "Displayed under the record's assigned supervisor name.")}
          </div>
        </div>

        {/* Research Head column */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: primaryColor }}>
            Research Head Column
          </p>
          <div className="grid grid-cols-1 gap-4">
            {field('Research Head Position / Title', 'research_head_position', 'Label shown under the Research Head line. The name is auto-filled from the Employee/Applicant record.')}
          </div>
        </div>

        {/* President column */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: primaryColor }}>
            President Column
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('President Name', 'president_name')}
            {field('President Position / Title', 'president_position')}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Preview — Signature Row</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { name: '(Assigned Supervisor)', title: form.supervisor_title },
            { name: '(Employee/Applicant)', title: form.research_head_position },
            { name: form.president_name,     title: form.president_position },
          ].map(({ name, title }, i) => (
            <div key={i} className="space-y-1">
              <div className="h-px bg-gray-400 mx-4" />
              <p className="font-bold text-gray-800 break-words">{name}</p>
              <p className="text-gray-500">{title}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || fetching}
        className="flex items-center gap-2 px-8 py-4 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
      >
        <Save className="h-5 w-5" />
        {loading ? 'Saving...' : 'Save Signatory Settings'}
      </button>
    </div>
  );
}
