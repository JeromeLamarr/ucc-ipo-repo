# CMS Deep-Dive & Branding Comparison Report

> Generated: March 4, 2026 — Read-only analysis, no code changes.

---

## A) CMS Routes & UI Components

### Admin Entry Points (all require `role = 'admin'`, inside `DashboardLayout`)

| Route | Component | File | Purpose |
|---|---|---|---|
| `/dashboard/public-pages` | `PublicPagesManagement` | `src/pages/PublicPagesManagement.tsx` | List, create, delete, publish/unpublish pages |
| `/dashboard/public-pages/:pageId` | `PageSectionsManagement` | `src/pages/PageSectionsManagement.tsx` | Add/edit/delete/reorder sections via `CMSSectionEditor` modal |
| `/dashboard/public-pages/:slug/edit` | `CMSPageEditor` | `src/pages/CMSPageEditor.tsx` | Alternative full-page section editor by slug |

Dashboard nav label: **"Public Pages"** with `Globe` icon — shown only to `admin` role (`src/components/DashboardLayout.tsx` L74-L78).

### Actions available in `PublicPagesManagement`
- **Create** page: title + slug input, with optional pre-built template from `pageTemplates.ts`
- **Publish / Unpublish**: toggle `is_published`, with pre-publish validation via `canPublishPage()` from `sectionValidation.ts`
- **Delete**: deletes page + cascades to all its sections (`ON DELETE CASCADE`)
- **Navigate to editor**: goes to `/dashboard/public-pages/:pageId`
- **Search**: client-side filter by title or slug

### App startup
`App.tsx` (line 104) calls `ensureHomeCMSPageExists()` from `src/lib/cmsSetup.ts` on every app load. This auto-creates the `home` page with default sections if missing.

---

## B) CMS Data Model (Supabase Tables)

> `cms_pages` and `cms_sections` are **not in `database.types.ts`**. All queries use `as any` casts. This is a type safety gap — TypeScript provides zero compile-time checking for CMS operations.

### Table: `cms_pages`

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` PK | Auto-generated ID |
| `slug` | `VARCHAR(255)` UNIQUE | URL segment — maps to public URL `/pages/:slug` |
| `title` | `VARCHAR(255)` | Page title (admin UI only; never set as `document.title` publicly) |
| `description` | `TEXT` | Exists in schema, **never surfaced in public render or admin form** |
| `is_published` | `BOOLEAN` | `true` = publicly visible; `false` = draft |
| `created_at`, `updated_at` | `timestamptz` | Timestamps |
| `created_by` | `UUID → auth.users` | Admin creator reference |
| `layout` | `JSONB` (optional) | Grid layout config added via a separate migration (not in original schema) |

### Table: `cms_sections`

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` PK | Auto-generated |
| `page_id` | `UUID → cms_pages` | Parent page (CASCADE delete) |
| `section_type` | `VARCHAR(50)` | CHECK IN: `hero`, `features`, `steps`, `categories`, `text-section`, `showcase`, `cta`, `gallery` |
| `content` | `JSONB` | Flexible per-section config (see section schemas below) |
| `order_index` | `INTEGER` | Display order (0-indexed) |
| `created_at`, `updated_at` | `timestamptz` | Timestamps |

### Content schemas per section type (key fields in `content` JSONB)
- **hero**: `headline`, `headline_highlight`, `subheadline`, `cta_text`, `cta_link`
- **features**: `features[]` (title, description, icon_bg_color, icon_color)
- **showcase**: `title`, `items[]` (title, description, image_url, image_width/height/position)
- **steps**: `steps[]` (title, description)
- **categories**: `categories[]` (name, description)
- **cta**: `heading`, `description`, `button_text`, `button_link`
- **gallery**: `title`, `images[]`
- **text-section**: `section_title`, `body_content`, `text_alignment`, `max_width`, `background_style`, `show_divider`, plus 7 style preset fields

### Publish / Unpublish mechanism
- A simple boolean toggle on `is_published`
- When publishing: `canPublishPage()` (from `sectionValidation.ts`) validates sections client-side first
- When unpublishing: no validation, direct update
- Both happen via `supabase.from('cms_pages').update({ is_published: !current })`
- **This is frontend-only validation** — can be bypassed via direct DB write

### RLS policies
```
cms_pages SELECT:     WHERE is_published = true         (public, drafts hidden)
cms_pages INSERT/UPDATE/DELETE: is_admin()
cms_sections SELECT:  WHERE parent cms_page.is_published = true
cms_sections INSERT/UPDATE/DELETE: is_admin()
```
`is_admin()` function: `SELECT role FROM users WHERE auth_user_id = auth.uid()`.

> **Inconsistency**: Footer table policies use `public.users WHERE id = auth.uid()`, but CMS uses `users WHERE auth_user_id = auth.uid()`. Two different admin check patterns coexist.

### Special `home` slug
- Auto-created on app startup via `cmsSetup.ts`
- `LandingPage` fetches it directly (not via `/pages/home` route)
- `PublicNavigation` explicitly excludes `slug = 'home'` from nav links

---

## C) Fetch / Save Data Flow

**There are no hooks (`usePages`, `useCMS`) and no service files for CMS.** All Supabase calls are inline inside component `useEffect`s and event handlers.

### Fetch flow (public renderer)
```
URL /pages/:slug
  → CMSPageRenderer mounts
  → useEffect → fetchPageData()
    → supabase.from('cms_pages').select('*').eq('slug', slug).eq('is_published', true)
    → supabase.from('cms_sections').select('*').eq('page_id', ...).order('order_index')
    → supabase.from('site_settings').select('*').eq('id', 1)   ← also fetches branding
  → Render sections
```

### Fetch flow (home `/`)
```
LandingPage mounts
  → useEffect → fetchHomePage()
    → supabase.from('cms_pages').select('id').eq('slug','home').eq('is_published',true)
    → supabase.from('cms_sections').select('*').eq('page_id', ...).order('order_index')
  → If no page or no sections → DefaultLandingPage (hardcoded React)
  → Else → render CMS sections
```

### Save flow (admin editor)
```
Admin clicks section type → handleAddSection()
  → supabase.from('cms_sections').insert([{page_id, section_type, content, order_index}])

Admin edits content → handleUpdateSectionContent()
  → supabase.from('cms_sections').update({ content: newContent }).eq('id', sectionId)

Admin reorders → handleMoveSection()
  → Promise.all([ supabase...update(order_index)×2 ])

Admin deletes section → handleDeleteSection()
  → supabase.from('cms_sections').delete().eq('id', sectionId)
  → then reorders remaining
```

### Caching / Realtime
- **No Supabase realtime subscriptions** for CMS
- **No polling**
- Changes visible only on page reload
- No optimistic updates
- Compare to Footer (branding system): uses Supabase realtime channel (`subscribeToFooterChanges`)

---

## D) Public Rendering Flow

### Route → Renderer → Layout

```
/pages/:slug
  └─ CMSPageRenderer (src/pages/CMSPageRenderer.tsx)
       ├─ PublicNavigation (fixed top navbar)
       ├─ Sections loop → SectionRenderer → per-type component
       └─ Footer

/ (home)
  └─ LandingPage (src/pages/LandingPage.tsx)
       ├─ PublicNavigation
       ├─ If CMS home available: sections loop → renderSection()
       │    Otherwise: DefaultLandingPage (hardcoded hero + features)
       └─ Footer
```

### How content is interpreted

| Section type | Rendering | Sanitization |
|---|---|---|
| hero, features, steps, categories, cta, gallery, showcase | Plain JSX — values interpolated as React children or props | No HTML involved; safe by default |
| **text-section** (`body_content`) | Split by `\n\n` into `<p>` tags — **plain text only** | N/A (no HTML rendered) |

**Key finding**: `CMSPageRenderer.tsx` imports `DOMPurify` at line 5 but **never calls it**. The `TextSectionRenderer` inside it renders `body_content` as plain text via `paragraph.split('\n\n')` — no `dangerouslySetInnerHTML`.

`TextSectionEnhanced.tsx` (line 421) does use `dangerouslySetInnerHTML` with proper `DOMPurify.sanitize()`, but it is used only inside the admin `CMSSectionEditor` modal — not in the public renderer.

`RichTextEditor.tsx` (lines 132 and 228) uses `dangerouslySetInnerHTML` **without sanitization** for its editor preview, but this is admin-only.

### SEO / document.title
- **Neither `document.title` nor any `<meta>` tags are set** in `CMSPageRenderer` — the browser tab shows whatever the app's default HTML `<title>` is, regardless of CMS page title.
- `page.description` column exists in the DB schema but is never used anywhere in the public render.
- `LandingPage` also sets no `document.title`.

### Layout wrappers
All CMS-driven public pages share: `PublicNavigation` (top) + `Footer` (bottom). No page-specific layout variations.

---

## E) CMS vs Branding Capability Matrix

| Capability | Branding (`site_settings`) | CMS (`cms_pages` / `cms_sections`) | Overlap / Notes |
|---|---|---|---|
| Site name | ✅ `site_name` | ❌ | Read by PublicNavigation via `useBranding()` |
| Logo | ✅ `logo_url` | ❌ | |
| Primary color | ✅ `primary_color` | ❌ | CMS renders pull it from `site_settings` directly |
| Secondary color | ✅ `secondary_color` | ❌ | |
| Gradient style | ✅ `gradient_style` | ❌ | |
| Favicon | ✅ `favicon_url` | ❌ | |
| Hero text/headline | ❌ | ✅ `hero` section `headline*` | |
| Hero CTA button | ❌ | ✅ `cta_text`, `cta_link` | |
| Feature grid | ❌ | ✅ `features` section | |
| Steps/Process | ❌ | ✅ `steps` section | |
| Categories list | ❌ | ✅ `categories` section | |
| Text/editorial content | ❌ | ✅ `text-section` | Plain text (no HTML) |
| Image gallery | ❌ | ✅ `gallery` section | |
| Showcase items | ❌ | ✅ `showcase` section | Not rendered in LandingPage — silent null! |
| Additional public pages | ❌ | ✅ Any `/pages/:slug` | |
| Navbar links | Indirect (site_name + logo) | ✅ Published non-home pages auto-appear in `PublicNavigation` | CMS page list controls navbar items |
| Footer about/contact | ✅ `site_footer_settings` | ❌ | Branding system, not CMS |
| Footer quick/support links | ✅ `site_footer_links` | ❌ | Branding system, not CMS |
| Page-level SEO title | ❌ | ❌ (field exists but never used) | **Gap in both systems** |
| Page meta description | ❌ | ❌ (`description` column unused) | **Gap** |
| Page URL slug | ❌ | ✅ admin-defined on creation | |
| Page publish/draft | ❌ | ✅ `is_published` toggle | |

### Cross-system interaction

- **If branding changes `site_name`/`logo`/`primary_color`**: reflected immediately in `PublicNavigation` (via `useBranding()`), and in CMS-rendered pages because `CMSPageRenderer` fetches `site_settings` directly on load. CMS does NOT override branding.
- **If CMS edits `home` content**: changes appear directly on `/` (LandingPage), not via `/pages/home`. The home slug is special-cased.
- **If all home CMS sections are deleted** or home page is unpublished: `LandingPage` falls back to `DefaultLandingPage` (the hardcoded React hero). Branding colors/name still show there.

### Hardcoded React vs CMS-driven

| Page | Type |
|---|---|
| `/login`, `/register`, `/forgot-password` | Hardcoded React |
| `/pending-approval`, `/verify/:id`, `/verify-disclosure/:id` | Hardcoded React |
| All `/dashboard/*` pages | Hardcoded React |
| `/` (home) | **Hybrid** — CMS-driven if home page published with sections; else hardcoded fallback |
| `/pages/:slug` (any other page) | CMS-driven (`CMSPageRenderer`) |

---

## F) Risks / Limitations Found

1. **No TypeScript types for CMS tables**: `cms_pages` and `cms_sections` are absent from `src/lib/database.types.ts`. The code uses `as any` everywhere. Rename a column in DB and nothing will catch it at compile time.

2. **Dead `DOMPurify` import**: `CMSPageRenderer.tsx` line 5 imports DOMPurify but never uses it. Text-section body is rendered as plain text (not rich HTML), so the import is misleading.

3. **No SEO on CMS pages**: `CMSPageRenderer` never sets `document.title` or any `<meta>` tags. The `page.description` column in `cms_pages` is populated in the DB but never read for public output.

4. **Admin RLS inconsistency**: CMS tables use `is_admin()` (checks `users.auth_user_id = auth.uid()`), but footer tables use `public.users WHERE id = auth.uid()`. Same database, two different admin check patterns — error-prone to maintain.

5. **Frontend-only publish validation**: `canPublishPage()` runs in the browser before publishing. A direct `UPDATE cms_pages SET is_published=true` bypasses it. No DB-level constraint enforces section requirements.

6. **RichTextEditor preview is unsanitized**: `RichTextEditor.tsx` lines 132 and 228 render stored HTML directly via `dangerouslySetInnerHTML` without `DOMPurify`. Admin-only, but stored XSS still possible if an attacker can write to the DB.

7. **`showcase` section not rendered on home page**: `CMSPageEditor` offers the `showcase` section type, and the editor can add it to the home page, but `LandingPage.tsx`'s `renderSection()` has no `case 'showcase'` — it silently returns `null` on the home route. It renders fine only on `/pages/:slug` routes.

8. **`page.description` is a dead column**: Created in the migration schema, never surfaced in admin create/edit UI, never used for SEO, never shown anywhere — purely unused DB column.

9. **No realtime for CMS**: Branding/footer have Supabase realtime channels. CMS changes (section edits, publish toggles) need a full page reload to appear publicly.

10. **Home page CMS controls the public navbar link list**: `PublicNavigation` queries `cms_pages WHERE is_published=true AND slug != 'home'`. Any published CMS page automatically appears as a nav link — there is no separate navbar management UI.

---

## G) Suggested Upgrade Targets (read-only recommendations)

1. **Add `cms_pages` + `cms_sections` to `database.types.ts`** — use the schema from `CORRECTED_CMS_TABLES_MIGRATION.sql` as the source of truth. Remove all `as any` casts.

2. **Set `document.title` and `<meta name="description">`** in `CMSPageRenderer` using `page.title` and `page.description`. Expose `description` in the admin create form.

3. **Standardize RLS admin check** across all tables to a single pattern. Either adopt `is_admin()` (which uses `auth_user_id`) for footer tables, or adopt the `WHERE id = auth.uid()` pattern for CMS tables — not both.

4. **Remove the dead `DOMPurify` import** from `CMSPageRenderer.tsx` — or actually use it if rich HTML in text-sections is ever desired.

5. **Add `showcase` case to LandingPage's `renderSection()`** so showcase sections on the home page render instead of silently disappearing.

6. **Sanitize the `RichTextEditor` preview pane** — wrap its `dangerouslySetInnerHTML` with `DOMPurify.sanitize()`, matching what `TextSectionEnhanced.tsx` already does.

7. **Add a navbar order/visibility management UI** — currently all published pages auto-inject into the navbar with no ordering control beyond CMS page creation date.

8. **Add Supabase realtime subscription to `LandingPage`** (matching the footer system) so home page section changes reflect live without reload.
