$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Stop-WithMessage([string]$Message) {
    Write-Host "`n$Message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'Chưa có Node.js. Hãy cài Node.js 20 trở lên từ https://nodejs.org rồi chạy lại.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'Không tìm thấy npm. Hãy cài lại Node.js và chọn thêm Node.js vào PATH.'
}
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'Không tìm thấy OpenSSH Client. Hãy bật OpenSSH Client trong Windows Optional Features.'
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host 'Đang cài thư viện lần đầu...' -ForegroundColor Cyan
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Không thể cài thư viện.' }
}

if (-not (Test-Path -LiteralPath '.env')) {
    Write-Host "`nCẤU HÌNH LẦN ĐẦU" -ForegroundColor Green
    $defaultShare = '\\DESKTOP-F9CH434\Datanew\NATA'
    $sharePath = Read-Host "Đường dẫn thư mục share [$defaultShare]"
    if ([string]::IsNullOrWhiteSpace($sharePath)) { $sharePath = $defaultShare }
    if (-not (Test-Path -LiteralPath $sharePath)) {
        Stop-WithMessage "Không truy cập được $sharePath. Hãy kết nối mạng/VPN và cấp quyền thư mục trước."
    }

    $username = Read-Host 'Tên đăng nhập web [admin]'
    if ([string]::IsNullOrWhiteSpace($username)) { $username = 'admin' }
    $passwordSecure = Read-Host 'Mật khẩu web (ít nhất 12 ký tự)' -AsSecureString
    $confirmSecure = Read-Host 'Nhập lại mật khẩu' -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $confirmPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecure)
    try {
        $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
        $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPtr)
        if ($password -ne $confirmation) { Stop-WithMessage 'Hai mật khẩu không giống nhau.' }
        if ($password.Length -lt 12) { Stop-WithMessage 'Mật khẩu phải có ít nhất 12 ký tự.' }
        $payload = @{ sharePath = $sharePath; username = $username; password = $password } | ConvertTo-Json -Compress
        $payload | & node scripts/bootstrap-config.js
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Không thể tạo cấu hình.' }
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPtr)
        $password = $null
        $confirmation = $null
        $payload = $null
    }
}

Write-Host "`nĐang khởi động NATA File Portal..." -ForegroundColor Cyan
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
        if (-not $details) { $details = 'Không có log.' }
        Stop-WithMessage "Web không khởi động được.`n$details"
    }

    Write-Host 'Web nội bộ: http://127.0.0.1:8787' -ForegroundColor Green
    Write-Host 'Đang tạo URL HTTPS công khai. Hãy sao chép URL có dạng https://...app.lhr.life' -ForegroundColor Yellow
    Write-Host 'Giữ cửa sổ này mở để website tiếp tục hoạt động. Nhấn Ctrl+C để dừng.' -ForegroundColor Yellow
    Start-Process 'http://127.0.0.1:8787'
    & ssh.exe -T -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:127.0.0.1:8787 nokey@localhost.run
}
finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
