param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$ROOT = "C:\Users\delag\Desktop\ucc ipo\project"
$REPO = "$ROOT\ucc-ipo-repo"

if (-not $Message) {
    $Message = Read-Host "Commit message"
}
if (-not $Message) { $Message = "chore: sync changes" }

Write-Host ""
Write-Host "==> Syncing source files to ucc-ipo-repo..." -ForegroundColor Cyan

$syncItems = @("src", "public", "supabase")

foreach ($item in $syncItems) {
    $src  = "$ROOT\$item"
    $dest = "$REPO\$item"
    if (Test-Path $src) {
        robocopy $src $dest /MIR /NJH /NJS /NDL /NFL /NC /NS /XD node_modules .git | Out-Null
        Write-Host "    synced  $item\" -ForegroundColor Green
    }
}

$configFiles = @(
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "index.html",
    ".env.example",
    ".npmrc",
    ".editorconfig"
)

foreach ($file in $configFiles) {
    $src = "$ROOT\$file"
    if (Test-Path $src) {
        Copy-Item $src "$REPO\$file" -Force
        Write-Host "    synced  $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==> Committing and pushing to GitHub..." -ForegroundColor Cyan

Push-Location $REPO

try {
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "    Nothing to commit - already up to date." -ForegroundColor Yellow
    } else {
        git add -A
        git commit -m $Message
        git push origin main
        Write-Host ""
        Write-Host "==> Done! Bolt will automatically pick up the changes from GitHub." -ForegroundColor Green
        Write-Host "    Live site: https://ucc-ipo.com" -ForegroundColor Cyan
    }
} finally {
    Pop-Location
}