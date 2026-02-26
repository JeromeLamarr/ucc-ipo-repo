import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '@lib/supabase';
import { PublicNavigation } from '@components/PublicNavigation';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verify that user has a valid password reset session
    const verifySession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error('Invalid reset session');
        }

        if (!session) {
          setError('No valid reset session found. Please request a new password reset link.');
          setVerifying(false);
          setTimeout(() => navigate('/forgot-password'), 3000);
          return;
        }

        // Session is valid, user can proceed with password reset
        setVerifying(false);
      } catch (err: any) {
        console.error('Session verification error:', err);
        setError('Invalid or expired reset link. Please request a new one.');
        setVerifying(false);
        setTimeout(() => navigate('/forgot-password'), 3000);
      }
    };

    verifySession();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Password update error:', error);
        throw new Error(error.message || 'Failed to update password');
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Redirect to login after success
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(
        err.message ||
          'Failed to update password. Please try again or request a new reset link.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
        <div className="max-w-md w-full">
          {!success ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Create New Password</h1>
                <p className="text-gray-600 mt-2">Enter a new password for your account</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8">
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Security tip:</strong> Use a strong password with a mix of letters, numbers, and special characters.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully updated. You can now log in with your new password.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
