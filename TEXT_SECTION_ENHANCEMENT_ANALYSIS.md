# Text Section Enhancement Analysis & Implementation Guide

## Current State Analysis

### How Text Sections Currently Work

**Editor (TextBlockForm):**
- Title input (optional)
- Text Style dropdown (6 predefined styles: default, intro, highlight, quote, subtitle, muted)
- Body textarea (plain text only)
- Limited to single column layout

**Renderer (TextSection):**
- Renders with fixed `max-w-2xl` container (centered)
- Uses `.prose` class for styling
- Predefined CSS classes for each heading level and text element
- No support for custom alignment, columns, or font sizing
- Fixed `lineHeight: 1.8`

### Limitations
- ❌ No font size controls
- ❌ No text alignment/justification options
- ❌ No positioning flexibility
- ❌ No column layout support
- ❌ Limited to predefined text styles
- ❌ No custom spacing controls
- ❌ No text color customization
- ❌ No width/max-width options

---

## Proposed Enhancements

### 1. **Typography Controls**
- Font size presets (Small, Medium, Large, Extra Large)
- Line height options (1.4, 1.6, 1.8, 2.0)
- Letter spacing options (normal, wide, extra-wide)
- Font weight for body text (regular, medium, semibold)

### 2. **Layout & Positioning**
- Text alignment: Left, Center, Right, Justify
- Container width: Full, Wide, Medium, Narrow, Auto
- Max width customization
- Horizontal positioning: Left, Center, Right
- Vertical spacing controls

### 3. **Column Layout**
- Single column (default)
- Two columns
- Three columns
- Column gap options
- Toggle between layout types via UI

### 4. **Color & Styling**
- Text color selector
- Heading color selector
- Background color options
- Border/accent options for highlights

### 5. **Advanced Text Formatting**
- Support for HTML formatting (bold, italic, lists, etc.)
- Rich text editor integration
- Code blocks with syntax highlighting
- Blockquote styling
- Custom CSS classes

### 6. **Preview Panel**
- Real-time preview showing how text will appear
- Mobile/Desktop view toggle
- Full preview before saving

---

## Implementation Plan

### Phase 1: Editor Enhancement (TextBlockForm)
1. Add typography controls section
2. Add layout & positioning controls
3. Add column layout selector
4. Create tabbed interface for organization
5. Add live preview

### Phase 2: Renderer Enhancement (TextSection)
1. Update renderer to accept new properties
2. Create dynamic CSS generation
3. Support column layouts
4. Apply alignment and spacing
5. Handle color customization

### Phase 3: Database Schema (Optional)
If needed, update CMS tables to store:
- `font_size`: string
- `line_height`: string
- `letter_spacing`: string
- `text_alignment`: string
- `container_width`: string
- `column_layout`: string (single|two|three)
- `text_color`: string
- `bg_color`: string
- `heading_color`: string

---

## Key Features to Implement

### Enhanced TextBlockForm
```
Tabs:
├── Content
│   ├── Title
│   ├── Body (with rich editor)
│   └── Text Style
│
├── Typography
│   ├── Font Size
│   ├── Line Height
│   ├── Letter Spacing
│   └── Font Weight
│
├── Layout
│   ├── Text Alignment
│   ├── Container Width
│   ├── Column Layout
│   └── Position
│
├── Styling
│   ├── Text Color
│   ├── Heading Color
│   └── Background
│
└── Preview
    ├── Desktop Preview
    └── Mobile Preview
```

### Enhanced TextSection Renderer
- Responsive column layouts
- Dynamic CSS based on settings
- Proper spacing and alignment
- Color overrides
- Mobile-friendly defaults

---

## User Benefits

1. **More Control**: Users can customize every aspect of text presentation
2. **Better Layout Options**: Column layouts for content organization
3. **Improved Readability**: Fine-grained typography controls
4. **Visual Flexibility**: Color and styling options
5. **Ease of Use**: Intuitive tabbed interface
6. **Live Feedback**: Real-time preview during editing

---

## Technical Approach

### New Component: `TextBlockFormEnhanced.tsx`
- Modular section components
- Tab navigation
- Live preview capability
- Proper state management

### Updated Renderer Properties
```typescript
interface TextSectionContent {
  title?: string;
  body: string;
  text_style?: string;
  
  // Typography
  fontSize?: string;        // 'sm' | 'base' | 'lg' | 'xl'
  lineHeight?: string;      // '1.4' | '1.6' | '1.8' | '2.0'
  letterSpacing?: string;   // 'normal' | 'wide' | 'extra-wide'
  fontWeight?: string;      // 'normal' | 'medium' | 'semibold'
  
  // Layout
  textAlign?: string;       // 'left' | 'center' | 'right' | 'justify'
  containerWidth?: string;  // 'full' | 'wide' | 'medium' | 'narrow'
  columnLayout?: string;    // 'single' | 'two' | 'three'
  columnGap?: string;       // spacing between columns
  
  // Styling
  textColor?: string;
  headingColor?: string;
  backgroundColor?: string;
}
```

---

## Next Steps

1. ✅ Analysis complete
2. Create enhanced TextBlockForm component
3. Update TextSection renderer
4. Test with various configurations
5. Update documentation
6. Optional: Add to database schema

