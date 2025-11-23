#!/usr/bin/env pwsh
# Supabase Edge Functions Verification Script
# Platform: Windows PowerShell 5.1+
# Purpose: Verify all prerequisites and configurations for edge function deployment

$ErrorActionPreference = "Continue"

# Colors for output
$Success = @{ ForegroundColor = "Green" }
$Error_ = @{ ForegroundColor = "Red" }
$Warning = @{ ForegroundColor = "Yellow" }
$Info = @{ ForegroundColor = "Cyan" }

Write-Host ""
Write-Host "=" * 80
Write-Host "Supabase Edge Functions Verification Script" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "=" * 80
Write-Host ""

# Counter for checks
$passed = 0
$failed = 0

# Function to log results
function LogCheck {
    param(
        [string]$name,
        [bool]$result,
        [string]$details = ""
    )
    
    if ($result) {
        Write-Host "✓" -ForegroundColor Green -NoNewline
        Write-Host " $name" @Success
        if ($details) { Write-Host "  → $details" -ForegroundColor Gray }
        $global:passed++
    } else {
        Write-Host "✗" -ForegroundColor Red -NoNewline
        Write-Host " $name" @Error_
        if ($details) { Write-Host "  → $details" -ForegroundColor Red }
        $global:failed++
    }
}

# ============================================================================
# 1. SYSTEM REQUIREMENTS
# ============================================================================
Write-Host ""
Write-Host "1. SYSTEM REQUIREMENTS" -ForegroundColor Cyan

# Check PowerShell version
$psVersion = [System.Version]$PSVersionTable.PSVersion
$psOk = $psVersion.Major -ge 5 -or ($psVersion.Major -eq 5 -and $psVersion.Minor -ge 1)
LogCheck "PowerShell Version" $psOk "Version: $($PSVersionTable.PSVersion)"

# Check Node.js
$nodeExists = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
if ($nodeExists) {
    $nodeVersion = (node --version 2>$null)
    LogCheck "Node.js" $true $nodeVersion
} else {
    LogCheck "Node.js" $false "Node.js not found. Install from https://nodejs.org"
}

# Check npm
$npmExists = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
if ($npmExists) {
    $npmVersion = (npm --version 2>$null)
    LogCheck "npm" $true "Version: $npmVersion"
} else {
    LogCheck "npm" $false "npm not found (install Node.js)"
}

# Check Git
$gitExists = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if ($gitExists) {
    $gitVersion = (git --version 2>$null)
    LogCheck "Git" $true $gitVersion
} else {
    LogCheck "Git" $false "Git not found"
}

# ============================================================================
# 2. PROJECT SETUP
# ============================================================================
Write-Host ""
Write-Host "2. PROJECT SETUP" -ForegroundColor Cyan

# Check project root
$projectRoot = Get-Location
$isProjectRoot = Test-Path "./supabase" -and Test-Path "./src" -and Test-Path "package.json"
LogCheck "Project Root Directory" $isProjectRoot $projectRoot

# Check required files exist
LogCheck ".env.example exists" (Test-Path ".env.example")
LogCheck ".gitignore exists" (Test-Path ".gitignore")
LogCheck "config.toml exists" (Test-Path "./supabase/config.toml")
LogCheck "package.json exists" (Test-Path "package.json")

# Check .env does NOT exist (should not be in repo)
$envExists = Test-Path ".env"
LogCheck ".env does NOT exist (as expected)" (-not $envExists)

# ============================================================================
# 3. SUPABASE CLI
# ============================================================================
Write-Host ""
Write-Host "3. SUPABASE CLI" -ForegroundColor Cyan

# Check Supabase CLI
$supabaseExists = $null -ne (Get-Command supabase -ErrorAction SilentlyContinue)
if ($supabaseExists) {
    $supabaseVersion = (supabase --version 2>$null)
    LogCheck "Supabase CLI" $true $supabaseVersion
} else {
    LogCheck "Supabase CLI" $false "Run: npm install -g supabase"
}

# Check Supabase login
if ($supabaseExists) {
    $isLoggedIn = Test-Path "$env:APPDATA\supabase\access_tokens" -ErrorAction SilentlyContinue
    if (-not $isLoggedIn) {
        $isLoggedIn = Test-Path "$env:HOME\.supabase\access_tokens" -ErrorAction SilentlyContinue
    }
    LogCheck "Supabase Authentication" $isLoggedIn "Run: supabase login (if not authenticated)"
}

# ============================================================================
# 4. ENVIRONMENT VARIABLES
# ============================================================================
Write-Host ""
Write-Host "4. ENVIRONMENT VARIABLES" -ForegroundColor Cyan

$envContent = Get-Content .env.example -Raw
$hasUrl = $envContent -match "VITE_SUPABASE_URL"
$hasKey = $envContent -match "VITE_SUPABASE_ANON_KEY"

LogCheck ".env.example has VITE_SUPABASE_URL" $hasUrl
LogCheck ".env.example has VITE_SUPABASE_ANON_KEY" $hasKey

# Check .env.local or .env
$localEnvExists = (Test-Path ".env.local") -or (Test-Path ".env")
if ($localEnvExists) {
    $localContent = if (Test-Path ".env.local") { Get-Content .env.local -Raw } else { Get-Content .env -Raw }
    $localHasUrl = $localContent -match "VITE_SUPABASE_URL"
    $localHasKey = $localContent -match "VITE_SUPABASE_ANON_KEY"
    LogCheck ".env.local configured" ($localHasUrl -and $localHasKey)
}

# ============================================================================
# 5. EDGE FUNCTIONS STRUCTURE
# ============================================================================
Write-Host ""
Write-Host "5. EDGE FUNCTIONS" -ForegroundColor Cyan

# Get all function folders
$functionsPath = "./supabase/functions"
if (Test-Path $functionsPath) {
    $functions = Get-ChildItem -Path $functionsPath -Directory | Select-Object -ExpandProperty Name
    Write-Host "  Found $($functions.Count) functions:" -ForegroundColor Gray
    
    foreach ($fn in $functions) {
        $indexExists = Test-Path "$functionsPath/$fn/index.ts"
        $inConfig = Select-String -Path "./supabase/config.toml" -Pattern "\[functions\.$fn\]" -Quiet
        
        if ($indexExists -and $inConfig) {
            Write-Host "  ✓ $fn (index.ts + config.toml)" -ForegroundColor Green
            $global:passed++
        } else {
            $reason = @()
            if (-not $indexExists) { $reason += "missing index.ts" }
            if (-not $inConfig) { $reason += "missing in config.toml" }
            Write-Host "  ✗ $fn ($($reason -join ', '))" -ForegroundColor Red
            $global:failed++
        }
    }
} else {
    Write-Host "  ✗ supabase/functions directory not found" -ForegroundColor Red
    $global:failed++
}

# ============================================================================
# 6. SOURCE CODE
# ============================================================================
Write-Host ""
Write-Host "6. SOURCE CODE" -ForegroundColor Cyan

# Check supabase.ts
$supabaseTsPath = "./src/lib/supabase.ts"
if (Test-Path $supabaseTsPath) {
    $content = Get-Content $supabaseTsPath -Raw
    $hasImport = $content -match "createClient"
    $hasExport = $content -match "export const supabase"
    $hasEnvUrl = $content -match "VITE_SUPABASE_URL"
    $hasEnvKey = $content -match "VITE_SUPABASE_ANON_KEY"
    
    LogCheck "lib/supabase.ts imports createClient" $hasImport
    LogCheck "lib/supabase.ts exports supabase client" $hasExport
    LogCheck "lib/supabase.ts uses VITE_SUPABASE_URL" $hasEnvUrl
    LogCheck "lib/supabase.ts uses VITE_SUPABASE_ANON_KEY" $hasEnvKey
} else {
    LogCheck "lib/supabase.ts exists" $false
}

# ============================================================================
# 7. CONFIGURATION FILES
# ============================================================================
Write-Host ""
Write-Host "7. CONFIGURATION FILES" -ForegroundColor Cyan

# Check .gitignore
$gitignoreContent = Get-Content .gitignore -Raw
$ignoresEnv = $gitignoreContent -match "^\.env$"
$ignoresNodeModules = $gitignoreContent -match "^node_modules"
$ignoresTemp = $gitignoreContent -match "supabase/\.temp"
$ignoresCache = $gitignoreContent -match "supabase/\.cache"

LogCheck ".gitignore excludes .env" $ignoresEnv
LogCheck ".gitignore excludes node_modules" $ignoresNodeModules
LogCheck ".gitignore excludes supabase/.temp" $ignoresTemp
LogCheck ".gitignore excludes supabase/.cache" $ignoresCache

# Check config.toml has CORS
$configContent = Get-Content "./supabase/config.toml" -Raw
$hasCors = $configContent -match "\[cors\]"
LogCheck "config.toml has CORS configuration" $hasCors

# ============================================================================
# 8. GIT STATUS
# ============================================================================
Write-Host ""
Write-Host "8. GIT STATUS" -ForegroundColor Cyan

if ($gitExists) {
    # Check if in git repo
    $inGitRepo = $null -ne (git rev-parse --git-dir 2>$null)
    LogCheck "In git repository" $inGitRepo
    
    if ($inGitRepo) {
        # Check if .env is being tracked
        $envTracked = $null -ne (git ls-files ".env" 2>$null)
        LogCheck ".env is NOT tracked by git" (-not $envTracked) "(as expected)"
        
        # Check branch
        $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
        LogCheck "Git branch" $true $branch
        
        # Check status
        $isClean = $null -eq (git status --porcelain 2>$null | Select-String -Pattern ".")
        if ($isClean) {
            LogCheck "Working directory clean" $true
        } else {
            $dirtyFiles = (git status --short 2>$null | Measure-Object -Line).Lines
            LogCheck "Working directory clean" $false "$dirtyFiles uncommitted changes"
        }
    }
}

# ============================================================================
# 9. DEPLOYMENT READINESS
# ============================================================================
Write-Host ""
Write-Host "9. DEPLOYMENT READINESS" -ForegroundColor Cyan

# Check package.json scripts
$packageContent = Get-Content package.json -Raw | ConvertFrom-Json
$hasDevScript = $null -ne $packageContent.scripts.dev
$hasBuildScript = $null -ne $packageContent.scripts.build

LogCheck "package.json has 'dev' script" $hasDevScript
LogCheck "package.json has 'build' script" $hasBuildScript

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "=" * 80
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 80

$total = $passed + $failed
$percentage = if ($total -gt 0) { [Math]::Round(($passed / $total) * 100) } else { 0 }

Write-Host ""
Write-Host "Passed:  " -NoNewline @Success; Write-Host $passed
Write-Host "Failed:  " -NoNewline @Error_; Write-Host $failed
Write-Host "Total:   " -NoNewline; Write-Host $total
Write-Host "Score:   " -NoNewline
if ($percentage -ge 80) { 
    Write-Host "$percentage%" @Success 
} else { 
    Write-Host "$percentage%" @Warning 
}
Write-Host ""

# Final status
if ($failed -eq 0) {
    Write-Host "✓ ALL CHECKS PASSED - Ready for deployment!" @Success
    Write-Host ""
    Write-Host "Next steps:" @Info
    Write-Host "1. Run: supabase functions deploy" -ForegroundColor White
    Write-Host "2. Run: supabase functions list" -ForegroundColor White
    Write-Host "3. Test in browser: https://your-domain/register" -ForegroundColor White
    Write-Host ""
    exit 0
}
else {
    Write-Host "✗ CHECKS FAILED - Please fix issues above" @Error_
    Write-Host ""
    Write-Host "Failed checks to address:" @Warning
    Write-Host "• Check error messages above" -ForegroundColor White
    Write-Host "• See WINDOWS_SUPABASE_CLI_SETUP.md for help" -ForegroundColor White
    Write-Host "• Or refer to README.md for setup instructions" -ForegroundColor White
    Write-Host ""
    exit 1
}
