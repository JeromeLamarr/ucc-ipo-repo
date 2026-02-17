# 🚀 Quick Start: Merge Mission & Vision Blocks

## What's Being Done

Your "Our Mission" and "Our Vision" sections are being **merged into a single 2-column grid** to save vertical space and improve layout.

---

## 3-Minute Setup

### Step 1: Open Supabase SQL Editor
```
1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "+ New Query"
```

### Step 2: Copy the Merge Script
Open and copy the full content from:
```
📄 MERGE_MISSION_VISION_QUICK.sql
```

### Step 3: Run Step-by-Step

**First, verify the data:**
```sql
-- Step 1: View current sections
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title,
  SUBSTRING(s.content->>'body_content', 1, 100) as preview
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section'
ORDER BY s.order_index;
```
✅ Should show: "Our Mission" and "Our Vision" sections

**Then execute the merge:**
```sql
-- Step 2: Merge the sections
UPDATE cms_sections
SET content = jsonb_build_object(
  'section_title', 'Our Mission & Vision',
  'text_alignment', 'left',
  'max_width', 'normal',
  'background_style', 'none',
  'show_divider', false,
  'internal_grid', jsonb_build_object(
    'enabled', true,
    'columns', 2,
    'gap', 'gap-6'
  ),
  'blocks', jsonb_build_array(
    jsonb_build_object(
      'title', 'Our Mission',
      'content', 'Our mission is to empower organizations and communities by providing reliable digital platforms, structured processes, and accessible tools that promote accountability, growth, and sustainable development.'
    ),
    jsonb_build_object(
      'title', 'Our Vision',
      'content', 'We envision a future where institutions, investors, and the public are connected through transparent systems that foster trust, innovation, and long term value.'
    )
  )
)
WHERE id IN (
  SELECT s.id
  FROM cms_sections s
  JOIN cms_pages p ON s.page_id = p.id
  WHERE p.slug = 'about-us'
    AND s.section_type = 'text-section'
    AND s.order_index = (
      SELECT MIN(order_index)
      FROM cms_sections s2
      JOIN cms_pages p2 ON s2.page_id = p2.id
      WHERE p2.slug = 'about-us'
        AND s2.section_type = 'text-section'
    )
);
```

**Remove the old Vision section:**
```sql
-- Step 3: Delete Vision (now merged)
DELETE FROM cms_sections
WHERE id IN (
  SELECT s.id
  FROM cms_sections s
  JOIN cms_pages p ON s.page_id = p.id
  WHERE p.slug = 'about-us'
    AND s.section_type = 'text-section'
    AND s.order_index = (
      SELECT MAX(order_index)
      FROM cms_sections s2
      JOIN cms_pages p2 ON s2.page_id = p2.id
      WHERE p2.slug = 'about-us'
        AND s2.section_type = 'text-section'
    )
);
```

**Verify success:**
```sql
-- Step 4: Verify
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title,
  (s.content->'internal_grid'->>'enabled')::boolean as has_grid,
  (s.content->'internal_grid'->>'columns')::int as columns,
  jsonb_array_length(s.content->'blocks') as blocks
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section'
ORDER BY s.order_index;
```
✅ Should show: 1 section with `has_grid=true`, `columns=2`, `blocks=2`

---

## Step 4: Test It

1. Go to your website: `ucc-ipo.com/pages/about-us` (or localhost)
2. Scroll to the About section
3. ✅ Should see **Mission and Vision side-by-side** on desktop
4. ✅ Should see **stacked** on mobile

---

## Review the Changes

### Files Modified:
- ✅ `src/pages/CMSPageRenderer.tsx` - Enhanced TextSectionRenderer with grid support

### Files Created:
- 📄 `MERGE_MISSION_VISION_QUICK.sql` - Database merge script
- 📄 `MERGE_MISSION_VISION_GRID.sql` - Detailed version with comments
- 📄 `MERGE_MISSION_VISION_IMPLEMENTATION_GUIDE.md` - Full documentation

---

## Issues? 

If the merge doesn't work:

1. **Check if section titles are different:**
   ```sql
   SELECT DISTINCT content->>'section_title' 
   FROM cms_sections 
   WHERE page_id = (SELECT id FROM cms_pages WHERE slug = 'about-us');
   ```
   Update the script if section titles differ.

2. **Check if pages/sections exist:**
   ```sql
   SELECT * FROM cms_pages WHERE slug LIKE '%about%';
   ```

3. **Revert if needed:**
   ```bash
   git revert <commit-hash>
   # Then recreate the sections manually
   ```

---

## What Happens Next?

- ✅ Mission & Vision merge into 1 section
- ✅ Layout changes from vertical to 2-column grid
- ✅ Saves vertical space on the page
- ✅ More balanced, professional appearance
- ✅ Still responsive (mobile: stacks, desktop: 2 columns)

**Time to implement:** 3 minutes  
**Time to take effect:** Immediate (on next page load)  
**Risk level:** Very Low (easily reversible)

---

**Ready? Run the SQL script now! 🚀**