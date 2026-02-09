# CMS Page Management Guide

## Overview
You can now manage the content of your home/landing page and any other public pages through a comprehensive CMS editor. No coding required!

## How to Access

1. **For Admins**: Go to Dashboard → **Public Pages** menu
2. Click the **Create Page** button or click the **Edit** (pencil icon) button on any existing page
3. This takes you to the **Page Editor**

## Managing the Home Page

The home/landing page is automatically created with a default landing template when you first access the system. You can edit it anytime:

1. Go to **Dashboard** → **Public Pages**
2. Find "Home" in the pages list
3. Click the **Edit** button (blue pencil icon)

## Page Editor Features

### Adding Sections

1. Scroll to the bottom of the page editor
2. Click on the section type you want to add:
   - **🦸 Hero Section** - Large headline with CTA button (perfect for landing pages)
   - **✨ Features Grid** - Display key features with icons
   - **📋 Steps/Process** - Show a step-by-step process
   - **📂 Categories** - List categories or topics
   - **📝 Text Block** - Add custom HTML content
   - **🎯 Call to Action** - Standalone CTA section

### Editing Sections

1. Click on any section card to expand it
2. Edit the content fields:
   - **Hero Section**: Headline, highlight text, description, button text, button link
   - **Text Block**: Raw HTML content (supports p, h1-h6, strong, em, a, ul, ol, li)
3. Click **Save Changes** to update
4. Click **Cancel** to discard changes

### Reordering Sections

1. While editing a section, use the arrow buttons at the top:
   - **↑ Up Arrow** - Move section up on page
   - **↓ Down Arrow** - Move section down on page
2. Changes are saved immediately

### Deleting Sections

1. Click the **trash icon** (red) on any section
2. Confirm deletion
3. Section is removed and others reorder automatically

## Publishing Your Page

### To Publish (Make Live)
1. In the **Public Pages** list, find your page
2. Click the **Eye** icon (blue eye)
3. Page is now visible to the public at `/pages/{page-slug}`

### To Unpublish (Hide)
1. Click the **Eye** icon again (now shows as crossed eye)
2. Page is no longer accessible to public

### Publishing Requirements
Before publishing, make sure:
- ✓ At least one section exists
- ✓ No validation errors shown
- ✓ All required fields are filled

## Creating New Pages

### Step 1: Create Page
1. Go to **Public Pages**
2. Click **Create Page**
3. Enter page title (e.g., "About Us")
4. URL slug auto-generates (e.g., "about-us")
5. Choose template:
   - **Blank** - Start empty, add sections as needed
   - **Landing** - Pre-filled with hero + features template
6. Click **Create**

### Step 2: Edit Content
1. Click **Edit** on your new page
2. Add and customize sections
3. Reorder as needed

### Step 3: Publish
1. Click the **Eye icon** to publish
2. Page is now live at `/pages/{slug}`

## Section Templates Reference

### Hero Section
Used for main landing page banners
```
- Headline: Main title
- Highlight: Bold emphasized text
- Subheadline: Description/subtitle
- CTA Button: Action button text + link
```

### Features Grid
Showcase 3+ key features
```
- Feature Title
- Feature Description
- Icon background color
- Icon color
```

### Text Block
Custom HTML content
```
- Supports HTML tags: p, h1-h6, strong, em, a, ul, ol, li
- Raw HTML editing
- Auto-sanitized for security
```

### Call to Action
Standalone action section
```
- Headline
- Button text + link
```

## Best Practices

✅ **Do:**
- Use clear, concise headlines
- Keep descriptions under 200 characters
- Test your links before publishing
- Use consistent branding colors
- Preview before publishing

❌ **Don't:**
- Leave sections empty
- Use excessive HTML
- Test links on published pages
- Overload with too many sections
- Change slugs after publishing (breaks links)

## Viewing Published Pages

Published pages appear at:
- **Home page**: `/` (root)
- **Other pages**: `/pages/{slug}`

Example:
- About Us → `/pages/about-us`
- Terms of Service → `/pages/terms-of-service`

## Troubleshooting

### Can't Publish Page
**Error**: "Cannot publish: Hero section missing required field"
**Solution**: Check each section for empty required fields. Click Edit and fill in all fields.

### Section Not Appearing
**Check**: Is the page published? (Click Eye icon)
**Fix**: Publish the page or edit it and check for errors

### Changes Not Saving
**Fix**: 
1. Check browser console for errors (F12)
2. Try clicking Save again
3. Refresh page and try again
4. Check database connection

## Admin Tips

### Managing Multiple Pages
- Create pages for: About, FAQ, Terms, Privacy, Contact, etc.
- Use consistent naming: lowercase, hyphens (e.g., "faq-page")
- Keep slug names short for easier URLs

### Content Organization
- Put most important info at top (Hero)
- Features section below headline
- CTA at bottom or middle
- Text sections for details

### Performance
- Limit to 5-10 sections per page
- Use concise content (shorter = faster)
- Optimize images before uploading

## Advanced

### Home Page Customization
The home page automatically includes:
- Dynamic logo (from branding settings)
- Site name (from branding settings)
- Primary color (from branding settings)

When you edit the home page, it displays these automatically.

### Database Structure
Pages stored in `cms_pages` table:
- `id` - Unique identifier
- `slug` - URL-friendly name
- `title` - Display name
- `is_published` - Visibility flag
- `created_at` - Creation timestamp

Sections stored in `cms_sections` table:
- `id` - Unique identifier
- `page_id` - Parent page
- `section_type` - Hero, features, text, etc.
- `content` - JSON data
- `order_index` - Display order

## Support

For issues or questions:
1. Check this guide first
2. Contact your administrator
3. Check browser console for error messages
