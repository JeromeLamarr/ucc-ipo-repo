import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PublicNavigation } from '../components/PublicNavigation';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const navigate = useNavigate();

  // Check if user has a valid session from the password reset email link
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        } else {
          setError('Invalid or expired reset link. Please request a new one.');
          setIsValidSession(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError('Error validating your session. Please try again.');
        setIsValidSession(false);
      } finally {
        setSessionChecking(false);
      }
    };

    checkSession();
  }, []);

  const validatePassword = (): boolean => {
    setError('');

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Clear form and show success
      setPassword('');
      setConfirmPassword('');
      setSuccess(true);

      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred while updating your password');
    } finally {
      setLoading(false);
    }
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <PublicNavigation />
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <p className="text-gray-600">Validating your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <PublicNavigation />
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Invalid Reset Link</h2>
                <p className="text-gray-600 text-sm">
                  {error || 'This password reset link is no longer valid or has expired.'}
                </p>
                <a
                  href="/forgot-password"
                  className="inline-block text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Request a new reset link
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Password</h1>
            <p className="text-gray-600 mt-2">Set a strong password for your account</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            {success ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900">Password Updated</h2>
                  <p className="text-gray-600 text-sm">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                  <p className="text-gray-500 text-sm">
                    Redirecting to login...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

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
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new password"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minimum 8 characters
                  </p>
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
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating password...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
