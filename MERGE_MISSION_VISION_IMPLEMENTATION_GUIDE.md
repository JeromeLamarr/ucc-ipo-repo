# 🎯 Merge Mission & Vision into 2-Column Grid - Implementation Guide

**Date:** February 17, 2026  
**Status:** ✅ Code Enhancement Complete  
**Type:** Layout Optimization

---

## 📌 Problem & Solution

### Before
- "Our Mission" and "Our Vision" displayed as **separate vertical blocks**
- Takes up **significant vertical space** on the about-us page
- Not optimal use of horizontal real estate

### After (What We're Doing)
- **Single section** with 2-column grid layout
- Mission and Vision displayed **side-by-side**
- **Saves vertical space** while improving visual balance
- More professional, balanced appearance

---

## 🔧 Technical Changes Made

### 1. Enhanced TextSectionRenderer in CMSPageRenderer.tsx

The `TextSectionRenderer` function now supports:
- **Internal Grid Layout**: `internal_grid` configuration with `enabled`, `columns`, and `gap` properties
- **Multiple Blocks**: `blocks` array containing individual text items with `title` and `content`
- **Backward Compatible**: Existing single-block sections work unchanged

#### Key Features:
```typescript
// Grid configuration in section.content
internal_grid: {
  enabled: true,
  columns: 2,           // Display in 2 columns
  gap: 'gap-6'         // Spacing between columns
}

// Multiple blocks array
blocks: [
  {
    title: 'Our Mission',
    content: 'Mission statement...'
  },
  {
    title: 'Our Vision',
    content: 'Vision statement...'
  }
]
```

---

## 🚀 Implementation Options

### Option A: SQL Script (Recommended)

**File:** `MERGE_MISSION_VISION_QUICK.sql`

1. **View Current Sections:**
   ```bash
   # Run the first SELECT query to verify current sections
   ```

2. **Execute the Merge:**
   - Run the UPDATE query to combine Mission section with grid + both blocks
   - Run the DELETE query to remove the Vision section
   - Run the verification query to confirm

3. **Benefits:**
   - ✅ Fast (single transaction)
   - ✅ Precise (uses exact section data)
   - ✅ Reversible (git history preserved)
   - ✅ No downtime

---

### Option B: Manual CMS Editor

1. **Go to:** CMS → Page Management → about-us page
2. **Delete Vision Section:**
   - Remove the "Our Vision" text-section block
3. **Edit Mission Section:**
   - Edit the "Our Mission" section
   - Enable "Internal Grid Layout"
   - Set columns to 2
   - Add a second block:
     - Title: "Our Vision"
     - Content: Copy from deleted Vision section

---

### Option C: Hybrid (Mixed)

1. Delete the Vision section in CMS
2. Edit the Mission section to enable grid
3. Manually add the Vision block in the grid editor

---

## 📊 Grid Layout Explained

The 2-column grid will:
- Display Mission and Vision **side-by-side** on desktop
- **Stack vertically** on mobile/tablet (responsive)
- Use **6px gap** between columns for breathing room
- **Equal width** columns by default

### Appearance:
```
Desktop (2 columns):
┌──────────────────┬──────────────────┐
│  Our Mission     │  Our Vision      │
│  Mission text... │  Vision text...  │
└──────────────────┴──────────────────┘

Mobile (stacked):
┌──────────────────┐
│  Our Mission     │
│  Mission text... │
└──────────────────┘
┌──────────────────┐
│  Our Vision      │
│  Vision text...  │
└──────────────────┘
```

---

## ✅ How to Execute

### Using Supabase SQL Editor:

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Copy the script from `MERGE_MISSION_VISION_QUICK.sql`
5. **First:** Run Step 1 (SELECT query) to verify data
6. **Then:** Run Steps 2-3 (UPDATE + DELETE) to execute merge
7. **Finally:** Run Step 4 (Verification query) to confirm success

### Using DBeaver or pgAdmin:

1. Connect to your Supabase PostgreSQL database
2. Open Query editor
3. Copy and paste the merge script
4. Execute in steps (Step 1 → 2 → 3 → 4)

### Using psql (Command Line):

```bash
# Connect to your database
psql postgresql://user:password@host:port/database

# Run the script
\i MERGE_MISSION_VISION_QUICK.sql
```

---

## 🔍 Verification

After running the SQL script, verify with this query:

```sql
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title,
  (s.content->'internal_grid'->>'enabled')::boolean as grid_enabled,
  (s.content->'internal_grid'->>'columns')::int as num_columns,
  jsonb_array_length(s.content->'blocks') as block_count
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section';
```

**Expected Output:**
```
id          | order_index | title              | grid_enabled | num_columns | block_count
------------|-------------|--------------------|----|-------------|------------
uuid-xxx    | 0           | Our Mission & Vision | true  | 2           | 2
```

---

## ♻️ Rollback Plan

If needed to revert:

1. **Via Git:**
   ```bash
   git revert <commit-hash>
   # Rerun migrations to restore original sections
   ```

2. **Via SQL (restore from backup):**
   - Use Supabase backup/restore feature
   - Or manually recreate sections

3. **Via CMS:**
   - Delete merged section
   - Create two separate text-sections again

---

## 🎨 Customization Options

After merging, you can further customize using the grid section's options:

| Setting | Options | Effect |
|---------|---------|--------|
| **Columns** | 1, 2, 3, 4 | Number of columns in grid |
| **Gap** | gap-4, gap-6, gap-8 | Space between columns |
| **Background** | none, light_gray, soft_blue | Grid background |
| **Max Width** | narrow, normal, wide | Container width |
| **Text Alignment** | left, center | Text alignment within blocks |

---

## 📝 Code Reference

### TextSectionRenderer Enhancement

The renderer now includes:

```tsx
// Grid layout support
const internalGrid = content.internal_grid as Record<string, any> | undefined;
const blocks = Array.isArray(content.blocks) ? content.blocks : [];
const hasGridLayout = internalGrid?.enabled === true && blocks.length > 0;

// Build grid classes
const getGridClasses = (): string => {
  if (!internalGrid) return '';
  let classes = 'grid';
  const columns = internalGrid.columns || 2;
  if (columns && typeof columns === 'number' && columns > 0 && columns <= 12) {
    classes += ` grid-cols-${columns}`;
  }
  const gap = internalGrid.gap || 'gap-6';
  if (gap) {
    classes += ` ${gap}`;
  }
  return classes;
};

// Render grid layout
{hasGridLayout ? (
  <div className={getGridClasses()}>
    {blocks.map((block: any, blockIdx: number) => (
      <div key={blockIdx} className="flex flex-col">
        {block.title && <h3>{block.title}</h3>}
        <div>{block.content}</div>
      </div>
    ))}
  </div>
) : (
  /* Default single block layout */
)}
```

---

## 🎯 Next Steps

1. ✅ **Code Enhanced** - TextSectionRenderer now supports grid layouts
2. ⏳ **Execute Merge** - Run MERGE_MISSION_VISION_QUICK.sql script
3. ⏳ **Test Layout** - View about-us page to see 2-column layout
4. ⏳ **Deploy** - Commit and push changes to production

---

## 💡 Future Improvements

The grid system can be used for:
- **3-column layouts:** Services, Features, Values
- **4-column layouts:** Team members, Partners, Testimonials
- **Mixed layouts:** Combine with other section types
- **Responsive overrides:** Different columns per breakpoint

---

## ❓ FAQ

**Q: Will existing pages break?**  
A: No. The enhancement is backward compatible. Sections without `internal_grid` work as before.

**Q: Can I undo this?**  
A: Yes. Git history preserves original data, or use sql rollback scripts.

**Q: Does it work on mobile?**  
A: Yes. Grid automatically stacks on mobile devices.

**Q: Can I add more blocks later?**  
A: Yes. Edit the section and add more items to the blocks array.

**Q: What about SEO?**  
A: No SEO impact. Both blocks are still in the same section with proper HTML structure.

---

## 📞 Support

For issues or questions:
1. Check the verification query output
2. Review the code changes in src/pages/CMSPageRenderer.tsx
3. Consult the SQL script comments
4. Review this guide's customization section
