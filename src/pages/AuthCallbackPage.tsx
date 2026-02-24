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
        // Log URL parameters for debugging (NO token/codes logged)
        console.log('[AuthCallback] Callback triggered');
        console.log('[AuthCallback] Has hash:', !!window.location.hash);
        console.log('[AuthCallback] Has search:', !!window.location.search);

        // Wait for Supabase auth state to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Parse query parameters and hash
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const code = params.get('code');
        const accessToken = hashParams.get('access_token');

        console.log('[AuthCallback] Detected flow:', {
          hasTokenHash: !!tokenHash,
          type,
          hasCode: !!code,
          hasAccessToken: !!accessToken,
        });

        let finalSession = null;

        // FLOW 1: Handle OTP verification (token_hash + type=signup from Supabase email)
        if (tokenHash && type === 'signup') {
          console.log('[AuthCallback] Attempting OTP verification (Supabase confirmation email)...');
          try {
            const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'signup',
            });

            if (otpError) {
              console.error('[AuthCallback] OTP verification error:', otpError.message);
              throw new Error(`Email verification failed: ${otpError.message}`);
            }

            if (otpData?.session) {
              finalSession = otpData.session;
              console.log('[AuthCallback] OTP verification successful');
            }
          } catch (otpErr: any) {
            console.error('[AuthCallback] OTP flow failed:', otpErr.message);
            // Don't throw - try other flows
          }
        }

        // FLOW 2: Handle PKCE code exchange (code parameter from magic link)
        if (!finalSession && code) {
          console.log('[AuthCallback] Attempting code exchange (PKCE magic link flow)...');
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error('[AuthCallback] Code exchange error:', exchangeError.message);
              throw new Error(`Code exchange failed: ${exchangeError.message}`);
            }

            if (exchangeData?.session) {
              finalSession = exchangeData.session;
              console.log('[AuthCallback] Code exchange successful');
            }
          } catch (codeErr: any) {
            console.error('[AuthCallback] Code exchange flow failed:', codeErr.message);
            // Don't throw - try other flows
          }
        }

        // FLOW 3: Check if session was already auto-established (access_token in hash)
        if (!finalSession && accessToken) {
          console.log('[AuthCallback] Access token in hash detected, checking session...');
        }

        // FLOW 4: Final attempt - get current session (may be auto-established)
        if (!finalSession) {
          console.log('[AuthCallback] Attempting to retrieve auto-established session...');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('[AuthCallback] Session retrieval error:', sessionError.message);
            throw new Error(`Failed to get session: ${sessionError.message}`);
          }

          if (session) {
            finalSession = session;
            console.log('[AuthCallback] Session auto-established from browser storage');
          }
        }

        // No session could be established
        if (!finalSession) {
          console.error('[AuthCallback] No session established - verification link may be invalid or expired');
          setStatus('error');
          setMessage('Email verification failed. Your link may have expired. Please request a new verification email.');
          setTimeout(() => navigate('/register'), 4000);
          return;
        }

        // Verify email is confirmed
        const user = finalSession.user;
        console.log('[AuthCallback] Session established for user:', user.id);

        if (!user.email_confirmed_at) {
          console.warn('[AuthCallback] Email not marked as confirmed in auth');
          setStatus('error');
          setMessage('Email not confirmed. Please contact support at support@ucc-ipo.com');
          setTimeout(() => navigate('/register'), 4000);
          return;
        }

        console.log('[AuthCallback] Email confirmed:', user.email);

        // Wait for database trigger to create profile (retry up to 3 times)
        console.log('[AuthCallback] Waiting for profile creation by trigger...');
        let profile = null;
        let retries = 0;
        const maxRetries = 3;

        while (!profile && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s between attempts

          const { data, error: profileError } = await supabase
            .from('users')
            .select('id, role, is_verified, is_approved')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('[AuthCallback] Profile lookup error:', profileError.message);
            throw profileError;
          }

          if (data) {
            profile = data;
            console.log('[AuthCallback] Profile found:', {
              id: data.id,
              role: data.role,
              is_verified: data.is_verified,
              is_approved: data.is_approved
            });
            break;
          }

          retries++;
          console.log(`[AuthCallback] Profile not found yet, retry ${retries}/${maxRetries}`);
        }

        if (!profile) {
          console.error('[AuthCallback] Profile creation by trigger failed or timed out');
          setStatus('error');
          setMessage('Email verified, but profile creation failed. Please contact support at support@ucc-ipo.com');
          setTimeout(() => navigate('/login'), 4000);
          return;
        }

        // Success!
        console.log('[AuthCallback] Email verification complete, profile ready');
        setStatus('success');

        if (profile.is_approved === false) {
          setMessage('Email verified successfully! Your account is pending admin approval. You will be notified once approved.');
        } else {
          setMessage('Email verified successfully! Redirecting to dashboard...');
        }

        setTimeout(() => {
          navigate('/dashboard');
        }, 2500);
      } catch (err: any) {
        // Only log error message, NOT the error object or stack
        const errorMsg = err?.message || 'Unknown verification error';
        console.error('[AuthCallback] Verification failed:', errorMsg);
        setStatus('error');
        setMessage('Email verification failed. Please request a new verification link or contact support@ucc-ipo.com');
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
