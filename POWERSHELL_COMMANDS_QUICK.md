# PowerShell Commands - Copy & Paste Ready

**Use one of these in PowerShell. Don't use `&&` — it won't work in PowerShell 5.1.**

---

## 🚀 DEPLOYMENT (4 Steps Total)

### Step 1️⃣: Apply Database Migration
```powershell
supabase db push
```

**Expected output:**
```
Applying migration: supabase/migrations/20260225_fix_applicant_approval_defaults.sql
✓ Migration completed successfully
```

---

### Step 2️⃣: Build Frontend

```powershell
npm run build
```

**Wait for it to complete. Check for "✓ 0 errors" at the end.**

---

### Step 3️⃣: Deploy Frontend (ONLY if Step 2 succeeded)

**Choose ONE of these:**

#### **Option A (Recommended - Single line):**
```powershell
npm run deploy
```

#### **Option B (Safe - Checks for errors first):**
```powershell
if ($LASTEXITCODE -eq 0) { npm run deploy } else { Write-Host "Build failed! Fix errors above." -ForegroundColor Red }
```

#### **Option C (Combined build + deploy):**
```powershell
npm run build; if ($LASTEXITCODE -eq 0) { npm run deploy }
```

---

### Step 4️⃣: Verify the Fix

Pick ONE method:

#### **Method A: Check database (30 seconds)**
```sql
-- Copy-paste in Supabase SQL Editor
SELECT column_default FROM information_schema.columns 
WHERE table_name='users' AND column_name='is_approved' AND table_schema='public';
```
**Expected:** `false`

#### **Method B: Run verification script (1 minute)**
```powershell
node verify-approval-workflow.js
```

#### **Method C: Manual test (5 minutes)**
```powershell
npm run dev

# Then in browser:
# 1. Go to http://localhost:5173/register
# 2. Create new test account
# 3. Verify email
# 4. Login - should see /pending-approval page (NOT blank)
# 5. Check: F12 → Console → no red errors
```

---

## 🔧 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| **`&&` not recognized** | Use `if ($LASTEXITCODE -eq 0) { ... }` instead |
| **Build fails** | Fix errors shown in red, then re-run: `npm run build` |
| **Deployment not running** | Run: `$LASTEXITCODE` to check if build passed (should be 0) |
| **Blank page on /pending-approval** | Clear cache (F12 → Application) and hard refresh (Ctrl+Shift+R) |
| **Not sure if migration applied** | Run SQL check above (Method A) |

---

## 📍 My Current Status

- [ ] Step 1: Migration applied (`supabase db push`)
- [ ] Step 2: Build completed (`npm run build`)
- [ ] Step 3: Deployed (`npm run deploy`)
- [ ] Step 4: Verified fix (choose A, B, or C)

---

## 🧠 Quick Reference

```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Check last command exit code
$LASTEXITCODE

# Run something IF previous command succeeded
if ($LASTEXITCODE -eq 0) { Write-Host "Success!" }

# Run something IF previous command failed
if ($LASTEXITCODE -ne 0) { Write-Host "Failed!" }
```

---

## 💡 Remember

- **Do NOT use `&&` in PowerShell** — it causes "token is not a valid statement separator"
- **Use `if ($LASTEXITCODE -eq 0)` instead** — checks if previous command succeeded
- **Run commands in order** — don't skip steps
- **Fix build errors BEFORE deploying** — don't deploy broken builds

---

**Ready? Start with Step 1 above!**
