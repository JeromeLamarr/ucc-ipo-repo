# Bolt.new Environment Setup Guide

This guide explains how to configure environment variables for your Bolt.new deployment.

## Prerequisites

1. A Supabase project (free tier available at [supabase.com](https://supabase.com))
2. Access to your Supabase project dashboard
3. A Bolt.new project linked to this GitHub repository

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API** (or **Project Settings**)
4. Copy the following values:
   - **Project URL** → Your `VITE_SUPABASE_URL`
   - **Anon/Public Key** → Your `VITE_SUPABASE_ANON_KEY`

> ⚠️ **Important**: Keep the anon key visible to the public (it's prefixed with `VITE_` for that reason). Never expose your service role or admin keys.

### 2. Add Environment Variables to Bolt.new

1. Open your Bolt.new project settings
2. Navigate to **Environment Variables** (or **Settings** → **Environment**)
3. Click **Add Environment Variable** and add these two:

| Variable Name | Value | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL | `https://abcdefgh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

4. Save the environment variables

### 3. Local Development Setup

For local development (before pushing to Bolt):

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

> **Note**: `.env.local` is gitignored and will never be committed to GitHub.

## Verifying Your Setup

### Test Locally
```bash
npm run dev
```
Visit `http://localhost:5173` and verify:
- Login page loads
- Supabase connection works (check browser console for errors)

### Test in Bolt.new
After pushing to GitHub:
1. Bolt.new automatically rebuilds and deploys
2. Check the deployment logs for build errors
3. Visit your live URL and verify the application works

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Bolt.new
- Environment variables need to be added **before** the first build
- Trigger a rebuild if variables were added after initial build

### Error: "undefined is not a valid API key"
- Check that you copied the full anon key value
- Ensure no extra spaces or quotes were included
- Verify you're using the **Anon/Public Key**, not the service role key

### Application loads but can't log in
- Open browser DevTools (F12)
- Go to Console tab
- Check for Supabase connection errors
- Verify your Supabase project is active and has authentication enabled

## Production Considerations

✓ All credentials are automatically injected at build time from environment variables
✓ The anon key in the frontend is intentionally public (it's designed for that)
✓ Sensitive operations use RLS (Row Level Security) policies in Supabase
✓ Service role credentials are only used in Supabase Edge Functions (server-side)

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Bolt.new Documentation](https://bolt.new/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
