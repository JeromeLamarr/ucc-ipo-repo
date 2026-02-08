# Design System

A comprehensive, reusable design system for the UCC IP Office application.

## Overview

The design system provides centralized design tokens and reusable components that ensure visual consistency across the application. It includes:

- **Color Palette**: Primary, secondary, neutral, and semantic colors
- **Typography Scale**: Font sizes, weights, and line heights
- **Spacing Scale**: Consistent spacing values
- **Shadows**: Pre-defined shadow effects
- **Border Radius**: Rounded corner values
- **Button Styles**: Reusable button variants
- **Card Components**: Reusable card layouts

## File Structure

```
src/
├── styles/
│   └── designSystem.ts          # Design tokens and constants
├── components/
│   ├── Button.tsx               # Reusable Button component
│   └── Card.tsx                 # Reusable Card components
└── ...
```

## Design Tokens

### Colors

Colors are organized by semantic purpose:

```typescript
import { COLORS } from '@/styles/designSystem';

// Usage
backgroundColor: COLORS.primary[600];      // #2563eb
textColor: COLORS.neutral[900];            // #171717
successColor: COLORS.success;              // #10b981
```

**Available Color Scales:**
- `primary` - Blue (50-900)
- `secondary` - Cyan (50-900)
- `accent` - Purple, Indigo, Cyan
- `neutral` - Gray scale (50-900)
- Status: `success`, `warning`, `error`, `info`

### Typography

```typescript
import { TYPOGRAPHY } from '@/styles/designSystem';

// Font sizes: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl
// Font weights: thin (100) to black (900)
// Line heights: tight (1.2) to loose (2)
```

### Spacing

Consistent 8px-based spacing scale:

```typescript
import { SPACING } from '@/styles/designSystem';

// Values: 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), ..., 32 (128px)
```

### Shadows

```typescript
import { SHADOWS } from '@/styles/designSystem';

// Pre-defined shadows: none, sm, base, md, lg, xl, 2xl
```

## Components

### Button Component

Reusable button with multiple variants and sizes.

**Usage:**

```typescript
import Button from '@/components/Button';

// Primary button
<Button onClick={() => {}}>Get Started</Button>

// Secondary button
<Button variant="secondary">Sign In</Button>

// Danger button
<Button variant="danger" size="lg">Delete</Button>

// Ghost button with icon
<Button variant="ghost" icon={<TrashIcon />}>
  Remove
</Button>

// Full width button
<Button fullWidth>Submit Form</Button>
```

**Props:**

- `variant`: `'primary'` | `'secondary'` | `'danger'` | `'ghost'` (default: `'primary'`)
- `size`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
- `disabled`: boolean
- `onClick`: function
- `icon`: ReactNode
- `iconPosition`: `'left'` | `'right'` (default: `'right'`)
- `fullWidth`: boolean
- `type`: `'button'` | `'submit'` | `'reset'`
- `className`: string (additional Tailwind classes)

### Card Components

Set of reusable card components for consistent layouts.

**Basic Card:**

```typescript
import Card from '@/components/Card';

<Card hoverable>
  Content here
</Card>

// With flex column (equal height)
<Card variant="default" flexCol hoverable>
  <CardHeader title="Feature" subtitle="Description" />
  <CardContent>
    Main content that grows
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

**Card Variants:**

- `default`: White background with soft shadow
- `elevated`: White background with stronger shadow
- `outlined`: Transparent with border

**Sub-Components:**

- `CardHeader`: Header with title and optional subtitle
- `CardContent`: Main content area (grows with `flexCol`)
- `CardFooter`: Footer with optional top border

**Card Props:**

- `variant`: `'default'` | `'elevated'` | `'outlined'` (default: `'default'`)
- `hoverable`: boolean (adds hover lift and shadow animation)
- `flexCol`: boolean (enables flex column for equal heights)
- `onClick`: function
- `className`: string

**CardHeader Props:**

- `title`: string (required)
- `subtitle`: string (optional)
- `className`: string

**CardContent Props:**

- `children`: ReactNode (required)
- `className`: string

**CardFooter Props:**

- `children`: ReactNode (required)
- `withBorder`: boolean (default: `true`)
- `className`: string

## Example: Feature Card

```typescript
import Card, { CardHeader, CardContent, CardFooter } from '@/components/Card';
import Button from '@/components/Button';

<Card variant="default" flexCol hoverable>
  <div className="mb-8">
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
      <span className="text-4xl">📄</span>
    </div>
  </div>
  
  <CardHeader 
    title="Easy Submissions"
    subtitle="Streamlined forms and uploads"
  />
  
  <CardContent>
    <p className="text-gray-600">
      Submit your intellectual property with our user-friendly interface.
    </p>
  </CardContent>
  
  <CardFooter>
    <div className="flex items-center text-blue-600 font-semibold text-sm gap-1">
      <span>Learn more</span>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </CardFooter>
</Card>
```

## Button Variants

### Primary

Main call-to-action button with gradient background.

```typescript
<Button>Get Started</Button>
```

### Secondary

Alternative action with border and outline style.

```typescript
<Button variant="secondary">Sign In</Button>
```

### Danger

Destructive action (delete, remove, etc.).

```typescript
<Button variant="danger">Delete Item</Button>
```

### Ghost

Minimal button without background.

```typescript
<Button variant="ghost">Cancel</Button>
```

## Best Practices

1. **Use Design System Tokens**: Always reference tokens from `designSystem.ts` instead of hard-coding values
2. **Consistent Spacing**: Use `SPACING` scale for margins and padding
3. **Typography Hierarchy**: Follow the `TYPOGRAPHY` scale for font sizes
4. **Color Semantics**: Use semantic color names (success, error, warning, info)
5. **Reusable Components**: Use Button and Card components instead of custom implementations
6. **Responsive Design**: Use Tailwind's responsive prefixes with design system values

## Extending the Design System

To add new design tokens:

1. Add to appropriate section in `designSystem.ts`
2. Update this README with usage examples
3. Create new components if needed
4. Test across all breakpoints

Example:

```typescript
export const NEW_TOKENS = {
  value1: '...',
  value2: '...',
};
```

## Contributing

When adding new components or tokens:

1. Maintain consistency with existing design system
2. Use established naming conventions
3. Document props and usage examples
4. Ensure responsive behavior
5. Test accessibility (WCAG compliance)
