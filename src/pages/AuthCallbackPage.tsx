import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '@lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the callback hash automatically
        // Give the auth session time to be established
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          setStatus('error');
          setMessage('Email verification failed. Please try registering again or contact support.');
          setTimeout(() => navigate('/register'), 3000);
          return;
        }

        const user = session.user;

        if (!user.email_confirmed_at) {
          setStatus('error');
          setMessage('Email verification incomplete. Please try again.');
          setTimeout(() => navigate('/register'), 3000);
          return;
        }

        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // If profile doesn't exist, create it
        if (!profile) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_user_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              affiliation: user.user_metadata?.affiliation || null,
              role: 'applicant',
              is_verified: true,
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
        }

        // Success - redirect to dashboard
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err: any) {
        console.error('Callback error:', err);
        setStatus('error');
        setMessage(err.message || 'An error occurred during email verification. Please try again.');
        setTimeout(() => navigate('/register'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Successful!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 text-sm">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
