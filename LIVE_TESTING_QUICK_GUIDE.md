# 🎯 Live Website Testing - Quick Start Guide

## ⚡ 30-Second Overview

The new **Academic Presentation Materials** workflow has 4 simple phases:

```
1️⃣ ADMIN REQUESTS
   Admin clicks "Request Materials" button
   
2️⃣ APPLICANT UPLOADS
   Applicant uploads 2 files (poster + paper)
   
3️⃣ SUBMISSION COMPLETE
   Admin sees submission, can download files
   
4️⃣ MARK COMPLETED
   Admin clicks "Mark as Completed" to progress workflow
```

---

## 🧪 How to Test (15 minutes total)

### **PHASE 1: Admin Request** (2 minutes)

**Where:** Submission Detail Page → Admin Actions section

```
1. Log in as ADMIN
2. Go to Dashboard → All Records
3. Find a record in "academic_presentation_materials" stage
4. Click to open detail page
5. Scroll down → "REQUEST PRESENTATION MATERIALS" section
6. Click [Request Materials] button
   ✅ Status changes to "Materials Requested"
   ✅ Timestamp shows
   ✅ Button disables
```

**What you'll see:**
```
┌─────────────────────────────────────┐
│ REQUEST PRESENTATION MATERIALS      │
├─────────────────────────────────────┤
│ Status: Materials Requested         │
│ Applicant: John Doe                 │
│ Email: john@university.edu          │
│ Requested: Jan 20, 2026 @ 2:30 PM  │
│ [Request Materials] ← GRAYED OUT    │
└─────────────────────────────────────┘
```

---

### **PHASE 2: Applicant Upload** (5 minutes)

**Where:** Submission Detail Page → Upload section

```
1. Log in as APPLICANT (who owns the record)
2. Go to My Submissions
3. Click on record marked "Awaiting Materials"
4. Scroll down → "UPLOAD PRESENTATION MATERIALS" section
5. You'll see two drop zones:
   • Scientific Poster (JPG/PNG, 10MB max)
   • IMRaD Short Paper (PDF/DOCX, 5MB max)
```

**Upload Files:**
```
1. Click or drag poster file → poster.png appears ✓
2. Click or drag paper file → paper.pdf appears ✓
3. [Submit Materials] button becomes BLUE (enabled)
4. Click [Submit Materials]
   ✅ Files upload with progress bar
   ✅ Success message appears
   ✅ Download links appear
```

**What you'll see:**
```
BEFORE FILES SELECTED:
┌─────────────────────────────────────┐
│ [Drop Poster Here]                  │
│ [Drop Paper Here]                   │
│                                     │
│ [Submit Materials] ← GRAYED OUT    │
└─────────────────────────────────────┘

AFTER FILES SELECTED:
┌─────────────────────────────────────┐
│ ✓ poster.png (2.5MB)                │
│ ✓ paper.pdf (3.8MB)                │
│                                     │
│ [Submit Materials] ← BLUE!         │
└─────────────────────────────────────┘

AFTER SUBMITTED:
┌─────────────────────────────────────┐
│ ✓ poster.png (2.5MB) [Download]     │
│ ✓ paper.pdf (3.8MB) [Download]      │
│                                     │
│ Status: Submitted Successfully ✓    │
└─────────────────────────────────────┘
```

---

### **PHASE 3: Admin Views Submission** (2 minutes)

**Where:** Submission Detail Page → Admin section

```
1. Log in as ADMIN
2. Open same record detail page
3. Scroll to "REQUEST PRESENTATION MATERIALS"
4. You'll now see:
   ✅ Status: "Materials Submitted"
   ✅ Submission date/time
   ✅ File download links
   ✅ [Download] button for each file
```

---

### **PHASE 4: Mark as Completed** (2 minutes)

**Where:** Submission Detail Page → Admin Actions

```
BEFORE MATERIALS:
[Mark as Completed] ← DISABLED (gray)
⚠️  "Materials must be submitted first"

AFTER MATERIALS:
[Mark as Completed] ← ENABLED (blue)
✅ "All materials submitted"

1. Click [Mark as Completed]
   ✅ Status changes to "Completed"
   ✅ Workflow advances to next stage
   ✅ Can now generate certificates
```

---

## ✅ Quick Checklist

### **Admin Actions**
- [ ] Can see "Request Materials" button
- [ ] Button click works
- [ ] Status changes to "Requested"
- [ ] Can see uploaded files
- [ ] "Mark as Completed" button enabled after upload

### **Applicant Actions**
- [ ] Sees upload form
- [ ] Can select files
- [ ] Submit button enables with valid files
- [ ] Upload completes successfully
- [ ] Gets success message

### **Database**
- [ ] presentation_materials table shows records
- [ ] Status transitions work
- [ ] Timestamps recorded
- [ ] File URLs stored

### **Security**
- [ ] Applicants can only see own records
- [ ] Admins can see all records
- [ ] Unauthenticated users blocked

---

## 🔍 What to Look For

### **Success Indicators** ✅
- Components render correctly
- Status updates in real-time
- Files upload to storage
- No console errors
- Buttons enable/disable properly
- Timestamps accurate

### **Potential Issues** ⚠️
- Missing components (not rendering)
- Upload failures
- Database errors
- RLS permission issues
- File storage not working
- Console errors

---

## 📱 Testing on Different Devices

### **Desktop Browser**
```
✓ Full page visibility
✓ Drag-and-drop works
✓ All buttons accessible
✓ Good for detailed testing
```

### **Mobile Browser**
```
✓ Touch-friendly file selection
✓ Responsive layout
✓ Progress indicators visible
✓ Good for UX testing
```

---

## 🚨 If You See Issues

### **"Component not showing"**
```
Check:
1. Are you on the right page?
   → Submission Detail Page (not dashboard)
2. Is stage correct?
   → current_stage must be 'academic_presentation_materials'
3. Are you the right user?
   → Admin or applicant owner
```

### **"Upload fails"**
```
Check:
1. File size within limits?
   → Poster: max 10MB, Paper: max 5MB
2. File format correct?
   → Poster: JPG/PNG, Paper: PDF/DOCX
3. Storage bucket exists?
   → Supabase Dashboard → Storage
```

### **"Can't see applicant uploads as admin"**
```
Solution:
1. Refresh the page
2. Check if materials were submitted
3. Look in browser console for errors
```

---

## 📊 Expected User Journey

### **Admin's Journey**
```
Admin Dashboard
   ↓
Select IP Record
   ↓
Detail Page opens
   ↓
Sees "Request Materials" button
   ↓
Clicks button
   ↓
✓ Status changes to "Requested"
   ↓
[Waits for applicant to upload]
   ↓
Refreshes page
   ↓
✓ Sees files uploaded
   ↓
Clicks "Mark as Completed"
   ↓
✓ Workflow progresses
```

### **Applicant's Journey**
```
My Submissions
   ↓
Sees "Awaiting Materials" badge
   ↓
Clicks record
   ↓
Detail Page opens
   ↓
Sees "Upload Materials" form
   ↓
Drags/selects poster file
   ↓
Drags/selects paper file
   ↓
Clicks "Submit Materials"
   ↓
✓ Files upload with progress
   ↓
✓ Success message appears
   ↓
✓ Download links appear
   ↓
[Admin can now view]
```

---

## 🎬 Real-Time Collaboration Test

**Two Simultaneous Users:**

```
User 1 (Admin)                User 2 (Applicant)
Opens detail page      ←→     
                               Opens detail page
Requests materials     ←→     
                               Sees upload form
                               Uploads files
Refreshes page         ←→     
✓ Sees files           ←→     ✓ Sees success
Marks completed        ←→     
                               Sees "Completed" status
```

---

## 🏁 How to Know It's Working

### **All Green Light Indicators** 🟢
- ✅ Components appear on page
- ✅ Admin button works
- ✅ Applicant can upload
- ✅ Files appear in storage
- ✅ Admin sees submission
- ✅ Completion button enables
- ✅ Status changes propagate
- ✅ No console errors

### **Ready for Production** 🚀
If all indicators are green, you're ready to:
1. Deploy to production
2. Enable for all users
3. Train support team
4. Monitor usage

---

## 📞 Quick Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| Component hidden | Stage name | Must be `academic_presentation_materials` |
| Upload fails | File size | Poster <10MB, Paper <5MB |
| No storage | Bucket name | Must be `presentation-materials` |
| Can't see files | RLS policy | Must be admin or file owner |
| Button disabled | Requirements | Admin: all permissions, Applicant: both files |

---

## 🎯 Testing Priority Order

1. **Admin Request** (Critical)
2. **Applicant Upload** (Critical)
3. **File Storage** (Critical)
4. **Completion Gating** (Important)
5. **Real-time Updates** (Nice-to-have)
6. **Error Handling** (Edge cases)

---

## ✨ Success = Workflow Progresses Smoothly

```
Not Requested → Requested → Submitted → Completed
                                            ↓
                                       Next Stage
                                       Unlocked
```

When all three transitions work without errors, **you're done testing!** 🎉

---

**Ready to test?** Start with Phase 1 and work through all 4 phases.

Document any issues and we can fix them in minutes!

Good luck! 🚀
