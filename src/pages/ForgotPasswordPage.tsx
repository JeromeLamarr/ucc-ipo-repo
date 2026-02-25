import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PublicNavigation } from '../components/PublicNavigation';

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
      // Always show success message regardless of whether email exists (security)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // We don't return different messages based on whether it succeeded or failed
      // This prevents email enumeration attacks
      setEmail('');
      setSuccess(true);

      if (error) {
        // Log for debugging but still show generic message
        console.warn('Password reset error:', error.message);
      }

      // Redirect after a delay so user can see the success message
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Unexpected error:', err);
      // Still show generic message for security
      setSuccess(true);
      setEmail('');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-gray-600 mt-2">Enter your email to receive a password reset link</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            {success ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
                  <p className="text-gray-600 text-sm">
                    If that email exists in our system, a password reset link will be sent shortly. 
                    Please check your inbox and spam folder.
                  </p>
                  <p className="text-gray-500 text-sm">
                    Redirecting to login in a few seconds...
                  </p>
                </div>
                <Link
                  to="/login"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
                >
                  Back to login
                </Link>
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
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@university.edu"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    We'll send a secure link to reset your password
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending reset link...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center text-gray-600 text-sm">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in instead
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
