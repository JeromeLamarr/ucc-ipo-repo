import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Save, CheckCircle, AlertCircle, PenLine, Upload, X, Image } from 'lucide-react';

interface SignatorySettings {
  id?: string;
  research_head_name: string;
  research_head_position: string;
  president_name: string;
  president_position: string;
  supervisor_title: string;
  research_head_signature_url: string | null;
  president_signature_url: string | null;
  supervisor_signature_url: string | null;
}

const DEFAULTS: SignatorySettings = {
  research_head_name: 'Teodoro Macaraeg',
  research_head_position: 'Research Department Head',
  president_name: 'Atty. Jared',
  president_position: 'President',
  supervisor_title: 'Supervisor',
  research_head_signature_url: null,
  president_signature_url: null,
  supervisor_signature_url: null,
};

export function CertificateSignatoriesSettings() {
  const { primaryColor, secondaryColor } = useBranding();
  const [form, setForm] = useState<SignatorySettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState<'research_head' | 'president' | 'supervisor' | null>(null);
  const researchHeadFileRef = useRef<HTMLInputElement>(null);
  const presidentFileRef = useRef<HTMLInputElement>(null);
  const supervisorFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from('certificate_signatories')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setForm({
          id: data.id,
          research_head_name: data.research_head_name ?? DEFAULTS.research_head_name,
          research_head_position: data.research_head_position ?? DEFAULTS.research_head_position,
          president_name: data.president_name ?? DEFAULTS.president_name,
          president_position: data.president_position ?? DEFAULTS.president_position,
          supervisor_title: data.supervisor_title ?? DEFAULTS.supervisor_title,
          research_head_signature_url: data.research_head_signature_url ?? null,
          president_signature_url: data.president_signature_url ?? null,
          supervisor_signature_url: data.supervisor_signature_url ?? null,
        });
      }
      setFetching(false);
    };
    fetchSettings();
  }, []);

  const handleSignatureUpload = async (role: 'research_head' | 'president' | 'supervisor', file: File) => {
    setUploadingSignature(role);
    setMessage(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `signatures/${role}_signature.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('branding').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      setForm((prev) => ({ ...prev, [`${role}_signature_url`]: publicUrl }));
      setMessage({ type: 'success', text: 'Signature uploaded. Click "Save" to apply.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload signature.' });
    } finally {
      setUploadingSignature(null);
    }
  };

  const handleSignatureRemove = (role: 'research_head' | 'president' | 'supervisor') => {
    setForm((prev) => ({ ...prev, [`${role}_signature_url`]: null }));
    setMessage({ type: 'success', text: 'Signature removed. Click "Save" to apply.' });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        research_head_name: form.research_head_name.trim(),
        research_head_position: form.research_head_position.trim(),
        president_name: form.president_name.trim(),
        president_position: form.president_position.trim(),
        supervisor_title: form.supervisor_title.trim(),
        research_head_signature_url: form.research_head_signature_url || null,
        president_signature_url: form.president_signature_url || null,
        supervisor_signature_url: form.supervisor_signature_url || null,
        updated_at: new Date().toISOString(),
      };

      // Use SECURITY DEFINER upsert RPC — handles both insert and update,
      // bypassing RLS so it works even when no row exists yet.
      const { data: upsertedId, error } = await supabase.rpc('upsert_certificate_signatories', {
        p_id:                              form.id ?? null,
        p_research_head_name:              payload.research_head_name,
        p_research_head_position:          payload.research_head_position,
        p_president_name:                  payload.president_name,
        p_president_position:              payload.president_position,
        p_supervisor_title:                payload.supervisor_title,
        p_research_head_signature_url:     payload.research_head_signature_url,
        p_president_signature_url:         payload.president_signature_url,          p_supervisor_signature_url:        payload.supervisor_signature_url,      });

      if (error) throw error;

      // Persist the returned id so subsequent saves use UPDATE path
      if (upsertedId && !form.id) {
        setForm((prev) => ({ ...prev, id: upsertedId as string }));
      }

      setMessage({ type: 'success', text: 'Certificate signatory settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof Omit<SignatorySettings, 'id' | 'research_head_signature_url' | 'president_signature_url'>,
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

  const signatureField = (
    role: 'research_head' | 'president' | 'supervisor',
    fileRef: React.RefObject<HTMLInputElement>
  ) => {
    const urlKey = `${role}_signature_url` as 'research_head_signature_url' | 'president_signature_url' | 'supervisor_signature_url';
    const currentUrl = form[urlKey];
    const isUploading = uploadingSignature === role;

    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">E-Signature Image</label>
        {currentUrl ? (
          <div className="flex items-start gap-3">
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: `${primaryColor}40` }}>
              <img
                src={currentUrl}
                alt="Signature preview"
                className="h-16 w-auto max-w-[200px] object-contain bg-white p-1"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={fetching || isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all hover:scale-105 disabled:opacity-50"
                style={{ borderColor: `${primaryColor}60`, color: primaryColor }}
              >
                <Upload className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => handleSignatureRemove(role)}
                disabled={fetching}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={fetching || isUploading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
            style={{ borderColor: `${primaryColor}50`, color: primaryColor }}
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Image className="h-4 w-4" />
                Upload Signature Image
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          aria-label={`Upload ${role === 'research_head' ? 'Research Head' : 'President'} signature image`}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSignatureUpload(role, file);
            e.target.value = '';
          }}
        />
        <p className="text-xs text-gray-500 mt-1.5 font-medium">PNG or JPG, transparent background recommended. Displayed above the signature line on the certificate.</p>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <PenLine className="h-6 w-6" style={{ color: primaryColor }} />
          <h3 className="text-2xl font-bold text-gray-900">Certificate Signatories</h3>
        </div>
        <p className="text-sm text-gray-600 font-medium">
          Configure the names and titles that appear in the signatory section of generated certificates.
          The supervisor name is always fetched dynamically from the assigned supervisor per record.
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
          <p
            className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: primaryColor }}
          >
            Supervisor Column
          </p>
          <div className="grid grid-cols-1 gap-4">
            {field('Supervisor Title', 'supervisor_title', 'Displayed under the record\'s assigned supervisor name.')}
          </div>
          <div className="mt-4">
            {signatureField('supervisor', supervisorFileRef)}
          </div>
        </div>

        {/* Research Head column */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: primaryColor }}
          >
            Research Head Column
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Research Head Name', 'research_head_name')}
            {field('Research Head Position', 'research_head_position')}
          </div>
          <div className="mt-4">
            {signatureField('research_head', researchHeadFileRef)}
          </div>
        </div>

        {/* President column */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-wider mb-4"
            style={{ color: primaryColor }}
          >
            President Column
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('President Name', 'president_name')}
            {field('President Position / Title', 'president_position')}
          </div>
          <div className="mt-4">
            {signatureField('president', presidentFileRef)}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Preview — Signature Row</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { name: '(Assigned Supervisor)', title: form.supervisor_title, signatureUrl: form.supervisor_signature_url },
            { name: form.research_head_name, title: form.research_head_position, signatureUrl: form.research_head_signature_url },
            { name: form.president_name, title: form.president_position, signatureUrl: form.president_signature_url },
          ].map(({ name, title, signatureUrl }, i) => (
            <div key={i} className="space-y-1">
              {signatureUrl ? (
                <div className="flex justify-center mb-1">
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="h-10 w-auto max-w-[120px] object-contain"
                  />
                </div>
              ) : (
                <div className="h-10 flex items-end justify-center mb-1">
                  <span className="text-gray-300 text-xs italic">no signature</span>
                </div>
              )}
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
