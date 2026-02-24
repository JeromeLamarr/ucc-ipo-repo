# ROUTES & PAGES REFERENCE

Complete listing of all routes, pages, and navigation endpoints in the UCC IP Management System.

---

## Public Routes (No Authentication Required)

| Route | Component | Purpose | Access |
|-------|-----------|---------|--------|
| `/` | LandingPage | Marketing homepage, system overview | Public |
| `/login` | LoginPage | User login form (email + password) | Public |
| `/register` | RegisterPage | New account creation (includes dept selection) | Public |
| `/auth/callback` | AuthCallbackPage | Email verification redirect handler | Public |
| `/verify/:trackingId` | CertificateVerifyPage | Public certificate viewer with QR code | Public |
| `/verify-disclosure/:trackingId` | DisclosureVerifyPage | Public disclosure document viewer | Public |
| `/pages/:slug` | CMSPageRenderer | Dynamic CMS pages (home, about, etc.) | Public |
| `/unauthorized` | Inline Component | Error page (403 Unauthorized) | Public |

---

## Protected Routes (Authentication Required)

All routes below are nested under `/dashboard/*` and require valid JWT + ProtectedRoute wrapper.

### Dashboard Root & Role-Based Routing

| Route | Component | Purpose | Accessible By |
|-------|-----------|---------|---|
| `/dashboard` or `/dashboard/` | DashboardRouter | Root protected route, role-based redirect | applicant, supervisor, evaluator, admin |

### Applicant Routes

| Route | Component | Purpose | File Path |
|-------|-----------|---------|-----------|
| `/dashboard/submissions` | ApplicantDashboard | View all my IP submissions (main hub) | src/pages/ApplicantDashboard.tsx |
| `/dashboard/submit` | NewSubmissionPage | Create new IP submission (6-step wizard) | src/pages/NewSubmissionPage.tsx |
| `/dashboard/submissions/:id` | SubmissionDetailPage | View/edit individual IP details | src/pages/SubmissionDetailPage.tsx |
| `/dashboard/settings` | SettingsPage | User account preferences | src/pages/SettingsPage.tsx |

### Supervisor Routes

| Route | Component | Purpose | File Path |
|-------|-----------|---------|-----------|
| `/dashboard/review` | SupervisorDashboard | Review queue (assigned IP submissions) | src/pages/SupervisorDashboard.tsx |

### Evaluator Routes

| Route | Component | Purpose | File Path |
|-------|-----------|---------|-----------|
| `/dashboard/evaluations` | EvaluatorDashboard | Evaluation queue (assigned IPs to grade) | src/pages/EvaluatorDashboard.tsx |

### Admin Routes

| Route | Component | Purpose | File Path |
|-------|-----------|---------|-----------|
| `/dashboard/analytics` | AdminDashboard | System analytics & overview | src/pages/AdminDashboard.tsx |
| `/dashboard/users` | UserManagement | User CRUD (create, edit, delete, role assign) | src/pages/UserManagement.tsx |
| `/dashboard/records` | AllRecordsPage | View all IP submissions (admin view) | src/pages/AllRecordsPage.tsx |
| `/dashboard/deleted-records` | DeletedArchivePage | Soft-deleted IPs (archive/restore) | src/pages/DeletedArchivePage.tsx |
| `/dashboard/legacy-records` | LegacyRecordsPage | Pre-digital IP records | src/pages/LegacyRecordsPage.tsx |
| `/dashboard/legacy-records/new` | AddLegacyRecordPage | Manually add legacy IP (digitization) | src/pages/AddLegacyRecordPage.tsx |
| `/dashboard/legacy-records/:id` | LegacyRecordDetailPage | View/edit legacy IP details | src/pages/LegacyRecordDetailPage.tsx |
| `/dashboard/departments` | DepartmentManagementPage | Department CRUD & management | src/pages/DepartmentManagementPage.tsx |
| `/dashboard/assignments` | AssignmentManagementPage | Assign evaluators to IP submissions | src/pages/AssignmentManagementPage.tsx |
| `/dashboard/public-pages` | PublicPagesManagement | CMS page list (create, edit, delete) | src/pages/PublicPagesManagement.tsx |
| `/dashboard/public-pages/:slug/edit` | CMSPageEditor | Edit CMS page content & sections | src/pages/CMSPageEditor.tsx |
| `/dashboard/public-pages/:pageId` | PageSectionsManagement | Manage page sections (reorder, add, delete) | src/pages/PageSectionsManagement.tsx |
| `/dashboard/branding` | AdminBrandingSettingsPage | Upload logo, configure UI colors | src/pages/AdminBrandingSettingsPage.tsx |

---

## Dynamic CMS Pages

Created via admin interface, accessible at `/pages/:slug`:

| Slug | Title | Purpose | Editable |
|------|-------|---------|----------|
| `home` | Home | System homepage (auto-created) | Yes |
| `about` | About | About the system (if created) | Yes |
| *(custom)* | *(user-defined)* | Any custom page | Yes |

---

## Route Hierarchy Diagram

```
/                                    (Landing - Public)
├─ /login                           (Login - Public)
├─ /register                        (Register - Public)
├─ /auth/callback                   (Auth Callback - Public)
├─ /verify/:trackingId              (Cert Verify - Public)
├─ /verify-disclosure/:trackingId   (Disclosure Verify - Public)
├─ /pages/:slug                     (CMS Pages - Public)
├─ /unauthorized                    (Error - Public)
│
└─ /dashboard                       (Protected Root)
   │
   ├─ /                            (DashboardRouter - role-based)
   ├─ /submit                      (NewSubmissionPage - Applicant)
   ├─ /submissions                 (ApplicantDashboard - Applicant)
   ├─ /submissions/:id             (SubmissionDetailPage - All roles)
   ├─ /settings                    (SettingsPage - All roles)
   ├─ /review                      (SupervisorDashboard - Supervisor)
   ├─ /evaluations                 (EvaluatorDashboard - Evaluator)
   │
   ├─ /analytics                   (AdminDashboard - Admin)
   ├─ /users                       (UserManagement - Admin)
   ├─ /records                     (AllRecordsPage - Admin)
   ├─ /deleted-records             (DeletedArchivePage - Admin)
   ├─ /legacy-records              (LegacyRecordsPage - Admin)
   ├─ /legacy-records/new          (AddLegacyRecordPage - Admin)
   ├─ /legacy-records/:id          (LegacyRecordDetailPage - Admin)
   ├─ /departments                 (DepartmentManagementPage - Admin)
   ├─ /assignments                 (AssignmentManagementPage - Admin)
   ├─ /public-pages                (PublicPagesManagement - Admin)
   ├─ /public-pages/:slug/edit     (CMSPageEditor - Admin)
   ├─ /public-pages/:pageId        (PageSectionsManagement - Admin)
   └─ /branding                    (AdminBrandingSettingsPage - Admin)
```

---

## Navigation Components

### Header Navigation (Public)
- **PublicNavigation** (src/components/PublicNavigation.tsx)
  - Home button linking to `/`
  - Dynamic links to CMS pages (`/pages/:slug`)
  - Login link (`/login`)
  - Register link (`/register`)
  - Mobile menu (responsive)

### Sidebar Navigation (Authenticated)
- **DashboardLayout** (src/components/DashboardLayout.tsx)
  - Shows different menu items based on `user.role`
  - Applicants: Submissions, Submit, Settings
  - Supervisors: Review Queue, Settings
  - Evaluators: Evaluations, Settings
  - Admins: All admin pages + role-specific items

---

## Page Components Summary

| File | Route | Purpose |
|------|-------|---------|
| LandingPage.tsx | `/` | Product marketing |
| LoginPage.tsx | `/login` | Authentication |
| RegisterPage.tsx | `/register` | User registration |
| AuthCallbackPage.tsx | `/auth/callback` | Email verification |
| ApplicantDashboard.tsx | `/dashboard/submissions` | Main applicant hub |
| NewSubmissionPage.tsx | `/dashboard/submit` | IP submission creation |
| SubmissionDetailPage.tsx | `/dashboard/submissions/:id` | IP detail view/edit |
| SupervisorDashboard.tsx | `/dashboard/review` | Supervisor review queue |
| EvaluatorDashboard.tsx | `/dashboard/evaluations` | Evaluator grading queue |
| AdminDashboard.tsx | `/dashboard/analytics` | Admin analytics |
| UserManagement.tsx | `/dashboard/users` | User management CRUD |
| AllRecordsPage.tsx | `/dashboard/records` | All submissions view |
| DeletedArchivePage.tsx | `/dashboard/deleted-records` | Soft-deleted records |
| LegacyRecordsPage.tsx | `/dashboard/legacy-records` | Legacy IP records |
| AddLegacyRecordPage.tsx | `/dashboard/legacy-records/new` | Add legacy IP |
| LegacyRecordDetailPage.tsx | `/dashboard/legacy-records/:id` | Legacy IP detail |
| AssignmentManagementPage.tsx | `/dashboard/assignments` | Evaluator assignment |
| DepartmentManagementPage.tsx | `/dashboard/departments` | Department management |
| SettingsPage.tsx | `/dashboard/settings` | User preferences |
| CertificateVerifyPage.tsx | `/verify/:trackingId` | Public cert verify |
| DisclosureVerifyPage.tsx | `/verify-disclosure/:trackingId` | Public disclosure verify |
| CMSPageRenderer.tsx | `/pages/:slug` | Dynamic CMS pages |
| CMSPageEditor.tsx | `/dashboard/public-pages/:slug/edit` | CMS page editor |
| PublicPagesManagement.tsx | `/dashboard/public-pages` | CMS page list |
| PageSectionsManagement.tsx | `/dashboard/public-pages/:pageId` | CMS sections |
| AdminBrandingSettingsPage.tsx | `/dashboard/branding` | Branding settings |

---

## API Routes (Non-REST)

All managed via Supabase Edge Functions (see API_MAP.md for full details):

- `/auth/register` → register-user function
- `/auth/verify-code` → verify-code function
- `/auth/reset-password` → reset-user-password function
- `/admin/create-user` → create-user function
- `/admin/initialize-evaluators` → initialize-evaluators function
- `/certificates/generate` → generate-certificate function
- `/certificates/verify/:trackingId` → CertificateVerifyPage (frontend)
- `/disclosures/generate` → generate-full-disclosure function
- `/notifications/send` → send-status-notification function
- `/materials/submit` → submit-presentation-materials function

---

## Redirect & Error Handling

| Condition | Redirect To |
|-----------|-----------|
| Unauthenticated access to `/dashboard/*` | `/login` |
| Invalid JWT / session expired | `/login` (via AuthContext) |
| Access denied (401/403) | `/unauthorized` |
| Unknown route (404) | `/` (Navigate catch-all) |
| Email verification in progress | `/auth/callback` |

---

## Query Parameters & Filters

| Page | Supported Query Params | Purpose |
|------|----------------------|---------|
| AllRecordsPage | `status=` | Filter by IP status |
| AllRecordsPage | `category=` | Filter by IP category |
| AllRecordsPage | `supervisor_id=` | Filter by supervisor |
| AllRecordsPage | `search=` | Search title/abstract |
| LegacyRecordsPage | `department_id=` | Filter by department |
| LegacyRecordsPage | `digitized=true\|false` | Show digitized/undigitized |

---

**Last updated**: February 24, 2026
