import { useEffect, useState } from 'react';
import { useBranding } from '../hooks/useBranding';
import { updateBrandingData, uploadLogo, deleteLogo, validateImageFile } from '../services/brandingService';
import { Card, CardHeader, CardContent, CardFooter } from '../components/Card';
import { Button } from '../components/Button';
import { DashboardLayout } from '../components/DashboardLayout';
import { AlertCircle, CheckCircle, Loader, Upload, X, Eye } from 'lucide-react';

export function AdminBrandingSettingsPage() {
  const { branding, loading: brandingLoading } = useBranding();
  const [siteName, setSiteName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLogoPreview, setShowLogoPreview] = useState(false);

  // Initialize form with branding data
  useEffect(() => {
    if (branding.site_name) {
      setSiteName(branding.site_name);
    }
    if (branding.logo_path) {
      setLogoPreview(branding.logo_path);
    }
  }, [branding.site_name, branding.logo_path]);

  // Track if there are changes
  useEffect(() => {
    setHasChanges(siteName !== branding.site_name || logoFile !== null);
  }, [siteName, logoFile, branding.site_name]);

  const handleSave = async () => {
    if (!siteName.trim()) {
      setError('Site name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const updateData: Record<string, any> = {};

      // Upload new logo if selected
      if (logoFile) {
        try {
          setLogoUploading(true);
          const newLogoUrl = await uploadLogo(logoFile);
          if (newLogoUrl) {
            // Delete old logo if it exists
            if (branding.logo_path) {
              await deleteLogo(branding.logo_path);
            }
            updateData.logo_path = newLogoUrl;
            setLogoFile(null);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to upload logo';
          setError(errorMsg);
          setLoading(false);
          setLogoUploading(false);
          return;
        }
      }

      // Update site name
      updateData.site_name = siteName.trim();

      const result = await updateBrandingData(updateData);

      if (result) {
        setSuccess(true);
        setHasChanges(false);
        setLogoFile(null);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Failed to update branding settings');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setLogoUploading(false);
    }
  };

  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError(null);
    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleReset = () => {
    setSiteName(branding.site_name);
    setLogoFile(null);
    setLogoPreview(branding.logo_path);
    setHasChanges(false);
    setError(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Branding Settings</h1>
          <p className="text-gray-600">Manage your site branding and appearance</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Success</h3>
              <p className="text-green-700 text-sm">Branding settings updated successfully</p>
            </div>
          </div>
        )}

        {/* Site Name Settings Card */}
        <Card variant="elevated" className="mb-6">
          <CardHeader
            title="Site Information"
            subtitle="Update your site name and branding information"
          />
          <CardContent>
            <div className="space-y-6">
              {/* Site Name Input */}
              <div>
                <label htmlFor="siteName" className="block text-sm font-semibold text-gray-900 mb-3">
                  Site Name
                </label>
                <input
                  id="siteName"
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  disabled={loading || brandingLoading}
                  placeholder="Enter your site name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This name appears in the navbar and footer across your site
                </p>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Site Logo
                </label>
                
                {/* Logo Preview */}
                <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg mb-4">
                  {logoPreview ? (
                    <div className="relative">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-24 w-auto mx-auto mb-3 object-contain"
                          />
                          <p className="text-xs text-gray-600 mb-3">
                            {logoFile ? logoFile.name : 'Current logo'}
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => setShowLogoPreview(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            {logoFile && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                              >
                                <X size={14} />
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium mb-1">No logo selected</p>
                      <p className="text-xs text-gray-500">
                        Select an image to upload a new logo
                      </p>
                    </div>
                  )}
                </div>

                {/* File Input */}
                <div className="relative">
                  <input
                    id="logoFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoFileSelect}
                    disabled={loading || logoUploading}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('logoFile')?.click()}
                    disabled={loading || logoUploading}
                    className="w-full px-4 py-2.5 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {logoUploading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Choose Logo File
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Allowed: JPG, PNG, WebP, SVG (max 5MB)
                </p>
              </div>

              {/* Color Scheme Info */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Color Scheme
                </label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">
                    Current primary color:
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: branding.primary_color || '#2563EB' }}
                    />
                    <span className="text-sm font-mono text-gray-700">
                      {branding.primary_color || '#2563EB'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Color customization coming in future updates
                  </p>
                </div>
              </div>

              {/* Last Updated */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last updated:{' '}
                  <span className="font-semibold">
                    {new Date(branding.updated_at).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={!hasChanges || loading || brandingLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || loading || brandingLoading}
                icon={loading ? <Loader className="h-4 w-4 animate-spin" /> : undefined}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Information Card */}
        <Card variant="outlined" className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                Branding Sync
              </h3>
              <p className="text-xs text-gray-600">
                Your branding changes will appear across all pages in real-time,
                including the navbar and footer. All site visitors will see the
                updated branding on their next page load.
              </p>
            </div>
          </div>
        </Card>

        {/* Logo Preview Modal */}
        {showLogoPreview && logoPreview && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowLogoPreview(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Logo Preview</h3>
                <button
                  onClick={() => setShowLogoPreview(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex items-center justify-center bg-gray-50 rounded-lg p-8 min-h-64">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setShowLogoPreview(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
