// Frontend Auth Callback Route
// File: src/pages/auth/callback.tsx (or .jsx for React)
//       OR src/routes/auth/callback.svelte (for SvelteKit)
//       OR app/auth/callback/page.tsx (for Next.js)

/**
 * This route handles the email verification callback from Supabase.
 * 
 * When user clicks the verification link in email:
 * https://xyzabc.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=https://ucc-ipo.com/auth/callback?code=yyy
 * 
 * Supabase redirects to: https://ucc-ipo.com/auth/callback?code=yyy
 * This page processes the code.
 */

// ============================================================
// React/Next.js Version (Recommended)
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // or useRouter from 'next/navigation' (App Router)
import { supabase } from '@/lib/supabase'; // Your Supabase client

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The URL should contain: ?code=exchange_code_from_supabase
        const code = new URLSearchParams(window.location.search).get('code');

        if (!code) {
          console.error('No code in URL. User may have clicked an expired or invalid link.');
          setStatus('error');
          setMessage('Verification link is invalid or expired. Please register again.');
          setTimeout(() => router.push('/register'), 3000);
          return;
        }

        console.log('[auth/callback] Exchanging code for session...');

        // Exchange the code for a session
        // Supabase SDK handles this automatically if you wait for auth state change
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('[auth/callback] Exchange code error:', error);
          setStatus('error');
          setMessage(`Verification failed: ${error.message}`);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (data.session) {
          console.log('[auth/callback] Session created for user:', data.session.user.id);
          setStatus('success');
          setMessage('✓ Email verified! Redirecting...');

          // Redirect to dashboard or home
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          console.warn('[auth/callback] No session returned');
          setStatus('error');
          setMessage('Session creation failed. Please try logging in.');
          setTimeout(() => router.push('/login'), 3000);
        }
      } catch (error: any) {
        console.error('[auth/callback] Unexpected error:', error);
        setStatus('error');
        setMessage(`Unexpected error: ${error.message}`);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        textAlign: 'center',
      }}>
        {status === 'verifying' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              margin: '0 auto 20px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #1a59a6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <h1>Verifying Email</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
            }}>✓</div>
            <h1>Email Verified!</h1>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              color: '#dc2626',
            }}>✕</div>
            <h1>Verification Failed</h1>
          </>
        )}

        <p style={{
          color: '#6b7280',
          fontSize: '16px',
          margin: '0',
        }}>
          {message}
        </p>

        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/register'}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#1a59a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SvelteKit Version
// ============================================================

/*
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';

  let status: 'verifying' | 'success' | 'error' = 'verifying';
  let message = 'Verifying your email...';

  onMount(async () => {
    const code = $page.url.searchParams.get('code');

    if (!code) {
      status = 'error';
      message = 'Verification link is invalid or expired. Please register again.';
      await new Promise(r => setTimeout(r, 3000));
      goto('/register');
      return;
    }

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) throw error;

      status = 'success';
      message = '✓ Email verified! Redirecting...';
      await new Promise(r => setTimeout(r, 1500));
      goto('/dashboard');
    } catch (error: any) {
      status = 'error';
      message = `Verification failed: ${error.message}`;
      await new Promise(r => setTimeout(r, 3000));
      goto('/login');
    }
  });
</script>

<div class="container">
  {#if status === 'verifying'}
    <div class="spinner" />
    <h1>Verifying Email</h1>
  {:else if status === 'success'}
    <div class="success">✓</div>
    <h1>Email Verified!</h1>
  {:else}
    <div class="error">✕</div>
    <h1>Verification Failed</h1>
  {/if}

  <p>{message}</p>

  {#if status === 'error'}
    <button on:click={() => goto('/register')}>Try Again</button>
  {/if}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: #f9fafb;
    font-family: Arial, sans-serif;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #1a59a6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .success {
    font-size: 48px;
    color: #059669;
  }

  .error {
    font-size: 48px;
    color: #dc2626;
  }

  h1 {
    margin: 20px 0;
    font-size: 24px;
  }

  p {
    color: #6b7280;
    font-size: 16px;
    margin: 0;
  }

  button {
    margin-top: 20px;
    padding: 10px 20px;
    background: #1a59a6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  button:hover {
    background: #0d3a7a;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
*/
