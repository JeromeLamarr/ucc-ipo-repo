# PROJECT AUDIT: UCC IP Management System
**Date**: February 24, 2026  
**Status**: Active Development  
**Framework**: React 18 + TypeScript + Vite + Supabase  

---

## 1) Project Overview

### Product Purpose
The **University Intellectual Property Management System** is a comprehensive web-based platform for managing intellectual property submissions, reviews, evaluations, and approvals at the University of Cape Coast. It facilitates the end-to-end workflow of IP disclosure, supervisor review, expert evaluation, and certificate generation for IP applicants.

### Target User Roles & Workflows

| Role | Purpose | Key Actions |
|------|---------|------------|
| **Applicant** | Submit and track IP disclosures | Create submission, upload documents, track status, request certificate |
| **Supervisor** | Review IP submissions | Approve/reject/request revision, add remarks |
| **Evaluator** | Grade and assess IP | Score on 4 criteria (Innovation, Feasibility, Market Potential, Technical Merit), provide feedback |
| **Admin** | System oversight | User management, analytics, CMS page editing, department management |

### Core End-to-End Workflows

1. **IP Submission Workflow** (Applicant → Supervisor → Evaluator → Admin)
   - Applicant submits IP disclosure with category, title, abstract, and documents
   - Supervisor reviews and approves or requests revision
   - Evaluator assesses submission across 4-point grading scale
   - Admin generates official certificate with QR code for verification

2. **Legal & Document Management Workflow**
   - System-generated PDFs stored with tracking IDs
   - Public certificate verification via `/verify/:trackingId`
   - Legacy record digitization and migration
   - Full disclosure document generation for legal filings

3. **User & Role Management Workflow**
   - Admin creates users with role assignment (applicant/supervisor/evaluator/admin)
   - Department-based organization and access control
   - Email verification and temporary password system
   - Supervisor and evaluator assignment to submissions

4. **Academic Materials Workflow** (Secondary feature)
   - Applicants submit presentation materials alongside IP
   - Separate storage and tracking from main IP documents

---

## 2) Tech Stack & Tooling

### Frontend Framework
- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 5.4.2
- **Routing**: React Router DOM v7.9.6
- **Styling**: Tailwind CSS 3.4.1 (utility-first, no custom theme)
- **Icons**: Lucide React 0.344.0
- **UI Tools**: DOMPurify 3.3.1 (for XSS protection on rich text)
- **Code Quality**: ESLint 9.9.1, TypeScript ESLint

### Backend & Database
- **Backend Service**: Supabase (PostgreSQL + Auth + Storage)
- **Database Version**: PostgreSQL 17
- **Client Library**: @supabase/supabase-js 2.57.4
- **Edge Functions**: Deno-based serverless functions (23 functions deployed)
- **Storage**: Supabase Storage (ip-documents, presentation-materials buckets)

### Authentication
- **Method**: Supabase Auth (email + password)
- **Session Persistence**: Automatic token refresh, browser-based persistence
- **Authorization**: Role-based access control (RBAC) via RLS policies
- **Custom User Profiles**: Extended via `users` table with role, department, category_specialization

### Email Service
- **Primary**: Supabase built-in email service (for certificates, notifications)
- **Alternative**: Resend API integration available (for send-notification-email edge function)

### Deployment & Hosting
- **Bolt.new**: Template-based development environment (`template: bolt-vite-react-ts`)
- **Build Output**: Vite outputs to `dist/` directory
- **Dev Scripts**: 
  - `npm run dev` - Start development server
  - `npm run build` - Build for production (minify, strip console in prod)
  - `npm run typecheck` - TypeScript type validation
  - `npm run test` - Vitest unit testing
  - `npm run lint` - ESLint code quality checks

---

## 3) Repo Structure Map

```
project-root/
├── src/                              # Main source code
│   ├── components/                   # 43 reusable React components
│   │   ├── Auth & Protected Routes
│   │   │   ├── ProtectedRoute.tsx         (Role-based route guard)
│   │   │   └── Button.tsx, Card.tsx, FormField.tsx (UI primitives)
│   │   ├── Dashboards
│   │   │   └── DashboardLayout.tsx        (Main layout wrapper)
│   │   ├── Forms & Submission
│   │   │   ├── ProcessTrackingWizard.tsx  (Multi-step IP submission)
│   │   │   ├── DocumentUploadSection.tsx  (File upload handler)
│   │   │   ├── MaterialsSubmissionForm.tsx (Academic materials)
│   │   │   └── EditSubmissionModal.tsx
│   │   ├── CMS & Page Management
│   │   │   ├── CMSSectionEditor.tsx       (Section builder)
│   │   │   ├── TextBlockFormEnhanced.tsx  (Rich text editing)
│   │   │   ├── PagePreviewRenderer.tsx    (Preview view)
│   │   │   └── PublicNavigation.tsx       (Dynamic nav from CMS pages)
│   │   ├── Certificates & Documents
│   │   │   ├── CertificateManager.tsx     (Certificate download/view)
│   │   │   ├── DocumentGenerator.tsx      (PDF generation)
│   │   │   └── FullDisclosureManager.tsx  (Legal disclosure doc)
│   │   ├── Admin Tools
│   │   │   ├── AdminDepartmentManagement.tsx
│   │   │   ├── TitleDuplicateChecker.tsx
│   │   │   └── NotificationCenter.tsx
│   │   └── Legacy Records
│   │       ├── LegacyRecordBadge.tsx
│   │       └── LegacyRecordDetailModal.tsx
│   │
│   ├── pages/                        # 27 page components (one per route)
│   │   ├── Public Pages
│   │   │   ├── LandingPage.tsx          (Homepage, unauthenticated)
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx         (Requires department selection)
│   │   │   ├── AuthCallbackPage.tsx     (Email verification redirect)
│   │   │   └── CMSPageRenderer.tsx      (Dynamic public pages from CMS)
│   │   ├── Verification Pages
│   │   │   ├── CertificateVerifyPage.tsx
│   │   │   └── DisclosureVerifyPage.tsx
│   │   ├── Applicant Dashboard
│   │   │   ├── ApplicantDashboard.tsx   (Main submission list)
│   │   │   ├── NewSubmissionPage.tsx    (Create new IP)
│   │   │   └── SubmissionDetailPage.tsx (View/edit IP details)
│   │   ├── Role-Based Dashboards
│   │   │   ├── SupervisorDashboard.tsx  (Review queue)
│   │   │   ├── EvaluatorDashboard.tsx   (Evaluation queue)
│   │   │   └── AdminDashboard.tsx       (Analytics & overview)
│   │   ├── Admin Pages
│   │   │   ├── UserManagement.tsx       (CRUD users)
│   │   │   ├── AllRecordsPage.tsx       (View all submissions)
│   │   │   ├── DeletedArchivePage.tsx   (Soft-deleted records)
│   │   │   ├── LegacyRecordsPage.tsx    (Pre-digitization records)
│   │   │   ├── AddLegacyRecordPage.tsx  (Manual IP entry)
│   │   │   ├── AssignmentManagementPage.tsx (Allocate evaluators)
│   │   │   ├── DepartmentManagementPage.tsx (Dept CRUD)
│   │   │   ├── AdminBrandingSettingsPage.tsx (Logo/color theming)
│   │   │   ├── PublicPagesManagement.tsx (CMS page list)
│   │   │   ├── PageSectionsManagement.tsx (Edit CMS sections)
│   │   │   ├── CMSPageEditor.tsx (Create/edit CMS pages)
│   │   │   └── SettingsPage.tsx         (User preferences)
│   │
│   ├── contexts/                     # React Context providers
│   │   └── AuthContext.tsx            (Global auth state, user profile, session)
│   │
│   ├── lib/                          # Utility functions & configuration
│   │   ├── database.types.ts          (Generated TypeScript types from Supabase schema)
│   │   ├── supabase.ts                (Supabase client initialization)
│   │   ├── fileUpload.ts              (File upload utilities)
│   │   ├── cmsSetup.ts                (CMS initialization)
│   │   ├── processTracking.ts         (IP status & workflow helpers)
│   │   ├── validation.ts              (Form validation rules)
│   │   ├── sectionValidation.ts       (CMS section validation)
│   │   ├── statusLabels.ts            (Human-readable status mapping)
│   │   ├── stylePresets.ts            (Tailwind preset configurations)
│   │   └── pageTemplates.ts           (CMS page template definitions)
│   │
│   ├── services/                     # Business logic services
│   │   ├── brandingService.ts         (Logo/branding upload)
│   │   ├── materialsService.ts        (Academic materials CRUD)
│   │   ├── materialsEmailService.ts   (Email notifications for materials)
│   │   └── API Routes
│   │       └── materialsRoutes.ts     (REST API endpoint definitions)
│   │
│   ├── constants/                    # Application constants
│   │   └── cmsConstants.ts            (CMS section types, routes, page slugs)
│   │
│   ├── hooks/                        # Custom React hooks (TBD)
│   │
│   ├── api/                          # API integration layer
│   │   └── materialsRoutes.ts         (API route handlers)
│   │
│   ├── test/                         # Unit tests
│   │   └── vitest configuration
│   │
│   ├── styles/                       # Tailwind CSS config
│   │   └── index.css
│   │
│   ├── App.tsx                       # Root routing setup
│   └── main.tsx                      # React app entry point
│
├── supabase/                         # Supabase backend configuration
│   ├── config.toml                   # Supabase local CLI config
│   ├── migrations/                   # 72 SQL migration files
│   │   ├── Core Schema (Phase 1)
│   │   │   └── 20251115150428_create_ip_management_system_schema_v2.sql
│   │   ├── Storage & RLS Policies (Phase 2)
│   │   │   ├── 20251115153558_setup_storage_and_helpers.sql
│   │   │   ├── 20251115173454_fix_security_and_performance_issues_v2.sql
│   │   │   └── 20251115180527_fix_infinite_recursion_in_user_policies.sql
│   │   ├── Auth & Email System
│   │   │   ├── 20251123190300_add_email_verification_system.sql
│   │   │   └── 20251212_auto_create_user_on_email_verified.sql
│   │   ├── Department System
│   │   │   ├── 20251214_add_department_id_to_users.sql
│   │   │   ├── 20251219_add_departments_system.sql
│   │   │   └── 20260119_consolidate_affiliation_to_department.sql
│   │   ├── Academic Materials System
│   │   │   ├── 20260120_add_academic_presentation_materials.sql
│   │   │   └── 20260120_add_current_step_to_ip_records.sql
│   │   ├── Soft Delete & Legacy Records
│   │   │   ├── 20260220_add_soft_delete_to_ip_records.sql
│   │   │   └── 20251229000002_create_legacy_ip_records_table.sql
│   │   ├── CMS System
│   │   │   ├── create_cms_tables.sql
│   │   │   ├── 20260217_add_tabs_section_type.sql
│   │   │   └── fix_cms_rls_policies.sql
│   │   ├── Disclosure Tracking
│   │   │   └── 20251227_create_full_disclosures_table.sql
│   │   └── Bug Fixes & Iterative Improvements (42 files)
│   │       (RLS policy fixes, recursion fixes, trigger updates, etc.)
│   │
│   └── functions/                   # Deno-based Edge Functions (23 total)
│       ├── Authentication
│       │   ├── register-user/              (User registration + email verification)
│       │   ├── send-verification-code/     (Verification code generation)
│       │   ├── verify-code/                (Code validation)
│       │   └── reset-user-password/        (Password reset)
│       ├── Certificates & PDFs
│       │   ├── generate-certificate/       (PDF cert with QR code)
│       │   ├── generate-certificate-legacy/
│       │   ├── generate-full-disclosure/   (Legal disclosure document)
│       │   ├── generate-disclosure-legacy/
│       │   ├── generate-pdf/               (Generic PDF generation)
│       │   ├── send-certificate/           (Certificate delivery)
│       │   └── send-certificate-email/     (Email notification)
│       ├── Email Notifications
│       │   ├── send-notification-email/    (Generic notifications)
│       │   ├── send-status-notification/   (Status change alerts)
│       │   ├── send-completion-notification/
│       │   ├── send-revision-resubmit-notification/
│       │   └── process-email-queue/        (Batch email processing)
│       ├── User Management
│       │   ├── create-user/                (Admin user creation)
│       │   └── initialize-evaluators/      (Bulk evaluator setup)
│       ├── Document Processing
│       │   ├── generate-documentation/     (Auto-doc generation)
│       │   ├── check-title/                (Duplicate title detection)
│       │   ├── delete-draft/               (Draft deletion)
│       │   └── submit-presentation-materials/ (Academic materials upload)
│       ├── Department Management
│       │   └── manage-departments/         (CRUD departments)
│       └── _shared/                        (Shared utility functions)
│
├── scripts/                         # Deployment & setup scripts
│   ├── init.js                       (Initialize project)
│   └── setup*.py, setup*.js          (Demo page & storage setup)
│
├── .bolt/                           # Bolt.new configuration
│   └── config.json                  (Uses bolt-vite-react-ts template)
│
├── Configuration Files
│   ├── package.json                 (Dependencies & NPM scripts)
│   ├── tsconfig.json                (TypeScript configuration)
│   ├── tsconfig.app.json            (App-specific TS config)
│   ├── tsconfig.node.json           (Build tool TS config)
│   ├── vite.config.ts               (Path aliases, build config)
│   ├── vitest.config.ts             (Unit testing framework)
│   ├── tailwind.config.js           (Tailwind CSS config)
│   ├── postcss.config.js            (PostCSS + Autoprefixer)
│   ├── eslint.config.js             (Code quality rules)
│   └── .env.example                 (Required environment variables)
│
├── dist/                            # Build output (generated)
│
├── node_modules/                    # NPM dependencies (generated)
│
└── Documentation Files (100+ markdown files)
    ├── SETUP.md, README.md, FEATURES.md
    ├── Deployment & Implementation Guides
    ├── CMS System Documentation (40+ guides)
    ├── Feature Implementation Records
    ├── SQL Migration & RLS Policy Fixes (30+ docs)
    ├── Email & Certificate System Docs
    ├── Legacy Records & Digitization Guides
    └── Testing & Troubleshooting Guides

```

### Submodules
- **ucc-ipo-repo** (submodule pointed at e6265b7)
  - Contains another version of the project with similar structure
  - Used by Bolt.new for code generation and updates

---

## 4) Application Architecture

### Routing Structure (React Router v7)

**Public Routes (No Authentication)**
```
GET  /                              → LandingPage (product marketing)
GET  /login                         → LoginPage (user login form)
GET  /register                      → RegisterPage (account creation)
GET  /auth/callback                 → AuthCallbackPage (email verification redirect)
GET  /verify/:trackingId            → CertificateVerifyPage (public cert viewer)
GET  /verify-disclosure/:trackingId → DisclosureVerifyPage (public disclosure viewer)
GET  /pages/:slug                   → CMSPageRenderer (dynamic CMS pages)
```

**Protected Routes (Requires Authentication & Role)**
```
All nested under /dashboard/* with role-based access (via ProtectedRoute + useAuth())

GET    /dashboard                   → DashboardRouter (role-based root)
GET    /dashboard/submit            → NewSubmissionPage (create IP) [applicant]
GET    /dashboard/submissions       → ApplicantDashboard (my submissions) [applicant]
GET    /dashboard/submissions/:id   → SubmissionDetailPage (view/edit IP) [applicant]
GET    /dashboard/review            → SupervisorDashboard (review queue) [supervisor]
GET    /dashboard/evaluations       → EvaluatorDashboard (grading queue) [evaluator]
GET    /dashboard/users             → UserManagement (admin users CRUD) [admin]
GET    /dashboard/records           → AllRecordsPage (all submissions) [admin]
GET    /dashboard/deleted-records   → DeletedArchivePage (soft-deleted IPs) [admin]
GET    /dashboard/legacy-records    → LegacyRecordsPage (pre-digital IPs) [admin]
GET    /dashboard/legacy-records/new → AddLegacyRecordPage (manual IP entry) [admin]
GET    /dashboard/legacy-records/:id → LegacyRecordDetailPage (legacy detail) [admin]
GET    /dashboard/assignments       → AssignmentManagementPage (evaluator allocation) [admin]
GET    /dashboard/departments       → DepartmentManagementPage (dept mgmt) [admin]
GET    /dashboard/public-pages      → PublicPagesManagement (CMS page list) [admin]
GET    /dashboard/public-pages/:slug/edit → CMSPageEditor (edit CMS page) [admin]
GET    /dashboard/public-pages/:pageId → PageSectionsManagement (sections edit) [admin]
GET    /dashboard/analytics         → AdminDashboard (analytics view) [admin]
GET    /dashboard/settings          → SettingsPage (user prefs) [all users]
GET    /dashboard/branding          → AdminBrandingSettingsPage (logo/color) [admin]
```

### Main Components & Layout Structure

```
<BrowserRouter>
└── <AuthProvider>  (Global auth state)
    ├── <LandingPage /> (public)
    ├── <LoginPage /> (public)
    ├── <RegisterPage /> (public)
    └── <ProtectedRoute>
        └── <DashboardRouter>
            └── <DashboardLayout>  (Left sidebar nav + top header)
                ├── <ApplicantDashboard />
                ├── <SupervisorDashboard />
                ├── <EvaluatorDashboard />
                ├── <AdminDashboard />
                └── [other dashboard pages]
```

### State Management Approach

- **Component-Level State**: React `useState()` for local component state
- **Global Auth State**: Context API via `AuthContext` (user, profile, loading, sign methods)
- **Async Data Fetching**: Direct Supabase client calls within components/services
- **Query Caching**: None currently (calls re-run on component mount); candidate for TanStack Query
- **Server State**: Supabase handles—changes sync via subscriptions not yet fully implemented

### Data Flow Architecture

```
Frontend Component
    ↓
Supabase Client (supabase.ts)
    ↓ (PostgREST queries)
Supabase Database (PostgreSQL 17)
    ↓ (RLS Policies enforce row-level security)
Auth Layer (Supabase Auth + JWT)
    ↓ (Edge Functions for complex operations)
Deno Edge Functions
    ↓ (For cert generation, email, PDF)
Supabase Storage & External Services
    ↓
PDF files, emails, QR codes
```

Example Flow (IP Submission):
1. User fills `ProcessTrackingWizard` component (6-step form)
2. On submit → calls `supabase.from('ip_records').insert()`
3. RLS policy checks user_id matches applicant_id
4. Triggers auto-create `ip_documents` rows for uploads
5. Email notification via `send-status-notification` edge function
6. Supervisor sees new item in SupervisorDashboard (polls or manual refresh)

### Error Handling & Loading States

- **Try/Catch Blocks**: Most async operations wrapped in try/catch
- **Error UI**: Generic error messages displayed; details logged to console
- **Loading States**: 
  - `AuthContext.loading` = true while initializing auth
  - Component `useState` flags for data fetching
  - No global loading indicator
- **Missing Patterns**: No error boundary, no automatic retry logic, no optimistic updates

---

## 5) Features Inventory (Current State)

### A) Authentication & User Management

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| User Registration | `/register` | RegisterPage | ✓ Working (email verification) |
| Email Verification | `/auth/callback` | AuthCallbackPage | ✓ Working |
| Login | `/login` | LoginPage | ✓ Working |
| Password Reset | (edge function) | reset-user-password | ✓ Via edge function |
| Role Assignment | `Admin Dashboard` | UserManagement | ✓ Can assign: applicant/supervisor/evaluator/admin |
| Department Assignment | `Admin Dashboard` | UserManagement, DepartmentManagementPage | ✓ Linked to departments table |
| User Creation (Admin) | `Admin Dashboard` | UserManagement | ✓ Bulk or individual |
| Evaluator Initialization | (edge function) | initialize-evaluators | ✓ Bulk evaluator setup by category |

### B) IP Submission & Tracking

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Create IP Submission | `/dashboard/submit` | NewSubmissionPage, ProcessTrackingWizard | ✓ 6-step wizard (category, title, abstract, docs, supervisor, confirm) |
| View My Submissions | `/dashboard/submissions` | ApplicantDashboard | ✓ Table with status, filters |
| Edit Submission | `/dashboard/submissions/:id` | SubmissionDetailPage | ✓ In-progress edits; revision handling |
| Upload Documents | (embedded in wizard) | DocumentUploadSection, FileUploadField | ✓ Multi-file upload to IP-documents storage bucket |
| Track Status Changes | ApplicantDashboard | NotificationCenter | ✓ Real-time status updates + email notifications |
| Select Supervisor | (in wizard) | ProcessTrackingWizard | ✓ Dropdown of available supervisors |
| Document Download | SubmissionDetailPage | CertificateManager | ✓ Download uploaded docs |
| View Abstract/Details | SubmissionDetailPage | SubmissionDetailPage | ✓ Full submission view |
| Soft Delete (Archive) | `/dashboard/deleted-records` | DeletedArchivePage | ✓ is_deleted flag, soft-delete via edge function delete-draft |

### C) Supervisor Review Workflow

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Review Queue | `/dashboard/review` | SupervisorDashboard | ✓ List of assigned submissions |
| Approve Submission | SupervisorDashboard | EditSubmissionModal | ✓ Change status → supervisor_approved |
| Reject Submission | SupervisorDashboard | EditSubmissionModal | ✓ Change status → rejected |
| Request Revision | SupervisorDashboard | EditSubmissionModal | ✓ Change status → supervisor_revision |
| Add Remarks/Feedback | SupervisorDashboard | EditSubmissionModal | ✓ Text field in modal |
| Track Revisions | SubmissionDetailPage | ProcessTrackingWizard | ✓ current_step column tracks progress |
| Receive Notifications | (email) | send-status-notification | ✓ Email on new assignment, resubmission |

### D) Evaluator Grading & Assessment

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Evaluation Queue | `/dashboard/evaluations` | EvaluatorDashboard | ✓ Assigned submissions list |
| View Submission for Eval | EvaluatorDashboard | SubmissionDetailPage | ✓ Full details + prior feedback |
| Grade on 4 Criteria | EvaluatorDashboard | (modal in-page form) | ✓ Innovation, Feasibility, Market Potential, Technical Merit (0-10 scale) |
| Approve/Revision/Reject | EvaluatorDashboard | (modal in-page form) | ✓ Decision dropdown |
| Add Evaluation Remarks | EvaluatorDashboard | (modal in-page form) | ✓ Feedback text field |
| Track Evaluation Status | SubmissionDetailPage | SubmissionDetailPage | ✓ Status column shows evaluator_approved, etc. |
| Receive Notifications | (email) | send-status-notification | ✓ New assignment alerts |

### E) Certificate & Document Generation

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Generate Certificate | `/dashboard/submissions/:id` | CertificateManager, CompletionButton | ✓ PDF with QR code (via generate-certificate edge function) |
| Download Certificate | SubmissionDetailPage | CertificateManager | ✓ Direct download or email |
| Send Certificate Email | (dashboard button) | send-certificate-email | ✓ Email edge function |
| Public Certificate Verify | `/verify/:trackingId` | CertificateVerifyPage | ✓ QR code links to public verify page |
| Generate Full Disclosure | AdminDashboard (implied) | generate-full-disclosure | ✓ Legal document edge function (status: ready_for_filing) |
| Legacy Certificate Gen | (admin) | generate-certificate-legacy | ✓ For digitized legacy records |

### F) Admin Dashboards & Analytics

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| System Analytics | `/dashboard/analytics` | AdminDashboard | ✓ Overview cards (counts, charts) |
| User Management | `/dashboard/users` | UserManagement | ✓ Table with CRUD, role assignment |
| User Deletion | UserManagement | UserManagement | ✓ Hard delete from auth + profile |
| View All Records | `/dashboard/records` | AllRecordsPage | ✓ Responsive table, filters, search |
| Soft-Delete Management | `/dashboard/deleted-records` | DeletedArchivePage | ✓ View & restore archived IPs |
| Activity Logging | AdminDashboard (implied) | activity_logs table | ✓ Audit trail of changes |
| System Notifications | AdminDashboard | NotificationCenter | ✓ Unread count & detail view |

### G) Legacy Records & Digitization

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| View Legacy Records | `/dashboard/legacy-records` | LegacyRecordsPage | ✓ Pre-digital IP records (is_legacy_record = true) |
| Add Legacy Record | `/dashboard/legacy-records/new` | AddLegacyRecordPage | ✓ Manual entry form (admin) |
| View Legacy Detail | `/dashboard/legacy-records/:id` | LegacyRecordDetailPage | ✓ Full legacy record details |
| Digitize Legacy Record | (via add form) | AddLegacyRecordPage | ✓ Upload docs, edit metadata |
| Legacy Badge Indicator | AllRecordsPage, LegacyRecordsPage | LegacyRecordBadge | ✓ Visual indicator for legacy records |
| Legacy to Standard Workflow | (implied) | AddLegacyRecordPage | ✓ Can be converted to normal IP workflow |

### H) CMS & Public Page Management

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Create Public Page | `/dashboard/public-pages` | PublicPagesManagement, CMSPageEditor | ✓ Admin can create custom pages (Home always exists) |
| Edit Page Sections | `/dashboard/public-pages/:pageId` | PageSectionsManagement, CMSSectionEditor | ✓ Sections: hero, features, steps, categories, text, showcase, cta, gallery, tabs |
| Rich Text Editing | Section editor | TextBlockFormEnhanced, RichTextEditor | ✓ DOMPurify-sanitized HTML, Tailwind styling |
| Preview Page | CMSPageEditor | PagePreviewRenderer | ✓ Live preview before publish |
| Publish Page | CMSPageEditor | CMSPageEditor | ✓ Validation + publish toggle |
| View Public Page | `/pages/:slug` | CMSPageRenderer | ✓ Renders CMS-defined sections |
| Reorder Sections | PageSectionsManagement | PageSectionsManagement | ✓ Drag-reorder with visual feedback |
| Delete Section | PageSectionsManagement | PageSectionsManagement | ✓ Remove from page (soft-delete likely) |
| Dynamic Navigation | All public pages | PublicNavigation | ✓ Nav links auto-populate from CMS pages |
| Page Branding | `/dashboard/branding` | AdminBrandingSettingsPage | ✓ Upload logo, set primary color |

### I) Academic Presentation Materials (Secondary Feature)

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Submit Materials | (during IP submission?) | MaterialsSubmissionForm | ✓ Separate materials submission workflow |
| View Materials | SubmissionDetailPage | MaterialsView | ✓ Materials attached to IP record |
| Download Materials | SubmissionDetailPage | MaterialsView | ✓ Storage bucket download |
| Manage Materials (Admin) | (implied) | AdminDashboard | ~/  (Not fully exposed in UI, edge function exists) |
| Email Materials Status | (implied) | materialsEmailService | ✓ Notifications on materials review |

### J) Notifications & Email System

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Status Change Notifications | (in-app) | NotificationCenter | ✓ Unread badges, detail list |
| Email on Status Change | (email) | send-status-notification | ✓ Triggered on IP status update |
| Email on Completion | (email) | send-completion-notification | ✓ When workflow reaches end |
| Email on Revision Request | (email) | send-revision-resubmit-notification | ✓ Notifies applicant of needed changes |
| Notification Center UI | ApplicantDashboard | NotificationCenter | ✓ Bell icon + drawer |
| Mark as Read | NotificationCenter | NotificationCenter | ✓ Click notification |
| Email Queue Processing | (background) | process-email-queue | ✓ Batch email processing edge function |

### K) Department & Organizational Management

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| View Departments | `/dashboard/departments` | DepartmentManagementPage | ✓ List all departments |
| Create Department | DepartmentManagementPage | AdminDepartmentManagement | ✓ Add new department |
| Edit Department | DepartmentManagementPage | AdminDepartmentManagement | ✓ Update department info |
| Delete Department | DepartmentManagementPage | AdminDepartmentManagement | ✓ Remove department (RLS may prevent if in use) |
| Assign User to Department | UserManagement | UserManagement | ✓ User.department_id foreign key |
| Filter by Department | AllRecordsPage, AdminDashboard | (filters) | ✓ Department dropdown filter |

### L) API Documentation & Integration

| Feature | Route | Component(s) | Status |
|---------|-------|------------|--------|
| Materials API Routes | `/api/materials/*` | materialsRoutes.ts | ✓ REST endpoints for materials CRUD |
| Edge Function APIs | (serverless) | supabase/functions/* | ✓ 23 serverless functions deployed |

---

## 6) Backend / API / Database

### API Architecture

All API calls use **Supabase PostgREST** (auto-generated REST from tables) or **Edge Functions** (Deno serverless).

#### Edge Functions (23 Deployed)

| Function | Method | Purpose | Auth Required | File Path |
|----------|--------|---------|----------------|-----------|
| `register-user` | POST | User registration + auth setup | No | `supabase/functions/register-user/index.ts` |
| `verify-code` | POST | Email verification code validation | No | `supabase/functions/verify-code/index.ts` |
| `send-verification-code` | POST | Generate & send verification code | No | `supabase/functions/send-verification-code/index.ts` |
| `reset-user-password` | POST | Password reset workflow | No | `supabase/functions/reset-user-password/index.ts` |
| `create-user` | POST | Admin user creation | Yes (admin) | `supabase/functions/create-user/index.ts` |
| `initialize-evaluators` | POST | Bulk evaluator setup by category | Yes (admin) | `supabase/functions/initialize-evaluators/index.ts` |
| `generate-certificate` | POST | Generate PDF certificate with QR | Yes | `supabase/functions/generate-certificate/index.ts` |
| `generate-certificate-legacy` | POST | Certificate for legacy records | Yes | `supabase/functions/generate-certificate-legacy/index.ts` |
| `generate-full-disclosure` | POST | Legal disclosure PDF | Yes | `supabase/functions/generate-full-disclosure/index.ts` |
| `generate-disclosure-legacy` | POST | Legacy disclosure PDF | Yes | `supabase/functions/generate-disclosure-legacy/index.ts` |
| `generate-pdf` | POST | Generic PDF generation | Yes | `supabase/functions/generate-pdf/index.ts` |
| `send-certificate` | POST | Send cert PDF to user/email | Yes | `supabase/functions/send-certificate/index.ts` |
| `send-certificate-email` | POST | Email certificate | Yes | `supabase/functions/send-certificate-email/index.ts` |
| `send-status-notification` | POST | Status change email alert | Yes | `supabase/functions/send-status-notification/index.ts` |
| `send-completion-notification` | POST | Workflow completion email | Yes | `supabase/functions/send-completion-notification/index.ts` |
| `send-revision-resubmit-notification` | POST | Revision request email | Yes | `supabase/functions/send-revision-resubmit-notification/index.ts` |
| `send-notification-email` | POST | Generic notification email | No | `supabase/functions/send-notification-email/index.ts` |
| `process-email-queue` | POST | Batch email processing | Yes | `supabase/functions/process-email-queue/index.ts` |
| `check-title` | POST | Detect duplicate IP titles | Yes | `supabase/functions/check-title/index.ts` |
| `delete-draft` | POST | Soft-delete IP record | Yes | `supabase/functions/delete-draft/index.ts` |
| `generate-documentation` | POST | Auto-generate docs | Yes | `supabase/functions/generate-documentation/index.ts` |
| `submit-presentation-materials` | POST | Upload academic materials | Yes | `supabase/functions/submit-presentation-materials/index.ts` |
| `manage-departments` | POST | CRUD departments | Yes (admin) | `supabase/functions/manage-departments/index.ts` |

#### Supabase PostgREST Endpoints (Auto-Generated)

Tables automatically expose REST endpoints:
```
GET/POST   /rest/v1/ip_records              (CRUD submissions)
GET/POST   /rest/v1/ip_documents            (CRUD documents)
GET/POST   /rest/v1/users                   (CRUD user profiles)
GET/POST   /rest/v1/evaluations             (CRUD grades)
GET/POST   /rest/v1/notifications           (CRUD notifications)
GET/POST   /rest/v1/generated_pdfs          (CRUD certificates)
GET/POST   /rest/v1/activity_logs           (CRUD audit logs)
GET/POST   /rest/v1/departments             (CRUD departments)
GET/POST   /rest/v1/supervisor_assignments  (CRUD supervisor assignments)
GET/POST   /rest/v1/evaluator_assignments   (CRUD evaluator assignments)
GET/POST   /rest/v1/page_sections           (CRUD CMS sections)
GET/POST   /rest/v1/public_pages            (CRUD CMS pages)
GET/POST   /rest/v1/academic_presentation_materials (CRUD materials)
GET/POST   /rest/v1/legacy_ip_records       (CRUD legacy IPs)
GET/POST   /rest/v1/full_disclosures        (CRUD disclosure docs)
... and others
```

### Database Tables (11+ Core Tables)

| Table | Purpose | Key Columns | Created By Migration |
|-------|---------|------------|---------------------|
| `users` | User profiles & identity | id, auth_user_id, email, role, full_name, department_id, category_specialization, is_verified | 20251115150428_create_ip_management_system_schema_v2.sql |
| `ip_records` | IP submissions | id, applicant_id, category, title, abstract, status, supervisor_id, evaluator_id, is_deleted, is_legacy_record, current_step | 20251115150428_create_ip_management_system_schema_v2.sql |
| `ip_documents` | Attached documents | id, ip_record_id, file_path, doc_type, size_bytes | 20251115150428_create_ip_management_system_schema_v2.sql |
| `evaluations` | Grading records | id, evaluator_id, ip_record_id, innovation_score, feasibility_score, market_potential_score, technical_merit_score, decision, remarks | 20251115150428_create_ip_management_system_schema_v2.sql |
| `generated_pdfs` | Certificate storage | id, ip_record_id, file_path, created_at, checksum | 20251115150428_create_ip_management_system_schema_v2.sql |
| `supervisor_assignments` | Supervisor workflow | id, ip_record_id, supervisor_id, status | 20251115150428_create_ip_management_system_schema_v2.sql |
| `evaluator_assignments` | Evaluator allocation | id, ip_record_id, evaluator_id, status | 20251115150428_create_ip_management_system_schema_v2.sql |
| `notifications` | User alerts | id, user_id, message, type, read_at | 20251115150428_create_ip_management_system_schema_v2.sql |
| `activity_logs` | Audit trail | id, actor_id, action, table_name, record_id, old_data, new_data, created_at | 20251115150428_create_ip_management_system_schema_v2.sql |
| `departments` | Organizational units | id, name, code, description | 20251219_add_departments_system.sql |
| `public_pages` | CMS pages | id, slug, title, subtitle, is_published | create_cms_tables.sql |
| `page_sections` | CMS sections | id, page_id, section_type, content, styling, order | create_cms_tables.sql |
| `academic_presentation_materials` | Materials submissions | id, ip_record_id, file_path, submitted_at | 20260120_add_academic_presentation_materials.sql |
| `legacy_ip_records` | Pre-digital IPs | id, reference_number, title, category, applicant_info, digitized_at | 20251229000002_create_legacy_ip_records_table.sql |
| `full_disclosures` | Legal documents | id, ip_record_id, file_path, tracking_id | 20251227_create_full_disclosures_table.sql |
| `generated_pdfs` | All generated PDFs | id, ip_record_id, file_path, type (certificate/disclosure/etc) | 20251115150428_create_ip_management_system_schema_v2.sql |

### Database Enums

```typescript
// From database.types.ts
UserRole = 'applicant' | 'supervisor' | 'evaluator' | 'admin'
IpCategory = 'patent' | 'copyright' | 'trademark' | 'design' | 'utility_model' | 'other'
IpStatus = 'submitted' | 'waiting_supervisor' | 'supervisor_revision' | 'supervisor_approved' | 
           'waiting_evaluation' | 'evaluator_revision' | 'evaluator_approved' | 'preparing_legal' | 
           'ready_for_filing' | 'rejected' | 'draft'
DocumentType = 'disclosure' | 'attachment' | 'evidence' | 'draft' | 'generated_pdf' | 'other'
EvaluationDecision = 'approved' | 'revision' | 'rejected'
CmsSectionType = 'hero' | 'features' | 'steps' | 'categories' | 'text' | 'showcase' | 'cta' | 'gallery' | 'tabs'
```

### Storage Buckets

| Bucket | Purpose | Access | Contents |
|--------|---------|--------|----------|
| `ip-documents` | IP submission documents | Private (RLS) | Applicant uploads (PDFs, images, etc.) |
| `presentation-materials` | Academic materials | Private (RLS) | Academic materials from applicants |
| `generated-pdfs` | Certificates & disclosures | Private (RLS) | System-generated PDFs |
| `branding` | Logo & assets | Public | Company logo for UI |

### External APIs Integrated

| Service | Configuration | Purpose | File Path |
|---------|---------------|---------|-----------|
| Supabase Email | Built-in (no config needed) | Transactional emails (certs, status) | Edge functions |
| Resend API | Optional (RESEND_API_KEY env var) | Alternative email provider | send-notification-email function |
| QR Code Library | qrcode npm package | Generate certificate QR codes | generate-certificate function |

### Environment Variables Required

```bash
# Supabase Configuration (PUBLIC - safe to expose)
VITE_SUPABASE_URL=https://mqfftubqlwiemtxpagps.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional Production Settings
VITE_API_URL=https://your-domain.com  # Custom API domain
VITE_APP_NAME=UCC IP Management       # App display name
NODE_ENV=production                   # Env indicator

# Email Service (Optional)
RESEND_API_KEY=re_xxxx                # Alternative email provider
```

**Edge Functions automatically receive:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### Migrations & Schema Versioning

**72 SQL migration files** applied in order:
1. **Core schema** (11 tables, triggers, functions)
2. **Storage setup** (buckets, RLS policies)
3. **RLS policy fixes** (42 migrations to fix recursion, infinite loops)
4. **Feature additions** (email verification, departments, legacy records, CMS)
5. **Soft delete system** (add is_deleted column & triggers)

To apply migrations:
```bash
supabase migration list          # See all migrations
supabase db push                 # Apply pending migrations (local dev)
# Production: migrations auto-applied via Supabase dashboard
```

---

## 7) Security & Access Control Check

### Authentication & Authorization Model

**Auth Flow:**
1. User submits email + password to `/register` endpoint
2. `register-user` edge function:
   - Validates input (email format, password strength)
   - Creates Supabase Auth user
   - Creates `users` profile record with role = 'applicant' (default)
   - Sends verification email via Supabase email service
3. User clicks email link → `/auth/callback` → `verify-code` edge function
4. On login, `AuthContext` retrieves JWT from Supabase Auth
5. JWT included in all subsequent API requests

**JWT Handling:**
- Stored in browser localStorage (via Supabase's persistSession)
- Auto-refreshed (autoRefreshToken: true in supabase client)
- Included in Authorization header: `Authorization: Bearer <JWT>`

### Role-Based Access Control (RBAC)

**Roles:**
- `applicant` - Can submit IPs, view own submissions
- `supervisor` - Can review assigned submissions
- `evaluator` - Can grade assigned submissions
- `admin` - Full system access

**Route Protection:**
- All `/dashboard/*` routes wrapped in `<ProtectedRoute>`
- `ProtectedRoute` checks `profile.role` and redirects unauthenticated users to `/login`
- **Note**: No per-route role validation (all authenticated users can access any dashboard route)

**Database-Level RLS Policies:**

Example policies (from migrations):
```sql
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Applicants can view their own IPs
CREATE POLICY "Applicants can view their own IPs"
  ON ip_records FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = applicant_id));

-- Supervisors can view assigned submissions
CREATE POLICY "Supervisors can view their submissions"
  ON ip_records FOR SELECT
  USING (
    supervisor_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
```

### Secrets Management

**Public Keys** (safe to expose):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (limited permissions)

**Service Role Key** (must NOT expose):
- Only available in Edge Functions environment
- Never sent to frontend
- Used for admin operations bypassing RLS

**Storage in .env:**
- `.env.example` checked into repo (template)
- `.env` with actual keys in local dev only
- CI/CD should inject env vars at build/deploy time

### Identified Security Patterns & Concerns

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| No CORS headers validated on frontend calls | Medium | supabase.ts | Client makes unauthenticated requests to public API; relies on RLS |
| RLS policies use `auth.uid()` indirectly | Medium | Multiple migrations | Risk of infinite recursion if policy references table it's protecting (42 migrations were fixes) |
| DOMPurify sanitization for CMS HTML | Low | RichTextEditor, CMSSectionEditor | XSS protection on rich text (good practice) |
| Password reset flow | Low | reset-user-password function | Uses verification code, not JWT; reasonable but no rate limiting evident |
| No 2FA or MFA | Medium | AuthContext | All users authenticated via single factor |
| File uploads accept any MIME type | Medium | FileUploadField, ip-documents bucket | No file type validation in RLS; relies on frontend validation |
| No request rate limiting | Medium | Edge functions | Edge functions not rate-limited; open to DoS |
| Soft delete not cascading | Low | ip_records.is_deleted | Only ip_records soft-deleted; documents remain accessible via direct query |
| Public certificate verification endpoint | Low | CertificateVerifyPage | `/verify/:trackingId` publicly accessible (intended) |
| Email templates hardcoded | Low | Edge functions | Email content in code; no template system |

### XSS/Injection Protection

- DOMPurify 3.3.1 used in CMS text sections → strips malicious HTML
- SQL injection: Using Supabase PostgREST (parameterized queries) → no raw SQL from frontend
- Edge functions use Deno (sandboxed runtime) → limited OS access

---

## 8) Deployment & Environments

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment (copy from .env.example)
cp .env.example .env
# Edit .env with your Supabase project credentials

# 3. Start development server
npm run dev
# Opens http://localhost:5173

# 4. Connect to local Supabase (optional)
supabase start              # If using local Supabase
supabase db push            # Apply migrations

# 5. Run tests
npm run test                # Unit tests via Vitest
npm run test:ui             # UI for tests
```

### Build & Deployment

```bash
# Build for production
npm run build
# Output: dist/ directory (optimized, minified, no console logs)

# Type checking before build
npm run typecheck           # Catch TS errors

# Preview production build locally
npm run preview             # Serves dist/ at http://localhost:5000
```

**Build Configuration** (vite.config.ts):
- Minifies to `dist/`
- Strips console logs in production (`NODE_ENV=production`)
- Terser compression enabled
-No sourcemaps in production
- Path aliases resolved (`@`, `@components`, etc.)

### Environment-Specific Configuration

| Setting | Local Dev | Production |
|---------|-----------|-----------|
| Supabase URL | Same (cloud or local) | Cloud URL |
| Anon Key | Dev key (limited) | Prod key |
| Build | npm run dev (hot reload) | npm run build → dist/ |
| API URL | http://localhost:5173 | Actual domain |
| Email Service | Supabase (test or live) | Resend or Supabase |
| Console Logs | Visible | Stripped |

### Hosting Clues

- **Not Vercel/Netlify specific** (no `vercel.json` or `netlify.toml`)
- **Bolt.new integration**: Uses Bolt template (bolt-vite-react-ts)
- **Static site**: Vite output is fully static (HTML/JS/CSS) + serverless edge functions
- **Supabase Hosting**: Can deploy to Vercel, Netlify, or Fly.io by pointing to `dist/` folder
- **Edge Functions**: Deployed via Supabase CLI (`supabase functions deploy`)

**Recommended Deployment:**
1. Build frontend: `npm run build` → `dist/`
2. Deploy dist/ to Vercel/Netlify/Fly
3. Edge functions auto-deployed by Supabase dashboard or CLI

### CI/CD Files

- **No GitHub Actions or CI files found** in workspace
- Recommend adding `.github/workflows/deploy.yml` for:
  - Run tests on PR
  - Build on push to main
  - Deploy to Vercel/Netlify

---

## 9) Product/UI Notes

### Screen Inventory

| Screen | Route | Purpose | Last Seen Status |
|--------|-------|---------|------------------|
| **Public** ||||
| Landing Page | `/` | Marketing & product info | ✓ Working |
| Login Form | `/login` | Email/password auth | ✓ Working |
| Register Form | `/register` | New user signup + dept selection | ✓ Working |
| Cert Verify (Public) | `/verify/:trackingId` | QR code landing, public view | ✓ Working |
| Disclosure Verify | `/verify-disclosure/:trackingId` | Public disclosure document view | ✓ Working |
| CMS Pages | `/pages/:slug` | Dynamic content pages | ✓ Working (home, about, etc.) |
| **Applicant Dashboard** ||||
| Submissions List | `/dashboard/submissions` | My IPs table + status | ✓ Working (responsive layout added) |
| New Submission | `/dashboard/submit` | 6-step wizard | ✓ Working |
| Submission Detail | `/dashboard/submissions/:id` | View/edit IP, track progress | ✓ Working |
| **Supervisor Dashboard** ||||
| Review Queue | `/dashboard/review` | Assigned submissions for review | ✓ Working |
| Review Modal | (inline) | Approve/reject/request revision | ✓ Working |
| **Evaluator Dashboard** ||||
| Evaluation Queue | `/dashboard/evaluations` | Assigned IPs to grade | ✓ Working |
| Evaluation Form | (inline) | Score 4 criteria, decision | ✓ Working |
| **Admin Dashboard** ||||
| Analytics | `/dashboard/analytics` | Counts, charts, overview | ✓ Working |
| Users CRUD | `/dashboard/users` | Create/edit/delete users | ✓ Working |
| All Records | `/dashboard/records` | All IPs (responsive table) | ✓ Working |
| Deleted Records | `/dashboard/deleted-records` | Soft-deleted IPs | ✓ Working |
| Legacy Records | `/dashboard/legacy-records` | Pre-digital IPs | ✓ Working |
| Add Legacy IP | `/dashboard/legacy-records/new` | Manual IP entry | ✓ Working |
| Departments | `/dashboard/departments` | Dept management CRUD | ✓ Working |
| Assignments | `/dashboard/assignments` | Evaluator allocation | ✓ Working |
| CMS Pages | `/dashboard/public-pages` | List editable CMS pages | ✓ Working |
| CMS Editor | `/dashboard/public-pages/:slug/edit` | Edit page sections | ✓ Working |
| Branding | `/dashboard/branding` | Upload logo, set color | ✓ Working |
| Settings | `/dashboard/settings` | User preferences | ✓ Partial |

### Navigation Structure

```
Public (No Auth)
  ├─ Home (/)
  ├─ Dynamic Pages (/pages/*)
  ├─ Login (/login)
  ├─ Register (/register)
  └─ Verify Links (/verify/*, /verify-disclosure/*)

Authenticated (Sidebar Dashboard)
  ├─ Applicants
  │   ├─ Dashboard (submissions list)
  │   ├─ New Submission
  │   └─ Submission Detail
  ├─ Supervisors
  │   ├─ Review Queue
  │   └─ Submission Detail (review mode)
  ├─ Evaluators
  │   └─ Evaluation Queue
  └─ Admins
      ├─ Analytics
      ├─ Users
      ├─ All Records
      ├─ Deleted Records
      ├─ Legacy Records
      ├─ Departments
      ├─ Assignments
      ├─ Public Pages (CMS)
      └─ Branding
```

### Known Placeholder/Unfinished Areas

| Area | Status | Notes |
|------|--------|-------|
| Settings Page | ~ Partial | `/dashboard/settings` exists but minimal content |
| Evaluator Category Specialization | ~ Partial | Column exists, not widely used in assignment UI |
| Email Templates | ~/Hardcoded | No template engine; subject/body in edge function code |
| Activity Log Viewer | ~ Not exposed | activity_logs table exists; no UI to view |
| CMS Section: Gallery | ~/Not tested | Component exists but may have rendering issues |
| Academic Materials UI | ~/Incomplete | Edge function exists; limited dashboard exposure |
| Real-time Subscriptions | ✗ Not implemented | Could add Supabase realtime for live updates |
| Role-based Route Guards | ✗ Missing | All authenticated users can theoretically access any /dashboard route |
| Error Boundaries | ✗ Missing | No React error boundary; page crash on undefined state |

### Bugs & TODOs Found in Code

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| Missing role validation on /dashboard routes | Medium | App.tsx, ProtectedRoute | Any authenticated user can access any role-specific page (relies on RLS) |
| No error boundary | Medium | App.tsx | App crash if component throws during render |
| Loading placeholder too brief | Low | DashboardRouter | Shows "Loading..." but no actual loading state during profile fetch |
| EditSubmissionModal may not show recent data | Low | SupervisorDashboard | Modal opens, but underlying data not re-fetched when status changes |
| File type validation only frontend | Low | FileUploadField | No backend validation of uploaded file MIME types |
| No automatic retry on network fail | Low | Any fetch in components | Network errors don't auto-retry; user must reload |
| DOMPurify on already-sanitized HTML | Low | RichTextEditor | Possible double-sanitization (minor performance) |
| Legacy records soft-delete unclear | Low | DeleteArchivePage, AddLegacyRecordPage | Unclear if legacy records can be soft-deleted same way as regular IPs |
| Page section order sync | Low | PageSectionsManagement | Reorder updates `order` column; refresh may re-sort unexpectedly |
| Evaluator assignment without category check | Low | AssignmentManagementPage | UI allows assigning evaluator even if no category_specialization set |

---

## 10) Known Gaps & Recommended Next Updates

### Top 20 Improvements (Prioritized by Impact & Effort)

#### CRITICAL (Do First)

1. **Add Per-Route Role Authorization Guards** ⚠️ Security
   - **Issue**: `ProtectedRoute` only checks auth, not role
   - **Impact**: Admin user could potentially access evaluator features
   - **Fix**: Add role check in each route; redirect to /unauthorized if mismatch
   - **Effort**: Low (1-2 hrs)
   - **Files**: src/App.tsx, src/components/ProtectedRoute.tsx, src/pages/* (dashboard pages)
   ```typescript
   <ProtectedRoute requiredRole="admin">
     <AdminDashboard />
   </ProtectedRoute>
   ```

2. **Implement Error Boundary** 🚨 Stability
   - **Issue**: Uncaught errors crash entire app
   - **Impact**: Users see blank page on component error
   - **Fix**: Add React ErrorBoundary around <App>, show error UI
   - **Effort**: Low (1 hr)
   - **Files**: src/App.tsx (wrap Router), create src/components/ErrorBoundary.tsx

3. **Validate File Uploads (Backend)** 🔒 Security
   - **Issue**: No MIME type validation in Supabase
   - **Impact**: Users could upload malicious files
   - **Fix**: Add RLS policy to check file_path extension, or validate in edge function
   - **Effort**: Medium (2-3 hrs)
   - **Files**: supabase/migrations/new_file_validation.sql

4. **Add Rate Limiting to Edge Functions** 🔒 Security
   - **Issue**: No DoS protection
   - **Impact**: /register, /send-notification-email could be abused
   - **Fix**: Implement IP-based or user-based rate limiting in functions
   - **Effort**: Medium (2-3 hrs)
   - **Files**: supabase/functions/*/index.ts

#### HIGH PRIORITY (Next Batch)

5. **Implement Real-Time Notifications** 📡 UX
   - **Issue**: Supervisors must refresh to see new assignments
   - **Impact**: Delayed workflow, poor user experience
   - **Fix**: Add Supabase Realtime subscriptions to tables (ip_records, evaluator_assignments)
   - **Effort**: Medium (3-4 hrs)
   - **Files**: src/pages/SupervisorDashboard.tsx, src/pages/EvaluatorDashboard.tsx

6. **Add Request Retry Logic with Exponential Backoff** 🌐 Stability
   - **Issue**: Network errors fail immediately; no retry
   - **Impact**: User loses work on transient network blips
   - **Fix**: Wrap async calls in retry handler (exponential backoff + max attempts)
   - **Effort**: Medium (2-3 hrs)
   - **Files**: src/lib/supabase.ts (create new utility), use in all fetch locations

7. **Complete Activity Log Viewer** 📊 Admin
   - **Issue**: activity_logs table populated but no UI
   - **Impact**: No audit trail visibility
   - **Fix**: Create /dashboard/activity-logs page with filters (actor, table, date range)
   - **Effort**: Medium (3-4 hrs)
   - **Files**: src/pages/ActivityLogsPage.tsx (new), src/App.tsx (add route)

8. **Add Two-Factor Authentication (2FA)** 🔒 Security
   - **Issue**: Only email + password authentication
   - **Impact**: Accounts vulnerable to password breach
   - **Fix**: Add TOTP (Google Authenticator) or SMS 2FA via Supabase Auth
   - **Effort**: High (4-5 hrs)
   - **Files**: src/pages/LoginPage.tsx, src/pages/SettingsPage.tsx, edge functions updates

9. **Fix Role-Based Dashboard Routing** 🎯 UX
   - **Issue**: All roles see all pages in sidebar
   - **Impact**: Confusing for applicants (evaluator menu items visible but inaccessible)
   - **Fix**: Conditionally show sidebar items based on user.role
   - **Effort**: Low (1-2 hrs)
   - **Files**: src/components/DashboardLayout.tsx

10. **Implement TanStack Query for Caching** ⚡ Performance
    - **Issue**: No query caching; API calls refetch on every mount
    - **Impact**: Slow dashboards, unnecessary bandwidth
    - **Fix**: Replace direct Supabase calls with @tanstack/react-query
    - **Effort**: High (5-6 hrs refactor)
    - **Files**: src/* (wide refactor), add npm @tanstack/react-query

11. **Add CSV/Excel Export for Admin Reports** 📈 Admin
    - **Issue**: No bulk export of records
    - **Impact**: Can't generate compliance reports
    - **Fix**: Add button to AllRecordsPage, export to CSV via papaparse
    - **Effort**: Low (2-3 hrs)
    - **Files**: src/pages/AllRecordsPage.tsx, add papaparse package

12. **Create Email Template System** 📧 Maintainability
    - **Issue**: Email text hardcoded in edge functions
    - **Impact**: Can't update email content without code change
    - **Fix**: Store templates in database, query in edge functions
    - **Effort**: Medium (3-4 hrs)
    - **Files**: supabase/migrations/add_email_templates_table.sql, edge functions

13. **Add Multi-Language Support (i18n)** 🌍 UX
    - **Issue**: UI only in English
    - **Impact**: Not accessible to non-English users
    - **Fix**: Add react-i18next, extract strings, add language selector
    - **Effort**: High (4-5 hrs)
    - **Files**: src/* (wide), create src/i18n/*, add translations/

14. **Implement Automated Email Verification Resend** 📧 UX
    - **Issue**: Registration email may not arrive; hard to resend
    - **Impact**: Users can't verify accounts
   **Fix**: Add resend button in /auth/callback or email status page
    - **Effort**: Low (1-2 hrs)
    - **Files**: src/pages/AuthCallbackPage.tsx, register-user function

15. **Add Pagination to Large Tables** 📄 Performance
    - **Issue**: AllRecordsPage loads all IPs at once
    - **Impact**: Slow for 1000+ records
    - **Fix**: Implement cursor-based or limit/offset pagination
    - **Effort**: Medium (2-3 hrs)
    - **Files**: src/pages/AllRecordsPage.tsx, src/components/Pagination.tsx

#### NICE-TO-HAVE (Polish)

16. **Implement Bulk User Import (CSV)** 📥 Admin
    - **Issue**: Can only create users one at a time
    - **Impact**: Painful for initial user setup
    - **Fix**: Add CSV upload to UserManagement, batch-create users
    - **Effort**: Medium (3-4 hrs)
    - **Files**: src/pages/UserManagement.tsx, create import edge function

17. **Add Search Across IP Titles & Abstract** 🔍 UX
    - **Issue**: Can only filter by status/category
    - **Impact**: Hard to find specific submissions
    - **Fix**: Add fulltext search via Supabase PostgreSQL FTS
    - **Effort**: Medium (2-3 hrs)
    - **Files**: src/lib/supabase.ts (add search function), AllRecordsPage, ApplicantDashboard

18. **Create Email Notification Preferences** 🔔 UX
    - **Issue**: All users get all emails
    - **Impact**: Email fatigue
    - **Fix**: Add notification_preferences table, toggle in SettingsPage
    - **Effort**: Medium (3-4 hrs)
    - **Files**: supabase/migrations/add_notification_preferences.sql, SettingsPage, edge functions

19. **Add Dashboard Charts/Analytics with Recharts** 📊 Admin
    - **Issue**: AdminDashboard analytics basic
    - **Impact**: Can't see trends (submissions over time, etc.)
    - **Fix**: Integration Recharts library, add time-series charts
    - **Effort**: Medium (3-4 hrs)
    - **Files**: src/pages/AdminDashboard.tsx, add recharts package

20. **Implement Submission Templates/Drafts Auto-Save** 💾 UX
    - **Issue**: Users lose form data on page refresh
    - **Impact**: Frustration when filling long forms
    - **Fix**: LocalStorage auto-save of form state, or DB draft status
    - **Effort**: Medium (2-3 hrs)
    - **Files**: src/pages/NewSubmissionPage.tsx, src/components/ProcessTrackingWizard.tsx

---

## Summary Table

| Metric | Value |
|--------|-------|
| **Framework** | React 18 + TypeScript + Vite |
| **Backend** | Supabase (PostgreSQL 17, Auth, Storage, Edge Functions) |
| **Pages** | 27 (6 public, 21 authenticated) |
| **Components** | 43+ reusable components |
| **API Endpoints** | 23 serverless edge functions + PostgREST auto-generated |
| **Database Tables** | 15+ core tables |
| **Migrations** | 72 SQL files |
| **Users Roles** | 4 (applicant, supervisor, evaluator, admin) |
| **IP Categories** | 6 (patent, copyright, trademark, design, utility_model, other) |
| **IP Status States** | 11 total workflow states |
| **Styling** | Tailwind CSS (no custom theme) |
| **Authentication** | Supabase Auth + JWT + RLS policies |
| **Key Dependencies** | lucide-react, dompurify, @supabase/supabase-js |
| **Test Framework** | Vitest |
| **Code Quality** | ESLint, TypeScript strict mode |
| **Build Tool** | Vite with optimized minification |
| **Deployment** | .dist/ static site + serverless functions |

---

**Audit completed**: February 24, 2026  
**Next step**: Review recommendations, prioritize by business impact, assign to sprints.
