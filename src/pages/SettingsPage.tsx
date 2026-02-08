import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { supabase } from '../lib/supabase';
import { User, Lock, Bell, Shield, Save, AlertCircle, CheckCircle, Palette } from 'lucide-react';
import { AdminBrandingSettingsPage } from './AdminBrandingSettingsPage';

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'branding'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: profile?.full_name || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileForm.fullName,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(profile?.role === 'admin' ? [{ id: 'branding', label: 'Branding', icon: Palette }] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-3">Settings</h1>
        <p className="text-lg text-gray-600 font-medium">Manage your account settings and preferences</p>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border backdrop-blur-sm transition-all duration-300 ${
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

      {/* Settings Container */}
      <div className="rounded-2xl border shadow-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #6366f120)`, borderColor: `${primaryColor}40` }}>
        {/* Tabs */}
        <div className="border-b" style={{ borderBottomColor: `${primaryColor}40`, background: `linear-gradient(to right, ${primaryColor}08, #6366f108)` }}>
          <div className="flex gap-1 p-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setMessage(null);
                  }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg scale-105'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                  style={activeTab === tab.id ? { background: `linear-gradient(to right, ${primaryColor}, #6366f1)`, boxShadow: `0 8px 16px ${primaryColor}33` } : {}}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-8 max-w-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h3>
                <div className="space-y-6 rounded-2xl p-6 border" style={{ background: 'white/40', borderColor: `${primaryColor}30` }}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile?.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                    />
                    <p className="text-xs text-gray-500 mt-2 font-medium">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all duration-300 font-medium"
                      style={{ borderColor: `${primaryColor}40`, '--tw-ring-color': primaryColor } as any}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <div className="px-4 py-3 border rounded-xl text-gray-700 capitalize font-medium" style={{ background: `linear-gradient(to right, ${primaryColor}08, #6366f108)`, borderColor: `${primaryColor}40` }}>
                      {profile?.role}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Role is assigned by administrators</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-4 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)` }}
              >
                <Save className="h-5 w-5" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-8 max-w-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h3>
                <div className="space-y-6">
                  <div className="bg-white/40 rounded-2xl p-6 border border-blue-200/30 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-300 font-medium"
                        placeholder="Minimum 6 characters"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-300 font-medium"
                        placeholder="Re-enter new password"
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-300/50 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-bold mb-3 text-base">Password Requirements:</p>
                        <ul className="list-disc list-inside space-y-1.5 font-medium">
                          <li>Minimum 6 characters</li>
                          <li>Use a unique password</li>
                          <li>Don't share your password</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                <Lock className="h-5 w-5" />
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 max-w-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h3>
                <div className="space-y-4">
                  {/* Email Notifications Card */}
                  <div className="flex items-center justify-between p-6 bg-white/40 rounded-2xl border border-blue-200/30 hover:shadow-lg transition-all duration-300 group">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg">Email Notifications</p>
                      <p className="text-sm text-gray-600 mt-1 font-medium">Receive email updates about your submissions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600 shadow-md"></div>
                    </label>
                  </div>

                  {/* In-App Notifications Card */}
                  <div className="flex items-center justify-between p-6 bg-white/40 rounded-2xl border border-blue-200/30 hover:shadow-lg transition-all duration-300 group">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg">In-App Notifications</p>
                      <p className="text-sm text-gray-600 mt-1 font-medium">Show notifications in the notification center</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600 shadow-md"></div>
                    </label>
                  </div>

                  {/* Status Updates Card */}
                  <div className="flex items-center justify-between p-6 bg-white/40 rounded-2xl border border-blue-200/30 hover:shadow-lg transition-all duration-300 group">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg">Status Updates</p>
                      <p className="text-sm text-gray-600 mt-1 font-medium">Get notified when submission status changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600 shadow-md"></div>
                    </label>
                  </div>

                  {/* Info Alert */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/50 rounded-2xl p-6 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-amber-900 font-medium">
                        Note: Notification preferences are currently view-only. Full implementation coming soon.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && profile?.role === 'admin' && (
            <div className="space-y-8">
              <AdminBrandingSettingsPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
