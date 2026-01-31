# CMS Dropdown Button - Quick Reference

## TL;DR

New `CMSButton` component supports simple buttons and dropdown menus. Use in Hero, CTA, and Showcase sections.

---

## Quick Examples

### Simple Button

```json
{
  "button": {
    "text": "Get Started",
    "link": "/register"
  }
}
```

### Dropdown Button

```json
{
  "button": {
    "type": "dropdown",
    "label": "Get Started",
    "items": [
      { "text": "Register", "link": "/register" },
      { "text": "Login", "link": "/login" }
    ]
  }
}
```

### Legacy Format (Still Works!)

```json
{
  "cta_text": "Get Started",
  "cta_link": "/register"
}
```

---

## Where to Use

| Section | Field | Type |
|---------|-------|------|
| Hero | `button` | SimpleButton \| DropdownButton |
| CTA | `button` | SimpleButton \| DropdownButton |
| Showcase Items | `button` (per item) | SimpleButton \| DropdownButton |

---

## Component Props

```tsx
<CMSButton
  button={buttonConfig}           // Required
  bgColor="#2563EB"              // Optional hex color
  textColor="text-white"         // Optional Tailwind class
  hoverClass="hover:opacity-90"  // Optional Tailwind class
/>
```

---

## Button Objects

### SimpleButton
```typescript
{
  type?: 'simple';        // Optional
  text: string;           // Button label
  link: string;           // URL
}
```

### DropdownButton
```typescript
{
  type: 'dropdown';       // Required
  label: string;          // Button label
  items: [                // Menu items
    { text: string; link: string }
  ]
}
```

---

## Real-World Examples

### Hero with Dropdown

```json
{
  "headline": "Welcome to IP Office",
  "button": {
    "type": "dropdown",
    "label": "Get Started",
    "items": [
      { "text": "Individual", "link": "/register?type=ind" },
      { "text": "Organization", "link": "/register?type=org" },
      { "text": "Learn More", "link": "/about" }
    ]
  }
}
```

### CTA with Dropdown

```json
{
  "heading": "Choose Your Service",
  "button": {
    "type": "dropdown",
    "label": "Services",
    "items": [
      { "text": "Patents", "link": "/services/patents" },
      { "text": "Trademarks", "link": "/services/trademarks" },
      { "text": "Copyright", "link": "/services/copyright" }
    ]
  }
}
```

### Showcase Item with Button

```json
{
  "title": "Success Story",
  "image_url": "...",
  "link": "/case-study",
  "button": {
    "type": "dropdown",
    "label": "Actions",
    "items": [
      { "text": "Read Case", "link": "/case-study" },
      { "text": "Download", "link": "/case-study/pdf" },
      { "text": "Contact", "link": "/contact" }
    ]
  }
}
```

---

## Styling

**Simple Button:**
- Inline-block with padding
- Rounded corners (rounded-lg)
- Drop shadow
- Hover opacity change

**Dropdown Button:**
- Same as simple button
- + Chevron icon
- + Menu appears on hover
- Menu items styled as light gray background on hover

**Colors:**
- Button background: `bgColor` prop (default: primary color)
- Button text: `textColor` prop (default: text-white)
- Dropdown background: white
- Dropdown items: gray-800 text, gray-100 on hover

---

## Migration from Old Format

### Before
```json
{
  "cta_text": "Get Started",
  "cta_link": "/register"
}
```

### After (Optional - Old Still Works!)
```json
{
  "button": {
    "text": "Get Started",
    "link": "/register"
  }
}
```

**No action needed** - old format still supported!

---

## Accessibility

✅ ARIA attributes for screen readers  
✅ Semantic HTML (`<button>`, `<a>`)  
✅ Keyboard focusable  
✅ Keyboard navigable (Tab, Enter)  
✅ Menu announced as popup  
✅ Items announced as menu items  

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Dropdown doesn't appear | Check `items` array is not empty |
| Wrong button color | Update `bgColor` prop |
| Menu too narrow | Menu has fixed width (192px), text wraps |
| Button too big/small | Adjust padding in component |
| Dropdown closes on click | Current behavior: click item, navigate away |

---

## TypeScript Types

```typescript
// Import types if needed in other components
type CMSButtonType = SimpleButton | DropdownButton;

interface SimpleButton {
  type?: 'simple' | undefined;
  text: string;
  link: string;
}

interface DropdownButton {
  type: 'dropdown';
  label: string;
  items: DropdownItem[];
}

interface DropdownItem {
  text: string;
  link: string;
}
```

---

## Performance

- **Zero overhead**: ~50 LOC, no deps
- **Tailwind only**: No CSS bloat
- **Hover-based**: No JavaScript polling
- **GPU accelerated**: CSS transitions

---

## File Location

**Component:** `src/pages/CMSPageRenderer.tsx` (lines ~54-200)  
**Documentation:** `CMS_DROPDOWN_BUTTON_FEATURE.md` (this folder)  
**Git Commit:** 28a3334

---

## Next Steps

1. Update existing pages to use dropdown buttons (optional)
2. Test in staging environment
3. Deploy to production
4. Monitor for issues

All changes are live immediately upon deployment.
