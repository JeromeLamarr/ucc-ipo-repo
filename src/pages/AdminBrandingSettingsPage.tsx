import { useEffect, useState } from 'react';
import { useBranding } from '../hooks/useBranding';
import { updateBrandingData, uploadLogo, deleteLogo, validateImageFile } from '../services/brandingService';
import {
  fetchFooterSettings,
  updateFooterSettings,
  fetchFooterLinks,
  upsertFooterLink,
  deleteFooterLink,
  checkMigrationApplied,
  DEFAULT_FOOTER_SETTINGS,
  type FooterSettings,
  type FooterLink,
  type FooterLinkGroup,
} from '../services/footerService';
import { Card, CardHeader, CardContent, CardFooter } from '../components/Card';
import { Button } from '../components/Button';
import { AlertCircle, CheckCircle, Loader, Upload, X, Eye, Plus, Trash2, GraduationCap, Link2, AlertTriangle } from 'lucide-react';
import { getBrandGradient, type GradientStyle } from '../utils/brandStyles';

// ── Option lists ────────────────────────────────────────────────────────────

const GRADIENT_OPTIONS: { value: GradientStyle; label: string }[] = [
  { value: 'primary-secondary', label: 'Primary → Secondary' },
  { value: 'primary-dark',      label: 'Primary → Darker' },
  { value: 'primary-light',     label: 'Light → Primary' },
  { value: 'solid',             label: 'Solid (no gradient)' },
];

const LINK_GROUPS: { value: FooterLinkGroup; label: string }[] = [
  { value: 'quick',   label: 'Quick Links' },
  { value: 'support', label: 'Support Links' },
  { value: 'social',  label: 'Social Links' },
];

// ── Live Preview ────────────────────────────────────────────────────────────

function LivePreview({
  siteName,
  logoPreview,
  primaryColor,
  secondaryColor,
  gradientStyle,
}: {
  siteName: string;
  logoPreview: string | null;
  primaryColor: string;
  secondaryColor: string;
  gradientStyle: string;
}) {
  const gradient = getBrandGradient(primaryColor, secondaryColor, gradientStyle as GradientStyle);
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white select-none">
      {/* Mini Navbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          {logoPreview ? (
            <img src={logoPreview} alt="" className="h-6 w-6 object-contain flex-shrink-0" />
          ) : (
            <GraduationCap className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
          )}
          <span className="text-sm font-bold text-gray-900 truncate max-w-[180px]">
            {siteName || 'Site Name'}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded text-xs font-semibold border-2 text-blue-600 border-blue-600">
            Login
          </span>
          <span
            className="px-3 py-1 rounded text-xs font-semibold text-white"
            style={{ background: gradient }}
          >
            Register
          </span>
        </div>
      </div>
      {/* Hero tint */}
      <div className="px-4 py-6 text-center" style={{ background: `${primaryColor}15` }}>
        <div
          className="inline-block px-6 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: gradient }}
        >
          Submit IP Now
        </div>
        <p className="text-xs text-gray-400 mt-2">Hero gradient preview</p>
      </div>
      {/* Mini footer */}
      <div
        className="px-4 py-3 text-center text-xs text-white"
        style={{ background: 'linear-gradient(to right, #111827, #1f2937)' }}
      >
        <span style={{ color: primaryColor }}>{siteName || 'Site Name'}</span>
        {' '}— Footer preview
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function AdminBrandingSettingsPage() {
  const { branding, loading: brandingLoading } = useBranding();

  // ── Branding form ──
  const [siteName, setSiteName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#6366F1');
  const [gradientStyle, setGradientStyle] = useState<string>('primary-secondary');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [hasBrandingChanges, setHasBrandingChanges] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);

  // ── Migration status ──
  const [migrationStatus, setMigrationStatus] = useState<{
    brandingColumnsReady: boolean;
    footerTablesReady: boolean;
  } | null>(null);

  // ── Footer form ──
  const [footerSettings, setFooterSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [activeLinksTab, setActiveLinksTab] = useState<FooterLinkGroup>('quick');
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerSuccess, setFooterSuccess] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [hasFooterChanges, setHasFooterChanges] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);

  // ── Init: branding ──
  useEffect(() => {
    if (branding.site_name) setSiteName(branding.site_name);
    if (branding.logo_url) setLogoPreview(branding.logo_url);
    if (branding.primary_color) setPrimaryColor(branding.primary_color);
    if (branding.secondary_color) setSecondaryColor(branding.secondary_color);
    if (branding.gradient_style) setGradientStyle(branding.gradient_style);
    if (branding.favicon_url) setFaviconPreview(branding.favicon_url);
  }, [
    branding.site_name,
    branding.logo_url,
    branding.primary_color,
    branding.secondary_color,
    branding.gradient_style,
    branding.favicon_url,
  ]);

  // ── Init: footer ──
  useEffect(() => {
    fetchFooterSettings().then(setFooterSettings);
    fetchFooterLinks().then(setFooterLinks);
    checkMigrationApplied().then(setMigrationStatus);
  }, []);

  // ── Track branding changes ──
  useEffect(() => {
    const changed =
      siteName !== branding.site_name ||
      primaryColor !== (branding.primary_color ?? '#2563EB') ||
      secondaryColor !== (branding.secondary_color ?? '#6366F1') ||
      gradientStyle !== (branding.gradient_style ?? 'primary-secondary') ||
      logoFile !== null ||
      faviconFile !== null;
    setHasBrandingChanges(changed);
  }, [siteName, primaryColor, secondaryColor, gradientStyle, logoFile, faviconFile, branding]);

  // ── Branding save ──
  const handleBrandingSave = async () => {
    if (!siteName.trim()) {
      setBrandingError('Site name cannot be empty');
      return;
    }
    try {
      setBrandingSaving(true);
      setBrandingError(null);
      setBrandingSuccess(false);
      const updatePayload: Record<string, any> = {
        site_name: siteName.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        gradient_style: gradientStyle,
      };

      if (logoFile) {
        setLogoUploading(true);
        const newLogoUrl = await uploadLogo(logoFile);
        setLogoUploading(false);
        if (newLogoUrl) {
          if (branding.logo_url) await deleteLogo(branding.logo_url);
          updatePayload.logo_url = newLogoUrl;
          setLogoFile(null);
        }
      }

      if (faviconFile) {
        const newFaviconUrl = await uploadLogo(faviconFile);
        if (newFaviconUrl) {
          updatePayload.favicon_url = newFaviconUrl;
          setFaviconFile(null);
        }
      }

      const result = await updateBrandingData(updatePayload);
      if (result) {
        setBrandingSuccess(true);
        setHasBrandingChanges(false);
        setTimeout(() => setBrandingSuccess(false), 3000);
      } else {
        setBrandingError('Failed to update branding settings');
      }
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setBrandingSaving(false);
      setLogoUploading(false);
    }
  };

  // ── Logo handlers ──
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) { setBrandingError(v.error || 'Invalid file'); return; }
    setBrandingError(null);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFaviconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) { setBrandingError(v.error || 'Invalid file'); return; }
    setBrandingError(null);
    setFaviconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFaviconPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBrandingReset = () => {
    setSiteName(branding.site_name);
    setPrimaryColor(branding.primary_color ?? '#2563EB');
    setSecondaryColor(branding.secondary_color ?? '#6366F1');
    setGradientStyle(branding.gradient_style ?? 'primary-secondary');
    setLogoFile(null);
    setLogoPreview(branding.logo_url);
    setFaviconFile(null);
    setFaviconPreview(branding.favicon_url);
    setHasBrandingChanges(false);
    setBrandingError(null);
  };

  // ── Footer save ──
  const handleFooterSave = async () => {
    try {
      setFooterSaving(true);
      setFooterError(null);
      setFooterSuccess(false);
      const result = await updateFooterSettings(footerSettings);
      if (result) {
        setFooterSettings(result);
        setFooterSuccess(true);
        setHasFooterChanges(false);
        setTimeout(() => setFooterSuccess(false), 3000);
      } else {
        setFooterError('Failed to save footer settings');
      }
    } catch (err) {
      setFooterError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setFooterSaving(false);
    }
  };

  const updateFooterField = <K extends keyof FooterSettings>(
    key: K,
    value: FooterSettings[K],
  ) => {
    setFooterSettings((prev) => ({ ...prev, [key]: value }));
    setHasFooterChanges(true);
  };

  // ── Footer links ──
  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setLinkSaving(true);
    const groupLinks = footerLinks.filter((l) => l.group_name === activeLinksTab);
    const result = await upsertFooterLink({
      group_name: activeLinksTab,
      label: newLinkLabel.trim(),
      url: newLinkUrl.trim(),
      sort_order: groupLinks.length + 1,
      is_enabled: true,
    });
    if (result) {
      setFooterLinks((prev) => [...prev, result]);
      setNewLinkLabel('');
      setNewLinkUrl('');
    }
    setLinkSaving(false);
  };

  const handleDeleteLink = async (id: string) => {
    const ok = await deleteFooterLink(id);
    if (ok) setFooterLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleToggleLink = async (link: FooterLink) => {
    const updated = await upsertFooterLink({ ...link, is_enabled: !link.is_enabled });
    if (updated) setFooterLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const tabLinks = footerLinks
    .filter((l) => l.group_name === activeLinksTab)
    .sort((a, b) => a.sort_order - b.sort_order);

  const brandingDisabled = brandingSaving || brandingLoading;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Branding &amp; Footer</h1>
        <p className="text-gray-600">Manage site identity, colours, and footer content</p>
      </div>

      {/* Migration notice — shown only when new DB columns / tables are missing */}
      {migrationStatus && (!migrationStatus.brandingColumnsReady || !migrationStatus.footerTablesReady) && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Database migration required</p>
            <p className="text-amber-800 text-sm mt-0.5">
              Some features are unavailable because the database schema hasn&apos;t been updated yet.
              {!migrationStatus.brandingColumnsReady && ' (Secondary colour, gradient, favicon columns missing.)'}
              {!migrationStatus.footerTablesReady && ' (Footer tables missing.)'}
            </p>
            <p className="text-amber-700 text-xs mt-2">
              Go to your <strong>Supabase project → SQL Editor</strong> and run the file{' '}
              <code className="bg-amber-100 px-1 rounded">supabase/migrations/20260121000100_branding_and_footer_upgrade.sql</code>.
              Basic site name &amp; logo saves still work in the meantime.
            </p>
          </div>
        </div>
      )}

      {/* Branding alerts */}
      {brandingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900 text-sm">Error</p>
            <p className="text-red-700 text-sm">{brandingError}</p>
          </div>
          <button onClick={() => setBrandingError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}
      {brandingSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="font-semibold text-green-900 text-sm">Branding saved successfully</p>
        </div>
      )}

      {/* ── Live Preview ── */}
      <Card variant="elevated">
        <CardHeader title="Live Preview" subtitle="Updates as you adjust settings below" />
        <CardContent>
          <LivePreview
            siteName={siteName}
            logoPreview={logoPreview}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            gradientStyle={gradientStyle}
          />
        </CardContent>
      </Card>

      {/* ── Site Identity ── */}
      <Card variant="elevated">
        <CardHeader title="Site Identity" subtitle="Site name and logo" />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Site name */}
            <div>
              <label htmlFor="siteName" className="block text-sm font-semibold text-gray-900 mb-2">
                Site Name
              </label>
              <input
                id="siteName"
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                disabled={brandingDisabled}
                placeholder="Enter site name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Shown in navbar, footer, and page titles</p>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Site Logo</label>
              <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center mb-2">
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="Logo" className="h-16 w-auto object-contain mx-auto" />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowLogoModal(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        <Eye size={12} /> View
                      </button>
                      {logoFile && (
                        <button
                          type="button"
                          onClick={() => { setLogoFile(null); setLogoPreview(branding.logo_url); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          <X size={12} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No logo selected</p>
                  </div>
                )}
              </div>
              <input
                id="logoFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoFileSelect}
                disabled={brandingDisabled}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('logoFile')?.click()}
                disabled={brandingDisabled}
                className="w-full px-3 py-2 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
              >
                {logoUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUploading ? 'Uploading…' : 'Choose Logo File'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, SVG — max 5 MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Colours & Gradient ── */}
      <Card variant="elevated">
        <CardHeader title="Colours &amp; Gradient" subtitle="Primary and secondary brand colours" />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
            {/* Primary */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={brandingDisabled}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer disabled:opacity-50 p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setPrimaryColor(e.target.value); }}
                  disabled={brandingDisabled}
                  className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Secondary */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Secondary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={brandingDisabled}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer disabled:opacity-50 p-0.5"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setSecondaryColor(e.target.value); }}
                  disabled={brandingDisabled}
                  className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Gradient style */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Gradient Style</label>
              <select
                value={gradientStyle}
                onChange={(e) => setGradientStyle(e.target.value)}
                disabled={brandingDisabled}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white"
              >
                {GRADIENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Swatch */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Gradient preview</p>
            <div
              className="h-8 rounded-lg"
              style={{ background: getBrandGradient(primaryColor, secondaryColor, gradientStyle as GradientStyle) }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Favicon ── */}
      <Card variant="elevated">
        <CardHeader title="Favicon" subtitle="Browser tab icon — 32×32 or 64×64 recommended" />
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon" className="h-12 w-12 object-contain rounded border border-gray-200 p-1 bg-gray-50" />
              ) : (
                <div className="h-12 w-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs bg-gray-50">
                  ICO
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                id="faviconFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml,image/x-icon"
                onChange={handleFaviconFileSelect}
                disabled={brandingDisabled}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('faviconFile')?.click()}
                disabled={brandingDisabled}
                className="px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {faviconFile ? faviconFile.name : 'Choose Favicon'}
              </button>
              {faviconFile && (
                <button
                  type="button"
                  onClick={() => { setFaviconFile(null); setFaviconPreview(branding.favicon_url); }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove selection
                </button>
              )}
              <p className="text-xs text-gray-400 mt-2">PNG, SVG, or ICO — max 5 MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding action bar */}
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={handleBrandingReset}
          disabled={!hasBrandingChanges || brandingDisabled}
        >
          Reset
        </Button>
        <Button
          variant="primary"
          onClick={handleBrandingSave}
          disabled={!hasBrandingChanges || brandingDisabled}
          icon={brandingSaving ? <Loader className="h-4 w-4 animate-spin" /> : undefined}
        >
          {brandingSaving ? 'Saving…' : 'Save Branding'}
        </Button>
      </div>

      {/* ═══════════════  FOOTER MANAGEMENT  ══════════════════ */}
      <div className="border-t border-gray-200 pt-2">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Footer Management</h2>
        <p className="text-gray-500 text-sm">Control footer content visible to all site visitors</p>
      </div>

      {/* Footer alerts */}
      {footerError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm flex-1">{footerError}</p>
          <button onClick={() => setFooterError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}
      {footerSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="font-semibold text-green-900 text-sm">Footer settings saved</p>
        </div>
      )}

      {/* ── Footer Content ── */}
      <Card variant="elevated">
        <CardHeader title="Footer Content" subtitle="About text, contact info, and copyright" />
        <CardContent>
          <div className="space-y-5">
            {/* About */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">About Text</label>
              <textarea
                value={footerSettings.about_text ?? ''}
                onChange={(e) => updateFooterField('about_text', e.target.value || null)}
                rows={3}
                placeholder="Brief description shown in the footer about column…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Contact row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={footerSettings.contact_email ?? ''}
                  onChange={(e) => updateFooterField('contact_email', e.target.value || null)}
                  placeholder="info@example.edu.ph"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Contact Phone</label>
                <input
                  type="text"
                  value={footerSettings.contact_phone ?? ''}
                  onChange={(e) => updateFooterField('contact_phone', e.target.value || null)}
                  placeholder="+63 (2) 1234-5678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Contact Address</label>
              <input
                type="text"
                value={footerSettings.contact_address ?? ''}
                onChange={(e) => updateFooterField('contact_address', e.target.value || null)}
                placeholder="123 University Ave, Caloocan City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Copyright */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Copyright Text</label>
              <input
                type="text"
                value={footerSettings.copyright_text ?? ''}
                onChange={(e) => updateFooterField('copyright_text', e.target.value || null)}
                placeholder={`© ${new Date().getFullYear()} Your Site. All rights reserved.`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave blank to auto-generate from current year + site name
              </p>
            </div>

            {/* Visibility toggles */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Section Visibility</p>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    { key: 'show_quick_links', label: 'Quick Links' },
                    { key: 'show_support',     label: 'Support Links' },
                    { key: 'show_contact',     label: 'Contact Info' },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={footerSettings[key]}
                      onChange={(e) => updateFooterField(key, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleFooterSave}
              disabled={!hasFooterChanges || footerSaving}
              icon={footerSaving ? <Loader className="h-4 w-4 animate-spin" /> : undefined}
            >
              {footerSaving ? 'Saving…' : 'Save Footer Settings'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* ── Footer Links ── */}
      <Card variant="elevated">
        <CardHeader title="Footer Links" subtitle="Manage navigation links in the footer columns" />
        <CardContent>
          {/* Group tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
            {LINK_GROUPS.map((g) => (
              <button
                key={g.value}
                onClick={() => setActiveLinksTab(g.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeLinksTab === g.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Links list */}
          <div className="space-y-2 mb-5">
            {tabLinks.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2 text-center">
                No links added yet — add one below
              </p>
            ) : (
              tabLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 block truncate">{link.label}</span>
                    <span className="text-xs text-gray-400 truncate block">{link.url}</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={link.is_enabled}
                      onChange={() => handleToggleLink(link)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                    title="Delete link"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add link */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Add New Link</p>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Label (e.g. About Us)"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="URL (e.g. / or https://…)"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddLink}
                disabled={linkSaving || !newLinkLabel.trim() || !newLinkUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 flex-shrink-0 transition-colors"
              >
                {linkSaving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Info card ── */}
      <Card variant="outlined" className="p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Real-time Sync</h3>
            <p className="text-xs text-gray-600">
              Branding changes propagate in real-time to all open pages via Supabase Realtime.
              CSS custom-properties (<code className="bg-gray-100 px-1 rounded">--brand-primary</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">--brand-secondary</code>, etc.)
              are updated automatically so Tailwind CSS overrides also work instantly.
            </p>
          </div>
        </div>
      </Card>

      {/* Logo preview modal */}
      {showLogoModal && logoPreview && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowLogoModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Logo Preview</h3>
              <button onClick={() => setShowLogoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-8 min-h-48">
              <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
