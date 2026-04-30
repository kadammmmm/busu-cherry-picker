#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# ============================================================
#  Call Selector Widget — Windows Server Installer
# ============================================================

function Write-Step    { param($msg) Write-Host "`n  --> $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Fail    { param($msg) Write-Host "  [ERR] $msg" -ForegroundColor Red }

Clear-Host
Write-Host @"

  ============================================================
   Call Selector Widget - Windows Server Installer
  ============================================================

"@ -ForegroundColor Cyan

# ---- Admin check -------------------------------------------------------
if (-not ([Security.Principal.WindowsPrincipal]
          [Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "This script must be run as Administrator."
    Write-Host "  Right-click install.ps1 and choose 'Run as Administrator'."
    Read-Host "`n  Press Enter to exit"
    exit 1
}

# ---- Step 1: Node.js ---------------------------------------------------
Write-Step "Checking Node.js..."

function Get-NodeMajor {
    try {
        $v = & node --version 2>$null
        if ($v -match 'v(\d+)') { return [int]$Matches[1] }
    } catch {}
    return 0
}

$nodeMajor = Get-NodeMajor

if ($nodeMajor -ge 18) {
    Write-Success "Node.js v$nodeMajor found."
} else {
    if ($nodeMajor -gt 0) {
        Write-Warn "Node.js v$nodeMajor found but version 18+ is required."
    } else {
        Write-Warn "Node.js not found."
    }

    $choice = Read-Host "  Install Node.js 18 LTS now via winget? (y/n)"
    if ($choice -ieq 'y') {
        Write-Step "Installing Node.js LTS via winget..."
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        # Refresh PATH for this session
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        $nodeMajor = Get-NodeMajor
        if ($nodeMajor -ge 18) {
            Write-Success "Node.js installed successfully."
        } else {
            Write-Fail "Node.js installation may require a new terminal session."
            Write-Host "  Please restart PowerShell as Administrator and re-run this script."
            Read-Host "`n  Press Enter to exit"
            exit 1
        }
    } else {
        Write-Fail "Node.js 18+ is required. Download from https://nodejs.org and re-run."
        Read-Host "`n  Press Enter to exit"
        exit 1
    }
}

# ---- Step 2: Install directory -----------------------------------------
Write-Step "Choose install directory..."
$defaultDir = "C:\inetpub\call-selector"
$installDir = Read-Host "  Install path (press Enter for $defaultDir)"
if ([string]::IsNullOrWhiteSpace($installDir)) { $installDir = $defaultDir }

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
Write-Success "Using: $installDir"

# ---- Step 3: Copy files ------------------------------------------------
Write-Step "Copying application files..."
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Get-ChildItem -Path $sourceDir | Where-Object {
    $_.Name -notin @("node_modules", ".env", ".git", "install.ps1")
} | ForEach-Object {
    Copy-Item $_.FullName -Destination $installDir -Recurse -Force
}
Write-Success "Files copied to $installDir."

# ---- Step 4: npm install -----------------------------------------------
Write-Step "Installing server dependencies (this may take a minute)..."
Push-Location $installDir
npm install --omit=dev --silent
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install failed. Check your internet connection and try again."
    Pop-Location; Read-Host "`n  Press Enter to exit"; exit 1
}
Pop-Location
Write-Success "Dependencies installed."

# ---- Step 5: Collect environment values --------------------------------
Write-Step "Configure environment..."
Write-Host "  Press Enter to accept the default shown in brackets.`n"

# Port
$port = Read-Host "  Server port [5000]"
if ([string]::IsNullOrWhiteSpace($port)) { $port = "5000" }

# Host URI
do {
    $hostUri = Read-Host "  Public server URL (e.g. https://call-selector.yourcompany.com)"
    if ([string]::IsNullOrWhiteSpace($hostUri)) { Write-Warn "  HOST_URI is required." }
} while ([string]::IsNullOrWhiteSpace($hostUri))

# CORS origins
$corsDefault = "https://desktop.wxcc-us1.cisco.com"
Write-Host "  WxCC Desktop URL(s) for CORS. For multiple regions separate with commas."
$corsOrigins = Read-Host "  CORS origins [$corsDefault]"
if ([string]::IsNullOrWhiteSpace($corsOrigins)) { $corsOrigins = $corsDefault }

# API Key
Write-Host "`n  API_KEY protects the call ingestion endpoint (POST /)."
Write-Host "  Your WxCC flow HTTP Request node must send this as the x-api-key header."
$apiKey = Read-Host "  API_KEY (press Enter to generate one automatically)"
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    $apiKey = & node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    Write-Success "Generated API_KEY: $apiKey"
    Write-Warn "  Save this value — you will need it when configuring your WxCC flow."
}

# Admin Key
Write-Host "`n  ADMIN_KEY protects the /admin/* diagnostic endpoints."
$adminKey = Read-Host "  ADMIN_KEY (press Enter to generate one automatically)"
if ([string]::IsNullOrWhiteSpace($adminKey)) {
    $adminKey = & node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    Write-Success "Generated ADMIN_KEY: $adminKey"
}

# Log level
$logLevel = Read-Host "`n  Log level — error / warn / info / debug [info]"
if ([string]::IsNullOrWhiteSpace($logLevel)) { $logLevel = "info" }

# ---- Step 6: Write .env ------------------------------------------------
Write-Step "Writing .env file..."
@"
PORT=$port
HOST_URI=$hostUri
CORS_ORIGINS=$corsOrigins
NODE_ENV=production
LOG_LEVEL=$logLevel
API_KEY=$apiKey
ADMIN_KEY=$adminKey
"@ | Set-Content -Path "$installDir\.env" -Encoding UTF8
Write-Success ".env file written."

# ---- Step 7: Install PM2 -----------------------------------------------
Write-Step "Installing PM2 process manager..."
npm install -g pm2 --silent
npm install -g pm2-windows-startup --silent
Write-Success "PM2 installed."

# ---- Step 8: Start service with PM2 ------------------------------------
Write-Step "Starting Call Selector service..."
Push-Location $installDir

# Remove any existing instance cleanly
pm2 stop call-selector  2>$null | Out-Null
pm2 delete call-selector 2>$null | Out-Null

pm2 start index.js --name call-selector
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Failed to start service. Run 'pm2 logs call-selector' for details."
    Pop-Location; Read-Host "`n  Press Enter to exit"; exit 1
}
pm2 save
pm2-startup install

Pop-Location
Write-Success "Service started and configured to run on Windows startup."

# ---- Step 9: Firewall --------------------------------------------------
Write-Step "Opening Windows Firewall port $port..."
$ruleName = "Call Selector Widget (port $port)"
if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
    Write-Success "Firewall rule already exists."
} else {
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction   Inbound `
        -Protocol    TCP `
        -LocalPort   $port `
        -Action      Allow | Out-Null
    Write-Success "Firewall rule created for port $port."
}

# ---- Step 10: Verify ---------------------------------------------------
Write-Step "Verifying service health..."
Start-Sleep -Seconds 4
try {
    $health = Invoke-RestMethod -Uri "http://localhost:$port/health" -TimeoutSec 10
    if ($health.status -eq "healthy") {
        Write-Success "Service is healthy! (version: $($health.version))"
    } else {
        Write-Warn "Service responded but reported status: $($health.status)"
    }
} catch {
    Write-Warn "Health check did not respond yet — the service may still be starting up."
    Write-Host "  Run 'pm2 logs call-selector' to check for errors."
}

# ---- Summary -----------------------------------------------------------
Write-Host @"

  ============================================================
   Installation Complete!
  ============================================================

   Install directory : $installDir
   Service URL       : $hostUri
   Health check      : http://localhost:$port/health
   Widget bundle     : $hostUri/build/bundle.js

   *** IMPORTANT — WxCC Flow HTTP Request node settings ***

     URL    : $hostUri/
     Header : x-api-key
     Value  : $apiKey

   Save the above — you will need it when configuring your flow.

   Useful commands:
     pm2 status                   Check if service is running
     pm2 logs call-selector       View live logs
     pm2 restart call-selector    Restart after config changes
     pm2 stop call-selector       Stop the service

   Next steps:
     1. Set up IIS as a reverse proxy for HTTPS (see DEPLOYMENT_GUIDE.md)
     2. Configure your WxCC queue (manuallyAssignable: true)
     3. Add the HTTP Request nodes to your WxCC flow
     4. Add the widget to your Agent Desktop Layout

  ============================================================

"@ -ForegroundColor Green

Read-Host "  Press Enter to exit"
