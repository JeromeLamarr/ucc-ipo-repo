# Legacy IP Records — Enhancement Plan

**Prepared:** 2026-03-08  
**Author:** GitHub Copilot (inspection only — no production code modified)  
**Scope:** `/dashboard/legacy-records`, `/dashboard/legacy-records/new`, `/dashboard/legacy-records/:id`  
**Reference pages inspected for parity:** `AllRecordsPage`, `UserManagement`, `DeletedArchivePage`, `AssignmentManagementPage`

---

## Executive Summary

The Legacy IP Records module is **fully functional** — routes, DB, and edge-function calls all work. However, it was built as a first-pass implementation and is noticeably behind the quality bar set by the other admin pages (`AllRecordsPage`, `UserManagement`). Critical CRUD operations (edit, delete) are either missing from the UI or non-functional (email). The list page lacks the loading spinner, error visibility, bulk row selection, export, and date-range filter that are standard on every other admin list page. The detail and add pages use a full-page layout that breaks from the dashboard card style used everywhere else.

This plan proposes **three phases** of safe, incremental improvements that bring the module to parity without touching the database schema or breaking existing functionality:

- **Phase 1 — Must Fix (critical gaps):** Delete with confirmation, edit form, spinner loading, visible error state, source-filter field alignment.  
- **Phase 2 — Parity Upgrades:** Export to Excel, row selection + bulk delete, date-range filter, sticky table header, `formatDate` consistency, `useBranding` adoption.  
- **Phase 3 — Polish and UX:** Debounced search, IPOPHIL No. in form/detail, filter-aware empty state, page layout consistency, accessibility labels, orphaned modal cleanup.

Security fixes (RLS SELECT restriction, UPDATE multi-admin gap) are recommended as a parallel track with no frontend work required.

---

## Current Strengths

- Clean amber visual identity distinguishing legacy from workflow records.
- Fully working create flow with non-blocking file upload.
- Responsive dual-layout (desktop table + mobile cards) on the list page.
- Pagination component already integrated.
- Two-layer admin-only guard (ProtectedRoute + component useEffect) — no role bypass risk in the UI.
- Document generation (disclosure/certificate) via Supabase Edge Functions with auto-download.
- Three independent routes registered and working (`list → new → detail`).

---

## Current Gaps

### CRUD
| Feature | Status | Comparison |
|---|---|---|
| Create | ✅ Working | — |
| Read (list) | ✅ Working | — |
| Read (detail) | ✅ Working | — |
| Edit | ❌ Missing | UserManagement has Edit modal; AllRecordsPage edits via detail page |
| Delete | ❌ Missing from UI | AllRecordsPage has soft-delete with confirmation modal |
| Email send | ❌ Stub (always errors) | Not present on other pages but button is visible and misleading |

### Loading / Error / Empty States
| State | Status | Comparison |
|---|---|---|
| Loading spinner | ❌ Text only ("Loading legacy records…") | All other pages use `animate-spin` spinner |
| Fetch error visibility | ❌ Silent `console.error` only | Same issue on other pages but confirmed pattern to improve |
| Empty state (no records at all) | ✅ Good — shows CTA link | — |
| Empty state (filters active, no results) | ⚠️ Shows same "Create first record" CTA — misleading | AllRecordsPage shows an empty row in the table without a misleading CTA |

### Filtering and Search
| Feature | Status | Comparison |
|---|---|---|
| Search (title + creator) | ✅ Working | — |
| Category filter | ✅ Working | — |
| Source filter | ⚠️ Reads from `details.legacy_source` (JSONB), not the indexed top-level `legacy_source` column | Risk of filter mismatch for records where values differ |
| Date range filter | ❌ Missing | AllRecordsPage has From / To date inputs with clear button |
| Search debounce | ❌ Fires on every keystroke | Minor issue at current scale |
| Filter icon in select elements | ❌ Missing | AllRecordsPage / UserManagement use lucide `<Filter>` icon prefix |

### Table UX
| Feature | Status | Comparison |
|---|---|---|
| Sticky thead on scroll | ❌ Missing | AllRecordsPage uses `sticky top-0 z-10` |
| Row checkboxes / selection | ❌ Missing | AllRecordsPage, UserManagement, DeletedArchivePage all have per-row checkboxes + select-all |
| Bulk actions bar | ❌ Missing | AllRecordsPage shows selection count and bulk Delete |
| Export to Excel | ❌ Missing | AllRecordsPage has Export Filtered / Export Selected |
| `formatDate` locale consistency | ⚠️ Uses `new Date().toLocaleDateString()` (locale-dependent) | AllRecordsPage uses `toLocaleDateString('en-US', {year, month, day})` |

### Detail Page
| Feature | Status | Comparison |
|---|---|---|
| Edit record | ❌ No edit button or form | UserManagement opens an edit modal |
| Delete record | ❌ No delete button | AllRecordsPage has delete with confirmation |
| Email send | ❌ Stub | Button visible but non-functional |
| IPOPHIL Application No. | ❌ Not displayed | DB column exists but never shown |
| `digitized_at` | ❌ Not displayed | Column exists but never shown |
| Layout style | ⚠️ Standalone `min-h-screen bg-gray-50` wrapper — uses its own header/nav container, different from the rest of the dashboard |

### Add Record Page
| Feature | Status | Comparison |
|---|---|---|
| Layout style | ⚠️ Standalone `min-h-screen bg-gray-50` with its own header bar — breaks dashboard layout consistency |
| IPOPHIL Application No. field | ❌ Missing | Column in DB but not in form |
| Field labels with `<label htmlFor>` | ⚠️ Labels present but not linked via `htmlFor`/`id` pairs on most inputs | Accessibility gap |
| Cancel navigation | ✅ Works | — |

### Accessibility
| Issue | Scope |
|---|---|
| Filter `<select>` elements have no `<label>` | `LegacyRecordsPage` |
| Search input has no `<label>` (placeholder only) | `LegacyRecordsPage` |
| Most form inputs in `AddLegacyRecordPage` lack `htmlFor`/`id` pairs linking label to input | `AddLegacyRecordPage` |

### Code Quality
| Issue | Risk |
|---|---|
| `AddLegacyRecordModal.tsx` and `LegacyRecordDetailModal.tsx` exist but are not used by any legacy-records page | Dead code / confusion |
| Category and source values hardcoded separately in both `LegacyRecordsPage` and `AddLegacyRecordPage` | Drift risk if values change |

---

## Parity Gaps vs Other Admin Pages

The table below maps every capability present in at least one comparable admin page against the legacy records module.

| Capability | AllRecords | UserManagement | DeletedArchive | LegacyRecords |
|---|:---:|:---:|:---:|:---:|
| Animated loading spinner | ✅ | ✅ | ✅ | ❌ |
| Sort by date in query | ✅ | ✅ | ✅ | ✅ |
| Date range filter | ✅ | ❌ | ❌ | ❌ |
| Row checkboxes + select-all | ✅ | ✅ | ✅ | ❌ |
| Bulk action bar | ✅ | ❌ | ✅ | ❌ |
| Export to Excel | ✅ | ❌ | ❌ | ❌ |
| Delete action + confirmation modal | ✅ | ✅ | ✅ | ❌ |
| Edit action | ❌ | ✅ | ❌ | ❌ |
| Filter icon prefix in selects | ✅ | ✅ | ❌ | ❌ |
| Sticky table header | ✅ | ❌ | ❌ | ❌ |
| `formatDate` locale string | ✅ | ✅ | ✅ | ❌ |
| Empty state in table row (no misleading CTA) | ✅ | ✅ | ✅ | ❌ |
| `useBranding` theme integration | ❌ | ✅ | ❌ | ❌ |
| Content rendered inside dashboard content area | ✅ | ✅ | ✅ | ❌ (new/detail pages have own full-page wrapper) |

---

## Recommended UX Improvements

### 1. Spinner Loading State
**Why it matters:** The current text "Loading…" is visually jarring and inconsistent with every other admin page that shows the branded animated spinner. Users experience a visual layout shift when records appear.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal — change one JSX block.

### 2. Visible Fetch Error State
**Why it matters:** If `fetchRecords()` throws (e.g., network blip, RLS denial), the user sees a permanent empty state with no feedback. They may think no records exist.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal — add an `error` state variable and a simple red banner.

### 3. Filter-Aware Empty State
**Why it matters:** When category + source filters are active and no records match, the current empty state shows "Create the first legacy record" — this is wrong. Records exist; the filters just excluded them. This misleads admins.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal — add a condition to show "Clear filters" action when `records.length > 0` but `filteredRecords.length === 0`.

### 4. Sticky Table Header
**Why it matters:** As the list grows, the column headers scroll out of view on the desktop table, making it hard to scan rows.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal — add `sticky top-0 z-10 bg-gray-50` to `<thead>`.

### 5. Filter Icon Prefix on Select Dropdowns
**Why it matters:** AllRecordsPage and UserManagement use a `<Filter>` lucide icon as a visual prefix inside select elements. The legacy page selects have no icon, looking bare by comparison.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal — CSS-only change.

### 6. `formatDate` Utility Consistency
**Why it matters:** Using `new Date().toLocaleDateString()` without a locale argument produces different formats on different machines/browsers (e.g., DD/MM/YYYY vs MM/DD/YYYY). AllRecordsPage locks to `'en-US'` format.  
**Affected files:** `src/pages/LegacyRecordsPage.tsx`, `src/pages/LegacyRecordDetailPage.tsx`  
**Risk:** None.

### 7. Detail and Add Page Layout Alignment
**Why it matters:** `AddLegacyRecordPage` and `LegacyRecordDetailPage` each have their own standalone `min-h-screen bg-gray-50` wrapper with a custom white header bar at the top. Every other admin page (AllRecords, UserManagement, etc.) renders as a `space-y-6` div directly inside the `DashboardLayout` content area — no inner full-page wrapper. The legacy pages effectively "double up" the layout, resulting in inconsistent spacing and a different visual rhythm from the rest of the dashboard.  
**Affected files:** `src/pages/AddLegacyRecordPage.tsx`, `src/pages/LegacyRecordDetailPage.tsx`  
**Risk:** Low-medium — structural change to two pages; requires review of all sections inside.

### 8. Debounced Search
**Why it matters:** The search input calls `filterRecords()` on every keystroke via `useEffect`. At scale this is wasteful. A 300 ms debounce is standard practice.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal — add a `useEffect` with `setTimeout` debounce.

---

## Recommended Functional Improvements

### 9. Delete Record with Confirmation Modal
**Why it matters:** The DB already has the `admins_can_delete_legacy_records` RLS policy. The UI simply never exposes deletion. Admins cannot remove erroneous records without going directly to the database.  
**Affected files:** `src/pages/LegacyRecordsPage.tsx`, `src/pages/LegacyRecordDetailPage.tsx`  
**Implementation approach:**
- Add a `deleteConfirmation: { id: string; title: string } | null` state variable.
- Add a `<Trash2>` button to each table row (list page) and to the detail page header.
- On click, open a confirmation modal (same pattern as `AllRecordsPage`).
- On confirm, call `supabase.from('legacy_ip_records').delete().eq('id', id)`, then refresh.
**Risk:** Low — mirrors the exact pattern already in `AllRecordsPage`.

### 10. Edit Record Form
**Why it matters:** Post-creation corrections are currently impossible from the frontend. Typos in title, wrong category, or incorrect source cannot be fixed without database access.  
**Affected files:** `src/pages/LegacyRecordDetailPage.tsx` (add inline edit mode) or new `src/pages/EditLegacyRecordPage.tsx`  
**Implementation approach:** The simplest approach is to add an "Edit" button on the detail page that toggles an inline form (same fields as the create form, pre-populated from `record`). On save, call `supabase.from('legacy_ip_records').update({...}).eq('id', id)`.  
**Risk:** Low-medium — new form state required; RLS UPDATE policy restricts edits to `created_by_admin_id = auth.uid()` (see Security section).

### 11. Remove / Replace Non-Functional Email Button
**Why it matters:** The "Email" button on generated documents always triggers an error state immediately. This is visible, confusing, and erodes trust.  
**Affected file:** `src/pages/LegacyRecordDetailPage.tsx`  
**Options:**
  - A. Remove the button entirely until the feature is implemented.
  - B. Mark it visually as "Coming soon" with a tooltip and `disabled` state.  
**Risk:** None — removes broken behavior.

### 12. Row Selection + Bulk Delete
**Why it matters:** When cleaning up legacy records in bulk, having to delete one by one is highly inefficient. AllRecordsPage and DeletedArchivePage both have per-row checkboxes and a bulk action toolbar.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Low — isolated to the list page; same pattern as existing pages.

### 13. Export to Excel
**Why it matters:** Admins will need to report on legacy digitisation progress. AllRecordsPage has a styled export function that generates `.xls` with metadata headers. This pattern can be reused directly.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** None — client-side only; no API calls.  
**Export columns suggested:** Title, Creator Name, Creator Email, Category, Source, Original Filing Date, IPOPHIL Application No., Digitized At, Remarks.

### 14. Date Range Filter (Digitized Date)
**Why it matters:** AllRecordsPage has date range filtering. For a historical records module where admins track digitisation progress over time, filtering by when a record was added is valuable.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx`  
**Risk:** Minimal.

### 15. Expose IPOPHIL Application No. in Form and Detail View
**Why it matters:** The `ipophil_application_no` column exists in the DB but is invisible in both the create form and the detail view. Any records with official IPOPHIL numbers cannot be properly documented using the current UI.  
**Affected files:** `src/pages/AddLegacyRecordPage.tsx`, `src/pages/LegacyRecordDetailPage.tsx`  
**Risk:** None — purely additive.

### 16. Expose `digitized_at` Timestamp in Detail View
**Why it matters:** This field records when the record was entered into the system, which is audit-relevant for a digitisation project. It is never shown to the admin.  
**Affected file:** `src/pages/LegacyRecordDetailPage.tsx`  
**Risk:** None — read-only display.

---

## Recommended Security / Data Fixes

### 17. Align Source Filter to Top-Level Column
**Why it matters (CRITICAL DATA FIX):** The source filter on `LegacyRecordsPage` reads `record.details?.legacy_source` (JSONB nested field). The actual indexed column on the table is `legacy_source` (top-level). The create form stores `legacy_source` in both the top-level column AND in `details.legacy_source`. However, any records inserted directly via SQL, a migration, or an edge function that only populates the top-level column will NOT be filterable by source in the UI. The indexed column should be the single source of truth.  
**Affected file:** `src/pages/LegacyRecordsPage.tsx` — change `record.details?.legacy_source` to `record.legacy_source` in the `sourceFilter` condition.  
**Risk:** None to the code — one line change. Verify existing data is consistent before changing.

### 18. Restrict SELECT RLS Policy
**Why it matters (SECURITY FIX):** The current `anyone_can_view_legacy_records` policy has `USING (true)` — anyone with the Supabase anon key can read all legacy records via the REST API with no authentication. If legacy records contain sensitive historical IP data (which they likely do), this should require at least an authenticated session.  
**Affected files:** Migration file (new migration) — `src/` code is not affected.  
**Suggested policy change:**
```sql
DROP POLICY "anyone_can_view_legacy_records" ON legacy_ip_records;

CREATE POLICY "authenticated_can_view_legacy_records" ON legacy_ip_records
FOR SELECT
USING (auth.role() = 'authenticated');
```
**Risk:** Low for the frontend (all users are authenticated before reaching the dashboard). Confirm no public-facing pages query this table before applying.

### 19. Allow Any Admin to Edit (Not Just Creator)
**Why it matters:** The UPDATE RLS policy restricts edits to `created_by_admin_id = auth.uid()`. In a team context, Admin A cannot fix errors in a record created by Admin B. This is overly restrictive for a shared admin tool.  
**Affected files:** Migration file (new migration) — no frontend changes needed.  
**Suggested policy change:**
```sql
DROP POLICY "admins_can_manage_own_legacy_records" ON legacy_ip_records;

CREATE POLICY "admins_can_update_legacy_records" ON legacy_ip_records
FOR UPDATE
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
```
**Risk:** Low — broadens admin access within the admin role boundary.

### 20. Remove / Archive Orphaned Modal Components
**Why it matters:** `src/components/AddLegacyRecordModal.tsx` (439 lines) and `src/components/LegacyRecordDetailModal.tsx` (285 lines) exist but are not imported or used anywhere in the current implementation. They represent ~724 lines of maintenance burden. If they were superseded by the full-page approach, they should be removed.  
**Affected files:** `src/components/AddLegacyRecordModal.tsx`, `src/components/LegacyRecordDetailModal.tsx`  
**Risk:** Minimal — verify no dynamic import exists (`grep` for component names first).

---

## Proposed Final UX Structure

### List Page `/dashboard/legacy-records` — Target State

```
┌─────────────────────────────────────────────────────────────┐
│  🗄 Legacy IP Records                         [+ Add New]    │
│  Digitized historical intellectual property records          │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search title or creator…] [⊟ Category ▾] [⊟ Source ▾] │
│  Date: [From ──────] [To ──────]  [Clear dates]             │
├─────────────────────────────────────────────────────────────┤
│  Legacy Records  123 records found        [Export (123) ▾]  │
│                                                             │
│  [☐] Title          Creator      Category   Source   Date  Action│
│  [☐] Patent ABC…    J. Dela Cruz  Patent    Old Sys  Jan 5  👁 🗑 │
│  [☐] Trademark XY…  M. Santos     TM        Email    Dec 3  👁 🗑 │
│  …                                                           │
│  [Bulk: Delete Selected (3)]                                │
│                                                             │
│  < 1 2 3 … 12 >   Items per page: [10 ▾]                   │
└─────────────────────────────────────────────────────────────┘
```

### Detail Page `/dashboard/legacy-records/:id` — Target State

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard > Legacy Records > [Record Title]                 │
│  🗄 [Record Title]                    [Edit] [Delete]       │
│  Legacy IP Record                                           │
├─────────────────────────────────────────────────────────────┤
│  Record Details                                             │
│  Creator Name  |  Creator Email  |  Category  |  Source    │
│  Date Created  |  IPOPHIL No.    |  Record ID |  Digitized  │
├──────────────────────────────────────────────────────────── │
│  Abstract  |  Remarks  |  Technical Details  |  Keywords    │
├─────────────────────────────────────────────────────────────┤
│  Generate Documents                                         │
│  [Generate Disclosure]  [Regenerate]  [Download]            │
│  [Generate Certificate] [Regenerate]  [Download]            │
├─────────────────────────────────────────────────────────────┤
│  Generated Documents                                        │
│  disclosure.pdf  Jan 5  [Download]  (Email removed/disabled)│
├─────────────────────────────────────────────────────────────┤
│  Uploaded Files                                             │
│  original_scan.pdf  2.3 KB  [Download]                      │
│                                                             │
│  [← Back to Legacy Records]                                 │
└─────────────────────────────────────────────────────────────┘
```

### Add Page `/dashboard/legacy-records/new` — Target State
- Layout: render inside DashboardLayout content area (remove standalone `min-h-screen` wrapper).
- Add `IPOPHIL Application No.` field (optional) in the Legacy Information section.
- Proper `<label htmlFor>` + `id` attributes on all inputs.
- Keep all existing sections and behavior.

---

## Phased Implementation Plan

### Phase 1 — Must Fix (Critical, ~1–2 days)

These are blocking gaps that affect data integrity, user trust, or create misleading UX.

| # | Enhancement | Affected Files | Risk | Priority |
|---|---|---|---|---|
| 17 | Align source filter to top-level `legacy_source` column | `LegacyRecordsPage.tsx` | None | Do first |
| 9 | Delete with confirmation modal (list + detail) | `LegacyRecordsPage.tsx`, `LegacyRecordDetailPage.tsx` | Low | — |
| 10 | Edit record inline on detail page | `LegacyRecordDetailPage.tsx` | Low-Medium | After delete |
| 1 | Replace text loading with animated spinner | `LegacyRecordsPage.tsx` | None | — |
| 2 | Show error state when list fetch fails | `LegacyRecordsPage.tsx` | None | — |
| 11 | Remove/disable non-functional email button | `LegacyRecordDetailPage.tsx` | None | — |
| 3 | Filter-aware empty state | `LegacyRecordsPage.tsx` | None | — |

### Phase 2 — Parity Upgrades (~1–2 days)

These bring the module to parity with `AllRecordsPage` and `UserManagement`.

| # | Enhancement | Affected Files | Risk | Priority |
|---|---|---|---|---|
| 12 | Row selection + bulk delete | `LegacyRecordsPage.tsx` | Low | — |
| 13 | Export to Excel | `LegacyRecordsPage.tsx` | None | — |
| 14 | Date range filter (digitized date) | `LegacyRecordsPage.tsx` | None | — |
| 4 | Sticky table header | `LegacyRecordsPage.tsx` | None | — |
| 6 | `formatDate` locale string | `LegacyRecordsPage.tsx`, `LegacyRecordDetailPage.tsx` | None | — |
| 5 | Filter icon prefix in selects | `LegacyRecordsPage.tsx` | None | — |
| 19 | RLS UPDATE policy — allow any admin | New migration (no frontend change) | Low | Before edit UI |

### Phase 3 — Polish and UX (~1 day)

| # | Enhancement | Affected Files | Risk | Priority |
|---|---|---|---|---|
| 7 | Detail + Add page layout alignment with dashboard | `AddLegacyRecordPage.tsx`, `LegacyRecordDetailPage.tsx` | Low-Medium | After Phase 2 |
| 15 | Add IPOPHIL Application No. to form and detail | `AddLegacyRecordPage.tsx`, `LegacyRecordDetailPage.tsx` | None | — |
| 16 | Show `digitized_at` in detail view | `LegacyRecordDetailPage.tsx` | None | — |
| 8 | Debounced search | `LegacyRecordsPage.tsx` | None | — |
| Acc. | Add `<label htmlFor>`/`id` pairs to all form inputs | `AddLegacyRecordPage.tsx` | None | — |
| Acc. | Add `aria-label` to filter selects and search input | `LegacyRecordsPage.tsx` | None | — |

### Security Track (Parallel — Backend Only)

| # | Enhancement | Affected Files | Risk |
|---|---|---|---|
| 18 | Restrict SELECT RLS to authenticated users | New migration | Low |
| 19 | Broaden UPDATE RLS to any admin | New migration | Low |
| 20 | Verify and remove orphaned modal components | `AddLegacyRecordModal.tsx`, `LegacyRecordDetailModal.tsx` | None after grep verify |

---

## File Impact Map

| File | Touches in Plan | Phase |
|---|---|---|
| `src/pages/LegacyRecordsPage.tsx` | Spinner, error state, filter-aware empty state, source-filter column alignment, date filter, row selection, bulk delete, export, sticky header, Filter icons, formatDate, debounce, aria-labels | 1, 2, 3 |
| `src/pages/LegacyRecordDetailPage.tsx` | Delete action + modal, edit form/mode, remove/disable email button, expose IPOPHIL No. + digitized_at, layout alignment, formatDate | 1, 2, 3 |
| `src/pages/AddLegacyRecordPage.tsx` | Add IPOPHIL Application No. field, label/id accessibility, layout alignment | 3 |
| New migration (security) | RLS SELECT restriction, RLS UPDATE broadening | Security track |
| `src/components/AddLegacyRecordModal.tsx` | Remove after verifying no usages | 3 |
| `src/components/LegacyRecordDetailModal.tsx` | Remove after verifying no usages | 3 |

**Files with ZERO planned changes:**
- `src/App.tsx` — routes are correct as-is
- `src/components/DashboardLayout.tsx` — sidebar nav is correct as-is
- `src/components/ProtectedRoute.tsx` — auth guard is correct as-is
- `src/components/Pagination.tsx` — shared component, no changes needed
- `src/components/LegacyRecordBadge.tsx` — no changes needed
- All migration files — changes go in new dedicated migrations only
- All services files — no service layer exists for this module; status quo acceptable

---

## Risks / Dependencies

### Risk 1 — RLS UPDATE policy change breaks edit if done in wrong order
The currently proposed edit feature (Enhancement 10) will silently fail for any admin trying to edit a record they did not create, because the current RLS UPDATE policy enforces `created_by_admin_id = auth.uid()`. The RLS migration (Enhancement 19) **must be applied before or simultaneously** with deploying the edit UI.

### Risk 2 — Source filter column alignment may expose hidden mismatches
If there are existing records in `legacy_ip_records` where `legacy_source` (top-level column) and `details.legacy_source` (JSONB) contain different values, changing the filter to read from the top-level column will change which records appear/disappear in filter results. A database audit query should be run before applying Enhancement 17:
```sql
SELECT id, title, legacy_source AS top_level, details->>'legacy_source' AS jsonb_source
FROM legacy_ip_records
WHERE legacy_source IS DISTINCT FROM (details->>'legacy_source');
```

### Risk 3 — Layout refactor on Add/Detail pages may break current document generation UX
The `LegacyRecordDetailPage` document generation section is deeply nested inside the current standalone layout. When refactoring the layout to match the dashboard card pattern (Enhancement 7), the section widths and card containment need to be carefully verified. Recommend treating this as a separate PR with visual regression testing.

### Risk 4 — SELECT RLS change may affect any future public-facing feature
Before restricting the `anyone_can_view_legacy_records` SELECT policy (Enhancement 18), confirm that no current or planned public page (e.g., a public IP search page) queries `legacy_ip_records` directly. The `PublicIPSearchPage` and `publicIPSearchService.ts` should be audited.

### Risk 5 — Orphaned modal removal requires grep verification
`AddLegacyRecordModal` and `LegacyRecordDetailModal` must be grep-checked for any dynamic imports, lazy loading, or usage from outside the `src/` tree (e.g., test files, Storybook if present) before removal.

---

## Safe Next Step Recommendation

**Start with Enhancement 17 (one-line source filter fix) and Enhancement 1 (spinner).** These are zero-risk changes that immediately improve data correctness and UI consistency.

Then, immediately address **Enhancement 9 (Delete with confirmation modal)** on both the list and detail pages — this is the most visible functional gap and follows an exact pattern already working in `AllRecordsPage.tsx`.

Follow with **Enhancement 10 (Edit form on detail page)** — but only after confirming or applying the RLS UPDATE policy migration (Enhancement 19).

Do **not** start the layout refactor (Enhancement 7) until Phase 1 and Phase 2 are complete and stable, as it carries the highest structural risk and offers only visual/consistency benefit, not functional gain.

All Phase 1 and Phase 2 work only modifies the three existing legacy-records page files. No new files, no route changes, no schema changes, and no changes to any shared component are required until Phase 3 cleanup.
