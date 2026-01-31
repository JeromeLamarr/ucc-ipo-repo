# CMS Section Grid Positioning - Quick Reference
**Date:** January 31, 2026  
**Purpose:** Fast lookup for section layout properties

---

## Basic Syntax

Add `layout` object to any section's `content`:

```json
{
  "headline": "Section Title",
  "other_fields": "...",
  "layout": {
    "col_span": 2,
    "row_span": 1,
    "align_self": "self-center",
    "justify_self": "justify-self-center"
  }
}
```

---

## Properties at a Glance

| Property | Type | Values | Default | Example |
|----------|------|--------|---------|---------|
| `col_span` | Number | 1, 2, 3, 4, 6, 12 | 12 (full) | `2` = 2 columns |
| `row_span` | Number | 1, 2, 3... | Not set | `2` = 2 rows |
| `align_self` | String | self-start, self-center, self-end, self-stretch, self-auto | Not set | `"self-center"` |
| `justify_self` | String | justify-self-start, justify-self-center, justify-self-end, justify-self-stretch, justify-self-auto | Not set | `"justify-self-center"` |

---

## Common Patterns

### Full Width (Default)
```json
{
  "layout": {
    "col_span": 12
  }
}
```
Or omit layout entirely - automatically full width.

---

### Half Width
```json
{
  "layout": {
    "col_span": 6
  }
}
```

---

### Two-Column Layout (2 sections per row)
**Section A:**
```json
{
  "layout": {
    "col_span": 6
  }
}
```
**Section B:**
```json
{
  "layout": {
    "col_span": 6
  }
}
```

---

### Three-Column Layout (3 sections per row)
**Section A:**
```json
{
  "layout": {
    "col_span": 4
  }
}
```
**Section B:**
```json
{
  "layout": {
    "col_span": 4
  }
}
```
**Section C:**
```json
{
  "layout": {
    "col_span": 4
  }
}
```

---

### Four-Column Layout (4 sections per row)
**Each Section:**
```json
{
  "layout": {
    "col_span": 3
  }
}
```

---

### Sidebar + Main Content (1:2)
**Sidebar:**
```json
{
  "layout": {
    "col_span": 4
  }
}
```
**Main:**
```json
{
  "layout": {
    "col_span": 8
  }
}
```

---

### 2:1 Sidebar (1:3:1)
**Left (1/6):**
```json
{
  "layout": {
    "col_span": 2
  }
}
```
**Main (3/6):**
```json
{
  "layout": {
    "col_span": 6
  }
}
```
**Right (1/6):**
```json
{
  "layout": {
    "col_span": 2
  }
}
```

---

### Centered Content
```json
{
  "layout": {
    "col_span": 6,
    "justify_self": "justify-self-center"
  }
}
```

---

### Tall Section (Spans 2 Rows)
```json
{
  "layout": {
    "col_span": 4,
    "row_span": 2,
    "align_self": "self-center"
  }
}
```

---

## Tailwind Classes Generated

| Layout Property | Tailwind Class |
|-----------------|----------------|
| `"col_span": 1` | `col-span-1` |
| `"col_span": 2` | `col-span-2` |
| `"col_span": 3` | `col-span-3` |
| `"col_span": 4` | `col-span-4` |
| `"col_span": 6` | `col-span-6` |
| `"col_span": 12` | `col-span-12` |
| `"row_span": 2` | `row-span-2` |
| `"row_span": 3` | `row-span-3` |
| `"align_self": "self-start"` | `self-start` |
| `"align_self": "self-center"` | `self-center` |
| `"align_self": "self-end"` | `self-end` |
| `"justify_self": "justify-self-start"` | `justify-self-start` |
| `"justify_self": "justify-self-center"` | `justify-self-center` |
| `"justify_self": "justify-self-end"` | `justify-self-end` |

---

## Real-World Examples

### Landing Page Layout
```json
// Section 1: Hero (full width)
{ "layout": { "col_span": 12 } }

// Section 2: Features (3 columns)
{ "layout": { "col_span": 4 } }
{ "layout": { "col_span": 4 } }
{ "layout": { "col_span": 4 } }

// Section 3: CTA (full width)
{ "layout": { "col_span": 12 } }
```

---

### Services Page Layout
```json
// Section 1: Hero
{ "layout": { "col_span": 12 } }

// Section 2: Sidebar + Content
{ "layout": { "col_span": 3 } }   // Left sidebar
{ "layout": { "col_span": 9 } }   // Main content

// Section 3: Services Grid (3 columns)
{ "layout": { "col_span": 4 } }
{ "layout": { "col_span": 4 } }
{ "layout": { "col_span": 4 } }
```

---

### Portfolio Layout
```json
// Section 1: Header
{ "layout": { "col_span": 12 } }

// Section 2: Featured (Large)
{ "layout": { "col_span": 6, "row_span": 2 } }

// Section 3: Small items
{ "layout": { "col_span": 3 } }
{ "layout": { "col_span": 3 } }
{ "layout": { "col_span": 3 } }
{ "layout": { "col_span": 3 } }
```

---

## Page Requirements

### To Use Section Grid Positioning:

1. **Enable Page-Level Grid:**
```json
{
  "grid": {
    "enabled": true,
    "columns": 12,
    "gap": "gap-6",
    "max_width": "max-w-7xl"
  }
}
```

2. **Add Layout to Sections:**
```json
{
  "layout": {
    "col_span": 4
  }
}
```

### Without Page-Level Grid:
- Section layout values are ignored
- All sections stack vertically (graceful degradation)
- Existing behavior preserved (backward compatible)

---

## Validation Rules

### col_span Rules
- Must be a **number**
- Range: **1-12**
- ✅ Valid: 1, 2, 3, 4, 6, 12
- ❌ Invalid: 0, "2", 24, -1

### row_span Rules
- Must be a **number**
- Value: **1 or greater**
- ✅ Valid: 1, 2, 3, 5, 10
- ❌ Invalid: 0, "2", -1

### align_self Rules
- Must be a **string**
- Must match exact value
- ✅ Valid: "self-start", "self-center", "self-end"
- ❌ Invalid: "center" (use "self-center"), "top" (use "self-start")

### justify_self Rules
- Must be a **string**
- Must match exact value
- ✅ Valid: "justify-self-start", "justify-self-center"
- ❌ Invalid: "center" (use "justify-self-center"), "right"

---

## Quick Troubleshooting

**Q: Layout not working?**
- Check page-level grid is enabled
- Verify col_span is a number (not string)
- Ensure values are valid (1-12 for col_span)

**Q: Sections overlapping?**
- Total col_span per row must not exceed 12
- Example: col-span-6 + col-span-6 = 12 ✅

**Q: Alignment not visible?**
- Only works when section is smaller than grid cell
- Use col_span < page grid columns
- Example: col-span-4 in 12-column grid ✅

**Q: Mobile looks wrong?**
- Grid positioning applies at all sizes
- Consider page-level grid for mobile responsiveness
- Alternatively, use col-span-12 for mobile stacking

---

## Copy-Paste Templates

### 1. Full Width Section
```json
{
  "layout": {
    "col_span": 12
  }
}
```

### 2. Two Equal Columns
```json
{
  "layout": {
    "col_span": 6
  }
}
```

### 3. Three Equal Columns
```json
{
  "layout": {
    "col_span": 4
  }
}
```

### 4. Sidebar + Main (1:2)
```json
{
  "layout": {
    "col_span": 4
  }
}
```
and
```json
{
  "layout": {
    "col_span": 8
  }
}
```

### 5. Centered Half-Width
```json
{
  "layout": {
    "col_span": 6,
    "justify_self": "justify-self-center"
  }
}
```

### 6. Tall Section (Multi-Row)
```json
{
  "layout": {
    "col_span": 4,
    "row_span": 2,
    "align_self": "self-center"
  }
}
```

---

**For Full Documentation:** See [CMS_SECTION_GRID_POSITIONING.md](CMS_SECTION_GRID_POSITIONING.md)

**Last Updated:** January 31, 2026  
**Status:** Ready to use
