# PowerShell Deployment Guide - Applicant Approval Bug Fix

**If you're using PowerShell in VS Code, copy and paste the exact commands below.**

---

## ⚠️ Problem with `&&` in PowerShell

The `&&` operator doesn't work the same way in PowerShell as it does in Bash/CMD.

```powershell
# ❌ This WILL FAIL in PowerShell 5.1
npm run build && npm run deploy

# Error: The token '&&' is not a valid statement separator
```

**Solution:** Use PowerShell-native conditional syntax instead.

---

## ✅ 3 DEPLOYMENT WORKFLOWS

### **Option 1: One-liner (Recommended for quick deployment)**

Copy and paste this exactly into PowerShell:

```powershell
npm run build; if ($LASTEXITCODE -eq 0) { npm run deploy } else { Write-Host "Build failed!" -ForegroundColor Red }
```

**What it does:**
1. Runs `npm run build`
2. Checks if build succeeded (exit code = 0)
3. If YES → runs `npm run deploy`
4. If NO → stops and shows red error message

---

### **Option 2: Step-by-step (Better for debugging)**

Copy each line individually into PowerShell:

```powershell
# Step 1: Build
npm run build

# Step 2: Verify (check output above for errors)
# If build succeeded (0 errors), continue to Step 3
# If build failed, fix errors and re-run Step 1

# Step 3: Deploy
npm run deploy

# Step 4: Verify
# Check for "Deployment successful" message
```

---

### **Option 3: Safe with detailed logging**

Copy and paste this multi-line script:

```powershell
# Build the project
Write-Host "🔨 Building frontend..." -ForegroundColor Cyan
npm run build
$buildResult = $LASTEXITCODE

# Check build status
if ($buildResult -eq 0) {
  Write-Host "✅ Build successful!" -ForegroundColor Green
  
  # Deploy
  Write-Host "🚀 Deploying to production..." -ForegroundColor Cyan
  npm run deploy
  $deployResult = $LASTEXITCODE
  
  if ($deployResult -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
  } else {
    Write-Host "❌ Deployment failed! Exit code: $deployResult" -ForegroundColor Red
  }
} else {
  Write-Host "❌ Build failed! Exit code: $buildResult" -ForegroundColor Red
  Write-Host "Fix the errors above before trying again." -ForegroundColor Yellow
  exit 1
}
```

---

## 🗂️ COMPLETE DEPLOYMENT WORKFLOW

Run these commands in order in PowerShell:

### **Step 1: Apply Database Migration**

```powershell
supabase db push
```

Expected output:
```
Applying migration: supabase/migrations/20260225_fix_applicant_approval_defaults.sql
✓ Migration completed successfully
```

### **Step 2: Build & Deploy Frontend (choose one option above)**

**Option 1 (Quickest):**
```powershell
npm run build; if ($LASTEXITCODE -eq 0) { npm run deploy } else { Write-Host "Build failed!" -ForegroundColor Red }
```

---

## 🧪 VERIFY THE FIX

### **Option A: Quick SQL Check (2 minutes)**

1. Open Supabase Dashboard → SQL Editor
2. Copy-paste this query:

```sql
SELECT column_default FROM information_schema.columns 
WHERE table_name='users' AND column_name='is_approved' AND table_schema='public';
```

**Expected result:** `false` (not `true`)

---

### **Option B: Full Verification Script (5 minutes)**

In PowerShell, run:
```powershell
node verify-approval-workflow.js
```

---

### **Option C: Manual Testing (10 minutes)**

1. **Start dev server:**
   ```powershell
   npm run dev
   ```

2. **Register as new applicant:**
   - Go to http://localhost:5173/register
   - Fill in the form
   - Complete email verification
   - Login

3. **Verify behavior:**
   - ✅ You should see /pending-approval page (NOT blank)
   - ✅ Clock icon visible
   - ✅ "Account Under Review" message
   - ✅ "Back to Home" and "Log Out" buttons visible

4. **Check database in Supabase:**
   ```sql
   SELECT email, role, is_approved FROM users 
   WHERE email LIKE '%<your-test-email>%';
   ```
   - ✅ Should show: is_approved = FALSE

---

## 🆘 TROUBLESHOOTING

### **Problem: "The token '&&' is not a valid statement separator"**

**Solution:** You're in PowerShell 5.1 (Windows default). Use one of the commands above instead.

To check your PowerShell version:
```powershell
$PSVersionTable.PSVersion
```

---

### **Problem: Build succeeds but deployment doesn't run**

**Check exit code:**
```powershell
npm run build
$LASTEXITCODE
```

If not 0, build failed. Look for red errors above.

---

### **Problem: Still seeing blank page on /pending-approval**

```powershell
# 1. Clear cache
# DevTools (F12) → Application → Clear Storage

# 2. Hard refresh
# Ctrl+Shift+R

# 3. Check console for errors
# F12 → Console tab

# 4. Verify migration applied
# Run SQL query from Option A above
```

---

## 📋 QUICK REFERENCE

| Task | PowerShell Command |
|------|-------------------|
| **Check version** | `$PSVersionTable.PSVersion` |
| **Build only** | `npm run build` |
| **Deploy only** | `npm run deploy` |
| **Build + Deploy (if succeeds)** | `npm run build; if ($LASTEXITCODE -eq 0) { npm run deploy }` |
| **Run dev server** | `npm run dev` |
| **Verify fix** | `node verify-approval-workflow.js` |
| **Check exit code** | `$LASTEXITCODE` |

---

## 📚 Related Files

- **Full checklist:** [DEPLOYMENT_CHECKLIST_BUG_FIX.md](DEPLOYMENT_CHECKLIST_BUG_FIX.md)
- **Summary:** [BUG_FIX_APPLICANT_APPROVAL_SUMMARY.md](BUG_FIX_APPLICANT_APPROVAL_SUMMARY.md)
- **SQL verification:** [VERIFICATION_SCRIPT.sql](VERIFICATION_SCRIPT.sql)
- **Code changes:** [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx)
- **Migration:** [supabase/migrations/20260225_fix_applicant_approval_defaults.sql](supabase/migrations/20260225_fix_applicant_approval_defaults.sql)

---

**Ready to deploy? Start with Step 1 above.**
