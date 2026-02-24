# Understanding PowerShell Syntax - Why `&&` Doesn't Work

**TL;DR:** PowerShell uses different syntax than Bash/CMD. Use `if ($LASTEXITCODE -eq 0) { ... }` instead of `&&`.

---

## The Problem

```powershell
# ❌ WRONG - This fails in PowerShell 5.1
npm run build && npm run deploy

# Error:
# The token '&&' is not a valid statement separator in position 12 near '&&'.
```

**Why?** PowerShell interprets `&&` as a special token, but doesn't support it until **PowerShell 7.0+** (and Windows still ships with 5.1 by default).

---

## The Solution: Use `$LASTEXITCODE`

**What is `$LASTEXITCODE`?**
- A PowerShell special variable
- Contains the exit code of the last command (0 = success, non-zero = failure)
- Used to check if a command succeeded or failed

```powershell
npm run build          # Run build
$LASTEXITCODE          # Check exit code (should be 0 if successful)
if ($LASTEXITCODE -eq 0) { npm run deploy }  # Deploy ONLY if 0
```

**Comparison:**

| Bash/CMD | PowerShell | Meaning |
|----------|-----------|---------|
| `cmd1 && cmd2` | `cmd1; if ($LASTEXITCODE -eq 0) { cmd2 }` | Run cmd2 only if cmd1 succeeds |
| `cmd1 \|\| cmd2` | `cmd1; if ($LASTEXITCODE -ne 0) { cmd2 }` | Run cmd2 only if cmd1 fails |
| `$?` (Bash) | `$LASTEXITCODE` | Check last command's exit code |

---

## Examples

### Example 1: Simple Build + Deploy

```powershell
# Build
npm run build

# Check if it succeeded (exit code = 0)
if ($LASTEXITCODE -eq 0) {
  # If success, deploy
  npm run deploy
} else {
  # If failed, show error
  Write-Host "Build failed! Fix errors above." -ForegroundColor Red
}
```

---

### Example 2: One-liner Version

```powershell
npm run build; if ($LASTEXITCODE -eq 0) { npm run deploy }
```

**Breakdown:**
- `npm run build` → Install/build
- `;` → Separator (like newline, but on one line)
- `if ($LASTEXITCODE -eq 0)` → Check if build succeeded
- `{ npm run deploy }` → Run this IF check is true

---

### Example 3: Multiple Conditions

```powershell
# Run tests, then build, then deploy (all dependent on each other)
npm run test
if ($LASTEXITCODE -ne 0) {
  Write-Host "Tests failed!" -ForegroundColor Red
  exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed!" -ForegroundColor Red
  exit 1
}

npm run deploy
if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed!" -ForegroundColor Red
  exit 1
}

Write-Host "✅ All steps completed successfully!" -ForegroundColor Green
```

---

## Common Patterns

### Pattern 1: "Run if previous succeeded"
```powershell
cmd1; if ($LASTEXITCODE -eq 0) { cmd2 }
```

### Pattern 2: "Run if previous failed"
```powershell
cmd1; if ($LASTEXITCODE -ne 0) { Write-Host "Failed!" -ForegroundColor Red }
```

### Pattern 3: "Show success/failure message"
```powershell
npm run build
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Success!" -ForegroundColor Green
} else {
  Write-Host "❌ Failed!" -ForegroundColor Red
}
```

### Pattern 4: "Exit script on failure"
```powershell
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed!" -ForegroundColor Red
  exit 1
}
# If we get here, build succeeded
npm run deploy
```

---

## Quick Reference Table

| Operator | Bash | PowerShell | Meaning |
|----------|------|-----------|---------|
| **AND** | `cmd1 && cmd2` | `cmd1; if ($LASTEXITCODE -eq 0) { cmd2 }` | Run cmd2 if cmd1 succeeds |
| **OR** | `cmd1 \|\| cmd2` | `cmd1; if ($LASTEXITCODE -ne 0) { cmd2 }` | Run cmd2 if cmd1 fails |
| **Check success** | `$?` | `$LASTEXITCODE` | Check if last command succeeded |
| **Success is 0** | 0 = success | 0 = success | Exit code 0 means success |

---

## Testing This Yourself

### Test 1: Successful command
```powershell
Write-Host "Success"          # This will succeed (exit code 0)
$LASTEXITCODE                 # Should show: 0

if ($LASTEXITCODE -eq 0) {
  Write-Host "Previous command succeeded!" -ForegroundColor Green
}
```

### Test 2: Failed command
```powershell
cmd /c "exit 1"               # This will fail (exit code 1)
$LASTEXITCODE                 # Should show: 1

if ($LASTEXITCODE -ne 0) {
  Write-Host "Previous command failed!" -ForegroundColor Red
}
```

---

## Why the Difference?

**Bash and CMD were designed to support `&&` as a shell operator.**

```bash
# Bash: && is a built-in operator
npm run build && npm run deploy
```

**PowerShell is object-oriented and uses different design principles.**

```powershell
# PowerShell: Use conditional logic instead
npm run build; if ($LASTEXITCODE -eq 0) { npm run deploy }
```

Both work, they're just different philosophies of shell design.

---

## Upgrading to PowerShell 7+ (Optional)

If you want to use `&&`, you can upgrade to **PowerShell 7+** which supports it:

```powershell
# Install PowerShell 7 (requires admin)
Install-Module -Name PowerShellGet -Force

# Or download from:
# https://github.com/PowerShell/PowerShell/releases
```

But the `if ($LASTEXITCODE -eq 0)` approach works in **all PowerShell versions** and is more readable.

---

## Summary

- **Don't use `&&` in PowerShell 5.1** (Windows default)
- **Use `if ($LASTEXITCODE -eq 0)` instead** to check if a command succeeded
- **`$LASTEXITCODE`** is the variable that holds the exit code (0 = success)
- **Both approaches are valid**, just different shells, different syntax

**For your deployment:** Use the commands from [POWERSHELL_COMMANDS_QUICK.md](POWERSHELL_COMMANDS_QUICK.md) — they work in PowerShell 5.1 and all newer versions.

---

**Questions?** Refer to:
- [POWERSHELL_COMMANDS_QUICK.md](POWERSHELL_COMMANDS_QUICK.md) - Copy-paste ready commands
- [POWERSHELL_DEPLOYMENT_GUIDE.md](POWERSHELL_DEPLOYMENT_GUIDE.md) - Full deployment walkthrough
