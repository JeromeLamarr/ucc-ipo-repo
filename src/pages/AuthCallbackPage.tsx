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
        // Log the hash for debugging
        console.log('[AuthCallback] URL hash:', window.location.hash);
        console.log('[AuthCallback] URL search:', window.location.search);

        // Wait a brief moment for Supabase to process the URL hash/search params
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try to get the current session - Supabase may have already established it
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          throw sessionError;
        }

        let finalSession = session;

        // If no session exists, try to exchange the code/token from URL (for PKCE flow)
        if (!finalSession) {
          console.log('[AuthCallback] No session found, attempting to exchange code...');
          
          // Extract code from URL if present (from Supabase callback)
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          
          if (code) {
            console.log('[AuthCallback] Found code in URL, exchanging for session...');
            try {
              const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              
              if (exchangeError) {
                console.error('[AuthCallback] Code exchange error:', exchangeError);
                throw exchangeError;
              }
              
              finalSession = exchangeData?.session;
              console.log('[AuthCallback] Code exchange successful, session:', !!finalSession);
            } catch (exchangeErr) {
              console.error('[AuthCallback] Failed to exchange code:', exchangeErr);
              // Continue - session might still be available
            }
          }
        }

        if (!finalSession) {
          console.error('[AuthCallback] No session available after attempts');
          setStatus('error');
          setMessage('Email verification failed. Please try registering again or contact support.');
          setTimeout(() => navigate('/register'), 3000);
          return;
        }

        const user = finalSession.user;
        console.log('[AuthCallback] Verified user:', user.id, 'Email confirmed:', !!user.email_confirmed_at);

        if (!user.email_confirmed_at) {
          console.warn('[AuthCallback] Email not confirmed yet. email_confirmed_at:', user.email_confirmed_at);
          setStatus('error');
          setMessage('Email verification incomplete. The verification link may have expired. Please try registering again.');
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
          console.error('[AuthCallback] Profile query error:', profileError);
          throw profileError;
        }

        // If profile doesn't exist, create it
        if (!profile) {
          console.log('[AuthCallback] Creating user profile...');
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
            console.error('[AuthCallback] Error creating profile:', insertError);
            throw insertError;
          }
          console.log('[AuthCallback] Profile created successfully');
        } else {
          console.log('[AuthCallback] Profile already exists');
        }

        // Success - redirect to dashboard
        console.log('[AuthCallback] Verification successful, redirecting to dashboard');
        setStatus('success');
        setMessage('Email verified successfully! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (err: any) {
        console.error('[AuthCallback] Callback error:', err);
        setStatus('error');
        setMessage(err.message || 'An error occurred during email verification. Please try again or contact support.');
        setTimeout(() => navigate('/register'), 4000);
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
