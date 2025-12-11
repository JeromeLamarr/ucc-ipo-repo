# 🎓 UCC Logo Upload Guide

The certificate design now includes:
- ✅ **UCC Logo** in the top-left corner (60x60 px)
- ✅ **Watermark** in background (10% opacity, center-bottom)

Both require the logo image to be uploaded to Supabase Storage in the `assets` bucket.

## 📋 Quick Steps

### **Option 1: Upload via Supabase Dashboard (Recommended)**

1. **Go to Supabase Dashboard**
   - Login to [app.supabase.com](https://app.supabase.com)
   - Select your project: `ucc-ipo-repo`

2. **Navigate to Storage**
   - Click "Storage" in left sidebar
   - You should see an `assets` bucket (if not, create it)

3. **Upload the Logo**
   - Click the `assets` bucket
   - Click "Upload file"
   - Select: `C:\Users\delag\Desktop\ucc ipo\ucc_logo.png`
   - Make sure filename is: `ucc_logo.png`
   - Click "Upload"

4. **Verify Upload**
   - You should see the file listed in the bucket
   - No need to change permissions (public access fine)

5. **Regenerate a Certificate**
   - Go back to the app
   - Click "Regenerate" on an existing certificate
   - The new certificate will include the logo!

---

### **Option 2: Upload via Supabase CLI**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Create assets bucket if it doesn't exist
supabase storage create assets

# Upload the logo
supabase storage upload assets "C:\Users\delag\Desktop\ucc ipo\ucc_logo.png" --local
```

---

### **Option 3: Upload via Script**

```bash
# Set environment variables
set VITE_SUPABASE_URL=your-supabase-url
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run upload script
node scripts/upload-logo.js
```

---

## ✨ What Happens After Upload

When a certificate is generated:

1. **Logo Header** (60x60 px)
   - Displays in top-left corner
   - Replaces "UCC" placeholder text
   - Shows actual UCC seal/emblem

2. **Watermark**
   - Faint (10% opacity) in center-bottom
   - Provides subtle branding
   - Prevents unauthorized copying
   - Doesn't interfere with text readability

3. **Fallback**
   - If logo file not found: shows "UCC" placeholder
   - Certificate still generates successfully
   - No errors or broken PDFs

---

## 🔍 Verify It's Working

After uploading the logo:

1. **Generate a test certificate** (as admin)
2. **Download the PDF**
3. **Check for:**
   - ✅ UCC logo in top-left corner
   - ✅ Subtle watermark in background
   - ✅ All other content unchanged

---

## 📍 Logo Storage Path

After upload, the logo will be at:
```
Supabase Storage → assets bucket → ucc_logo.png
```

URL (if public):
```
https://[your-supabase-url]/storage/v1/object/public/assets/ucc_logo.png
```

---

## 🎨 Logo Requirements

- **Format**: PNG with transparency preferred
- **Size**: Recommend 200x200 px or larger
- **Resolution**: 72+ DPI for print quality
- **Colors**: RGB or CMYK
- **Background**: Transparent background preferred

---

## ⚙️ Technical Details

### Certificate Code Changes
The `generate-certificate/index.ts` function now:

```typescript
// 1. Attempts to fetch logo from Supabase Storage
const logoData = await supabase.storage
  .from("assets")
  .download("ucc_logo.png");

// 2. Embeds as header image (60x60 px, top-left)
page.drawImage(logoImage, {
  x: margin + 10,
  y: yPosition - 50,
  width: 60,
  height: 60,
});

// 3. Embeds as watermark (300x300 px, 10% opacity, center)
page.drawImage(logoImage, {
  x: width / 2 - 150,
  y: borderY + 150,
  width: 300,
  height: 300,
  opacity: 0.1,
});

// 4. Falls back to "UCC" text if logo not found
```

### Error Handling
- ✅ If logo not found: uses "UCC" placeholder, no error
- ✅ If upload fails: certificate still generates
- ✅ Graceful degradation throughout

---

## 🚀 Next Steps

1. **Upload the logo** using one of the options above
2. **Regenerate a certificate** to test
3. **Verify** logo appears in header and as watermark
4. **Done!** Certificates now include UCC branding

---

## ❓ Troubleshooting

**Logo not appearing?**
- [ ] Check file exists at correct path in Supabase
- [ ] Verify filename is exactly `ucc_logo.png`
- [ ] Check bucket is named `assets`
- [ ] Regenerate certificate after upload (may need to wait 1-2 mins)

**"UCC" text still showing instead of logo?**
- [ ] Logo file may not be uploaded yet
- [ ] Check Supabase Storage → assets bucket
- [ ] Try uploading again

**Certificate generation failing?**
- [ ] Check browser console for errors
- [ ] Check Supabase function logs
- [ ] Verify Supabase credentials are correct

---

## 📞 Support

For issues:
1. Check Supabase dashboard logs
2. Verify logo file format and size
3. Check function error logs in Supabase
4. Contact development team with error details

---

**Last Updated**: December 12, 2025
**Commit**: 6a5867b
