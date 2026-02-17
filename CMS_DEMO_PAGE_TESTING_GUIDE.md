# CMS Demo Page - Complete Testing Guide

## Overview
This guide walks you through creating and testing a comprehensive CMS demo page that includes all available section types with full feature testing.

## Quick Start

### Option 1: Using the Setup Script (Recommended)
The automated setup will upload the image and create all sections.

```bash
cd "c:\Users\delag\Desktop\ucc ipo\project"
node setup-demo-page.js
```

### Option 2: Manual Setup via UI

#### Step 1: Create the Demo Page
1. Navigate to the CMS Admin Dashboard
2. Go to **Public Pages** section
3. Click **Create Page**
4. Fill in:
   - **Title**: `CMS Demo - All Sections`
   - **Slug**: `demo`
   - **Description**: `Comprehensive demo page showcasing all available CMS sections and features`
5. Click **Create** and then **Publish**

#### Step 2: Add Sections
The demo page includes 8 section types. Add them in this order:

---

## Section Testing Guide

### 1️⃣ HERO SECTION (Main Banner)
**Purpose**: Eye-catching landing banner with headline and CTA

**Features to Test**:
- ✅ Headline text
- ✅ Highlighted text (appears in primary color)
- ✅ Subheadline description
- ✅ Button text and link
- ✅ **NEW: Background image upload** ⭐

**Setup Instructions**:
1. Click **Add New Block** → Select **Hero Section**
2. Fill in:
   - Headline: `Welcome to`
   - Highlighted Text: `UCC IP Management System`
   - Subheadline: `A comprehensive platform for managing intellectual property, protecting innovation, and promoting excellence across the university`
   - Button Text: `Get Started`
   - Button Link: `/register`
3. **Upload Background Image**:
   - Click **Upload Image** under "Background Image"
   - Select the sample image: `C:\Users\delag\Downloads\IMG_0977.jpg`
   - Verify the image displays in preview
4. Save and refresh to see the hero section render with background

**Expected Result**: ✨
- Hero section displays with your headline
- Background image appears as the banner background
- Button is clickable and styled correctly

---

### 2️⃣ FEATURES SECTION (Grid Layout)
**Purpose**: Showcase 4 key features with icons and descriptions

**Features to Test**:
- ✅ Multiple feature items (4 in this demo)
- ✅ Feature title and description
- ✅ Icon color selection
- ✅ Responsive grid layout

**Setup Instructions**:
1. Click **Add New Block** → Select **Features Grid**
2. Add 4 features:

**Feature 1 - Secure Storage**
   - Title: `Secure Storage`
   - Description: `Enterprise-grade security for your IP documents and records`
   - Icon Color: **Blue** (bg-blue-100, text-blue-600)

**Feature 2 - Easy Management**
   - Title: `Easy Management`
   - Description: `Intuitive interface to manage and track all intellectual property`
   - Icon Color: **Purple** (bg-purple-100, text-purple-600)

**Feature 3 - Real-time Analytics**
   - Title: `Real-time Analytics`
   - Description: `Monitor submissions, approvals, and evaluation progress in real-time`
   - Icon Color: **Green** (bg-green-100, text-green-600)

**Feature 4 - Collaboration Tools**
   - Title: `Collaboration Tools`
   - Description: `Work seamlessly with supervisors, evaluators, and stakeholders`
   - Icon Color: **Orange** (bg-orange-100, text-orange-600)

**Expected Result**: ✨
- 4-column responsive grid appears
- Each feature shows icon with selected color, title, and description
- Grid responsive on mobile (2x2 → 1x4)

---

### 3️⃣ STEPS SECTION (Process Flow)
**Purpose**: Display a step-by-step workflow

**Features to Test**:
- ✅ Multiple step items
- ✅ Step numbering
- ✅ Descriptions and labels
- ✅ Sequential layout

**Setup Instructions**:
1. Click **Add New Block** → Select **Steps/Process**
2. Title: `How It Works`
3. Add 4 steps:

| # | Label | Description |
|---|-------|-------------|
| 1 | Register & Login | Create your account and log in to the system |
| 2 | Submit IP Record | Fill out the IP disclosure form with all required information |
| 3 | Expert Review | Submit for evaluation and feedback from IP experts |
| 4 | Decision & Next Steps | Receive decision and guidance on protecting your innovation |

**Expected Result**: ✨
- 4-step process displayed with numbers
- Steps arranged horizontally (desktop) or vertically (mobile)
- Each step shows number, label, and description

---

### 4️⃣ SHOWCASE SECTION (Featured Items with Images) ⭐
**Purpose**: Display featured items with images - TESTS NEW UPLOAD FEATURE

**Features to Test**:
- ✅ Multiple showcase items
- ✅ **NEW: Image upload for each item** ⭐
- ✅ Image dimensions (width/height)
- ✅ Image positioning
- ✅ Title and description

**Setup Instructions**:
1. Click **Add New Block** → Select **Showcase**
2. Title: `Our Success Stories`
3. Add 3 items:

**Item 1 - Patent for Advanced Robotics**
   - Title: `Patent for Advanced Robotics`
   - Description: `Successfully filed a patent for an innovative robotics system developed by our engineering department`
   - **Upload Image**: Click "Upload Image" → Select `IMG_0977.jpg`
   - Width: 400px, Height: 300px
   - Position: Center

**Item 2 - Medical Device Innovation**
   - Title: `Medical Device Innovation`
   - Description: `Created a trademark for a groundbreaking medical diagnostic tool`
   - **Upload Image**: Click "Upload Image" → Select `IMG_0977.jpg`
   - Width: 400px, Height: 300px
   - Position: Center

**Item 3 - Software Framework**
   - Title: `Software Framework`
   - Description: `Copyrighted a comprehensive open-source software framework used by developers worldwide`
   - **Upload Image**: Click "Upload Image" → Select `IMG_0977.jpg`
   - Width: 400px, Height: 300px
   - Position: Center

**Expected Result**: ✨
- 3 showcase items displayed with images
- Images uploaded successfully via MediaPicker
- Images display with correct dimensions
- Responsive layout on mobile

---

### 5️⃣ CATEGORIES SECTION
**Purpose**: Display service categories

**Features to Test**:
- ✅ Multiple category items
- ✅ Category name and description
- ✅ Grid layout

**Setup Instructions**:
1. Click **Add New Block** → Select **Categories**
2. Title: `Intellectual Property Types`
3. Add 5 categories:

| Name | Description |
|------|-------------|
| Patents | Protect your inventions and technological innovations |
| Trademarks | Safeguard your brand identity and logos |
| Copyright | Register and protect creative works |
| Trade Secrets | Manage and protect confidential business information |
| Designs | Protect industrial designs and aesthetic creations |

**Expected Result**: ✨
- 5 categories displayed in grid
- Each shows name and description
- Responsive on mobile devices

---

### 6️⃣ TEXT SECTION (Informational Content)
**Purpose**: Display rich text content with formatting options

**Features to Test**:
- ✅ Long-form text content
- ✅ Text alignment (left/center)
- ✅ Content width options
- ✅ Background styles
- ✅ Optional dividers

**Setup Instructions**:
1. Click **Add New Block** → Select **Text Section**
2. Title: `About IP Protection`
3. Body Content:
```
Intellectual Property (IP) is the product of human creativity and innovation. It includes inventions, literary and artistic works, designs, and symbols used in commerce. Protecting your IP is crucial for maintaining competitive advantage, attracting investors, and ensuring your innovations benefit you and your organization.

At the University of Caloocan City, we are committed to supporting faculty, students, and researchers in protecting and commercializing their intellectual property. Our state-of-the-art management system makes it easy to disclose, evaluate, and manage all types of IP.
```
4. Settings:
   - Text Alignment: **Left**
   - Content Width: **Normal**
   - Background Style: **Light Gray**
   - Show Dividers: **Yes**

**Expected Result**: ✨
- Text displays with light gray background
- Dividers appear above and below section
- Normal max-width applied (800px)
- Responsive text on mobile

---

### 7️⃣ GALLERY SECTION (Image Gallery) ⭐
**Purpose**: Display multiple images - TESTS NEW UPLOAD FEATURE

**Features to Test**:
- ✅ Multiple images with **NEW: Upload feature** ⭐
- ✅ Alt text for accessibility
- ✅ Image captions
- ✅ Image position adjustment (drag)
- ✅ Responsive grid

**Setup Instructions**:
1. Click **Add New Block** → Select **Image Gallery**
2. Gallery Title: `Gallery`
3. Add 3 images: (all using the same sample image for demo)

**Image 1**:
   - **Upload Image**: Click "Upload Image" → Select `IMG_0977.jpg`
   - Alt Text: `UCC IP Office Building`
   - Caption: `Main Office Building`
   - Click on the image and drag to adjust the view position

**Image 2**:
   - **Upload Image**: Click "Upload Image" → Select `IMG_0977.jpg`
   - Alt Text: `Research Lab`
   - Caption: `State-of-the-art Research Facilities`

**Image 3**:
   - **Upload Image**: Click "Upload Image" → Select `IMG_0977.jpg`
   - Alt Text: `Team Meeting`
   - Caption: `Expert Evaluation Team`

**Expected Result**: ✨
- 3 images uploaded successfully via MediaPicker
- Images display in responsive grid (3 columns desktop, 1 mobile)
- Captions appear below each image
- Image position adjustment works when dragging
- Responsive layout maintained

---

### 8️⃣ CTA SECTION (Call to Action)
**Purpose**: Prominent call-to-action button section

**Features to Test**:
- ✅ Heading text
- ✅ Description
- ✅ Button text and link
- ✅ Background styling

**Setup Instructions**:
1. Click **Add New Block** → Select **Call to Action**
2. Fill in:
   - Heading: `Ready to Protect Your Innovation?`
   - Description: `Join hundreds of faculty members and students who have already secured their intellectual property through our platform.`
   - Button Text: `Start Your IP Journey`
   - Button Link: `/register`

**Expected Result**: ✨
- CTA section displays with heading and description
- Button is prominently visible
- Click button navigates to `/register`
- Section has attractive background styling

---

## Testing Checklist

### ✅ All Features Tested
- [ ] Hero section with background image upload
- [ ] Features grid with 4 items and color selection
- [ ] Steps process with 4 sequential steps
- [ ] Showcase section with 3 items + image uploads
- [ ] Categories section with 5 categories
- [ ] Text section with formatting and background
- [ ] Gallery with 3 images + image uploads
- [ ] CTA section with button

### ✅ Image Upload Features (NEW)
- [ ] Hero section background image uploads successfully
- [ ] Showcase section images upload successfully
- [ ] Gallery section images upload successfully
- [ ] Images display with correct dimensions
- [ ] Image preview appears before saving
- [ ] Drag-to-position works for gallery images
- [ ] Images persist after page refresh

### ✅ Responsive Testing
- [ ] Layout works on desktop (1920px)
- [ ] Layout works on tablet (768px)
- [ ] Layout works on mobile (375px)
- [ ] Images scale properly on all screen sizes
- [ ] Text is readable on all devices

### ✅ Functionality Testing
- [ ] All sections save successfully
- [ ] Sections display in correct order
- [ ] Section reordering works
- [ ] Section duplication works
- [ ] Section deletion works
- [ ] Page publishes successfully
- [ ] Published page renders correctly

---

## Accessing the Demo Page

### Development
```
http://localhost:5173/pages/demo
```

### Production
```
https://yourdomain.com/pages/demo
```

---

## Troubleshooting

### Image Upload Issues
**Problem**: "Image upload failed" error
**Solution**:
1. Ensure Supabase storage bucket `cms-images` exists
2. Check RLS policies are correctly configured
3. Verify user is authenticated
4. Run: `CREATE_CMS_DEMO_PAGE.sql` to set up storage

### Sections Not Appearing
**Problem**: Sections created but not displaying on page
**Solution**:
1. Verify page is published (status should be "Published")
2. Check section `order_index` values are sequential (0, 1, 2...)
3. Refresh page in browser
4. Check browser console for errors

### Image Dimensions Wrong
**Problem**: Images appear stretched or squished
**Solution**:
1. Ensure width/height values are reasonable (100-800px)
2. For square images: set width = height
3. Adjust `image_position` to match content

---

## Performance Notes

- **Image Optimization**: All images are cached with 1-hour cache control
- **Page Load**: Demo page with 8 sections loads ~2-3 seconds
- **Image Size**: Recommended max 5MB per image
- **Batch Operations**: All sections created in single database operation for performance

---

## Support & Next Steps

After testing the demo page:

1. **Production Deployment**
   - Test on staging environment first
   - Verify all images display correctly
   - Check responsive design on devices

2. **Content Creation**
   - Use demo page as template
   - Create your own pages with custom content
   - Upload high-quality images

3. **Feature Requests**
   - Additional section types needed?
   - More image editing options?
   - Custom styling needs?
   - Report issues in GitHub

---

Generated: February 13, 2026
Last Updated: Version 1.0
