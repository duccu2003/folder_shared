$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Stop-WithMessage([string]$Message) {
    Write-Host "`n$Message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'Node.js is missing. Install Node.js 20 or newer from https://nodejs.org and run again.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'npm is missing. Reinstall Node.js and add it to PATH.'
}
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'OpenSSH Client is missing. Enable it in Windows Optional Features.'
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host 'Installing dependencies for the first run...' -ForegroundColor Cyan
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Dependency installation failed.' }
}

if (-not (Test-Path -LiteralPath '.env')) {
    Write-Host "`nFIRST-RUN SETUP" -ForegroundColor Green
    $defaultShare = '\\DESKTOP-F9CH434\Datanew\NATA'
    $sharePath = Read-Host "Shared folder path [$defaultShare]"
    if ([string]::IsNullOrWhiteSpace($sharePath)) { $sharePath = $defaultShare }
    if (-not (Test-Path -LiteralPath $sharePath)) {
        Stop-WithMessage "Cannot access $sharePath. Connect to the correct network/VPN and grant folder access first."
    }

    $username = Read-Host 'Web username [admin]'
    if ([string]::IsNullOrWhiteSpace($username)) { $username = 'admin' }
    $passwordSecure = Read-Host 'Web password (at least 12 characters)' -AsSecureString
    $confirmSecure = Read-Host 'Confirm password' -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $confirmPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecure)
    try {
        $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
        $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPtr)
        if ($password -ne $confirmation) { Stop-WithMessage 'Passwords do not match.' }
        if ($password.Length -lt 12) { Stop-WithMessage 'Password must contain at least 12 characters.' }
        $payload = @{ sharePath = $sharePath; username = $username; password = $password } | ConvertTo-Json -Compress
        $payload | & node scripts/bootstrap-config.js
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Configuration creation failed.' }
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPtr)
        $password = $null
        $confirmation = $null
        $payload = $null
    }
}

Write-Host "`nStarting NATA File Portal..." -ForegroundColor Cyan
$serverLog = Join-Path $env:TEMP 'nata-file-portal.log'
$serverErrorLog = Join-Path $env:TEMP 'nata-file-portal-error.log'
$server = Start-Process -FilePath 'node.exe' -ArgumentList 'src/server.js' -WorkingDirectory (Get-Location) -WindowStyle Hidden -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog -PassThru

try {
    $ready = $false
    foreach ($attempt in 1..20) {
        Start-Sleep -Milliseconds 500
        if ($server.HasExited) { break }
        try {
            $result = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/api/session' -UseBasicParsing -TimeoutSec 2
            if ($result.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) {
        $details = @($serverLog, $serverErrorLog) | Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { Get-Content -LiteralPath $_ -Raw }
        if (-not $details) { $details = 'No log is available.' }
        Stop-WithMessage "The web server failed to start.`n$details"
    }

    Write-Host 'Local website: http://127.0.0.1:8787' -ForegroundColor Green
    Write-Host 'Creating a public HTTPS URL. Copy the URL shaped like https://...app.lhr.life' -ForegroundColor Yellow
    Write-Host 'Keep this window open. Press Ctrl+C to stop the website.' -ForegroundColor Yellow
    Start-Process 'http://127.0.0.1:8787'
    & ssh.exe -T -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:127.0.0.1:8787 nokey@localhost.run
}
finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
