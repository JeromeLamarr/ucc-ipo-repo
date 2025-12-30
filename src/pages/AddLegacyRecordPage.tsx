import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Archive, AlertCircle, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function AddLegacyRecordPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    inventor_name: '',
    inventor_email: '',
    title: '',
    category: 'patent' as IpCategory,
    abstract: '',
    keywords: '',
    technical_field: '',
    prior_art: '',
    problem: '',
    solution: '',
    advantages: '',
    date_created: new Date().toISOString().split('T')[0],
    legacy_source: 'old_system',
    remarks: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const categories: IpCategory[] = ['patent', 'trademark', 'copyright', 'trade_secret', 'software', 'design', 'other'];
  const sources = ['old_system', 'physical_archive', 'email', 'manual_entry', 'other'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.inventor_name || !formData.title || !formData.category) {
        throw new Error('Please fill in all required fields');
      }

      // Create legacy record
      const { data: newRecord, error: recordError } = await supabase
        .from('legacy_ip_records')
        .insert([
          {
            title: formData.title,
            category: formData.category,
            legacy_source: formData.legacy_source,
            details: {
              creator_name: formData.inventor_name,
              creator_email: formData.inventor_email,
              description: formData.abstract,
              keywords: formData.keywords.split(',').map((k) => k.trim()).filter((k) => k),
              technical_field: formData.technical_field || '',
              prior_art: formData.prior_art || '',
              problem: formData.problem || '',
              solution: formData.solution || '',
              advantages: formData.advantages || '',
              remarks: formData.remarks,
              original_filing_date: formData.date_created,
            },
          },
        ])
        .select();

      if (recordError) throw recordError;
      if (!newRecord || newRecord.length === 0) throw new Error('Failed to create record');

      const recordId = newRecord[0].id;

      // Upload files if any
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const filePath = `legacy-records/${recordId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

          if (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
          }
        }
      }

      setSuccess('Legacy record created successfully!');
      setTimeout(() => {
        navigate(`/dashboard/legacy-records/${recordId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create legacy record');
    } finally {
      setLoading(false);
    }
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Archive className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Legacy Record</h1>
              <p className="text-gray-600 mt-1">Digitize historical intellectual property records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Alerts */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-800">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-green-800">{success}</span>
              </div>
            )}

            {/* Creator Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Creator / Inventor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Creator Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="inventor_name"
                    value={formData.inventor_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creator Email</label>
                  <input
                    type="email"
                    name="inventor_email"
                    value={formData.inventor_email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* IP Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Intellectual Property Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                    <input
                      type="date"
                      name="date_created"
                      value={formData.date_created}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abstract / Description</label>
                  <textarea
                    name="abstract"
                    value={formData.abstract}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleInputChange}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Legacy Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Legacy Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source of Record</label>
                  <select
                    name="legacy_source"
                    value={formData.legacy_source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {source.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h2>
              <label className="block p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                />
                <div className="text-center">
                  <Archive className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-1">PDF, images, or office documents</p>
                </div>
              </label>
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                  <ul className="space-y-1">
                    {uploadedFiles.map((file, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        • {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {loading ? 'Creating...' : 'Create Legacy Record'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/legacy-records')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
