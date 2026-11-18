$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Stop-WithMessage([string]$Message) {
    Write-Host "`n$Message" -ForegroundColor Red
    exit 1
}

$node = Join-Path $root 'runtime\node.exe'
$ssh = Join-Path $root 'runtime\openssh\ssh.exe'
if (-not (Test-Path -LiteralPath $node)) { Stop-WithMessage 'Portable package is missing runtime\node.exe.' }
if (-not (Test-Path -LiteralPath $ssh)) { Stop-WithMessage 'Portable package is missing runtime\openssh\ssh.exe.' }
if (-not (Test-Path -LiteralPath 'node_modules')) { Stop-WithMessage 'Portable package is missing node_modules.' }

if (-not (Test-Path -LiteralPath '.env')) {
    Write-Host "`nFIRST-RUN SETUP" -ForegroundColor Green
    $defaultShare = '\\DESKTOP-F9CH434\Datanew\NATA'
    $sharePath = Read-Host "Shared folder path [$defaultShare]"
    if ([string]::IsNullOrWhiteSpace($sharePath)) { $sharePath = $defaultShare }
    if (-not (Test-Path -LiteralPath $sharePath)) {
        Stop-WithMessage "Cannot access $sharePath. Check the path and folder permissions first."
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
        $payload | & $node scripts/bootstrap-config.js
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

$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$serverLog = Join-Path $logs 'server.log'
$serverErrorLog = Join-Path $logs 'server-error.log'

Write-Host 'Starting NATA File Portal...' -ForegroundColor Cyan
$server = Start-Process -FilePath $node -ArgumentList 'src/server.js' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog -PassThru

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

    Write-Host "`nLocal website: http://127.0.0.1:8787" -ForegroundColor Green
    Write-Host 'The public HTTPS URL will appear below, shaped like https://...app.lhr.life' -ForegroundColor Yellow
    Write-Host 'Keep this window open. Closing it or pressing Ctrl+C stops the website.' -ForegroundColor Yellow
    Start-Process 'http://127.0.0.1:8787'
    & $ssh -T -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:127.0.0.1:8787 nokey@localhost.run
}
finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
