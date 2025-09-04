# Music Tab App - Auto Start in VSCode Terminal
# 自动在 VSCode Terminal 中启动所有服务

param(
    [switch]$Status,
    [switch]$Stop
)

function Test-Port($Port) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

if ($Status) {
    Write-Host "Checking service status..." -ForegroundColor Green
    
    $orchestrator = Test-Port 8080
    $expo = Test-Port 8081
    $redis = Test-Port 6379
    
    Write-Host ""
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "  • Orchestrator (8080): " -NoNewline
    if ($orchestrator) { Write-Host "Running" -ForegroundColor Green } else { Write-Host "Not Running" -ForegroundColor Red }
    
    Write-Host "  • Expo App (8081): " -NoNewline
    if ($expo) { Write-Host "Running" -ForegroundColor Green } else { Write-Host "Not Running" -ForegroundColor Red }
    
    Write-Host "  • Redis (6379): " -NoNewline
    if ($redis) { Write-Host "Running" -ForegroundColor Green } else { Write-Host "Not Running" -ForegroundColor Yellow }
    
    Write-Host ""
    return
}

if ($Stop) {
    Write-Host "Stopping all services..." -ForegroundColor Green
    
    $ports = @(8080, 8081)
    foreach ($port in $ports) {
        try {
            $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($connection) {
                $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                    Write-Host "  Stopped service on port $port" -ForegroundColor Yellow
                }
            }
        } catch {
            # Ignore errors
        }
    }
    
    Write-Host "All services stopped" -ForegroundColor Green
    return
}

# 自动启动服务
Write-Host "Starting Music Tab App in VSCode Terminal..." -ForegroundColor Green

# 检查虚拟环境
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    return
}

Write-Host "Virtual environment found" -ForegroundColor Green

# 检查 VSCode 是否可用
$vscodeCmd = Get-Command "code" -ErrorAction SilentlyContinue
if (-not $vscodeCmd) {
    Write-Host "VSCode command 'code' not found in PATH" -ForegroundColor Yellow
    Write-Host "Please make sure VSCode is installed and added to PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use manual method" -ForegroundColor Cyan
    Write-Host "1. Open 3 Terminal tabs in VSCode" -ForegroundColor Gray
    Write-Host "2. Run these commands:" -ForegroundColor Gray
    Write-Host "   Tab 1: cd services/worker && ..\..\.venv\Scripts\python.exe -m celery -A tasks worker --loglevel=info --pool=solo" -ForegroundColor White
    Write-Host "   Tab 2: cd services/orchestrator && ..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -ForegroundColor White
    Write-Host "   Tab 3: cd apps/mobile && npx expo start" -ForegroundColor White
    return
}

Write-Host "VSCode found, creating terminal sessions..." -ForegroundColor Green

# 创建临时脚本文件
$workerScript = @"
cd services/worker
..\..\.venv\Scripts\python.exe -m celery -A tasks worker --loglevel=info --pool=solo
"@

$orchestratorScript = @"
cd services/orchestrator
..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
"@

$expoScript = @"
cd apps/mobile
npx expo start
"@

# 保存脚本到临时文件
$workerScript | Out-File -FilePath "temp_worker.ps1" -Encoding UTF8
$orchestratorScript | Out-File -FilePath "temp_orchestrator.ps1" -Encoding UTF8
$expoScript | Out-File -FilePath "temp_expo.ps1" -Encoding UTF8

try {
    Write-Host "Opening VSCode terminals..." -ForegroundColor Yellow
    
    # 方法1: 使用 VSCode 的集成终端
    Write-Host "  Starting Worker..." -ForegroundColor Gray
    Start-Process "code" -ArgumentList "--new-window", ".", "--command", "workbench.action.terminal.new" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    
    # 方法2: 直接在当前目录启动进程（在后台）
    Write-Host "  Starting services in background..." -ForegroundColor Gray
    
    # 启动 Worker
    $workerJob = Start-Job -ScriptBlock {
        param($workDir)
        Set-Location $workDir
        cd services/worker
        & "$workDir\.venv\Scripts\python.exe" -m celery -A tasks worker --loglevel=info --pool=solo
    } -ArgumentList $PWD
    
    # 启动 Orchestrator
    $orchestratorJob = Start-Job -ScriptBlock {
        param($workDir)
        Set-Location $workDir
        cd services/orchestrator
        & "$workDir\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
    } -ArgumentList $PWD
    
    # 启动 Expo
    $expoJob = Start-Job -ScriptBlock {
        param($workDir)
        Set-Location $workDir
        cd apps/mobile
        npx expo start
    } -ArgumentList $PWD
    
    Write-Host ""
    Write-Host "Services started in background jobs:" -ForegroundColor Green
    Write-Host "  • Worker Job ID: $($workerJob.Id)" -ForegroundColor Gray
    Write-Host "  • Orchestrator Job ID: $($orchestratorJob.Id)" -ForegroundColor Gray
    Write-Host "  • Expo Job ID: $($expoJob.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To view job output:" -ForegroundColor Cyan
    Write-Host "  Get-Job | Receive-Job" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop jobs:" -ForegroundColor Cyan
    Write-Host "  Get-Job | Stop-Job" -ForegroundColor Gray
    Write-Host "  Get-Job | Remove-Job" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Wait 10-15 seconds, then visit: http://localhost:8081" -ForegroundColor Green
    
} finally {
    # 清理临时文件
    Remove-Item "temp_worker.ps1" -ErrorAction SilentlyContinue
    Remove-Item "temp_orchestrator.ps1" -ErrorAction SilentlyContinue
    Remove-Item "temp_expo.ps1" -ErrorAction SilentlyContinue
}
