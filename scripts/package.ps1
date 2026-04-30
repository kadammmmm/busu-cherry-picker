# Creates a clean customer distribution ZIP from the main branch.
# Run from the repo root: .\scripts\package.ps1

$ErrorActionPreference = "Stop"

$repoRoot  = Split-Path -Parent $PSScriptRoot
$outputZip = Join-Path $repoRoot "call-selector-widget.zip"

Write-Host "Packaging Call Selector Widget from main branch..." -ForegroundColor Cyan

# Ensure we're on main and up to date
Push-Location $repoRoot
git checkout main | Out-Null
git pull        | Out-Null

# Export clean tree (no .git, no node_modules, no .env)
git archive --format=zip --output=$outputZip main
Pop-Location

$size = [math]::Round((Get-Item $outputZip).Length / 1KB)
Write-Host "Done: $outputZip ($size KB)" -ForegroundColor Green
Write-Host ""
Write-Host "The ZIP contains:" -ForegroundColor Cyan
Write-Host "  - All source files and pre-built bundle.js"
Write-Host "  - install.ps1  (customer runs this on their Windows Server)"
Write-Host "  - DEPLOYMENT_GUIDE.md"
Write-Host "  - README.md"
