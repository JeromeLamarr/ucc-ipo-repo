# CMSPageRenderer Defensive Patterns Reference

## Pattern 1: Content Validation

Every section component now follows this pattern:

```typescript
function XYZSection({ content }: { content: Record<string, any> }) {
  // Step 1: Validate content object exists
  if (!content) {
    console.warn('XYZSection: Missing content prop');
    return null;
  }

  // Step 2: Extract and provide defaults
  const field = content.field || 'default_value';
  
  // Step 3: Return null if critical data missing
  if (!field) {
    console.warn('XYZSection: Missing required field');
    return null;
  }

  // Step 4: Render with safe fallbacks
  return <div>{field}</div>;
}
```

## Pattern 2: Array Validation

For sections with arrays (features, steps, categories, items, images):

```typescript
// Validate array exists and is an array
const items = Array.isArray(content.items) ? content.items : [];

// Skip if empty
if (items.length === 0) {
  console.warn('XYZSection: No items provided');
  return null;
}

// Validate each item
items.map((item, idx) => {
  if (!item || typeof item !== 'object') {
    console.warn(`XYZSection: Invalid item at index ${idx}`);
    return null;
  }
  // ... render item
});
```

## Pattern 3: Enum Validation

For fields with restricted values (alignment, columns):

```typescript
// Define valid values
const validValues = ['left', 'center', 'right'];

// Type-narrow the value
const safeValue = validValues.includes(value) 
  ? (value as 'left' | 'center' | 'right')
  : 'left';

// Use typed Record for lookup
const classMap: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// Safe access
const className = classMap[safeValue];
```

## Pattern 4: Type Coercion for Primitives

For categories where strings might be mixed types:

```typescript
const categories = Array.isArray(content.categories) ? content.categories : [];

categories.map((category: any, idx: number) => {
  // Coerce to string safely
  const categoryText = typeof category === 'string' ? category : String(category);
  return <span key={idx}>{categoryText}</span>;
});
```

## Pattern 5: Conditional Rendering with Fallbacks

For optional fields:

```typescript
const imageUrl = item.image_url || null;

// Only render if exists
{imageUrl && (
  <img src={imageUrl} alt="..." />
)}

// Provide sensible defaults
const altText = item.alt_text || item.caption || `Gallery image ${idx + 1}`;
```

## Pattern 6: Settings Fallback

For optional settings with defaults:

```typescript
// Use optional chaining and logical OR
const color = settings?.primary_color || '#2563EB';

// Multiple fallbacks
const bgColor = content.background_color || settings?.primary_color || '#2563EB';
```

## Pattern 7: Section-Level Validation

In SectionRenderer before routing to specific sections:

```typescript
function SectionRenderer({ section, settings }: SectionRendererProps) {
  // Validate section exists
  if (!section) {
    console.warn('SectionRenderer: Missing section prop');
    return null;
  }

  // Validate content is an object
  const content = section.content || {};
  if (typeof content !== 'object' || content === null) {
    console.warn(`SectionRenderer: Invalid content for section type "${sectionType}"`);
    return null;
  }

  // Handle unknown types
  default:
    console.warn(`SectionRenderer: Unknown section type "${sectionType}"`);
    return null;
}
```

## Pattern 8: Fallback UI for Empty State

When sections are completely missing:

```typescript
{Array.isArray(sections) && sections.length > 0 ? (
  sections.map(...render sections...)
) : (
  <div className="text-center">
    <p className="text-gray-500">No content available for this page.</p>
  </div>
)}
```

## Benefits of These Patterns

1. **Fail gracefully** - Show fallback UI instead of crashing
2. **Debug easily** - Console warnings guide to missing data
3. **Type-safe** - TypeScript ensures correctness
4. **Maintainable** - Consistent patterns across all sections
5. **Defensive** - Handles edge cases without special handling in components

## Testing These Patterns

Test each pattern with:

```javascript
// Pattern 1: No content
<HeroSection content={null} settings={settings} />

// Pattern 2: Empty array
<FeaturesSection content={{ features: [] }} settings={settings} />

// Pattern 3: Invalid enum
<TextSection content={{ alignment: 'invalid' }} />

// Pattern 4: Type mismatch
<CategoriesSection content={{ categories: [123, "text", null] }} />

// Pattern 5: Missing optional fields
<ShowcaseSection content={{ items: [{ title: "Item" }] }} />

// Pattern 6: Missing settings
<HeroSection content={{ headline: "Hello" }} settings={null} />

// Pattern 7: Malformed section
<SectionRenderer section={{ id: "1" }} settings={settings} />

// Pattern 8: No sections
<CMSPageRenderer sections={[]} />
```

All should render without errors and log appropriate warnings to console.
