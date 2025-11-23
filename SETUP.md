# Project Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

**In `.env.local`, add your values:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. For Bolt.new Deployment

In your Bolt.new project settings, add these environment variables:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables (get values from [Supabase Dashboard](https://supabase.com/dashboard)):
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

### 4. Development
```bash
npm run dev
```

### 5. Build & Deploy
```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── CertificateManager.tsx
│   ├── CompletionButton.tsx
│   ├── DashboardLayout.tsx
│   ├── NotificationCenter.tsx
│   ├── ProcessTrackingWizard.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React Context providers (Auth, etc.)
│   └── AuthContext.tsx
├── pages/              # Page components (one per route)
│   ├── AdminDashboard.tsx
│   ├── ApplicantDashboard.tsx
│   ├── EvaluatorDashboard.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── ...
├── lib/                # Utility functions and config
│   ├── supabase.ts     # Supabase client
│   └── database.types.ts # Generated types from Supabase
├── App.tsx             # Main app routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Code Quality

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

## Path Aliases

The project is configured with convenient path aliases for imports:

```typescript
// Instead of:
import { supabase } from '../../../lib/supabase';

// Use:
import { supabase } from '@lib/supabase';
```

Available aliases:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@pages/*` → `src/pages/*`
- `@contexts/*` → `src/contexts/*`
- `@lib/*` → `src/lib/*`

## Deployment Checklist

Before pushing to GitHub:

- [ ] Run `npm run typecheck` - no TypeScript errors
- [ ] Run `npm run lint` - no linting errors
- [ ] Run `npm run build` - successful build
- [ ] Test locally with `npm run preview`
- [ ] Verify environment variables are set in Bolt.new settings
- [ ] `.env.local` is in `.gitignore` (never commit credentials)

Then deploy:
```bash
git add .
git commit -m "update"
git push
```

## Production Notes

- Console logs are stripped in production builds
- Minification is enabled for optimal performance
- No source maps in production
- All environment variables must be defined before build time
