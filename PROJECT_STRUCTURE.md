# Project Structure & Architecture Overview

## Project Summary

**University Intellectual Property Management and Evaluation System** - A comprehensive Vite + React + TypeScript application for managing IP submissions, reviews, and evaluations with role-based access control.

**Tech Stack:**
- Frontend: React 18 + TypeScript 5.5
- Routing: React Router v7
- Styling: Tailwind CSS
- UI Components: Lucide React Icons
- Backend: Supabase (PostgreSQL + Authentication)
- Build Tool: Vite 5.4
- Code Quality: ESLint + TypeScript

---

## Directory Structure

```
project-root/
├── src/                              # Source code
│   ├── components/                   # Reusable UI components
│   │   ├── CertificateManager.tsx    # Certificate generation/download
│   │   ├── CompletionButton.tsx      # Submission completion handler
│   │   ├── DashboardLayout.tsx       # Main dashboard layout wrapper
│   │   ├── NotificationCenter.tsx    # Notification system
│   │   ├── ProcessTrackingWizard.tsx # Multi-step submission form
│   │   └── ProtectedRoute.tsx        # Authentication guard
│   │
│   ├── pages/                        # Page components (one per route)
│   │   ├── LandingPage.tsx           # Public landing page
│   │   ├── LoginPage.tsx             # User login
│   │   ├── RegisterPage.tsx          # User registration
│   │   ├── ApplicantDashboard.tsx    # Applicant dashboard
│   │   ├── SupervisorDashboard.tsx   # Supervisor review interface
│   │   ├── EvaluatorDashboard.tsx    # Evaluator assessment interface
│   │   ├── AdminDashboard.tsx        # Admin analytics & overview
│   │   ├── NewSubmissionPage.tsx     # Create new submission
│   │   ├── SubmissionDetailPage.tsx  # View submission details
│   │   ├── AllRecordsPage.tsx        # Browse all records
│   │   ├── AssignmentManagementPage.tsx # Manage assignments
│   │   ├── UserManagement.tsx        # Admin user management
│   │   └── SettingsPage.tsx          # User settings
│   │
│   ├── contexts/                     # React Context providers
│   │   └── AuthContext.tsx           # Global auth state & methods
│   │
│   ├── lib/                          # Utilities & configuration
│   │   ├── supabase.ts               # Supabase client initialization
│   │   └── database.types.ts         # Auto-generated Supabase types
│   │
│   ├── App.tsx                       # Main router & layout
│   ├── main.tsx                      # React entry point
│   ├── index.css                     # Global styles (Tailwind)
│   └── vite-env.d.ts                 # Vite type declarations
│
├── supabase/                         # Supabase configuration
│   ├── functions/                    # Deno Edge Functions
│   │   ├── create-user/
│   │   ├── generate-certificate/
│   │   ├── send-verification-code/
│   │   ├── verify-code/
│   │   └── ... (other functions)
│   │
│   └── migrations/                   # Database schema migrations
│       └── 20251115150428_*.sql      # Database schema
│
├── Configuration Files
│   ├── vite.config.ts                # Vite build configuration
│   ├── tsconfig.json                 # TypeScript root config
│   ├── tsconfig.app.json             # App-specific TypeScript config
│   ├── tsconfig.node.json            # Node/build TypeScript config
│   ├── eslint.config.js              # ESLint rules
│   ├── tailwind.config.js            # Tailwind CSS config
│   ├── postcss.config.js             # PostCSS plugins
│   ├── package.json                  # Dependencies & scripts
│   └── .env.example                  # Environment variables template
│
├── Environment Files (Git-ignored)
│   └── .env.local                    # Local environment variables
│
├── Documentation
│   ├── README.md                     # Project overview
│   ├── SETUP.md                      # Quick start & development guide
│   ├── BOLT_ENVIRONMENT.md           # Bolt.new environment setup
│   ├── DEPLOYMENT_CHECKLIST.md       # Pre-deployment tasks
│   ├── FEATURES.md                   # Feature documentation
│   ├── PROJECT_SUMMARY.md            # Project details
│   └── ... (other docs)
│
└── Build Outputs
    └── dist/                         # Production build output (gitignored)
```

---

## Key Components & Their Responsibilities

### Authentication & Authorization
**File**: `src/contexts/AuthContext.tsx`
- Manages user login/logout
- Maintains authentication state globally
- Provides user profile data
- Handles session persistence

**Usage**:
```typescript
import { useAuth } from '@contexts/AuthContext';

function MyComponent() {
  const { user, profile, signIn, signOut } = useAuth();
}
```

### Protected Routes
**File**: `src/components/ProtectedRoute.tsx`
- Wraps routes that require authentication
- Redirects unauthenticated users to login
- Checks role-based access control

### Dashboard Layout
**File**: `src/components/DashboardLayout.tsx`
- Main layout wrapper for authenticated pages
- Provides sidebar/navigation
- Manages responsive layout

### Process Tracking Wizard
**File**: `src/components/ProcessTrackingWizard.tsx`
- Multi-step form for IP submissions
- Tracks form progress
- Handles file uploads

### Supabase Integration
**File**: `src/lib/supabase.ts`
- Initializes Supabase client
- Loads credentials from environment variables
- Configures authentication settings

---

## User Roles & Access Levels

| Role | Pages Accessible | Capabilities |
|------|-----------------|--------------|
| **Applicant** | Dashboard, Submit, My Submissions, Settings | Create/view submissions, download certificates |
| **Supervisor** | Review Queue, Submission Details | Review submissions, add feedback, approve/reject |
| **Evaluator** | Evaluations, Submission Details | Grade submissions on criteria, provide feedback |
| **Admin** | Analytics Dashboard, User Management, All Records | Full system oversight, user management |

---

## Data Flow

### User Registration
```
RegisterPage → AuthContext.signUp() → Supabase.auth.signUp()
→ Create user profile in DB → Success response
```

### Submission Creation
```
NewSubmissionPage → ProcessTrackingWizard → Submit data
→ Supabase insert → Supabase Edge Function triggers
→ Notification emails sent → Completion
```

### Evaluation Flow
```
EvaluatorDashboard → View submissions → SubmissionDetailPage
→ Grade on criteria → Submit evaluation → Supabase update
→ Notification sent to applicant
```

---

## Environment Variables

**Required for all environments**:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

**How to set**:
1. **Local Development**: Create `.env.local` with values
2. **Bolt.new Deployment**: Add in project Settings → Environment Variables

See `BOLT_ENVIRONMENT.md` for detailed setup instructions.

---

## Build & Deployment

### Scripts
```bash
npm run dev          # Start development server (hot reload)
npm run build        # Production build
npm run preview      # Preview production build locally
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Build Output
- Output directory: `dist/`
- Minified & optimized for production
- Console logs stripped in production
- No source maps in production

### Deployment to Bolt.new
```bash
git add .
git commit -m "update"
git push origin main
```

Bolt.new automatically:
1. Pulls latest code from GitHub
2. Installs dependencies
3. Runs build with environment variables
4. Deploys to CDN
5. Updates live URL

---

## Path Aliases

For cleaner imports, use configured path aliases:

```typescript
// Instead of relative imports:
import { useAuth } from '../../../contexts/AuthContext';

// Use aliases:
import { useAuth } from '@contexts/AuthContext';
import { supabase } from '@lib/supabase';
import { LandingPage } from '@pages/LandingPage';
```

**Available aliases**:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@pages/*` → `src/pages/*`
- `@contexts/*` → `src/contexts/*`
- `@lib/*` → `src/lib/*`

---

## Best Practices

✓ **Type Safety**: All files use TypeScript - no `any` types
✓ **Component Organization**: Small, reusable components in `/components`
✓ **Page Separation**: Each route has its own page component
✓ **Auth Management**: Centralized in AuthContext
✓ **Styling**: Tailwind CSS for consistent design
✓ **Linting**: ESLint + TypeScript rules enforce code quality
✓ **Environment**: Credentials never hardcoded, use environment variables
✓ **Git**: Sensitive files in `.gitignore`

---

## Troubleshooting

### Issue: "Cannot find module '@components/...'"
- Verify path alias in `vite.config.ts`
- Ensure file exists in correct location
- Restart dev server

### Issue: TypeScript errors
- Run `npm run typecheck`
- Check for missing types in `src/lib/database.types.ts`
- Ensure imports include file extensions

### Issue: Supabase connection fails
- Verify environment variables are set
- Check `VITE_SUPABASE_URL` format (should be full URL)
- Ensure project is active in Supabase dashboard

---

## Next Steps

1. **Local Development**: Follow `SETUP.md`
2. **Bolt.new Setup**: Follow `BOLT_ENVIRONMENT.md`
3. **Deployment**: Use `DEPLOYMENT_CHECKLIST.md`
4. **Feature Development**: Add new pages in `src/pages/`, components in `src/components/`

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0
**Maintainer**: Development Team
