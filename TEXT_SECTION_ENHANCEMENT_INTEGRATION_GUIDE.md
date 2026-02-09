# Text Section Enhancement - Integration Guide

## Overview

The enhanced text section system provides comprehensive typography, layout, and styling controls for users editing text content in the CMS. This guide explains how to integrate the new components.

---

## Files Created

### 1. **TextBlockFormEnhanced.tsx**
Location: `src/components/TextBlockFormEnhanced.tsx`

Enhanced editor component with:
- 5 tabbed interface (Content, Typography, Layout, Styling, Preview)
- Real-time live preview
- Font size, line height, letter spacing, and font weight controls
- Text alignment and container width options
- Column layout support (1, 2, or 3 columns)
- Color picker for text, headings, and background
- Mobile-responsive design

### 2. **TextSectionEnhanced.tsx**
Location: `src/components/TextSectionEnhanced.tsx`

Enhanced renderer component that:
- Applies all typography settings to rendered content
- Supports multi-column layouts
- Applies custom colors
- Generates dynamic CSS for styling
- Responsive design (columns collapse to single on mobile)
- Includes HTML markup helper functions

### 3. **TEXT_SECTION_ENHANCEMENT_ANALYSIS.md**
Location: `TEXT_SECTION_ENHANCEMENT_ANALYSIS.md`

Complete analysis document explaining:
- Current system limitations
- Proposed enhancements
- Technical approach
- Data model

---

## How to Integrate

### Option 1: Replace Existing Text Block Form (Recommended)

Replace the current `TextBlockForm` in `CMSSectionEditor.tsx` with the enhanced version:

```typescript
// In src/components/CMSSectionEditor.tsx

// OLD: Import TextBlockForm
import { TextBlockForm } from './TextBlockForm';

// NEW: Import enhanced version
import { TextBlockFormEnhanced } from './TextBlockFormEnhanced';

// In the component, replace:
{section.section_type === 'text' && (
  <TextBlockForm formData={formData} updateField={updateField} />
)}

// With:
{section.section_type === 'text' && (
  <TextBlockFormEnhanced formData={formData} updateField={updateField} />
)}
```

### Option 2: Add as Alternative (Keep Both)

You can offer both versions and let users choose:

```typescript
const [useEnhanced, setUseEnhanced] = useState(true);

{section.section_type === 'text' && (
  <>
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setUseEnhanced(true)}
        className={useEnhanced ? 'active' : 'inactive'}
      >
        Enhanced Editor
      </button>
      <button
        onClick={() => setUseEnhanced(false)}
        className={!useEnhanced ? 'active' : 'inactive'}
      >
        Simple Editor
      </button>
    </div>
    {useEnhanced ? (
      <TextBlockFormEnhanced formData={formData} updateField={updateField} />
    ) : (
      <TextBlockForm formData={formData} updateField={updateField} />
    )}
  </>
)}
```

---

## Using the Enhanced Renderer

### In CMSPageRenderer.tsx

Replace the existing TextSection with the enhanced version:

```typescript
// OLD
function TextSection({ content }: { content: Record<string, any> }) {
  // ... existing code ...
}

// NEW
import { TextSectionEnhanced } from '../components/TextSectionEnhanced';

function TextSection({ content }: { content: Record<string, any> }) {
  return <TextSectionEnhanced content={content} />;
}
```

---

## Supported Properties

### Typography Properties
```typescript
{
  fontSize?: string;        // 'sm' | 'base' | 'lg' | 'xl'
  lineHeight?: string;      // '1.4' | '1.6' | '1.8' | '2.0'
  letterSpacing?: string;   // 'normal' | 'wide' | 'extra-wide'
  fontWeight?: string;      // 'normal' | 'medium' | 'semibold'
}
```

### Layout Properties
```typescript
{
  textAlign?: string;       // 'left' | 'center' | 'right' | 'justify'
  containerWidth?: string;  // 'full' | 'wide' | 'medium' | 'narrow' | 'slim'
  columnLayout?: string;    // 'single' | 'two' | 'three'
  columnGap?: string;       // 'gap-4' | 'gap-6' | 'gap-8'
}
```

### Styling Properties
```typescript
{
  textColor?: string;       // hex color (e.g., '#000000')
  headingColor?: string;    // hex color (e.g., '#1f2937')
  backgroundColor?: string; // hex color (e.g., '#ffffff')
}
```

### Core Properties (Existing)
```typescript
{
  title?: string;
  body: string;
  text_style?: string;      // 'default' | 'intro' | 'highlight' | etc.
}
```

---

## Database Schema Update (Optional)

If you want to persist these new properties in the database, add them to the CMS schema:

```sql
-- If using Supabase or PostgreSQL
ALTER TABLE cms_sections ADD COLUMN IF NOT EXISTS content jsonb;

-- The content JSONB column already supports these properties, so no changes needed
-- The new properties will just be stored in the existing content JSON object
```

---

## Usage Examples

### Example 1: Simple Text with Custom Font Size
```json
{
  "title": "Our Mission",
  "body": "We empower businesses through innovative solutions.",
  "fontSize": "lg",
  "textAlign": "center",
  "textColor": "#1e40af"
}
```

### Example 2: Multi-Column Article
```json
{
  "title": "Blog Post",
  "body": "Long article content here...",
  "columnLayout": "two",
  "columnGap": "gap-8",
  "fontSize": "base",
  "lineHeight": "1.8",
  "containerWidth": "wide"
}
```

### Example 3: Centered Intro Section
```json
{
  "title": "Welcome",
  "body": "Introduction paragraph...",
  "textAlign": "center",
  "containerWidth": "narrow",
  "fontSize": "lg",
  "backgroundColor": "#f9fafb",
  "headingColor": "#1f2937"
}
```

---

## Features Breakdown

### 📝 Content Tab
- **Title**: Optional section heading
- **Text Style**: Quick preset options (for backward compatibility)
- **Content**: Main text body

### 🔤 Typography Tab
- **Font Size**: Choose from 4 preset sizes with visual preview
- **Line Height**: 4 options for vertical spacing
- **Letter Spacing**: 3 options for character spacing
- **Font Weight**: Regular, medium, or semibold

### 📐 Layout Tab
- **Text Alignment**: Left, center, right, or justified
- **Container Width**: 5 width options (full to slim)
- **Column Layout**: Switch between 1, 2, or 3 columns
- **Column Gap**: Spacing between columns (appears only for multi-column)

### 🎨 Styling Tab
- **Text Color**: Preset colors or custom color picker
- **Heading Color**: Custom color for headings
- **Background Color**: Custom background color

### 👁️ Preview Tab
- **Desktop View**: Full-width preview
- **Mobile View**: Mobile (single column) preview
- **Live Updates**: Changes apply immediately
- **Toggle**: Show/hide preview

---

## User Experience

### For Content Editors

1. **Simple Start**: The Content tab gives basic editor basics
2. **Gradual Customization**: Advanced controls in other tabs
3. **Live Feedback**: Preview tab shows real-time changes
4. **Preset Options**: Quick selections with visual previews
5. **Flexibility**: Custom colors and advanced spacing controls

### Mobile Responsive

- Column layouts automatically collapse to single column on mobile
- Font sizes adapt for readability
- All controls remain mobile-friendly

---

## Backward Compatibility

The enhanced system is **fully backward compatible**:

- Existing text sections continue to work
- Old properties (`text_style`, `body`, `title`) are still supported
- Gradual migration: Users can adopt new features incrementally
- No breaking changes to the data model

---

## Migration Strategy

### Approach 1: Gradual Adoption
1. Deploy enhanced editor alongside existing one
2. New text sections use the enhanced version
3. Old sections continue to work as-is
4. No forced migration needed

### Approach 2: Automatic Migration
1. Add migration script to add new properties with defaults
2. Set sensible defaults for backward compatibility
3. Users can then customize as needed

### Approach 3: Manual Migration
1. Users opt-in to enhance existing sections
2. Click "Enhance" button to enable new features
3. Default values applied automatically

---

## Troubleshooting

### Preview Not Updating
- Check that form state is updating correctly
- Verify that all event handlers are connected
- Clear browser cache and reload

### Colors Not Applying
- Ensure hex color format is valid (e.g., #1f2937)
- Check that CSS is being generated correctly
- Verify that dangerouslySetInnerHTML is being used

### Columns Overlapping
- Check column gap setting
- Verify responsive breakpoints in CSS
- Test on actual devices, not just browser dev tools

---

## Performance Considerations

- **CSS Generation**: Styles are generated inline (acceptable for small scale)
- **Live Preview**: Debounce or throttle updates for large content
- **Re-renders**: Use React.memo for optimization if needed
- **HTML Sanitization**: Already in place to prevent XSS

---

## Future Enhancements

Potential additions to consider:

1. **Text Shadow**: Add depth with shadows
2. **Text Transform**: Uppercase, lowercase, capitalize options
3. **Line Clamp**: Limit number of visible lines
4. **Gradient Text**: Gradient color support
5. **Animation**: Add entrance animations
6. **Responsive Font Size**: Different sizes for mobile/desktop
7. **Custom CSS**: Allow power users to add custom CSS
8. **Block Quote Styling**: Enhanced blockquote options
9. **Code Syntax Highlighting**: Better code block support
10. **Template Presets**: Save and reuse configurations

---

## Testing Checklist

- [ ] Font sizes display correctly in preview
- [ ] Line heights accommodate text properly
- [ ] Columns layout responsively on mobile
- [ ] Colors apply to correct elements
- [ ] Text alignment works in all directions
- [ ] Container width options work as expected
- [ ] Preview panels update in real-time
- [ ] Old text sections still render
- [ ] No console errors
- [ ] Mobile view is responsive

---

## Support & Documentation

For questions or issues:
1. Check this integration guide
2. Review TEXT_SECTION_ENHANCEMENT_ANALYSIS.md
3. Check component comments in source files
4. Test with the provided examples

