@echo off
REM Master deployment orchestrator for Windows

setlocal enabledelayedexpansion

cls
echo =======================================
echo PDF Generation System - Master Deployer
echo =======================================
echo.

:menu
cls
echo Choose deployment path:
echo.
echo 1) Full deployment (all components)
echo 2) Node Server only
echo 3) Frontend only
echo 4) Edge Function only
echo 5) Verify deployment
echo 0) Exit
echo.
set /p choice="Select option (0-5): "

if "%choice%"=="1" goto full_deploy
if "%choice%"=="2" goto node_deploy
if "%choice%"=="3" goto frontend_deploy
if "%choice%"=="4" goto edge_deploy
if "%choice%"=="5" goto verify_deploy
if "%choice%"=="0" goto end
goto menu

:full_deploy
cls
echo.
echo Preparing for full deployment...
echo Please choose Node Server deployment method:
echo.
echo a) Docker
echo b) Traditional VPS
echo.
set /p method="Choose (a/b) [Docker recommended]: "

if "%method%"=="a" (
    call deploy\02-deploy-docker.sh
) else if "%method%"=="b" (
    call deploy\03-deploy-vps.sh
) else (
    call deploy\02-deploy-docker.sh
)

echo.
echo Next: Deploy frontend
pause
call deploy\04-deploy-frontend.sh

echo.
echo Next: Deploy Edge Function
pause
call deploy\05-deploy-edge-function.sh

echo.
echo Full deployment complete!
goto verify_deploy

:node_deploy
cls
echo.
echo Deployment method for Node Server:
echo.
echo a) Vercel (recommended)
echo b) Docker
echo c) Traditional VPS
echo.
set /p method="Choose (a/b/c): "

if "%method%"=="a" (
    call deploy\01-deploy-vercel.sh
) else if "%method%"=="b" (
    call deploy\02-deploy-docker.sh
) else if "%method%"=="c" (
    call deploy\03-deploy-vps.sh
) else (
    echo Invalid option
)
goto menu

:frontend_deploy
cls
call deploy\04-deploy-frontend.sh
goto menu

:edge_deploy
cls
call deploy\05-deploy-edge-function.sh
goto menu

:verify_deploy
cls
echo.
echo =======================================
echo Verifying Deployment
echo =======================================
echo.

REM Check Node Server
echo Checking Node Server health...
for /f %%i in ('where curl') do (
    if "%%i"=="" (
        echo   curl not found - skipping health check
        goto skip_health
    )
)

set "PDF_SERVER_URL=http://localhost:3000"
echo   Attempting to reach: !PDF_SERVER_URL!/health
timeout /t 2 /nobreak > nul
curl -s !PDF_SERVER_URL!/health > nul 2>&1
if !errorlevel! equ 0 (
    echo   ✓ Node Server responding at !PDF_SERVER_URL!
    curl -s !PDF_SERVER_URL!/health
) else (
    echo   Note: Node Server not responding at !PDF_SERVER_URL!
    echo   It may not be running yet, or try a different URL
)

:skip_health
echo.

REM Check files
echo Checking critical files...
if exist "src\lib\sharedHTMLTemplate.ts" (
    echo   ✓ Shared HTML Template
) else (
    echo   ✗ Shared HTML Template
)

if exist "server\src\utils\pdfGenerator.ts" (
    echo   ✓ PDF Generator
) else (
    echo   ✗ PDF Generator
)

if exist "supabase\functions\generate-full-record-documentation-pdf\index.ts" (
    echo   ✓ Edge Function
) else (
    echo   ✗ Edge Function
)

if exist ".env.production" (
    echo   ✓ Frontend .env.production
) else (
    echo   - Frontend .env.production (not yet created)
)

if exist "server\.env" (
    echo   ✓ Node Server .env
) else (
    echo   - Node Server .env (not yet created)
)

echo.
pause
goto menu

:end
echo Exiting...
exit /b 0
