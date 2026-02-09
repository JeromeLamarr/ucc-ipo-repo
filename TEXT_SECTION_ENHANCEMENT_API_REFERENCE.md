# Text Section Enhancement - API Reference & Developer Guide

## Component API Reference

### TextBlockFormEnhanced

Enhanced editor component for text sections with tabbed interface.

**Location**: `src/components/TextBlockFormEnhanced.tsx`

#### Props

```typescript
interface TextBlockFormEnhancedProps {
  formData: Record<string, any>;    // Current form data
  updateField: (key: string, value: any) => void;  // Callback to update form
}
```

#### Example Usage

```typescript
import { TextBlockFormEnhanced } from './components/TextBlockFormEnhanced';

function MyEditor() {
  const [formData, setFormData] = useState({
    title: 'My Title',
    body: 'My content',
    fontSize: 'base',
  });

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <TextBlockFormEnhanced 
      formData={formData}
      updateField={updateField}
    />
  );
}
```

#### Form Data Properties

**Core Content**
```typescript
{
  title?: string;              // Optional section heading
  body: string;               // Main text content
  text_style?: string;        // Preset style: 'default'|'intro'|'highlight'|'quote'|'subtitle'|'muted'
}
```

**Typography Properties**
```typescript
{
  fontSize?: string;          // 'sm'|'base'|'lg'|'xl'
  lineHeight?: string;        // '1.4'|'1.6'|'1.8'|'2.0'
  letterSpacing?: string;     // 'normal'|'wide'|'extra-wide'
  fontWeight?: string;        // 'normal'|'medium'|'semibold'
}
```

**Layout Properties**
```typescript
{
  textAlign?: string;         // 'left'|'center'|'right'|'justify'
  containerWidth?: string;    // 'full'|'wide'|'medium'|'narrow'|'slim'
  columnLayout?: string;      // 'single'|'two'|'three'
  columnGap?: string;        // 'gap-4'|'gap-6'|'gap-8'
}
```

**Styling Properties**
```typescript
{
  textColor?: string;        // Hex color, e.g., '#000000'
  headingColor?: string;     // Hex color, e.g., '#1f2937'
  backgroundColor?: string;  // Hex color, e.g., '#ffffff'
}
```

#### Tabs

|Tab|ID|Purpose|Controls|
|---|--|---------|---------|
|Content|content|Main content entry|Title, body text, style preset|
|Typography|typography|Font styling|Font size, line height, letter spacing, weight|
|Layout|layout|Positioning & columns|Alignment, width, column layout, gap|
|Styling|styling|Colors & appearance|Text color, heading color, background|
|Preview|preview|Live preview|Desktop/mobile preview toggle|

#### Methods & Functions

None - this is a presentational component. State management is handled by parent.

---

### TextSectionEnhanced

Enhanced renderer component for displaying text sections.

**Location**: `src/components/TextSectionEnhanced.tsx`

#### Props

```typescript
interface TextSectionEnhancedProps {
  content: TextSectionContentEnhanced;  // Content to render
}

interface TextSectionContentEnhanced {
  title?: string;
  body: string;
  text_style?: string;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  fontWeight?: string;
  textAlign?: string;
  containerWidth?: string;
  columnLayout?: string;
  columnGap?: string;
  textColor?: string;
  headingColor?: string;
  backgroundColor?: string;
}
```

#### Example Usage

```typescript
import { TextSectionEnhanced } from './components/TextSectionEnhanced';

function PageRenderer() {
  const content = {
    title: 'Welcome',
    body: 'This is the main content...',
    fontSize: 'lg',
    textAlign: 'center',
    textColor: '#1f2937',
  };

  return <TextSectionEnhanced content={content} />;
}
```

#### Rendering Logic

1. **Container Setup**
   - Gets container width based on `containerWidth` prop
   - Applies background color
   - Calculates responsive column layout

2. **Typography Application**
   - Maps fontSize option to pixel size
   - Applies line height and letter spacing
   - Sets font weight
   - Applies text alignment

3. **Dynamic CSS Generation**
   - Creates heading styles with `headingColor`
   - Sets paragraph styles with `textColor`
   - Adds responsive column CSS
   - Generates stylesheet on render

4. **HTML Rendering**
   - Sanitizes HTML for XSS prevention
   - Renders with `dangerouslySetInnerHTML`
   - Applies `.prose` class for styling

---

## Helper Functions

### convertMarkupToHtml

Converts simple markdown-like markup to HTML.

```typescript
function convertMarkupToHtml(text: string): string
```

**Usage**:
```typescript
const html = convertMarkupToHtml('*bold text* and _italic text_');
// Returns: '<strong>bold text</strong> and <em>italic text</em>'
```

**Supported Formatting**:
- Bold: `*text*` or `**text**` → `<strong>text</strong>`
- Italic: `_text_` or `__text__` → `<em>text</em>`
- Line breaks to paragraphs: Split by `\n\n` → `<p>text</p>`
- Lists: Lines starting with `-` or `*` → `<ul><li>item</li></ul>`
- Numbered lists: Lines starting with `1.`, `2.` etc → `<ol><li>item</li></ol>`

---

## Integration Examples

### Example 1: Basic Integration

```typescript
// In CMSSectionEditor.tsx
import { TextBlockFormEnhanced } from './TextBlockFormEnhanced';

function SectionEditor() {
  const [formData, setFormData] = useState(section.content);

  return (
    <TextBlockFormEnhanced 
      formData={formData}
      updateField={(key, value) => 
        setFormData({ ...formData, [key]: value })
      }
    />
  );
}

// In CMSPageRenderer.tsx
import { TextSectionEnhanced } from './TextSectionEnhanced';

function renderPageSection(section) {
  if (section.section_type === 'text') {
    return <TextSectionEnhanced content={section.content} />;
  }
}
```

### Example 2: With TypeScript Typing

```typescript
import { TextSectionContentEnhanced } from './components/TextSectionEnhanced';

interface TextBlockData extends TextSectionContentEnhanced {
  // Add custom properties if needed
}

function handleSaveTextBlock(content: TextBlockData) {
  // Type-safe handling
  console.log(content.fontSize); // ✅ Type-checked
}
```

### Example 3: Conditional Rendering

```typescript
function renderTextSection(content: Record<string, any>) {
  // Use enhanced renderer if new properties exist
  if (content.fontSize || content.columnLayout) {
    return <TextSectionEnhanced content={content} />;
  }
  
  // Fall back to old renderer for backward compatibility
  return <OldTextSection content={content} />;
}
```

### Example 4: Custom Wrapper

```typescript
function TextSectionWithDefaults({ content }) {
  // Apply site-wide defaults
  const enhancedContent = {
    fontSize: 'base',
    lineHeight: '1.8',
    textColor: '#000000',
    ...content,  // User overrides take precedence
  };

  return <TextSectionEnhanced content={enhancedContent} />;
}
```

---

## Input Validation

### Valid Values

**fontSize**
```
Valid: 'sm', 'base', 'lg', 'xl'
Default: 'base'
Invalid: 'smll', '', 'big' → Falls back to 'base'
```

**lineHeight**
```
Valid: '1.4', '1.6', '1.8', '2.0'
Default: '1.8'
Invalid: '2', '1.5', '' → Falls back to '1.8'
```

**letterSpacing**
```
Valid: 'normal', 'wide', 'extra-wide'
Default: 'normal'
Invalid: 'relaxed', '', 'tight' → Falls back to 'normal'
```

**textAlign**
```
Valid: 'left', 'center', 'right', 'justify'
Default: 'left'
Invalid: 'centre', 'middle' → Falls back to 'left'
```

**containerWidth**
```
Valid: 'full', 'wide', 'medium', 'narrow', 'slim'
Default: 'medium'
Invalid: 'large', 'small' → Falls back to 'medium'
```

**columnLayout**
```
Valid: 'single', 'two', 'three'
Default: 'single'
Invalid: '2', 'dual', 'triple' → Falls back to 'single'
```

**Colors (hex format)**
```
Valid: '#000000', '#1f2937', '#ffffff', '#FF0000'
Invalid: '000000', 'black', '#gg0000' → Browser color picker handles
Fallback: #000000 for text, #1f2937 for headings, #ffffff for bg
```

---

## CSS Classes & Styling

### Generated CSS Classes

```css
.text-section-enhanced {
  /* Main wrapper */
}

.text-section-enhanced p {
  /* Paragraphs with dynamic color and margin */
}

.text-section-enhanced h1,
.text-section-enhanced h2,
...
.text-section-enhanced h6 {
  /* Headings with dynamic color */
}

.text-section-enhanced ul,
.text-section-enhanced ol {
  /* Lists with proper margins */
}

.text-section-enhanced a {
  /* Links with underline and hover effects */
}

.text-section-enhanced blockquote {
  /* Blockquotes with left border */
}

.text-section-enhanced code {
  /* Inline code styling */
}

.text-section-enhanced pre {
  /* Code blocks */
}

@media (max-width: 768px) {
  .text-section-enhanced.grid-responsive {
    grid-template-columns: 1fr;  /* Single column on mobile */
  }
}
```

### Tailwind Classes Used

```
Spacing: w-full, py-16, px-4, sm:px-6, lg:px-8, mx-auto
Grid: grid, grid-cols-2, grid-cols-3, gap-4, gap-6, gap-8
Text: text-left, text-center, text-right, text-justify
Display: text-3xl, text-2xl, font-bold
```

---

## Performance Considerations

### Optimization Tips

1. **Memoization**
```typescript
const TextSectionMemo = React.memo(TextSectionEnhanced);
// Prevents unnecessary re-renders
```

2. **Lazy Loading Preview**
```typescript
const [showPreview, setShowPreview] = useState(false);
// Only render preview when needed
```

3. **Debounced Updates**
```typescript
const debouncedUpdate = useCallback(
  debounce((data) => updateField('body', data), 300),
  []
);
```

4. **CSS-in-JS Optimization**
```typescript
// Cache computed styles
const styleBlock = useMemo(() => getStyleBlock(), [content]);
```

---

## Error Handling

### Common Issues & Solutions

**Issue: Colors not applying**
```typescript
// ✗ Wrong: 'blue' (named color)
textColor: 'blue'

// ✓ Correct: hex format
textColor: '#3b82f6'

// ✓ Alternative: rgb
textColor: 'rgb(59, 130, 246)'
```

**Issue: Column layout not working**
```typescript
// ✓ Correct way to enable columns
{
  columnLayout: 'two',
  columnGap: 'gap-6'
}

// Verify columnLayout is 'two' or 'three', not 'single'
```

**Issue: Typography not visible**
```typescript
// Ensure font size is a valid option
{
  fontSize: 'lg',  // ✓ Valid
  lineHeight: '1.8'  // ✓ Valid
}
```

---

## Testing Guide

### Unit Test Examples

```typescript
// Test color parsing
test('should apply custom text color', () => {
  const { container } = render(
    <TextSectionEnhanced 
      content={{ 
        body: 'test',
        textColor: '#ff0000'
      }} 
    />
  );
  
  expect(container.querySelector('.text-section-enhanced p'))
    .toHaveStyle('color: #ff0000');
});

// Test column layout
test('should render two-column layout', () => {
  const { container } = render(
    <TextSectionEnhanced 
      content={{ 
        body: 'test',
        columnLayout: 'two'
      }} 
    />
  );
  
  expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
});
```

### Integration Test Examples

```typescript
test('editor form updates and renders correctly', async () => {
  const { getByPlaceholderText, getByText } = render(
    <TextBlockFormEnhanced 
      formData={{}}
      updateField={mockUpdate}
    />
  );

  // Fill form
  fireEvent.change(getByPlaceholderText('Section title'), {
    target: { value: 'Test Title' }
  });

  // Verify callback
  expect(mockUpdate).toHaveBeenCalledWith('title', 'Test Title');
});
```

---

## Backward Compatibility

### Migrating Old Content

```typescript
// Old format content still works
const oldContent = {
  title: 'Old Title',
  body: 'Old content',
  text_style: 'default'
};

// Renders with defaults
<TextSectionEnhanced content={oldContent} />

// New properties are optional
const newContent = {
  ...oldContent,
  fontSize: 'lg',
  columnLayout: 'two'
};

<TextSectionEnhanced content={newContent} />
```

---

## Future API Enhancements (v2.0)

Planned additions:

```typescript
// Rich text editor support
{
  editorMode?: 'rich' | 'plain';  // New
  formatting?: boolean;             // New
}

// Advanced color options
{
  gradient?: {                      // New
    from: string;
    to: string;
    direction: string;
  };
  shadow?: 'none' | 'sm' | 'md' | 'lg';  // New
}

// Responsive typography
{
  responsiveFont?: {                // New
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

// Animations
{
  animation?: {                     // New
    type: 'fade' | 'slide' | 'zoom';
    duration: number;
    delay: number;
  };
}
```

---

## Support & Resources

### Getting Help

1. **Component Issues**
   - Check props are correctly typed
   - Verify form data shape matches interface
   - Review console for TypeScript errors

2. **Styling Issues**
   - Verify color format (hex, rgb, or name)
   - Check Tailwind classes are included
   - Inspect CSS in browser dev tools

3. **Performance Issues**
   - Profile with React DevTools
   - Check for unnecessary re-renders
   - Consider memoization

### Documentation Links

- [Integration Guide](./TEXT_SECTION_ENHANCEMENT_INTEGRATION_GUIDE.md)
- [Analysis Document](./TEXT_SECTION_ENHANCEMENT_ANALYSIS.md)
- [Visual Reference](./TEXT_SECTION_ENHANCEMENT_VISUAL_REFERENCE.md)
- [Implementation Checklist](./TEXT_SECTION_ENHANCEMENT_IMPLEMENTATION_CHECKLIST.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial release |
| 1.1 | TBD | Bug fixes, performance improvements |
| 2.0 | TBD | Rich text editor, advanced colors, animations |

---

**Last Updated**: [Date]  
**Next Review**: [Date]  
**Maintainers**: [Team]

