# CMS Form Validation - Quick Reference

## What's New

✅ **Real-time inline validation** for all CMS block forms  
✅ **Required fields highlighted** in red with error messages  
✅ **Empty CTA warnings** - blocks won't publish  
✅ **Invalid link detection** - validates /internal and http:// formats  
✅ **Save button blocked** until all errors are fixed  
✅ **Publish prevention** - pages can't go live with issues  

---

## Key Features

### 1. Form Editing
**When editing a block:**
- Required fields show `*` and red border if empty
- Real-time error messages appear below fields
- Save button is **DISABLED** if errors exist
- Warnings are shown but allow saving

**Example error flow:**
```
User leaves "Button Link" empty
    ↓
Red border appears around field
Save button becomes grayed out
Error message: "✗ Link must start with "/" (internal) or "http" (external)"
    ↓
User types "/register"
    ↓
Red border disappears
Save button becomes enabled again
```

### 2. Publishing Pages
**When publishing a draft page:**
- All blocks are validated
- Page cannot publish if any block has errors
- Clear error message shows which block and what's wrong

**Example publish error:**
```
Error: "Cannot publish: CTA block #3: Button text cannot be empty (2 issues)"
       ↑ page cannot go live    ↑ which block  ↑ specific issue
```

### 3. Page Status Indicators
**In Pages list:**
- Draft pages show issue count: "⚠ 3 issues"
- Publish button is grayed out for problem pages
- Hover to see the first validation issue

---

## Validation Rules by Block Type

### Hero Block (Required)
- ✓ Headline
- ✓ Subheadline  
- ✓ Button Text
- ✓ Button Link (must start with "/" or "http")

### CTA Block (Required)
- ✓ Heading
- ✓ Description
- ✓ Button Text
- ✓ Button Link (must start with "/" or "http")
- ⚠ Background Color (warned if missing)

### Features Block
- ⚠ Add at least one feature
- ✓ Each feature: title + description

### Steps Block
- ⚠ Add at least one step
- ✓ Each step: label + description

### Gallery Block
- ⚠ Add at least one image
- ✓ Each image: URL + alt text
- ✓ Valid image URLs (http/https)

### Text Block
- ✓ Body content (required)
- ✓ HTML tags must be matched
- ⚠ Content should be 10+ characters

### Categories Block
- ⚠ Add at least one category
- ✓ No empty category fields

---

## Valid Link Formats

✅ Correct:
- `/register`
- `/pages/about-us`
- `https://example.com`
- `http://example.com`

❌ Incorrect:
- `register` (missing /)
- `example.com` (missing protocol)
- `ftp://example.com` (invalid protocol)

---

## Troubleshooting

**Q: Why can't I save my block?**  
A: Check for red error messages. Fix all marked errors before saving.

**Q: Why can't I publish my page?**  
A: Edit the page and fix blocks with issues. You'll see error count in the status column.

**Q: My CTA button link keeps showing an error**  
A: Links must start with `/` (for internal) or `http://`/`https://` (for external).

**Q: Can I save a block with warnings?**  
A: Yes! Warnings don't block saving, but they will block publishing. Fix them before publishing.

**Q: How do I know which blocks have issues?**  
A: Edit the page - blocks with issues will show validation errors when you open them.

---

## Files Modified

- `src/lib/sectionValidation.ts` - Validation rules engine
- `src/components/CMSSectionEditor.tsx` - Real-time validation UI
- `src/pages/PublicPagesManagement.tsx` - Publish validation
- `src/components/FormField.tsx` - Reusable validated form field

---

## Implementation Details

```typescript
// Validation runs automatically on every change
const validation = useMemo(() => {
  return validateSection(section.section_type, formData);
}, [formData, section.section_type]);

// Two severity levels:
// 'error' = cannot save (red)
// 'warning' = can save but not publish (yellow)

// Save button logic:
<button disabled={!validation.isValid}>
  {validation.isValid ? 'Save Block' : 'Fix Errors First'}
</button>
```

---

## Best Practices

1. **Before Publishing:** Click Edit to review page
2. **Check for Warnings:** Yellow messages appear at top
3. **Fix Errors First:** Red errors block everything
4. **Test Links:** Try clicking a link after publishing
5. **Add Alt Text:** Required for accessibility

---

**For detailed documentation, see:** [CMS_FORM_VALIDATION_GUIDE.md](CMS_FORM_VALIDATION_GUIDE.md)
