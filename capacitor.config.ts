import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for UCC IPO Android wrapper.
 *
 * IMPORTANT: This uses server.url to point the Android wrapper at the live
 * deployed website. The Android app is a thin wrapper that loads the same
 * live system — no separate mobile codebase is required.
 *
 * To switch to a self-hosted/bundled build instead, remove the `server.url`
 * line and run `npx cap sync android` after `npm run build`.
 */
const config: CapacitorConfig = {
  appId: 'com.ucc.ipo',
  appName: 'UCC IPO',
  webDir: 'dist',
  server: {
    // Points the Android wrapper to the live deployed site.
    // Remove this line if you want to bundle the built app instead.
    url: 'https://ucc-ipo.com',
    cleartext: false, // HTTPS only — no HTTP allowed
  },
  android: {
    // Disallow mixed HTTP/HTTPS content for security
    allowMixedContent: false,
    // Capture input events (e.g. keyboard) correctly in WebView
    captureInput: true,
  },
};

export default config;
