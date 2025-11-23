# Quick Reference Guide

Fast lookup for common tasks and commands.

## Essential Commands

```bash
# Development
npm run dev           # Start dev server (hot reload)
npm run build         # Build for production
npm run preview       # Preview production build

# Quality Checks
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint code style check

# Deployment
git add .             # Stage all changes
git commit -m "msg"   # Commit changes
git push origin main  # Push to GitHub (triggers deployment)
```

## Quick Setup

```bash
# First time setup
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

## Bolt.new Environment Variables

Add to Bolt.new Settings → Environment Variables:
- `VITE_SUPABASE_URL=https://your-project.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-anon-key-here`

## Project Paths

```
src/
├── components/     # Reusable UI (CertificateManager, DashboardLayout, etc.)
├── pages/          # Routes (LandingPage, LoginPage, ApplicantDashboard, etc.)
├── contexts/       # Global state (AuthContext)
└── lib/            # Utilities & config (supabase.ts)
```

## Import Examples

```typescript
// ✓ Use path aliases (cleaner)
import { useAuth } from '@contexts/AuthContext';
import { ProtectedRoute } from '@components/ProtectedRoute';
import { supabase } from '@lib/supabase';

// ✗ Avoid relative paths
// import { useAuth } from '../../../contexts/AuthContext';
```

## Common Tasks

### Add New Page
1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Use components from `@components/`

### Add New Component
1. Create `src/components/MyComponent.tsx`
2. Export React component
3. Use in pages or other components

### Add Environment Variable
1. Add to `.env.example` (committed)
2. Add to `.env.local` (not committed)
3. Add to Bolt.new Settings → Environment Variables
4. Access with `import.meta.env.VITE_YOUR_VAR`

### Deploy Changes
```bash
npm run typecheck     # Check types
npm run lint          # Check style
npm run build         # Build locally
npm run preview       # Test build
git add . && git commit -m "feature: description" && git push
```

## Pre-Deployment Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run preview` works locally
- [ ] Environment variables set in Bolt.new
- [ ] `.env.local` not staged for commit

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Module not found | Check import path, use `@` aliases |
| TypeScript error | Run `npm run typecheck`, fix type issues |
| Lint error | Run `npm run lint -- --fix`, or fix manually |
| Build fails | Run `npm run build` locally to debug |
| Deployment fails | Check Bolt.new logs, verify env vars |
| Changes not showing | Restart dev server, check browser cache |

## Git Quick Reference

```bash
git status              # See what changed
git log --oneline       # See commit history
git add .               # Stage all changes
git commit -m "msg"     # Commit
git push origin main    # Push to GitHub
git pull origin main    # Get latest changes
git diff                # See what changed
git restore <file>      # Undo changes to file
```

## Documentation Files

- `SETUP.md` - Initial setup guide
- `BOLT_ENVIRONMENT.md` - Bolt.new environment setup
- `PROJECT_STRUCTURE.md` - Project architecture
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment tasks
- `GITHUB_WORKFLOW.md` - Git & deployment workflow
- `QUICK_REFERENCE.md` - This file

## Useful Links

- Supabase Dashboard: https://supabase.com/dashboard
- Bolt.new Project: Check your project URL
- GitHub Repository: https://github.com/JeromeLamarr/ucc-ipo-repo
- Local Dev: http://localhost:5173

## Need Help?

1. Check relevant `.md` file above
2. Run `npm run typecheck` or `npm run lint`
3. Check browser console (F12)
4. Check terminal output
5. Review code comments

## Tech Stack Summary

| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI Framework | 18.3.1 |
| TypeScript | Type Safety | 5.5.3 |
| React Router | Routing | 7.9.6 |
| Vite | Build Tool | 5.4.2 |
| Tailwind CSS | Styling | 3.4.1 |
| Supabase | Backend | 2.57.4 |
| ESLint | Code Quality | 9.9.1 |

## Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | `https://abc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | `eyJhbGciOiJIUzI1NiIs...` |

## File Structure at a Glance

```
src/
├── components/
│   ├── CertificateManager.tsx
│   ├── DashboardLayout.tsx
│   └── ProtectedRoute.tsx
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   └── ApplicantDashboard.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── supabase.ts
│   └── database.types.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0

For detailed information, see the full documentation files.
