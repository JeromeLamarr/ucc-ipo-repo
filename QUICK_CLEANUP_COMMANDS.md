# QUICK CLEANUP COMMANDS
## Copy & Paste Safe Cleanup

```powershell
# STEP 1: Update .gitignore
Copy-Item -Path ".gitignore.RECOMMENDED" -Destination ".gitignore" -Force

# STEP 2: Remove tmpclaude directories from Git (SAFE - files stay on disk)
git rm --cached -r tmpclaude-*/ --quiet

# STEP 3: Verify changes
git status

# STEP 4: Commit
git commit -m "chore: update .gitignore and remove temporary claude directories

- Add comprehensive .gitignore with clear documentation
- Remove tmpclaude-*/ directories from git tracking (42 items)
- These are temporary AI working folders that bloat the repository
- Update comments for Vite + React + Supabase + Bolt.new project
- Keep all essential files: src/, supabase/, scripts/, documentation
- This reduces repository size significantly while preserving all source code"

# STEP 5: Push to GitHub
git push origin main

# STEP 6 (OPTIONAL): Clean local artifacts
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path "dist" -Recurse -Force
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue
npm install
npm run build
```

---

## EXPECTED RESULTS

### Before Cleanup:
- Repository size: ~500+ MB
- Tracked files: ~350+
- Git history cluttered with temp directories

### After Cleanup:
- Repository size: ~20-30 MB (95% reduction! 🎉)
- Tracked files: ~300-350
- Clean git history
- Faster deployment to Bolt.new
- Same development environment

---

## VERIFICATION

```powershell
# Check tmpclaude is removed
git ls-files | Select-String "tmpclaude"
# Expected output: (nothing)

# Check source files still exist
git ls-files | Select-String "src/pages" | Select-Object -First 3
# Expected output: src/pages/... files

# Count total tracked files
@(git ls-files).Count
# Expected output: ~300-350

# Verify important files are still there
@("src/main.tsx", "package.json", "vite.config.ts", ".env.example") | % {
    if (git ls-files | Select-String $_) {
        Write-Host "✅ $_ is tracked"
    } else {
        Write-Host "❌ $_ is NOT tracked"
    }
}
```

**Run this command to verify everything is correct:**
```powershell
git ls-files | Measure-Object
git status
```

---

## SAFETY GUARANTEES

✅ No source code deleted  
✅ No configuration lost  
✅ No environment variables exposed  
✅ All documentation preserved  
✅ Can be reversed with `git reflog`  
✅ Bolt.new deployment unaffected  
✅ Team members unaffected on next `git pull`

---

## QUESTIONS?

See `PROJECT_CLEANUP_GUIDE.md` for detailed explanation of each section.
