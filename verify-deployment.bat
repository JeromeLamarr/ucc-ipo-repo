@echo off
REM Supabase Edge Functions Verification Script
REM Platform: Windows Command Prompt / PowerShell
REM Purpose: Verify all prerequisites for edge function deployment

setlocal enabledelayedexpansion

echo.
echo ================================================================================
echo Supabase Edge Functions Verification
echo ================================================================================
echo.

set passed=0
set failed=0

REM ============================================================================
REM 1. SYSTEM REQUIREMENTS
REM ============================================================================
echo 1. SYSTEM REQUIREMENTS
echo.

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set nodeVer=%%i
    echo [OK] Node.js: !nodeVer!
    set /a passed+=1
) else (
    echo [FAIL] Node.js not found
    set /a failed+=1
)

where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set npmVer=%%i
    echo [OK] npm: !npmVer!
    set /a passed+=1
) else (
    echo [FAIL] npm not found
    set /a failed+=1
)

where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('git --version 2^>nul') do set gitVer=%%i
    echo [OK] Git: !gitVer!
    set /a passed+=1
) else (
    echo [FAIL] Git not found
    set /a failed+=1
)

where supabase >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('supabase --version 2^>nul') do set supVer=%%i
    echo [OK] Supabase CLI: !supVer!
    set /a passed+=1
) else (
    echo [FAIL] Supabase CLI not found - run: npm install -g supabase
    set /a failed+=1
)

echo.

REM ============================================================================
REM 2. PROJECT SETUP
REM ============================================================================
echo 2. PROJECT SETUP
echo.

if exist "supabase\" (
    echo [OK] supabase/ folder exists
    set /a passed+=1
) else (
    echo [FAIL] supabase/ folder not found
    set /a failed+=1
)

if exist "src\" (
    echo [OK] src/ folder exists
    set /a passed+=1
) else (
    echo [FAIL] src/ folder not found
    set /a failed+=1
)

if exist "package.json" (
    echo [OK] package.json exists
    set /a passed+=1
) else (
    echo [FAIL] package.json not found
    set /a failed+=1
)

if exist ".env.example" (
    echo [OK] .env.example exists
    set /a passed+=1
) else (
    echo [FAIL] .env.example not found
    set /a failed+=1
)

if exist ".gitignore" (
    echo [OK] .gitignore exists
    set /a passed+=1
) else (
    echo [FAIL] .gitignore not found
    set /a failed+=1
)

if exist "supabase\config.toml" (
    echo [OK] supabase/config.toml exists
    set /a passed+=1
) else (
    echo [FAIL] supabase/config.toml not found
    set /a failed+=1
)

if not exist ".env" (
    echo [OK] .env does NOT exist (correct)
    set /a passed+=1
) else (
    echo [FAIL] .env should not exist in repo
    set /a failed+=1
)

echo.

REM ============================================================================
REM 3. EDGE FUNCTIONS
REM ============================================================================
echo 3. EDGE FUNCTIONS
echo.

setlocal enabledelayedexpansion
set funcCount=0
for /d %%d in (supabase\functions\*) do (
    if exist "%%d\index.ts" (
        echo [OK] %%~nxd - index.ts found
        set /a passed+=1
        set /a funcCount+=1
    ) else (
        echo [FAIL] %%~nxd - missing index.ts
        set /a failed+=1
    )
)
echo.
echo Found %funcCount% edge functions with index.ts
echo.

REM ============================================================================
REM 4. CONFIGURATION
REM ============================================================================
echo 4. CONFIGURATION
echo.

findstr /I "verify_jwt.*false" supabase\config.toml >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] config.toml has verify_jwt settings
    set /a passed+=1
) else (
    echo [FAIL] config.toml missing verify_jwt settings
    set /a failed+=1
)

findstr /I "VITE_SUPABASE_URL" .env.example >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] .env.example has VITE_SUPABASE_URL
    set /a passed+=1
) else (
    echo [FAIL] .env.example missing VITE_SUPABASE_URL
    set /a failed+=1
)

findstr /I "VITE_SUPABASE_ANON_KEY" .env.example >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] .env.example has VITE_SUPABASE_ANON_KEY
    set /a passed+=1
) else (
    echo [FAIL] .env.example missing VITE_SUPABASE_ANON_KEY
    set /a failed+=1
)

echo.

REM ============================================================================
REM 5. GIT STATUS
REM ============================================================================
echo 5. GIT STATUS
echo.

git rev-parse --git-dir >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Project is a git repository
    set /a passed+=1
    
    git ls-files ".env" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [OK] .env is not tracked by git
        set /a passed+=1
    ) else (
        echo [FAIL] .env is tracked by git (should not be)
        set /a failed+=1
    )
    
    for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set branch=%%i
    echo [OK] Branch: !branch!
    set /a passed+=1
) else (
    echo [FAIL] Not a git repository
    set /a failed+=1
)

echo.

REM ============================================================================
REM SUMMARY
REM ============================================================================
echo ================================================================================
echo SUMMARY
echo ================================================================================
echo.
set /a total=passed+failed
if %total% gtr 0 (
    for /f "tokens=*" %%i in ('powershell -Command "Write-Host ([Math]::Round((%passed% / %total%) * 100))"') do set percent=%%i
) else (
    set percent=0
)

echo Passed:  %passed%
echo Failed:  %failed%
echo Total:   %total%
echo Score:   %percent%^^%
echo.

if %failed% EQU 0 (
    echo [SUCCESS] All checks passed - Ready for deployment!
    echo.
    echo Next steps:
    echo 1. supabase functions deploy
    echo 2. supabase functions list
    echo 3. Test in browser: https://your-domain/register
    echo.
    exit /b 0
) else (
    echo [FAILED] Some checks failed - See errors above
    echo.
    echo Help:
    echo - See WINDOWS_SUPABASE_CLI_SETUP.md for detailed instructions
    echo - Run: supabase login
    echo - Run: supabase link --project-ref mqfftubqlwiemtxpagps
    echo.
    exit /b 1
)
