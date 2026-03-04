# UCC-IPO User Dashboard UI & Role Behavior

**Generated:** 2026-03-02  
**Source scanned:** `src/`, `supabase/migrations/`, `server/src/`  
**Stack:** React + TypeScript + Vite (frontend), Supabase (Postgres + Auth + Edge Functions), Node/Express PDF server

---

## Executive Summary

The UCC-IPO (University of the Cebu – Intellectual Property Office) system is a full-stack single-page application for managing intellectual property disclosure submissions. There are **four user roles**: `applicant`, `supervisor`, `evaluator`, and `admin`. All dashboard pages are nested under `/dashboard/*` and protected by `ProtectedRoute`. The sidebar navigation is role-filtered at render time using a static `navItems` array keyed on role. Backend enforcement is implemented via Supabase Row-Level Security (RLS) policies and Supabase Edge Functions (Deno). A small Express/Node server handles Playwright-based PDF generation.

The IP submission lifecycle follows a linear, stage-based workflow:

```
draft → submitted → waiting_supervisor → (supervisor_revision ←→ back)
      → supervisor_approved → waiting_evaluation → (evaluator_revision ←→ back)
      → evaluator_approved → preparing_legal → ready_for_filing
                                            → rejected (at any stage)
```

Applicants undergo a two-step approval process before they can submit: (1) email verification, (2) admin account approval (`is_approved` flag).

---

## 1. Role Model — Source of Truth

### 1.1 Role Enum Definition

| Symbol | Value | File |
|---|---|---|
| `UserRole` type alias | `'applicant' \| 'supervisor' \| 'evaluator' \| 'admin'` | [src/lib/database.types.ts](src/lib/database.types.ts#L9) |

```typescript
// src/lib/database.types.ts, line 9
export type UserRole = 'applicant' | 'supervisor' | 'evaluator' | 'admin';
```

### 1.2 Role Storage

Roles are stored in the **`users` table** in Supabase Postgres (not in JWT claims).

| Column | Type | Notes |
|---|---|---|
| `role` | `UserRole` | Set to `'applicant'` on self-registration; changed to other roles only by admin |
| `is_approved` | `boolean` | Default `true` for non-applicants, requires admin action for applicants after 2026-02-24 migration |
| `auth_user_id` | `uuid` | FK to `auth.users.id` (Supabase Auth) |

**Key migration:** [`20260224000100_add_applicant_approval_workflow.sql`](supabase/migrations/20260224000100_add_applicant_approval_workflow.sql) added `is_approved`, `approved_at`, `approved_by`, `rejected_at`, `rejection_reason` columns.

### 1.3 How the UI Obtains the Current Role

1. **`AuthContext`** ([src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)) wraps the app. On mount it calls `supabase.auth.getSession()`, then fetches the `users` row matching `auth_user_id = session.user.id`.
2. The result is stored as `profile: UserProfile | null` in React context state.
3. All components consume role via `const { profile } = useAuth()` and check `profile.role`.
4. `signUp()` in `AuthContext` hard-codes `role: 'applicant'` on insert; non-applicant roles must be created by admin through the User Management page or via the `create-user` edge function.

---

## 2. Dashboard Architecture Overview

### 2.1 Entry Point & Router

| File | Purpose |
|---|---|
| [src/App.tsx](src/App.tsx) | Root router; defines all top-level routes |
| `DashboardRouter` (inside App.tsx) | Nested router under `/dashboard/*`; renders the role-appropriate home page |
| [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx) | Shared layout shell: top header bar + responsive sidebar + main content area |
| [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) | Auth guard wrapping all `/dashboard/*` routes and `/pending-approval` |

**Default landing redirect per role:**  
When the user navigates to `/dashboard` (the index route), `DashboardRouter` renders one of:

| Role | Default Component |
|---|---|
| `applicant` | `<ApplicantDashboard />` |
| `supervisor` | `<SupervisorDashboard />` |
| `evaluator` | `<EvaluatorDashboard />` |
| `admin` | `<AdminDashboard />` |

Code reference: [src/App.tsx](src/App.tsx#L43-L57) — `getDashboardComponent()` switch statement.

### 2.2 Auth Guards (`ProtectedRoute`)

[src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) enforces the following checks in order:

1. While `loading === true` → show spinner.
2. `!user` → redirect to `/login`.
3. `!user.email_confirmed_at` → render "Email Not Verified" screen (cannot proceed).
4. `!profile` → redirect to `/login`.
5. `profile.role === 'applicant' && profile.is_approved === false` → redirect to `/pending-approval` (unless already there).
6. If `allowedRoles` prop is provided and `profile.role` not in it → redirect to `/unauthorized`.

> **Note:** The `allowedRoles` prop is **not currently passed** to `ProtectedRoute` in `App.tsx` for any dashboard sub-routes — role enforcement at route level is done exclusively by frontend conditional rendering inside pages (not by the route guard). This is a security consideration (see Section 6).

### 2.3 Sidebar Navigation Generation

Defined as a static array `navItems: NavItem[]` in [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx#L34-L120). Each item has a `roles: UserRole[]` field. At render time:

```typescript
const filteredNavItems = navItems.filter((item) =>
  profile ? item.roles.includes(profile.role) : false
);
```

The full list of nav items and their role restrictions is documented in Section 4.

---

## 3. Routes & Pages Inventory

### 3.1 Routes Table

| Route Path | Component File | Allowed Roles (Frontend) | Main Data Tables | Key Actions |
|---|---|---|---|---|
| `/` | `LandingPage` | Public | `cms_pages`, `site_settings` | View public content |
| `/login` | `LoginPage` | Public (unauthenticated) | `auth.users` | Sign in |
| `/register` | `RegisterPage` | Public | `users` (via edge fn) | Self-register as `applicant` |
| `/forgot-password` | `ForgotPasswordPage` | Public | Edge fn `request-password-reset-code` | Request password reset |
| `/auth/callback` | `AuthCallbackPage` | Public | — | Handle Supabase OAuth/email callback |
| `/pending-approval` | `PendingApprovalPage` | `applicant` (unapproved) | — | View approval status, sign out |
| `/verify/:trackingId` | `CertificateVerifyPage` | Public | `generated_pdfs`, `ip_records`, `users` | Verify certificate |
| `/verify-disclosure/:trackingId` | `DisclosureVerifyPage` | Public | `full_disclosures`, `ip_records` | Verify disclosure |
| `/pages/:slug` | `CMSPageRenderer` | Public | `cms_pages`, `cms_sections` | View CMS page |
| `/dashboard` | `DashboardRouter` → role-based | Authenticated + approved | varies | Role home page |
| `/dashboard/submit` | `NewSubmissionPage` | `applicant` (approved) | `ip_records`, `ip_documents`, `users` | Create new IP submission |
| `/dashboard/submissions` | `ApplicantDashboard` | `applicant` | `ip_records` | View own submissions & drafts |
| `/dashboard/submissions/:id` | `SubmissionDetailPage` | All roles (own records or assigned) | `ip_records`, `ip_documents`, `evaluations`, `presentation_materials` | View/edit submission detail |
| `/dashboard/settings` | `SettingsPage` | All roles | `users`, `auth.users`, `site_settings` | Update profile, password, notifications; branding (admin) |
| `/dashboard/branding` | `AdminBrandingSettingsPage` | `admin` (+ embedded in Settings) | `site_settings` (via `brandingService`) | Update site name, logo |
| `/dashboard/review` | `SupervisorDashboard` | `supervisor` | `ip_records`, `ip_documents`, `supervisor_assignments`, `departments` | Review queue + history |
| `/dashboard/evaluations` | `EvaluatorDashboard` | `evaluator` | `ip_records`, `ip_documents`, `evaluations`, `evaluator_assignments`, `departments` | Evaluation queue + history |
| `/dashboard/users` | `UserManagement` | `admin` | `users`, `departments`; Edge fn `create-user`, `reset-user-password` | Create/delete/search users, reset passwords |
| `/dashboard/public-pages` | `PublicPagesManagement` | `admin` | `cms_pages`, `cms_sections` | Create/delete/publish CMS pages |
| `/dashboard/public-pages/:slug/edit` | `CMSPageEditor` | `admin` | `cms_pages`, `cms_sections` | Edit CMS page content |
| `/dashboard/public-pages/:pageId` | `PageSectionsManagement` | `admin` | `cms_sections` | Manage page sections |
| `/dashboard/records` | `AllRecordsPage` | `admin` | `ip_records`, `users` | View/filter/export/soft-delete all records |
| `/dashboard/deleted-records` | `DeletedArchivePage` | `admin` | `ip_records`, `ip_documents` | Restore or permanently delete archived records |
| `/dashboard/legacy-records` | `LegacyRecordsPage` | `admin` | `legacy_ip_records` | View/search legacy (historical) IP records |
| `/dashboard/legacy-records/new` | `AddLegacyRecordPage` | `admin` | `legacy_ip_records` | Digitize a legacy IP record |
| `/dashboard/legacy-records/:id` | `LegacyRecordDetailPage` | `admin` | `legacy_ip_records`, `legacy_ip_documents` | View or edit legacy record detail |
| `/dashboard/assignments` | `AssignmentManagementPage` | `admin` | `ip_records`, `users`, `supervisor_assignments`, `evaluator_assignments` | Manually assign supervisors/evaluators to records |
| `/dashboard/departments` | `DepartmentManagementPage` | `admin` | `departments` (via `AdminDepartmentManagement`) | Create/edit/deactivate departments |
| `/dashboard/sla-policies` | `AdminSLAManagement` | `admin` | `workflow_sla_policies` | Edit per-stage SLA durations, grace periods, extensions |
| `/dashboard/analytics` | `AdminDashboard` (reused) | `admin` | `users`, `ip_records`, `activity_logs` | View analytics (same component as `/dashboard`) |
| `/unauthorized` | Inline JSX in `App.tsx` | Any authenticated | — | Display "Unauthorized" message |

---

## 4. Role-by-Role Dashboard Behavior

### 4.1 Role: `applicant`

**Requires:** `is_approved === true` to access `/dashboard` and submit IP.  
**Blocked state:** If `is_approved === false` → redirected to `/pending-approval`.

#### Visible Navigation Items
| Label | Path | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| My Submissions | `/dashboard/submissions` | FileText |
| New Submission | `/dashboard/submit` | ClipboardList |
| Settings | `/dashboard/settings` | Settings |

#### Pages & Actions

**`/dashboard` → `ApplicantDashboard`** ([src/pages/ApplicantDashboard.tsx](src/pages/ApplicantDashboard.tsx))
- Displays 4 stat cards: Total Submissions, Pending, Approved, Rejected, Drafts.
- Lists **submitted IP records** (all statuses except `draft`) in a paginated table.
- Lists **drafts** (status = `draft`) in a separate paginated table.
- Shows a yellow banner if `is_approved === false` (belt-and-suspenders UI notice).
- **Key handler:** `fetchRecords()` — `supabase.from('ip_records').select('*').eq('applicant_id', profile.id)`.
- **Key handler:** `deleteDraft(draftId)` — calls `POST /functions/v1/delete-draft` edge function.
- Shows revision banners when `status === 'supervisor_revision'` or `status === 'evaluator_revision'`.
- Link to `/dashboard/submit` only renders when `is_approved === true`.

**`/dashboard/submit` → `NewSubmissionPage`** ([src/pages/NewSubmissionPage.tsx](src/pages/NewSubmissionPage.tsx))
- Multi-step form (≥ 3 steps): basic info, inventors/details, documents, submission.
- **Autosave:** Every field change after debounce triggers `supabase.from('ip_records').upsert(...)` with `status: 'draft'`. Shows autosave indicator (idle / saving / saved / error).
- Fetches supervisors via `GET /functions/v1/list-supervisors` edge function.
- Fetches departments directly: `supabase.from('departments').select('id, name')`.
- Title duplicate check via `useCheckTitleDuplicate` hook → `GET /functions/v1/check-title`.
- **On submit:** `supabase.from('ip_records').update({ status: 'submitted' }).eq('id', draftId)` then uploads documents to `ip-documents` storage bucket.
- **Special constraint:** If `profile.is_approved === false` → sets error and redirects to `/pending-approval`.

**`/dashboard/submissions/:id` → `SubmissionDetailPage`** ([src/pages/SubmissionDetailPage.tsx](src/pages/SubmissionDetailPage.tsx))
- Applicant can only view their own record (RLS enforced).
- Displays submission details, stage tracking wizard (`ProcessTrackingWizard`), documents, evaluations.
- **Documents:** Applicant's query filters `uploader_id = profile.id` (frontend filter; RLS also enforces this).
- **Edit:** Shows `EditSubmissionModal` if `status === 'supervisor_revision'` or `status === 'evaluator_revision'`.
- **File upload:** `supabase.storage.from('ip-documents').upload(...)` then `supabase.from('ip_documents').insert(...)`.
- **Revision flow:** `handleSaveEdit()` updates `ip_records` title/abstract/details + marks `status = 'submitted'` (re-submission after revision).
- Shows `RevisionBanner` with revision comments when in revision status.
- Shows `CertificateManager`, `FullDisclosureManager` if record progress is at advanced stage.
- Shows `MaterialsSubmissionForm` / `MaterialsView` for academic presentation materials (stage-dependent).

**`/dashboard/settings` → `SettingsPage`** ([src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx))
- Tabs: **Profile** (update `full_name`), **Password** (via `supabase.auth.updateUser({ password })`), **Notifications**.
- Branding tab is hidden for applicants (only shown if `profile.role === 'admin'`).

---

### 4.2 Role: `supervisor`

#### Visible Navigation Items
| Label | Path | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| Review Queue | `/dashboard/review` | ClipboardList |
| Settings | `/dashboard/settings` | Settings |

#### Pages & Actions

**`/dashboard` → `SupervisorDashboard`** ([src/pages/SupervisorDashboard.tsx](src/pages/SupervisorDashboard.tsx))  
(Same component also mounted at `/dashboard/review`)

- Two tabs: **Queue** (pending review), **History** (already processed).
- **Queue fetch:** `supabase.from('ip_records').select('*, applicant:users!...').eq('supervisor_id', profile.id).in('status', ['waiting_supervisor', 'supervisor_revision'])`.
- **History fetch:** `.in('status', ['supervisor_approved', 'rejected', 'evaluator_approved', ...])`.
- **View Detail Modal:** Fetches documents `supabase.from('ip_documents').select('*').eq('ip_record_id', record.id)`.
- **Review Modal — `handleSubmitReview()`:**
  - Action `approve` → sets `status = 'waiting_evaluation'`, resolves evaluator by `category_specialization`, creates `evaluator_assignments` record, updates `supervisor_assignments`, creates SLA stage via `supabase.rpc('create_stage_instance', ...)`
  - Action `reject` → sets `status = 'rejected'`
  - Action `revision` → sets `status = 'supervisor_revision'`
  - All actions call `supabase.rpc('close_stage_instance', { p_record_id, p_close_status: 'COMPLETED' })` first.
  - **Validation:** Remarks are required for all decisions.
- Shows `ProcessTrackingWizard` in detail modal for stage visibility.

**`/dashboard/submissions/:id` → `SubmissionDetailPage`**
- Supervisor can view all documents (no `uploader_id` filter applied).
- Cannot edit; shows read-only view of evaluation scores.

**`/dashboard/settings`** — same as applicant (no branding tab).

---

### 4.3 Role: `evaluator`

#### Visible Navigation Items
| Label | Path | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| Evaluations | `/dashboard/evaluations` | Star |
| Settings | `/dashboard/settings` | Settings |

#### Pages & Actions

**`/dashboard` → `EvaluatorDashboard`** ([src/pages/EvaluatorDashboard.tsx](src/pages/EvaluatorDashboard.tsx))  
(Same component also mounted at `/dashboard/evaluations`)

- Two tabs: **Queue**, **History**.
- **Queue fetch:** `.eq('evaluator_id', profile.id).in('status', ['waiting_evaluation', 'evaluator_revision'])`.
- **History fetch:** `.in('status', ['evaluator_approved', 'rejected', 'completed', 'preparing_legal', 'ready_for_filing'])`.
- **Evaluation Form (`handleSubmitEvaluation()`):**
  - Per-criterion scores: `innovation`, `feasibility`, `marketPotential`, `technicalMerit` (each 0–10).
  - Auto-calculates `overallScore = (sum/40) * 100`.
  - Auto-grades via `getGradeFromScore()` (A+ through F).
  - `supabase.from('evaluations').insert({ ip_record_id, evaluator_id, score, grade, remarks, decision })`.
  - Decisions: `approved` → `status = 'evaluator_approved'`; `rejected` → `status = 'rejected'`; `revision` → `status = 'evaluator_revision'`.
  - Also calls SLA RPCs `close_stage_instance` and `create_stage_instance`.
  - **Validation:** remarks required; each score must be 0–10.

**`/dashboard/submissions/:id`** — read-only view, same as supervisor.

**`/dashboard/settings`** — same as applicant.

---

### 4.4 Role: `admin`

Admins have the widest access. All 13 admin-specific nav items plus the universal items.

#### Visible Navigation Items
| Label | Path | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| Users | `/dashboard/users` | Users |
| Public Pages | `/dashboard/public-pages` | Globe |
| All Records | `/dashboard/records` | FileText |
| Legacy Records | `/dashboard/legacy-records` | Archive |
| Deleted Archive | `/dashboard/deleted-records` | Archive |
| Assignments | `/dashboard/assignments` | UserCheck |
| Departments | `/dashboard/departments` | Settings |
| SLA Policies | `/dashboard/sla-policies` | Clock |
| Analytics | `/dashboard/analytics` | PieChart |
| Settings | `/dashboard/settings` | Settings |

#### Pages & Actions

**`/dashboard` → `AdminDashboard`** ([src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx))
- Stat cards: Total Users (with breakdown), Total Submissions, Pending Review, Approved.
- Category breakdown bar chart (client-side rendered).
- Paginated recent activity log from `activity_logs`.
- **`AdminPendingApplicants`** component embedded at top — fetches via `POST /functions/v1/get-pending-applicants` edge function, displays pending applicants, allows **Approve** or **Reject** actions.
  - Approve: calls `POST /functions/v1/approve-applicant` edge function.
  - Reject: prompts for reason, calls same edge function with `action: 'reject'`.
- **`fetchStats()`:** Parallel `Promise.all` of `supabase.from('users').select('role')`, `supabase.from('ip_records').select('status, category')`, `supabase.from('activity_logs').select(...).limit(10)`.

**`/dashboard/users` → `UserManagement`** ([src/pages/UserManagement.tsx](src/pages/UserManagement.tsx))
- Full user list with search + role filter + pagination.
- **`handleCreateUser()`:** `POST /functions/v1/create-user` edge function (passes email, fullName, password, role, departmentId, categorySpecialization).
- **`handleDeleteUser()`:** `supabase.from('users').delete().eq('id', userId)` (direct Supabase call, RLS admin policy applies).
- **`handleConfirmResetPassword()`:** Calls edge function `reset-user-password`. **Notes:** Applicant password reset is blocked (`if (user.role === 'applicant') return alert(...)`).
- After create, shows credentials modal with generated password.

**`/dashboard/public-pages` → `PublicPagesManagement`** ([src/pages/PublicPagesManagement.tsx](src/pages/PublicPagesManagement.tsx))
- List of CMS pages with publish/unpublish toggle, create, delete.
- **`handleCreatePage()`:** `supabase.from('cms_pages').insert({ title, slug, is_published: false })` then optionally seeds template sections.
- **`handleTogglePublish()`:** `supabase.from('cms_pages').update({ is_published: !current })`.
- **`handleDeletePage()`:** Deletes sections first then page.
- Pre-publish validation via `canPublishPage(sections)` from [src/lib/sectionValidation.ts](src/lib/sectionValidation.ts).
- Navigate to `CMSPageEditor` for content editing, `PageSectionsManagement` for section management.

**`/dashboard/records` → `AllRecordsPage`** ([src/pages/AllRecordsPage.tsx](src/pages/AllRecordsPage.tsx))
- All non-deleted `ip_records` with applicant/supervisor/evaluator joined.
- Search by title/applicant, filter by status and category.
- **`handleDeleteRecord()`:** Soft delete — `supabase.from('ip_records').update({ is_deleted: true, deleted_at: ... })`.
- **`exportToCSV()`:** Client-side CSV generation from filtered records (no server call).
- Link to `SubmissionDetailPage` per record.

**`/dashboard/deleted-records` → `DeletedArchivePage`** ([src/pages/DeletedArchivePage.tsx](src/pages/DeletedArchivePage.tsx))
- All records where `is_deleted = true`.
- **`handleRestoreRecord()`:** `supabase.from('ip_records').update({ is_deleted: false, deleted_at: null })`.
- **`handleDeleteForever()`:** Deletes `ip_documents` first, then hard deletes the `ip_records` row.
- Separate sections for deleted drafts vs. deleted workflow records.

**`/dashboard/legacy-records` → `LegacyRecordsPage`** ([src/pages/LegacyRecordsPage.tsx](src/pages/LegacyRecordsPage.tsx))
- `supabase.from('legacy_ip_records').select('*')` — separate table from `ip_records`.
- Search + category + source filters (client-side).
- **Frontend role guard:** `if (profile.role !== 'admin') navigate('/dashboard')` in `useEffect`.
- Add new legacy record → `/dashboard/legacy-records/new`.

**`/dashboard/legacy-records/new` → `AddLegacyRecordPage`** ([src/pages/AddLegacyRecordPage.tsx](src/pages/AddLegacyRecordPage.tsx))
- Form to digitize a historical IP record into `legacy_ip_records`.

**`/dashboard/legacy-records/:id` → `LegacyRecordDetailPage`** ([src/pages/LegacyRecordDetailPage.tsx](src/pages/LegacyRecordDetailPage.tsx))
- View/edit individual legacy record.

**`/dashboard/assignments` → `AssignmentManagementPage`** ([src/pages/AssignmentManagementPage.tsx](src/pages/AssignmentManagementPage.tsx))
- Lists all non-draft `ip_records` with their current supervisor/evaluator assignments.
- Fetches all supervisors and evaluators in parallel.
- **`handleAssign()`:** Updates `ip_records.supervisor_id` and/or `ip_records.evaluator_id`, also inserts into `supervisor_assignments` / `evaluator_assignments` tables.
- Search + category filter + pagination.

**`/dashboard/departments` → `DepartmentManagementPage`** ([src/pages/DepartmentManagementPage.tsx](src/pages/DepartmentManagementPage.tsx))
- Delegated to `AdminDepartmentManagement` component.
- CRUD on `departments` table.
- **Frontend role guard:** inline check `profile.role !== 'admin'` → renders "Unauthorized" screen.

**`/dashboard/sla-policies` → `AdminSLAManagement`** ([src/pages/AdminSLAManagement.tsx](src/pages/AdminSLAManagement.tsx))
- Lists all `workflow_sla_policies` rows (one per workflow stage).
- Stages tracked: `supervisor_review`, `evaluation`, `revision_requested`, `materials_requested`, `certificate_issued`.
- **`handleSavePolicy()`:** `supabase.from('workflow_sla_policies').update({ duration_days, grace_days, allow_extensions, max_extensions, extension_days })`.
- **Frontend role guard:** inline check `profile.role !== 'admin'` → renders "Access Denied" block.

**`/dashboard/analytics`** → reuses `AdminDashboard` component (same as `/dashboard`).

**`/dashboard/settings` → `SettingsPage`**
- Same as other roles but includes a **Branding** tab (visible only to `admin`).
- **Branding tab:** Embedded `AdminBrandingSettingsPage` — updates `site_settings` via `brandingService.updateBrandingData()`.

---

## 5. Function & Data Call Index

### 5.1 Key Handler Functions

| Handler Name | File | Purpose |
|---|---|---|
| `fetchRecords()` | `ApplicantDashboard.tsx` | Fetch current user's IP records split into submitted + drafts |
| `deleteDraft(draftId)` | `ApplicantDashboard.tsx` | POST edge fn `delete-draft`; then re-fetches |
| `handleSubmitReview()` | `SupervisorDashboard.tsx` | Approve/reject/revision on assigned IP record + SLA RPC calls |
| `handleSubmitEvaluation()` | `EvaluatorDashboard.tsx` | Submit scored evaluation + update IP status + SLA RPC calls |
| `fetchStats()` | `AdminDashboard.tsx` | Parallel fetch users + ip_records + activity_logs for analytics |
| `fetchPendingApplicants()` | `AdminPendingApplicants.tsx` | POST edge fn `get-pending-applicants` |
| `handleApprove() / handleReject()` | `AdminPendingApplicants.tsx` | POST edge fn `approve-applicant` with action `'approve'` or `'reject'` |
| `handleCreateUser()` | `UserManagement.tsx` | POST edge fn `create-user` |
| `handleDeleteUser()` | `UserManagement.tsx` | `supabase.from('users').delete()` |
| `handleConfirmResetPassword()` | `UserManagement.tsx` | POST edge fn `reset-user-password` |
| `handleDeleteRecord()` | `AllRecordsPage.tsx` | Soft delete — `ip_records.is_deleted = true` |
| `handleRestoreRecord()` | `DeletedArchivePage.tsx` | `ip_records.is_deleted = false` |
| `handleDeleteForever()` | `DeletedArchivePage.tsx` | Hard delete `ip_documents` then `ip_records` |
| `handleAssign()` | `AssignmentManagementPage.tsx` | Update `ip_records` supervisor/evaluator + insert assignment rows |
| `handleSavePolicy()` | `AdminSLAManagement.tsx` | Update `workflow_sla_policies` row |
| `handleCreatePage()` | `PublicPagesManagement.tsx` | Insert `cms_pages` + seed template sections |
| `handleTogglePublish()` | `PublicPagesManagement.tsx` | Toggle `cms_pages.is_published` |
| `handleFileUpload()` | `SubmissionDetailPage.tsx` | Upload to `ip-documents` storage + insert `ip_documents` |
| `getDashboardComponent()` | `App.tsx` | Switch on role to return correct dashboard component |
| `fetchUserProfile(userId)` | `AuthContext.tsx` | Fetch `users` row by `auth_user_id` (with 1 retry) |
| `signIn()` | `AuthContext.tsx` | `supabase.auth.signInWithPassword` + update `last_login_at` |
| `signUp()` | `AuthContext.tsx` | `supabase.auth.signUp` + insert `users` row with `role: 'applicant'` |

### 5.2 Supabase Queries & Mutations

#### `users` table
| Operation | Filter | File |
|---|---|---|
| `SELECT *` | `auth_user_id = uid` | `AuthContext.tsx` — `fetchUserProfile` |
| `SELECT role` (aggregate) | — | `AdminDashboard.tsx` — `fetchStats` |
| `SELECT *` | — (all) | `UserManagement.tsx` — `fetchUsers` |
| `SELECT id, full_name, department_id` | `role = 'supervisor'` | `AssignmentManagementPage.tsx` |
| `SELECT *` | `role = 'evaluator'` | `AssignmentManagementPage.tsx`, `SupervisorDashboard.tsx` |
| `UPDATE { last_login_at }` | `email` | `AuthContext.tsx` — `signIn` |
| `UPDATE { full_name }` | `id` | `SettingsPage.tsx` — `handleProfileUpdate` |
| `DELETE` | `id` | `UserManagement.tsx` — `handleDeleteUser` |
| `INSERT` | — | `AuthContext.tsx` — `signUp` (direct); `create-user` edge fn (admin) |

#### `ip_records` table
| Operation | Filter | File |
|---|---|---|
| `SELECT *, applicant, supervisor, evaluator` | `applicant_id = profile.id` | `ApplicantDashboard.tsx` |
| `SELECT *, applicant` | `supervisor_id = profile.id` + status in `[...]` | `SupervisorDashboard.tsx` |
| `SELECT *, applicant, supervisor` | `evaluator_id = profile.id` + status in `[...]` | `EvaluatorDashboard.tsx` |
| `SELECT *` (all non-deleted) | `is_deleted = false` | `AllRecordsPage.tsx` |
| `SELECT *` (deleted) | `is_deleted = true` | `DeletedArchivePage.tsx` |
| `SELECT *` (all non-draft) | `status != 'draft'` | `AssignmentManagementPage.tsx` |
| `SELECT *, applicant, supervisor, evaluator` | `id` | `SubmissionDetailPage.tsx` |
| `INSERT { status: 'draft' }` | — | `NewSubmissionPage.tsx` autosave |
| `UPDATE { status: 'submitted' }` | `id` | `NewSubmissionPage.tsx` final submit |
| `UPDATE { status, current_stage }` | `id` | `SupervisorDashboard.tsx`, `EvaluatorDashboard.tsx` |
| `UPDATE { is_deleted, deleted_at }` | `id` | `AllRecordsPage.tsx` soft delete |
| `UPDATE { is_deleted: false, deleted_at: null }` | `id` | `DeletedArchivePage.tsx` restore |
| `DELETE` (hard) | `id` | `DeletedArchivePage.tsx` delete forever |
| `UPDATE { supervisor_id, evaluator_id }` | `id` | `AssignmentManagementPage.tsx` |

#### `ip_documents` table
| Operation | Filter | File |
|---|---|---|
| `SELECT *` | `ip_record_id` | `SupervisorDashboard.tsx`, `EvaluatorDashboard.tsx`, `SubmissionDetailPage.tsx` |
| `SELECT *` | `ip_record_id` + `uploader_id` (applicant only) | `SubmissionDetailPage.tsx` |
| `INSERT { ip_record_id, uploader_id, ... }` | — | `SubmissionDetailPage.tsx` — `handleFileUpload` |
| `DELETE` | `ip_record_id` | `DeletedArchivePage.tsx` — `handleDeleteForever` |

#### `evaluations` table
| Operation | Filter | File |
|---|---|---|
| `SELECT *, evaluator` | `ip_record_id` | `SubmissionDetailPage.tsx` |
| `INSERT { ip_record_id, evaluator_id, score, grade, remarks, decision }` | — | `EvaluatorDashboard.tsx` — `handleSubmitEvaluation` |

#### `supervisor_assignments` / `evaluator_assignments`
| Operation | Table | File |
|---|---|---|
| `UPDATE { status, remarks }` | `supervisor_assignments` | `SupervisorDashboard.tsx` |
| `INSERT { ip_record_id, evaluator_id, category, assigned_by }` | `evaluator_assignments` | `SupervisorDashboard.tsx` |
| `INSERT { ip_record_id, supervisor_id, assigned_by }` | `supervisor_assignments` | `AssignmentManagementPage.tsx` |

#### `workflow_sla_policies`
| Operation | File |
|---|---|
| `SELECT *` | `AdminSLAManagement.tsx` — `fetchPolicies` |
| `UPDATE { duration_days, grace_days, allow_extensions, ... }` | `AdminSLAManagement.tsx` — `handleSavePolicy` |

#### `activity_logs`
| Operation | Filter | File |
|---|---|---|
| `SELECT *, user` | order by `created_at` desc, limit 10 | `AdminDashboard.tsx` — `fetchStats` |

#### `cms_pages` / `cms_sections`
| Operation | File |
|---|---|
| `SELECT *` | `PublicPagesManagement.tsx`, `CMSPageRenderer.tsx` |
| `INSERT` | `PublicPagesManagement.tsx` — `handleCreatePage` |
| `UPDATE { is_published }` | `PublicPagesManagement.tsx` — `handleTogglePublish` |
| `DELETE` | `PublicPagesManagement.tsx` — `handleDeletePage` |

#### `departments`
| Operation | File |
|---|---|
| `SELECT id, name` | `NewSubmissionPage.tsx`, `SupervisorDashboard.tsx`, `EvaluatorDashboard.tsx`, `AssignmentManagementPage.tsx`, `UserManagement.tsx` |
| `SELECT *` | `AdminDepartmentManagement.tsx` |
| CRUD via component | `AdminDepartmentManagement.tsx` |

#### `legacy_ip_records`
| Operation | File |
|---|---|
| `SELECT *` | `LegacyRecordsPage.tsx`, `LegacyRecordDetailPage.tsx` |
| `INSERT` | `AddLegacyRecordPage.tsx` |
| `UPDATE` | `LegacyRecordDetailPage.tsx` |

#### `notifications`
| Operation | File |
|---|---|
| `SELECT *` (user's own) | `NotificationCenter.tsx` |
| `UPDATE { is_read: true }` | `NotificationCenter.tsx` |

#### `site_settings`
| Operation | File |
|---|---|
| `SELECT *` | `useBranding.ts` hook |
| `UPDATE { site_name, logo_url, primary_color }` | `brandingService.ts` — `updateBrandingData` |

### 5.3 Supabase RPC Calls

| RPC Name | Called From | Purpose |
|---|---|---|
| `close_stage_instance(p_record_id, p_close_status)` | `SupervisorDashboard.tsx`, `EvaluatorDashboard.tsx` | Mark current SLA stage as completed |
| `create_stage_instance(p_record_id, p_stage, p_assigned_user_id)` | `SupervisorDashboard.tsx`, `EvaluatorDashboard.tsx` | Create next SLA tracking stage |

### 5.4 Supabase Storage Calls

| Bucket | Operation | File |
|---|---|---|
| `ip-documents` | Upload file | `SubmissionDetailPage.tsx`, `NewSubmissionPage.tsx` |
| `ip-documents` | Create signed URL / download | `SubmissionDetailPage.tsx`, `SupervisorDashboard.tsx`, `EvaluatorDashboard.tsx` |
| `site-assets` (logo) | Upload | `brandingService.ts` — `uploadLogo` |
| `site-assets` (logo) | Delete | `brandingService.ts` — `deleteLogo` |

### 5.5 Edge Function (Supabase) Calls

All calls use `fetch(${VITE_SUPABASE_URL}/functions/v1/<name>, { method, headers: { Authorization: Bearer <token> } })`.

| Edge Function | Method | Called From | Purpose |
|---|---|---|---|
| `delete-draft` | POST | `ApplicantDashboard.tsx` | Safely delete a draft and associated documents |
| `list-supervisors` | GET | `NewSubmissionPage.tsx` | Return all supervisors for the supervisor pick list |
| `check-title` | GET | `useCheckTitleDuplicate.ts` | Check if a title already exists |
| `get-pending-applicants` | POST | `AdminPendingApplicants.tsx` | Return all applicants with `is_approved = false` |
| `approve-applicant` | POST | `AdminPendingApplicants.tsx` | Approve or reject an applicant account |
| `create-user` | POST | `UserManagement.tsx` | Admin-created user (bypasses self-registration flow) |
| `reset-user-password` | POST | `UserManagement.tsx` | Admin password reset for non-applicant users |
| `generate-certificate` | POST | `CertificateManager.tsx` | Generate/issue IP certificate PDF |
| `generate-disclosure` | POST | `FullDisclosureManager.tsx` | Generate full disclosure PDF |
| `generate-documentation` | POST | `GenerateDocumentationButton.tsx` | Generate formal documentation PDF |
| `generate-full-disclosure` | POST | Disclosure manager | Generate comprehensive disclosure |
| `submit-presentation-materials` | POST | `MaterialsSubmissionForm.tsx` | Submit academic presentation materials |
| `send-certificate-email` | POST | `CertificateManager.tsx` | Email certificate to applicant |
| `send-status-notification` | POST | Notification triggers | Email status change notification |
| `send-revision-resubmit-notification` | POST | After resubmission | Email revision request notification |
| `verify-code` | POST | Email verification flow | Verify OTP code from email |
| `register-user` | POST | `RegisterPage.tsx` | Self-registration (alternative path) |
| `request-password-reset-code` | POST | `ForgotPasswordPage.tsx` | Request password reset via email code |
| `verify-password-reset-code` | POST | Password reset flow | Verify and apply password reset |
| `check-overdue-stages` | Scheduled/triggered | Background cron | Check SLA deadlines, create overdue notifications |
| `initialize-evaluators` | POST | Admin setup | Seed evaluator category specializations |
| `manage-departments` | POST | `AdminDepartmentManagement.tsx` | CRUD operations on departments (bypasses RLS via service role) |

### 5.6 Node/Express PDF Server

**Base URL:** `http://localhost:3000` (configured via `VITE_PDF_SERVER_URL`)

| Method | Path | File | Purpose |
|---|---|---|---|
| `GET` | `/health` | `server/src/server.ts` | Health check |
| `POST` | `/api/generate-full-record-pdf` | `server/src/routes/pdf.ts` | Generate Playwright-based full record documentation PDF; requires `Authorization: Bearer <token>` |

The PDF server uses the **Supabase service role key** (not anon key) to fetch record + related user data. Auth middleware (`server/src/middleware/auth.ts`) verifies the bearer token is a valid Supabase JWT before proceeding.

---

## 6. Security & Permissions Summary

### 6.1 Frontend Enforcement Patterns

| Pattern | Example | Location |
|---|---|---|
| Conditional nav rendering | `navItems.filter(item => item.roles.includes(profile.role))` | `DashboardLayout.tsx` |
| Inline role guard on page | `if (profile.role !== 'admin') return <AccessDenied />` | `AdminSLAManagement.tsx`, `DepartmentManagementPage.tsx`, `LegacyRecordsPage.tsx` (uses `navigate('/dashboard')`) |
| `ProtectedRoute` checks | unauthenticated → `/login`; unapproved applicant → `/pending-approval` | `ProtectedRoute.tsx` |
| Field-level disabling | "New Submission" button disabled if `is_approved === false` | `ApplicantDashboard.tsx` |
| Pre-route check in `useEffect` | `if (profile.role !== 'admin') navigate('/dashboard')` | `LegacyRecordsPage.tsx` |

### 6.2 Backend Enforcement Patterns (RLS)

All tables have RLS enabled. The main policies are managed across multiple migrations; the final set includes:

#### `users` table
| Policy | Type | Condition |
|---|---|---|
| "Users can view own profile" | SELECT | `auth_user_id = auth.uid()` |
| "Admins can view all users" | SELECT | `is_admin()` helper function |
| "Users can update own profile" | UPDATE | `auth_user_id = auth.uid()` |
| "Admins can update any user" | UPDATE | `is_admin()` |
| "Admins can create users" | INSERT | `is_admin()` |
| "Admins can delete users" | DELETE | `is_admin()` |

#### `ip_records` table
| Policy | Type | Condition |
|---|---|---|
| "Applicants can view created IP records (if approved)" | SELECT | `applicant_id = user.id AND is_approved_applicant_or_privileged()` |
| "Applicants can create their own IP records (must be approved)" | INSERT | `applicant_id = user.id AND is_approved_applicant_or_privileged()` |
| "Applicants update own records" | UPDATE | `applicant_id = user.id` |
| "Supervisors view assigned records" | SELECT | `supervisor_id = user.id` |
| "Supervisors update assigned" | UPDATE | `supervisor_id = user.id` |
| "Evaluators view assigned records" | SELECT | `evaluator_id = user.id` |
| "Evaluators update assigned" | UPDATE | `evaluator_id = user.id` |
| "Admins view all records" | SELECT | `is_admin()` |
| "Admins update any record" | UPDATE | `is_admin()` |
| "Admins delete records" | DELETE | `is_admin()` |

#### `ip_documents` table
| Policy | Condition |
|---|---|
| View (SELECT) | Caller is applicant / supervisor / evaluator on the parent IP record OR is admin |
| Upload (INSERT) | `uploader_id = user.id AND is_approved_applicant_or_privileged()` |
| Delete | admin only |

#### `workflow_sla_policies` table
| Policy | Type | Condition |
|---|---|---|
| "Authenticated users can read active SLA policies" | SELECT | `is_active = true` (any authenticated user) |
| "Only admins can create/update/delete SLA policies" | INSERT/UPDATE/DELETE | `auth.uid() IN (SELECT id FROM users WHERE role = 'admin')` |

> **Note:** The SLA admin RLS uses `auth.uid()` compared against `users.id` directly (not `auth_user_id`). This works only if `users.id` equals the Supabase auth UID — verify this mapping is correct in production.

#### Helper Functions
| Function | Purpose | File |
|---|---|---|
| `is_admin()` | Returns `true` if current auth user has role `admin` in `users` table | Migration `20251115182111` |
| `is_approved_applicant_or_privileged()` | Returns `true` if role ≠ `applicant` OR (`role = 'applicant'` AND `is_approved = true`) | Migration `20260224000200` |

### 6.3 Identified Mismatches / Security Considerations

| # | Issue | Severity | Detail |
|---|---|---|---|
| 1 | **No `allowedRoles` prop passed to `ProtectedRoute` for sub-routes** | Medium | `/dashboard/users`, `/dashboard/sla-policies`, etc. are not route-guarded by role — any authenticated+approved user who knows the URL can navigate there. Admins-only pages rely solely on in-page `profile.role !== 'admin'` checks. A determined non-admin can render the form components but Supabase RLS would block most writes. | 
| 2 | **`AllRecordsPage` `handleDeleteRecord` is a direct Supabase call with no frontend role check** | Low | RLS "Admins delete records" policy blocks non-admins at DB level, but the frontend renders the delete button without checking role (only admins see this page via nav). |
| 3 | **SLA admin update policy uses `auth.uid() IN (SELECT id FROM users ...)` instead of `auth_user_id`** | Medium | If `users.id` ≠ `auth.uid()` (which is the pattern used elsewhere, where `users.auth_user_id = auth.uid()`), the admin SLA write policies would fail silently. The migration `20260225000500` uses a different pattern from the standard `is_admin()` helper — cross-check actual column values in production. |
| 4 | **PDF Node server uses service role key** | Info | The PDF server at `POST /api/generate-full-record-pdf` uses `SUPABASE_SERVICE_KEY` which bypasses all RLS. Auth is enforced via bearer token JWT check in `server/src/middleware/auth.ts`, but after that the server can read any record. Scope is limited to fetching one record by ID. |
| 5 | **`AdminBrandingSettingsPage` imported in `SettingsPage` without role guard on import** | Low | The component is rendered conditionally (only when `profile.role === 'admin'`), but the page component itself at route `/dashboard/branding` is accessible to any authenticated user via direct URL. No page-level role guard in `AdminBrandingSettingsPage`. |
| 6 | **`handleDeleteUser` on `UserManagement.tsx` does a direct DB delete without checking if deleting self** | Low | No server-side guard prevents an admin from deleting themselves. RLS allows admin to delete any user including their own row. |

---

## 7. Public (Non-Dashboard) Routes Summary

| Route | Page | Auth Required | Purpose |
|---|---|---|---|
| `/` | `LandingPage` | No | Public marketing/info page; renders CMS home page |
| `/login` | `LoginPage` | No | Email/password sign-in |
| `/register` | `RegisterPage` | No | Self-registration (creates `applicant` role user) |
| `/forgot-password` | `ForgotPasswordPage` | No | Initiate password reset via email OTP |
| `/auth/callback` | `AuthCallbackPage` | No | Handles Supabase email confirmation redirect |
| `/pages/:slug` | `CMSPageRenderer` | No | Render any public CMS page by slug |
| `/verify/:trackingId` | `CertificateVerifyPage` | No | Public certificate authenticity verification |
| `/verify-disclosure/:trackingId` | `DisclosureVerifyPage` | No | Public disclosure document verification |
| `/pending-approval` | `PendingApprovalPage` | Yes (authenticated only) | Holding page for unapproved applicants |
| `/unauthorized` | Inline JSX | — | 403-equivalent screen |

---

## 8. Database Schema Quick Reference

| Table | Key Columns | Who can SELECT | Who can INSERT/UPDATE/DELETE |
|---|---|---|---|
| `users` | `id, auth_user_id, email, role, full_name, department_id, is_approved, is_verified` | Own row (all); all rows (admin) | Own row (update); admin (all) |
| `ip_records` | `id, applicant_id, supervisor_id, evaluator_id, category, title, status, current_stage, is_deleted, tracking_id` | Own records (by role); admin all | Per-role via RLS; admin all |
| `ip_documents` | `id, ip_record_id, uploader_id, file_name, file_path, doc_type` | Parties to the record; admin | Uploader (if approved); admin delete |
| `evaluations` | `id, ip_record_id, evaluator_id, score (JSON), grade, decision, remarks` | Parties to record | Evaluator insert; admin |
| `supervisor_assignments` | `id, ip_record_id, supervisor_id, status, remarks` | Parties; admin | Supervisor/admin |
| `evaluator_assignments` | `id, ip_record_id, evaluator_id, category, assigned_by` | Parties; admin | Supervisor (insert on approval); admin |
| `activity_logs` | `id, user_id, ip_record_id, action, details, created_at` | Own logs; admin all | Insert (trigger/system) |
| `notifications` | `id, user_id, type, title, message, is_read` | Own notifications | System/edge functions |
| `departments` | `id, name, description, active` | All authenticated | Admin only |
| `legacy_ip_records` | `id, title, category, details (JSON), created_at` | Admin only | Admin only |
| `cms_pages` | `id, slug, title, is_published` | All (published); admin (all) | Admin only |
| `cms_sections` | `id, page_id, section_type, content, position` | All (published); admin (all) | Admin only |
| `workflow_sla_policies` | `id, stage, duration_days, grace_days, allow_extensions, max_extensions, is_active` | All authenticated (active only) | Admin only |
| `site_settings` | `id, site_name, logo_path, primary_color` | Public | Admin only |
| `templates` | `id, name, type, content, variables, is_active` | Admin | Admin |
| `generated_pdfs` | `id, ip_record_id, file_path, qr_code_value, issued_at, hash` | Applicant (own); admin | Admin/edge functions |

---

*Document generated from direct source code analysis. All claims are backed by the file paths and line references cited above.*
