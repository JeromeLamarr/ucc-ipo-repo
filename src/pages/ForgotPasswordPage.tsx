import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@lib/supabase';
import { PublicNavigation } from '@components/PublicNavigation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Request password reset email from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        console.error('Password reset error:', error);
        throw new Error(error.message || 'Failed to send password reset email');
      }

      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      console.error('Error requesting password reset:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
        <div className="max-w-md w-full">
          {!success ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
                <p className="text-gray-600 mt-2">
                  Enter your email to receive a password reset link
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="you@university.edu"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> We'll send you an email with a link to reset your password. Click the link to set a new password.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleBackToLogin}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <div className="space-y-4">
                <p className="text-gray-600">
                  We've sent a password reset link to <span className="font-semibold">{email}</span>
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Next steps:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Check your email for the reset link</li>
                    <li>Click the link to reset your password</li>
                    <li>Create a new password</li>
                    <li>Return to login with your new password</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600">
                  The link expires in 24 hours. If you don't see the email, check your spam folder.
                </p>
              </div>

              <button
                onClick={handleBackToLogin}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
