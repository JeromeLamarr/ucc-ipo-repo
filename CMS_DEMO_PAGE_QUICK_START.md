# 🚀 CMS Demo Page - Quick Setup Guide

## Overview
This guide helps you create a comprehensive demo page with **all 8 CMS section types** to test every feature including the new **image upload functionality**.

---

## What's Included

✅ **Hero Section** - Banner with background image upload  
✅ **Features Section** - 4 feature cards with icon colors  
✅ **Steps Section** - 4-step process flow  
✅ **Categories Section** - 5 IP type categories  
✅ **Text Section** - Rich text with formatting options  
✅ **Showcase Section** - 3 items with image upload  
✅ **Gallery Section** - 3 image gallery with upload  
✅ **CTA Section** - Call-to-action button  

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Create Demo Page Data

1. Open **Supabase Dashboard** → Your Project
2. Go to **SQL Editor** 
3. Click **New Query**
4. Copy & paste the SQL from: `CREATE_CMS_DEMO_PAGE.sql`
5. Click **Run**

**Result**: Demo page with 7 sections created (images empty initially)

---

### Step 2: Access CMS Editor

1. Go to your app: `http://localhost:5173/dashboard`
2. Navigate to **Public Pages**
3. Click **Edit** on "CMS Demo - All Sections"
4. You'll see all 8 sections ready to edit

---

### Step 3: Test Image Upload (Optional but Recommended)

#### Upload to Hero Section:
1. Click **Edit** on Hero Block
2. Scroll to "Background Image"
3. Click **Upload Image**
4. Select: `C:\Users\delag\Downloads\IMG_0977.jpg`
5. **Save** - Image appears behind hero text!

#### Upload to Gallery Section:
1. Click **Edit** on Gallery Block  
2. For each image, click **Upload Image**
3. Select the sample image
4. Add captions:
   - Image 1: "Main Office Building"
   - Image 2: "Research Facilities"
   - Image 3: "Expert Team"
5. **Save** - Gallery displays with images!

#### Upload to Showcase Section:
1. Click **Edit** on Showcase Block
2. For each item, click **Upload Image**
3. Select the sample image for all 3 items
4. **Save** - Showcase displays with images!

---

## 📋 Section Testing Checklist

### Hero Section ✨
- [ ] Headline displays correctly
- [ ] Highlighted text appears in blue
- [ ] Subheadline shows
- [ ] Button visible and clickable
- [ ] Background image appears behind text

### Features Section 📊
- [ ] 4 feature cards display in grid
- [ ] Each has icon, title, and description
- [ ] Icons have different colors (blue, purple, green, orange)
- [ ] Responsive: 4 columns → 2 → 1 on smaller screens

### Steps Section 📈
- [ ] 4 steps display with numbers
- [ ] Steps arranged horizontally
- [ ] Each step shows label and description
- [ ] Mobile: steps stack vertically

### Categories Section 📂
- [ ] 5 categories display
- [ ] Patents, Trademarks, Copyright, Trade Secrets, Designs
- [ ] Each shows name and description
- [ ] Grid layout responsive

### Text Section 📝
- [ ] Section title displays
- [ ] Long text content renders properly
- [ ] Light gray background appears
- [ ] Dividers above and below section
- [ ] Text is readable

### Showcase Section 🎪
- [ ] 3 items display with images (if uploaded)
- [ ] Each shows title and description
- [ ] Images scale to 400x300px
- [ ] Responsive layout on mobile

### Gallery Section 🖼️
- [ ] 3 images display in grid
- [ ] Images have captions below
- [ ] Gallery responsive: 3 columns → 1
- [ ] Alt text accessible (inspect element)

### CTA Section 🎯
- [ ] Heading displays
- [ ] Description text shows
- [ ] "Start Your IP Journey" button visible
- [ ] Button navigates to /register

---

## 🎨 Customization Ideas

After testing, try these customizations:

### Change Colors
- Edit Features section: Change icon colors
- Edit CTA section: Change background color

### Update Content
- Edit Text section: Add your own information
- Edit Showcase items: Update titles and descriptions
- Edit Steps: Customize the process flow

### Replace Images
- Use different images for each section
- Test with various image sizes
- Try portrait, landscape, and square images

### Add More Sections
- Duplicate any section to test duplication
- Reorder sections to test drag-and-drop
- Delete a section to test removal

---

## 📸 Sample Image Details

**File**: `IMG_0977.jpg`  
**Location**: `C:\Users\delag\Downloads\`  
**Dimensions**: Landscape (3024 x 4032 pixels)  
**Size**: ~2.6 MB  
**Best used for**:
- Hero background (will crop/scale)
- Object/product showcase items
- Gallery display photos

---

## 🌐 Accessing the Demo Page

### View Example:
```
http://localhost:5173/pages/demo
```

### After Publishing:
```
https://yourdomain.com/pages/demo
```

---

## ✅ Features Demonstrated

| Feature | Section | Status |
|---------|---------|--------|
| Text editing | Hero, Features, Text | ✅ |
| Image upload | Hero, Showcase, Gallery | ✅ |
| Button links | Hero, CTA | ✅ |
| Grid layouts | Features, Categories | ✅ |
| Sequential display | Steps | ✅ |
| Rich text | Text Section | ✅ |
| Color selection | Features | ✅ |
| Image positioning | Gallery | ✅ |
| Responsive design | All sections | ✅ |

---

## 🚀 Production Checklist

Before deploying the demo page:

- [ ] Test all sections display correctly
- [ ] Images load and display properly
- [ ] Mobile responsive verified
- [ ] All links work
- [ ] Page published (not draft)
- [ ] Backup taken before major changes

---

## 📞 Support

If you encounter issues:

1. **Images not uploading?**
   - Check Supabase storage bucket `cms-images` exists
   - Verify RLS policies are set up
   - Ensure user is authenticated

2. **Sections not saving?**
   - Check browser console for errors
   - Verify database connection
   - Try refreshing the page

3. **Images not displaying?**
   - Check image URLs in database
   - Verify storage URLs are accessible
   - Check browser cache (Ctrl+Shift+Del)

---

## 📚 Additional Resources

- **Testing Guide**: `CMS_DEMO_PAGE_TESTING_GUIDE.md`
- **SQL Script**: `CREATE_CMS_DEMO_PAGE.sql`
- **Component Docs**: See source code inline comments

---

**Created**: February 13, 2026  
**Last Updated**: Version 1.0  
**Status**: Ready for Testing ✅
