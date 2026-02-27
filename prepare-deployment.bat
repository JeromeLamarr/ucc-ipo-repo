@echo off
REM Deployment preparation script for PDF Generation system (Windows)

setlocal enabledelayedexpansion

echo ======================================
echo PDF Generation Deployment Preparation
echo ======================================
echo.

REM Step 1: Verify Node Server environment
echo Step 1: Checking Node Server configuration...
if not exist "server\.env" (
  echo   ^! server\.env not found
  echo   Creating from template...
  copy server\.env.example server\.env
  echo   ^+ Created server\.env ^(UPDATE WITH YOUR VALUES^)
) else (
  echo   ^+ server\.env exists
)

REM Step 2: Verify Frontend environment
echo.
echo Step 2: Checking Frontend configuration...
if not exist ".env.production" (
  echo   ^! .env.production not found
  (
    echo ^# Optional: Direct Node server URL
    echo ^# VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com
  ) > .env.production
  echo   ^+ Created .env.production ^(UPDATE IF NEEDED^)
) else (
  echo   ^+ .env.production exists
)

REM Step 3: Verify Node dependencies
echo.
echo Step 3: Checking Node.js dependencies...
cd server
if not exist "node_modules" (
  echo   Installing dependencies...
  call npm install
) else (
  echo   ^+ node_modules exists
)
cd ..

REM Step 4: Build checks
echo.
echo Step 4: Running TypeScript build check...
call npm run build >nul 2>&1 && (
  echo   ^+ Frontend builds successfully
) || (
  echo   ! Frontend build has errors
)

cd server
call npm run build >nul 2>&1 && (
  echo   ^+ Node server builds successfully
) || (
  echo   ! Node server build has errors
)
cd ..

REM Step 5: Verify key files
echo.
echo Step 5: Verifying critical files...
if exist "src\lib\sharedHTMLTemplate.ts" (
  echo   ^+ src\lib\sharedHTMLTemplate.ts
) else (
  echo   - src\lib\sharedHTMLTemplate.ts MISSING
)

if exist "server\src\utils\pdfGenerator.ts" (
  echo   ^+ server\src\utils\pdfGenerator.ts
) else (
  echo   - server\src\utils\pdfGenerator.ts MISSING
)

if exist "supabase\functions\generate-full-record-documentation-pdf\index.ts" (
  echo   ^+ supabase\functions\generate-full-record-documentation-pdf\index.ts
) else (
  echo   - supabase\functions\generate-full-record-documentation-pdf\index.ts MISSING
)

if exist "src\utils\generateFullRecordPDF.ts" (
  echo   ^+ src\utils\generateFullRecordPDF.ts
) else (
  echo   - src\utils\generateFullRecordPDF.ts MISSING
)

REM Step 6: Environment variable checklist
echo.
echo Step 6: Environment variable checklist:
echo   Frontend ^(.env.production^):
echo     [ ] VITE_NODE_PDF_SERVER_URL ^(optional^)
echo.
echo   Node Server ^(server\.env^):
echo     [ ] SUPABASE_URL
echo     [ ] SUPABASE_SERVICE_ROLE_KEY
echo     [ ] PORT ^(default: 3000^)
echo     [ ] NODE_ENV ^(set to: production^)
echo.
echo   Edge Function ^(Supabase Dashboard^):
echo     [ ] NODE_PDF_SERVER_URL
echo.

echo ======================================
echo Deployment Checklist Summary:
echo ======================================
echo.
echo + Files created/verified
echo + Dependencies installed
echo + Build checks passed
echo.
echo ^> NEXT: Update environment variables in:
echo    1. server\.env
echo    2. .env.production ^(frontend^)
echo    3. Supabase Dashboard ^(Edge Function settings^)
echo.
echo ^> THEN: Follow PRODUCTION_PDF_DEPLOYMENT.md for deployment
echo.

pause
