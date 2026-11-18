$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Stop-WithMessage([string]$Message) {
    Write-Host "`n$Message" -ForegroundColor Red
    exit 1
}

$node = Join-Path $root 'runtime\node.exe'
$ssh = Join-Path $root 'runtime\openssh\ssh.exe'
if (-not (Test-Path -LiteralPath $node)) { Stop-WithMessage 'Gói portable bị thiếu runtime\node.exe.' }
if (-not (Test-Path -LiteralPath $ssh)) { Stop-WithMessage 'Gói portable bị thiếu runtime\openssh\ssh.exe.' }
if (-not (Test-Path -LiteralPath '.env')) { Stop-WithMessage 'Gói portable bị thiếu cấu hình .env.' }
if (-not (Test-Path -LiteralPath 'node_modules')) { Stop-WithMessage 'Gói portable bị thiếu thư viện node_modules.' }

$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$serverLog = Join-Path $logs 'server.log'
$serverErrorLog = Join-Path $logs 'server-error.log'

Write-Host 'Đang khởi động NATA File Portal...' -ForegroundColor Cyan
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
        if (-not $details) { $details = 'Không có log.' }
        Stop-WithMessage "Web không khởi động được.`n$details"
    }

    Write-Host "`nWeb nội bộ: http://127.0.0.1:8787" -ForegroundColor Green
    Write-Host 'URL HTTPS công khai sẽ xuất hiện bên dưới, có dạng https://...app.lhr.life' -ForegroundColor Yellow
    Write-Host 'Giữ cửa sổ này mở. Đóng cửa sổ hoặc nhấn Ctrl+C sẽ dừng website.' -ForegroundColor Yellow
    Start-Process 'http://127.0.0.1:8787'
    & $ssh -T -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:127.0.0.1:8787 nokey@localhost.run
}
finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
