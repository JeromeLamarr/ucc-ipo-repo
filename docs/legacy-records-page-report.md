# Legacy IP Records Page — Analysis Report

**Generated:** 2026-03-08  
**Analyst:** GitHub Copilot (automated inspection, no code modified)  
**Page:** `/dashboard/legacy-records` — "Legacy IP Records"  
**Inspection Status:** Fully implemented and connected to backend

---

## A. Page Overview

- **Purpose:** Provides admins with a dedicated list view of all digitised historical (legacy) intellectual property records that were migrated from older systems, physical archives, or emails. It is entirely separate from the live workflow IP records (`/dashboard/records`).
- **Intended user role(s):** `admin` only. All other roles are redirected to `/dashboard` immediately.
- **Dashboard location:** Left sidebar → "Legacy Records" (Archive icon). Sits between "All Records" and "Deleted Archive" in the admin navigation tree.
- **Relationship to other pages:**
  - `/dashboard/records` (All Records) — workflow IP records; legacy records were deliberately removed from that page to keep them separate.
  - `/dashboard/deleted-records` (Deleted Archive) — soft-deleted workflow records; legacy records do **not** appear here.
  - `/dashboard/assignments` — assignment management; legacy records are not linked to evaluator/supervisor assignments.
  - Legacy records have no involvement in the submission approval workflow.

---

## B. Route and Entry Points

### Route paths
| Path | Component |
|---|---|
| `/dashboard/legacy-records` | `LegacyRecordsPage` |
| `/dashboard/legacy-records/new` | `AddLegacyRecordPage` |
| `/dashboard/legacy-records/:id` | `LegacyRecordDetailPage` |

### Route registration
- **File:** `src/App.tsx` (lines 80–82)
- All three routes are nested inside `DashboardRouter` which itself is wrapped by `<ProtectedRoute>` at `/dashboard/*`.

### Layout wrapper
- `DashboardLayout` (`src/components/DashboardLayout.tsx`) — renders the topbar, responsive sidebar, and a content `<main>` that wraps every dashboard page including the legacy records pages.

### Auth guard / role guard
- **Outer guard:** `ProtectedRoute` (`src/components/ProtectedRoute.tsx`)
  - Redirects unauthenticated users to `/login`.
  - Redirects unverified emails to an inline message.
  - Redirects unapproved applicants to `/pending-approval`.
  - No role check is enforced here for the legacy-records routes (no `allowedRoles` prop is passed).
- **Inner guard (page level):** Each of the three legacy pages contains its own `useEffect` that checks `profile.role !== 'admin'` and calls `navigate('/dashboard')` if the check fails. Additionally, each component returns `null` before its render JSX if the role condition is not met.
- **Result:** Double-layer protection — route-level auth + component-level role redirect.

---

## C. UI Structure

### `LegacyRecordsPage` (`src/pages/LegacyRecordsPage.tsx`)

| Element | Details |
|---|---|
| **Page header** | `<Archive>` icon (amber), "Legacy IP Records" h1, subtitle "Digitized historical intellectual property records". Flex row on `sm+`, column on mobile. |
| **Add button** | `<Link to="/dashboard/legacy-records/new">` — amber filled button with `<Plus>` icon. Positioned top-right on `sm+`. |
| **Search input** | Full-text search with a `<Search>` icon prefix. Filters on `record.title` and `record.details.creator_name`. No debounce — fires on every keystroke via `onChange`. |
| **Category filter** | `<select>` dropdown. Options: `all` + 7 hardcoded IP category values. |
| **Source filter** | `<select>` dropdown. Options: `all` + 5 hardcoded source values. |
| **Filter container** | `bg-white rounded-xl` card. 3-column on `md+`, single column on mobile. |
| **Records container** | Separate `bg-white rounded-xl border-amber-200` card. Shows result count as subtitle. |
| **Loading state** | Centred text "Loading legacy records…" inside the records container. |
| **Empty state** | Centred `<Archive>` icon (gray), "No legacy records found.", plus a "Create the first legacy record" link to `/dashboard/legacy-records/new`. |
| **Desktop table** | `hidden lg:block` — columns: Title, Inventor / Author, Category (amber badge), Source, Date Created, Actions (View link). |
| **Mobile cards** | `lg:hidden` — one card per record showing title, category badge, inventor, source, date, and a full-width "View" button. |
| **Pagination** | `<Pagination>` component at the bottom of the results section. Supports items-per-page selector and page navigation. |
| **Modals / drawers** | None on the list page. |

### `AddLegacyRecordPage` (`src/pages/AddLegacyRecordPage.tsx`)

Single-page form layout (not a modal). Sections:
1. **Creator / Inventor Information** — Creator Name (required), Creator Email.
2. **Intellectual Property Information** — Title (required), Category (required), Date Created, Abstract / Description, Keywords (comma-separated).
3. **Technical Background** — Technical Field, Prior Art, Problem Statement, Solution, Advantages. *(All optional.)*
4. **Legacy Information** — Source of Record (dropdown), Remarks / Notes.
5. **Documentation** — drag-and-drop file upload input (hidden `<input type="file" multiple>`). Accepted: PDF, images, office documents.
6. **Submit / Cancel buttons** at the bottom.

Alerts: inline `AlertCircle` (red) for errors, `CheckCircle` (green) for success.

### `LegacyRecordDetailPage` (`src/pages/LegacyRecordDetailPage.tsx`)

Single-column full-page layout (no dashboard padding card — uses its own `min-h-screen bg-gray-50` wrapper). Sections:
- **Header** bar with title and "Legacy IP Record" subtitle.
- **Alerts** row (error/success messages).
- **Record Details** card — grid of fields: Creator Name, Creator Email, Category, Date Created (original filing date), Source, Record ID.
- **Abstract** section (conditional).
- **Remarks** section (conditional).
- **Technical Details** section (conditional — only shown if any field is populated): Technical Field, Prior Art, Problem Statement, Solution, Advantages.
- **Keywords** section (conditional — amber pill tags).
- **Generate Documents** card — two sub-sections (Full Disclosure, IP Certificate), each with Generate, Regenerate, and Download buttons.
- **Generated Documents** list — fetched from `legacy_record_documents` table; each row has Download and Email buttons.
- **Uploaded Files** list — fetched from Supabase Storage bucket `documents/legacy-records/{id}/`.
- **Back button** — navigates to `/dashboard/legacy-records`.

---

## D. Features and Functional Behavior

### Search
- Searches `record.title` and `record.details.creator_name` (a JSONB field).
- Case-insensitive via `.toLowerCase()`.
- No debounce — fires on every keypress.
- Runs entirely client-side on the full fetched dataset (no server-side search query).

### Category filter
- Hardcoded enum array: `['patent', 'trademark', 'copyright', 'trade_secret', 'software', 'design', 'other']`.
- Filters `record.category` (a top-level column).

### Source filter
- Hardcoded values: `['old_system', 'physical_archive', 'email', 'manual_entry', 'other']`.
- Filters `record.details.legacy_source` (a JSONB nested field — **not** `record.legacy_source` top-level column).

### Combined filtering
- All three filters are applied sequentially in `filterRecords()`. They are AND-combined (all conditions must pass).

### Pagination
- Client-side: all records are fetched at once, then sliced in memory.
- Default `itemsPerPage`: 10.
- Resets to page 1 whenever any filter changes.
- `<Pagination>` component (`src/components/Pagination.tsx`) renders prev/next controls and items-per-page selector.

### No sorting
- Records are always ordered by `created_at DESC` from the Supabase query. No UI re-sorting is available.

### No debounce
- Search input triggers `filterRecords()` on every change. Acceptable for client-side filtering on a reasonably small dataset; could be a concern at scale.

### No caching
- `fetchRecords()` runs once on mount (when `profile.role === 'admin'`). No SWR, React Query, or polling is used.

### Create (Add New Legacy Record)
- Navigate to `/dashboard/legacy-records/new` → `AddLegacyRecordPage`.
- On submit: validates required fields → `supabase.auth.getUser()` → `supabase.from('legacy_ip_records').insert(...)`.
- On success: navigates to the new record's detail page after a 1.5 s delay.
- File upload: non-blocking; failures log a warning and do not abort record creation.

### Edit
- **Not implemented** on the detail page. There is no edit form or inline editing visible in the inspected code. Needs verification.

### Delete
- **Not visible** on the list page or detail page in the inspected code. Needs verification.

### Email sending
- `handleSendEmail` in `LegacyRecordDetailPage` is a placeholder that immediately sets error: `'Email sending not yet implemented'`.

### Document generation
- **Disclosure:** Calls Supabase Edge Function `generate-disclosure-legacy` via `supabase.functions.invoke(...)`. Auto-downloads the PDF from base64 on success.
- **Certificate:** Calls `generate-certificate-legacy` similarly. Auto-downloads on success.
- Both edge function source files were **not found** in the local workspace (`supabase/functions/` directory appears absent or not included). The function names are confirmed from code calls.

### Navigation when clicking "View"
- `<Link to="/dashboard/legacy-records/{record.id}">` navigates to the detail page.

### Bulk actions
- None present.

---

## E. Data Flow

### Data source
- **Supabase** (PostgreSQL via the JS client in `src/lib/supabase.ts`).
- Direct Supabase client calls — no custom service layer or API abstraction for this module.

### Tables / views used

| Table | Usage |
|---|---|
| `legacy_ip_records` | Primary data store for all legacy IP records. |
| `legacy_record_documents` | Stores generated disclosure/certificate metadata (file_name, document_type, pdf_data, file_path, created_at). |
| `users` | Referenced by RLS policies (`WHERE role = 'admin'`) but not queried from the frontend. |

### Storage buckets used

| Bucket | Path Pattern | Usage |
|---|---|---|
| `documents` | `legacy-records/{record_id}/{timestamp}-{filename}` | Uploaded source documents during record creation. |
| `legacy-generated-documents` | Unknown path | Referenced in `handleDownloadDocument` fallback (from `file_path`). Needs verification. |

### Expected fields for a `legacy_ip_records` row

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `title` | TEXT (NOT NULL) | IP title |
| `category` | TEXT (NOT NULL) | IP category enum value |
| `abstract` | TEXT | Optional description |
| `details` | JSONB | Structured blob: `creator_name`, `creator_email`, `description`, `keywords[]`, `technical_field`, `prior_art`, `problem`, `solution`, `advantages`, `remarks`, `legacy_source` |
| `legacy_source` | TEXT (NOT NULL) | Top-level column (also duplicated in `details.legacy_source`) |
| `digitized_at` | TIMESTAMPTZ | Set to `now()` on insert |
| `original_filing_date` | TEXT | Date string from the "Date Created" form field |
| `ipophil_application_no` | TEXT | Optional; form does not expose this field *(Needs verification — field exists in DB but not in form)* |
| `remarks` | TEXT | Admin notes |
| `created_by_admin_id` | UUID (NOT NULL) | Admin user ID |
| `updated_by_admin_id` | UUID | Admin user ID |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-managed |

### Category and source option sources
- Both are **hardcoded arrays** directly in the page and form components. They are not fetched from a database enum table or a shared constants file.
- Category values mirror the `ip_records.category` column type from `database.types.ts`.

### Mutation flow — create
1. `AddLegacyRecordPage.handleSubmit()`
2. `supabase.auth.getUser()` → get current admin UUID
3. `supabase.from('legacy_ip_records').insert([...]).select()` → returns new record
4. For each file: `supabase.storage.from('documents').upload(filePath, file)` (non-blocking)
5. `navigate('/dashboard/legacy-records/{newId}')` after success delay

### Mutation flow — document generation
1. `LegacyRecordDetailPage.handleGenerateDisclosure()` or `handleGenerateCertificate()`
2. `supabase.auth.getSession()` → get access token
3. `supabase.functions.invoke('generate-disclosure-legacy' | 'generate-certificate-legacy', {body: {record_id}})` 
4. On success: auto-creates a browser download from base64 `pdf_data`
5. `fetchDocuments()` is called after 1 s to refresh the generated documents list

---

## F. State Management

### Local state (React `useState`)
All state is component-local. No global state store (Redux, Zustand, Jotai, etc.) is used by these pages.

| Component | State variables |
|---|---|
| `LegacyRecordsPage` | `records`, `filteredRecords`, `loading`, `searchTerm`, `categoryFilter`, `sourceFilter`, `currentPage`, `itemsPerPage` |
| `AddLegacyRecordPage` | `loading`, `error`, `success`, `formData`, `uploadedFiles` |
| `LegacyRecordDetailPage` | `record`, `loading`, `actionLoading`, `error`, `success`, `documents`, `uploadedFiles` |

### Hooks used

| Hook | Source | Usage |
|---|---|---|
| `useAuth()` | `src/contexts/AuthContext.tsx` | Provides `user` and `profile` (including `role`) |
| `useNavigate()` | `react-router-dom` | Programmatic navigation |
| `useParams()` | `react-router-dom` | Extracts `id` from URL in detail page |
| `useState()` | React | All component state |
| `useEffect()` | React | Side effects: role guard, data fetch, filter trigger, pagination reset |

### Query/mutation libraries
- None. All Supabase calls are raw `async/await` inside `useEffect` or event handlers.

### Loading and error handling

| State | Behavior |
|---|---|
| Initial list load | `loading = true`; renders "Loading legacy records…" text |
| List load error | Caught silently with `console.error`; no UI error message shown to the user *(risk — see Section J)* |
| Record detail load error | Stored in `error` state; rendered as a red alert banner |
| Form submit loading | Button text changes to "Creating…", button disabled |
| Document action loading | All document buttons show `disabled` state via `actionLoading` flag |

---

## G. Permissions and Security

### Who can view the page
- The route `/dashboard/legacy-records` is accessible to any authenticated user who reaches the dashboard.
- The `ProtectedRoute` component does **not filter by role** for this route (no `allowedRoles` prop passed).
- The `LegacyRecordsPage` component itself redirects non-admins away to `/dashboard` via a `useEffect`.

### Who can create/edit/delete
- **Create:** Admin only (both via frontend role check and Supabase RLS policy `admins_can_create_legacy_records`).
- **Update:** Admin only, restricted to records where `created_by_admin_id = auth.uid()` (RLS policy).
- **Delete:** Admin only (any admin can delete any legacy record per RLS policy).
- **Edit UI:** Not implemented in the frontend — Needs verification.

### Route protection summary

| Layer | Mechanism | Scope |
|---|---|---|
| Auth presence | `ProtectedRoute` → redirect to `/login` | All `/dashboard/*` routes |
| Email verification | `ProtectedRoute` inline message | All `/dashboard/*` routes |
| Role check | Component `useEffect` → `navigate('/dashboard')` | All three legacy pages |
| Component null render | `if (!profile || profile.role !== 'admin') return null` | All three legacy pages |

### Backend / RLS summary (from migration `20251229000002_create_legacy_ip_records_table.sql`)

| Policy | Operation | Condition |
|---|---|---|
| `admins_can_create_legacy_records` | INSERT | `auth.uid()` ∈ `users(role='admin')` |
| `admins_can_manage_own_legacy_records` | UPDATE | `created_by_admin_id = auth.uid()` AND role = admin |
| `admins_can_delete_legacy_records` | DELETE | role = admin (any admin) |
| `anyone_can_view_legacy_records` | SELECT | `USING (true)` — **public read** |

**Important:** The SELECT policy allows anyone (authenticated or not) to read all legacy records directly via the Supabase REST API. The frontend role guard is the only barrier preventing non-admin users from seeing the list page via the UI.

### `legacy_record_documents` RLS (from migration `20251231000200_simplify_legacy_documents_rls.sql`)

All operations restricted to admins via `auth.jwt() ->> 'role' = 'admin'`, with a service-role bypass (`auth.uid() IS NULL`) for edge function inserts.

---

## H. UX/UI Assessment

### What is good
- **Responsive design:** The list page implements two separate layouts — a desktop `<table>` (`hidden lg:block`) and mobile card stack (`lg:hidden`) — providing a clean experience at both viewport sizes.
- **Visual identity:** Amber colour scheme (`amber-600`, `amber-100`, `amber-200`) consistently marks legacy content as distinct from the main blue-themed dashboard.
- **Empty state UX:** The empty state includes a direct call-to-action link to create the first record, reducing friction.
- **Non-blocking file upload:** Upload failures do not prevent record creation, which avoids a poor experience when storage permissions are misconfigured.
- **Inline feedback:** Success and error alerts are displayed inline without modals or page navigations.
- **Pagination:** Client-side pagination with configurable page size improves performance perception for larger datasets.

### Likely friction points
- **No edit functionality:** The detail page has no way to correct a record after creation. There is no edit button or form visible in the inspected code.
- **No delete from UI:** There is no delete button on the list or detail pages despite the RLS policy permitting it.
- **No debounce on search:** Every keystroke triggers `filterRecords()`. Not a problem for small datasets, but could cause jank with hundreds of records.
- **Hardcoded filter options:** If the `details.legacy_source` field is stored with mixed casing or different values, the source filter will not match correctly.
- **Silent list-fetch error:** If the Supabase query fails on the list page, the user sees an infinite loading state until they reload. No error message is displayed.
- **Email not implemented:** The "Email" button in the Document list always shows an error. This could confuse admins expecting it to work.
- **Regenerate = Generate:** The "Regenerate" button in `LegacyRecordDetailPage` calls the same handler as "Generate". There is no differentiation in behavior.
- **`ipophil_application_no` not exposed in form:** The DB column exists but the create form has no input for it.
- **No IPOPHIL Application No. on detail view:** This field is stored but not rendered in the detail page.

### Responsiveness observations
- Grid changes: 1 col (mobile) → 2 col (`md`) → 3 col (`md` for filters) are properly implemented.
- Desktop table is hidden on `<lg`, mobile cards shown on `<lg`. No horizontal scroll issues expected.
- `AddLegacyRecordPage` and `LegacyRecordDetailPage` use `max-w-4xl mx-auto` with padding, suitable for forms on all screen widths.

### Accessibility observations
- Filter `<select>` elements have no associated `<label>` elements — they rely only on placeholder `<option>` values.
- Search input has no visible `<label>` — placeholder text alone is used.
- All action buttons use icon + text (good).
- No `aria-label` attributes found on icon-only or ambiguous controls.
- Focus ring styles are present (`focus:ring-2 focus:ring-amber-500`) on form inputs.

### Consistency with rest of dashboard
- Uses the same `DashboardLayout` wrapper and sidebar as all other dashboard pages.
- Style classes (rounded-xl, shadow-sm, space-y-6) match the overall dashboard design language.
- Uses the same `<Pagination>` component shared with `AllRecordsPage`.
- Amber accent colour is specific to legacy content and does not clash with the blue accent used for workflow pages.

---

## I. Dependencies / Connected Files Map

| File | Role |
|---|---|
| `src/pages/LegacyRecordsPage.tsx` | Main list page — search, filter, pagination, table/card layout |
| `src/pages/AddLegacyRecordPage.tsx` | Full-page form for creating a new legacy record |
| `src/pages/LegacyRecordDetailPage.tsx` | Record detail view with document generation and file download |
| `src/components/DashboardLayout.tsx` | Shared layout wrapper; registers "Legacy Records" in the sidebar nav |
| `src/components/ProtectedRoute.tsx` | Outer authentication gate for all `/dashboard/*` routes |
| `src/components/Pagination.tsx` | Shared pagination component used on the list page |
| `src/components/LegacyRecordBadge.tsx` | Amber "🔖 LEGACY RECORD" badge component (defined but usage location in this module not confirmed — likely used in `AllRecordsPage` or `LegacyRecordDetailModal`) |
| `src/components/AddLegacyRecordModal.tsx` | A multi-step modal version of the add form (see note below) |
| `src/components/LegacyRecordDetailModal.tsx` | A modal version of the detail view with document generation |
| `src/App.tsx` | Route registration for all three legacy pages |
| `src/contexts/AuthContext.tsx` | Provides `useAuth()` hook; supplies `user` and `profile` |
| `src/lib/supabase.ts` | Supabase JS client instance |
| `src/lib/database.types.ts` | TypeScript types for Supabase tables; `LegacyRecord` type sourced from here |
| `supabase/migrations/20251229000002_create_legacy_ip_records_table.sql` | Creates `legacy_ip_records` table, indexes, RLS policies, and updated_at trigger |
| `supabase/migrations/20251231000100_fix_legacy_document_rls_for_service_role.sql` | RLS fixes for `legacy_record_documents` |
| `supabase/migrations/20251231000200_simplify_legacy_documents_rls.sql` | Simplified, final RLS policies for `legacy_record_documents` |
| `supabase/migrations/20251231000300_verify_legacy_document_select_policy.sql` | Verification migration for document policies |
| `supabase/migrations/20260119000200_remove_legacy_affiliation_column.sql` | Removes `affiliation` column from `users` (related cleanup migration) |
| Edge Function: `generate-disclosure-legacy` | Supabase Edge Function invoked for PDF disclosure generation. Source files not found in workspace. |
| Edge Function: `generate-certificate-legacy` | Supabase Edge Function invoked for PDF certificate generation. Source files not found in workspace. |

### Note on Modal Components
`AddLegacyRecordModal.tsx` and `LegacyRecordDetailModal.tsx` exist as independent components but are **not used** by any of the three legacy-records pages. They appear to be an older implementation that was superseded when the full-page approach was adopted. Their usage should be confirmed (or they should be candidates for removal).

---

## J. Risks / Edge Cases

### Empty state issues
- If the admin has entered records but all are filtered out by a combination of category + source + search, the empty state "No legacy records found" is displayed with a "Create the first legacy record" link — this could mislead an admin into thinking no records exist rather than adjusting filters.
- **Recommendation:** Show a "Clear filters" action when no results are found and records do exist.

### Filter mismatch issues
- The `sourceFilter` compares against `record.details.legacy_source` (JSONB field), while `legacy_source` is also a **top-level column** on the table. If records were inserted directly via the DB or edge functions using only the top-level column (not the JSONB field), those records will not be filterable by source.
- `categories` array in the filter uses raw values like `'trade_secret'` but the label display uses `cat.replace('_', ' ').toUpperCase()` which only replaces the **first underscore**. `'trade_secret'` → `'TRADE SECRET'` is correct for this case, but `'trade_secret'` stored with a different casing in DB would cause a filter miss.

### Missing enum/data issues
- `ipophil_application_no` column exists in the DB schema but is never exposed in the create form or the detail view. Any records with this field populated are viewable only via direct DB access.
- `digitized_at` is auto-set but never displayed in the UI.

### Stale count issues
- The record count displayed (`{filteredRecords.length} record(s) found`) is based on the client-side filter, not the total DB count. A fresh record added from another session will not appear until the page is reloaded.

### Permission mismatch risks
- The SELECT RLS policy on `legacy_ip_records` is `USING (true)` — anyone with the Supabase anon key can read all legacy records directly via the REST API or PostgREST endpoint, bypassing the admin-only frontend route guard entirely.
- The UPDATE policy restricts to `created_by_admin_id = auth.uid()`, meaning Admin A cannot update records created by Admin B — this could be a problem in a multi-admin environment.

### Performance concerns
- All records are fetched in a single `.select('*')` with no server-side pagination, filtering, or search. If the `legacy_ip_records` table grows to thousands of records, this approach will degrade significantly.
- The `filterRecords()` function runs on every state change triggered by any of the three filter inputs, re-filtering the entire in-memory dataset each time.

---

## K. Recommended Next Improvements

*(Documentation only — no code changes made.)*

1. **Add Edit functionality:** Implement an edit form or inline edit mode on `LegacyRecordDetailPage` and/or a dedicated `/dashboard/legacy-records/:id/edit` route.
2. **Add Delete functionality:** Add a delete button with confirmation dialog on the detail page, using the existing `admins_can_delete_legacy_records` RLS policy.
3. **Fix source filter field:** Decide whether `legacy_source` should live as a top-level column or only in `details` JSONB, and ensure consistent storage and filtering. Prefer the top-level column (already indexed) for filtering performance.
4. **Add server-side search and filtering:** Move search/filter/pagination to the Supabase query to avoid fetching the full dataset on every page load.
5. **Add debounce to search input:** Debounce at ~300 ms to avoid excessive re-renders on fast typists.
6. **Show error on list load failure:** Display a visible error message (not just `console.error`) when `fetchRecords()` fails.
7. **Implement email functionality:** Implement `handleSendEmail` or remove the button to prevent misleading UX.
8. **Expose `ipophil_application_no` field:** Add this to the create form (optional) and the detail view.
9. **Improve empty state on filtered results:** When filters are active and return no results, show a "Clear filters" option rather than the "Create the first record" link.
10. **Restrict SELECT RLS policy:** Consider requiring authentication for reading legacy records unless public exposure is intentional.
11. **Clean up or document the modal components:** `AddLegacyRecordModal.tsx` and `LegacyRecordDetailModal.tsx` appear unused by the current implementation. Either remove them or document their intended use case.
12. **Add `aria-label` / `<label>` elements** to filter `<select>` and the search `<input>` to improve accessibility.
13. **Audit multi-admin UPDATE restriction:** The RLS UPDATE policy restricts changes to the creating admin only — review if this is intentional.

---

## L. Verification Notes

### Confirmed findings (from direct code inspection)
- ✅ Three dedicated pages (`LegacyRecordsPage`, `AddLegacyRecordPage`, `LegacyRecordDetailPage`) are fully implemented.
- ✅ Routes registered in `src/App.tsx` at lines 80–82.
- ✅ Admin-only redirect via `useEffect` + `return null` guard in all three pages.
- ✅ Supabase direct client calls (no service layer).
- ✅ Data table is `legacy_ip_records` (confirmed in migration and page code).
- ✅ Document metadata stored in `legacy_record_documents` table.
- ✅ File uploads go to `documents` bucket under `legacy-records/{id}/` path.
- ✅ Edge functions `generate-disclosure-legacy` and `generate-certificate-legacy` are invoked via `supabase.functions.invoke`.
- ✅ `legacy_source` is stored both as a top-level column AND duplicated inside `details` JSONB.
- ✅ SELECT RLS policy is `USING (true)` — public read.
- ✅ Pagination is client-side via `<Pagination>` component.
- ✅ No edit or delete UI is present in the frontend code.
- ✅ Email sending is a stub (always-error placeholder).
- ✅ `AddLegacyRecordModal` and `LegacyRecordDetailModal` are not currently used by the legacy-records pages.

### Needs verification
- ⚠️ **Edge function source files** (`generate-disclosure-legacy`, `generate-certificate-legacy`) were not found in the workspace. Their existence must be confirmed on the Supabase project dashboard or in a separate deployment repository.
- ⚠️ **`legacy-generated-documents` storage bucket** is referenced in `handleDownloadDocument` as a fallback but its configuration/policies are not confirmed in the inspected migrations.
- ⚠️ **`LegacyRecordBadge` usage location** — the badge component exists but its rendering location within the legacy records module is not confirmed (may be used in `AllRecordsPage` or `LegacyRecordDetailModal`).
- ⚠️ **`ipophil_application_no` population** — the column exists in the DB but no frontend code populates it. Whether it is set by an edge function or migration data import is unverified.
- ⚠️ **`legacy_record_documents` table schema** — the table is queried in `LegacyRecordDetailPage` but its `CREATE TABLE` migration was not found in the inspected migration files (`20251229000002` only creates `legacy_ip_records`). Needs verification of which migration creates this table.
- ⚠️ **Whether any records currently exist** in the database — implementation is confirmed but actual data presence requires live database inspection.
- ⚠️ **`AddLegacyRecordModal` render site** — this component accepts `isOpen`, `onClose`, `onSuccess` props and appears to be an older approach. Its current usage (if any) was not traced.

---

## Inspection Summary

### Files inspected
| File | Type |
|---|---|
| `src/pages/LegacyRecordsPage.tsx` | Page component (291 lines) |
| `src/pages/AddLegacyRecordPage.tsx` | Page component (367 lines) |
| `src/pages/LegacyRecordDetailPage.tsx` | Page component (658 lines) |
| `src/components/AddLegacyRecordModal.tsx` | Component (439 lines, partially read) |
| `src/components/LegacyRecordDetailModal.tsx` | Component (285 lines, partially read) |
| `src/components/LegacyRecordBadge.tsx` | Small UI component |
| `src/components/DashboardLayout.tsx` | Shared layout (235 lines) |
| `src/components/ProtectedRoute.tsx` | Auth guard (full) |
| `src/components/Pagination.tsx` | Pagination component (partial) |
| `src/App.tsx` | Route definitions (145 lines) |
| `supabase/migrations/20251229000002_create_legacy_ip_records_table.sql` | DB migration |
| `supabase/migrations/20251231000200_simplify_legacy_documents_rls.sql` | DB RLS migration |
| `supabase/migrations/20260119000200_remove_legacy_affiliation_column.sql` | DB cleanup migration |
| `LEGACY_RECORDS_FINAL_STATUS.md` | Internal status document |
| `API_MAP.md` (via search) | API reference document |

### Key findings
1. The Legacy IP Records page is **fully implemented** end-to-end — routes, pages, DB table, and edge function integration are all present.
2. Admin access is enforced at **two layers**: `ProtectedRoute` (auth) + component-level role redirect.
3. The **SELECT RLS policy is public** (`USING (true)`), which means any party with the anon key can read legacy records without authentication.
4. All filtering, search, and pagination are **entirely client-side** with no server-side query optimisation.
5. **Edit and Delete** functionality are missing from the frontend, despite the DB having appropriate RLS policies for both operations.
6. The **email send feature is a stub** and does nothing useful when clicked.
7. `legacy_source` is redundantly stored in **both** a top-level column and the `details` JSONB; the source filter reads from the JSONB path, not the indexed column.
8. There are **two legacy record modal components** (`AddLegacyRecordModal`, `LegacyRecordDetailModal`) that appear to be unused by the current full-page implementation.
9. **Edge function source files are not in the workspace**, only the invocation calls are visible.

### Unverified areas
- Edge function source code and deployment status
- `legacy_record_documents` table creation migration
- `legacy-generated-documents` storage bucket configuration
- Current production data in `legacy_ip_records`
- Current usage (if any) of `AddLegacyRecordModal` and `LegacyRecordDetailModal`
- Whether `ipophil_application_no` is populated by any external process
