# CMS Slug Mismatch Fix - Line-by-Line Changes

**Quick Reference:** All files changed and exact line numbers

---

## File 1: `supabase/migrations/create_cms_tables.sql`

### Change 1: Page Insertion (Line 227)
```
BEFORE (Line 227):  'landing',
AFTER  (Line 227):  'home',
```

### Change 2: Page Title (Line 228)
```
BEFORE (Line 228):  'Landing Page',
AFTER  (Line 228):  'Home Page',
```

### Change 3: Page Comment (Line 228 context)
```
BEFORE: 'Main landing page for the IP Management System',
AFTER:  'Main home page for the IP Management System',
```

### Change 4: Variable Name Declaration (Line 233)
```
BEFORE (Line 233):  landing_page_id UUID;
AFTER  (Line 233):  home_page_id UUID;
```

### Change 5: Variable Assignment (Line 235)
```
BEFORE (Line 235):  SELECT id INTO landing_page_id FROM cms_pages WHERE slug = 'landing' LIMIT 1;
AFTER  (Line 235):  SELECT id INTO home_page_id FROM cms_pages WHERE slug = 'home' LIMIT 1;
```

### Change 6: IF Condition (Line 237)
```
BEFORE (Line 237):  IF landing_page_id IS NOT NULL THEN
AFTER  (Line 237):  IF home_page_id IS NOT NULL THEN
```

### Change 7: Hero Section INSERT (Line 242)
```
BEFORE (Line 242):    landing_page_id,
AFTER  (Line 242):    home_page_id,
```

### Change 8: Features Section INSERT (Line 260)
```
BEFORE (Line 260):    landing_page_id,
AFTER  (Line 260):    home_page_id,
```

### Change 9: Steps Section INSERT (Line 295)
```
BEFORE (Line 295):    landing_page_id,
AFTER  (Line 295):    home_page_id,
```

### Change 10: Categories Section INSERT (Line 321)
```
BEFORE (Line 321):    landing_page_id,
AFTER  (Line 321):    home_page_id,
```

**Total Changes in File 1:** 10 replacements across 8 unique lines

---

## File 2: `CORRECTED_CMS_TABLES_MIGRATION.sql`

**Exact Same Changes As Above (File 1), but at slightly different line numbers:**

### Change 1: Page Insertion (Line 217)
```
BEFORE (Line 217):  'landing',
AFTER  (Line 217):  'home',
```

### Change 2: Page Title (Line 218)
```
BEFORE (Line 218):  'Landing Page',
AFTER  (Line 218):  'Home Page',
```

### Change 3: Page Comment (Line 218 context)
```
BEFORE: 'Main landing page for the IP Management System',
AFTER:  'Main home page for the IP Management System',
```

### Change 4: Variable Name Declaration (Line 223)
```
BEFORE (Line 223):  landing_page_id UUID;
AFTER  (Line 223):  home_page_id UUID;
```

### Change 5: Variable Assignment (Line 225)
```
BEFORE (Line 225):  SELECT id INTO landing_page_id FROM cms_pages WHERE slug = 'landing' LIMIT 1;
AFTER  (Line 225):  SELECT id INTO home_page_id FROM cms_pages WHERE slug = 'home' LIMIT 1;
```

### Change 6: IF Condition (Line 227)
```
BEFORE (Line 227):  IF landing_page_id IS NOT NULL THEN
AFTER  (Line 227):  IF home_page_id IS NOT NULL THEN
```

### Change 7: Hero Section INSERT (Line 232)
```
BEFORE (Line 232):    landing_page_id,
AFTER  (Line 232):    home_page_id,
```

### Change 8: Features Section INSERT (Line 250)
```
BEFORE (Line 250):    landing_page_id,
AFTER  (Line 250):    home_page_id,
```

### Change 9: Steps Section INSERT (Line 285)
```
BEFORE (Line 285):    landing_page_id,
AFTER  (Line 285):    home_page_id,
```

### Change 10: Categories Section INSERT (Line 311)
```
BEFORE (Line 311):    landing_page_id,
AFTER  (Line 311):    home_page_id,
```

**Total Changes in File 2:** 10 replacements across 8 unique lines (same pattern as File 1)

---

## File 3: `src/constants/cmsConstants.ts` (NEW FILE)

**Type:** New TypeScript file (created from scratch)  
**Lines:** 1-200+  
**Content:** See CMS_SLUG_MISMATCH_FIX.md for full content

### Key Sections Created:
1. **Lines 1-20:** File header and documentation
2. **Lines 23-33:** CMS_PAGES constant with HOME: 'home'
3. **Lines 35-48:** CMS_SECTION_TYPES constant with all 8 types
4. **Lines 50-65:** CMS_ROUTES constant with navigation functions
5. **Lines 67-80:** TypeScript type definitions (PageSlug, SectionType)
6. **Lines 82-100:** Validation helper functions
7. **Lines 102-110:** Default constants
8. **Lines 112-150:** Comprehensive migration guide comments

**Total New Code:** ~200 lines

---

## Summary of Changes

| File | Type | Lines Modified | Changes | New Lines |
|------|------|---|---------|----------|
| create_cms_tables.sql | Modified | 227-237, 242, 260, 295, 321 | 10 replacements | 0 |
| CORRECTED_CMS_TABLES_MIGRATION.sql | Modified | 217-227, 232, 250, 285, 311 | 10 replacements | 0 |
| cmsConstants.ts | NEW | All | N/A | 200+ |

**Total Impact:**
- 2 files modified: 20 total replacements (same pattern)
- 1 file created: 200+ lines of new code
- 3 files total changed
- 0 files deleted
- 0 breaking changes

---

## Verification Steps

### After Applying Changes:

**1. Check File 1:**
```bash
grep -n "home_page_id" supabase/migrations/create_cms_tables.sql | head -10
# Should show 5 occurrences (line 233, 235, 237, and 4 in section INSERTs)
```

**2. Check File 2:**
```bash
grep -n "home_page_id" CORRECTED_CMS_TABLES_MIGRATION.sql | head -10
# Should show 5 occurrences (same pattern)
```

**3. Check File 3:**
```bash
ls -la src/constants/cmsConstants.ts
# Should exist and be ~6-10 KB
```

**4. Verify No 'landing' Remains:**
```bash
grep -r "'landing'" supabase/migrations/ --include="*.sql"
# Should return: (empty - no results)
```

**5. Verify 'home' is Used:**
```bash
grep -r "CMS_PAGES.HOME\|'home'" src/ --include="*.ts" --include="*.tsx"
# Should show references in cmsConstants.ts
```

---

## Deployment Checklist

- [ ] All 3 files checked into git
- [ ] Both SQL migration files have identical slug changes
- [ ] cmsConstants.ts file exists at `src/constants/cmsConstants.ts`
- [ ] No syntax errors in TypeScript file
- [ ] No 'landing' slug references remain in migrations
- [ ] All 'home' references are consistent
- [ ] Migration tested in dev environment
- [ ] Frontend LandingPage loads with CMS content
- [ ] Code compiles without errors
- [ ] Ready for production deployment

---

## If Something Goes Wrong

### Issue: Can't Find Modified Lines
**Solution:** Search for 'landing' to find all occurrences:
```bash
grep -n "'landing'" supabase/migrations/create_cms_tables.sql
grep -n "landing_page_id" supabase/migrations/create_cms_tables.sql
```

### Issue: Changes Already Applied
**Solution:** Verify they worked:
```bash
grep -n "'home'" supabase/migrations/create_cms_tables.sql
# Should show: 'home' slug in pages table creation
```

### Issue: TypeScript File Won't Compile
**Solution:** Check for syntax errors:
```bash
npx tsc --noEmit src/constants/cmsConstants.ts
```

### Issue: Database Still Has 'landing' Slug
**Solution:** Manual update (if needed):
```sql
UPDATE cms_pages SET slug = 'home' WHERE slug = 'landing';
```

---

## Change Statistics

- **Total Files Modified:** 2
- **Total Files Created:** 1
- **Total Lines Changed:** ~20 (in migration files)
- **Total Lines Added:** ~200 (in constants file)
- **Breakingchanges:** 0
- **Risk Level:** LOW (migrations use ON CONFLICT DO NOTHING)

