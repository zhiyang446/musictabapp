# Music Tab App - VSCode Auto Start
# 自动在 VSCode 中启动所有服务

param(
    [switch]$Status,
    [switch]$Stop,
    [switch]$Tasks
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
    if ($orchestrator -and $expo) {
        Write-Host "All services running! Visit: http://localhost:8081" -ForegroundColor Green
    }
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

if ($Tasks) {
    Write-Host "Using VSCode Tasks to start services..." -ForegroundColor Green
    Write-Host ""
    Write-Host "In VSCode:" -ForegroundColor Cyan
    Write-Host "1. Press Ctrl+Shift+P" -ForegroundColor Yellow
    Write-Host "2. Type 'Tasks: Run Task'" -ForegroundColor Yellow
    Write-Host "3. Select 'Start All Services'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run individual tasks:" -ForegroundColor Cyan
    Write-Host "  • Start Worker" -ForegroundColor Gray
    Write-Host "  • Start Orchestrator" -ForegroundColor Gray
    Write-Host "  • Start Expo App" -ForegroundColor Gray
    Write-Host ""
    return
}

# 默认：自动启动
Write-Host "Starting Music Tab App services..." -ForegroundColor Green

# 检查虚拟环境
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    return
}

# 检查 VSCode
$vscodeCmd = Get-Command "code" -ErrorAction SilentlyContinue
if (-not $vscodeCmd) {
    Write-Host "VSCode 'code' command not found" -ForegroundColor Yellow
    Write-Host "Please install VSCode and add it to PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual method:" -ForegroundColor Cyan
    Write-Host "  .\start-vscode.ps1 -Tasks" -ForegroundColor Gray
    return
}

Write-Host "Opening VSCode and starting services..." -ForegroundColor Green

# 方法1: 使用 VSCode 命令行打开项目并运行任务
try {
    # 打开 VSCode
    Write-Host "Opening VSCode..." -ForegroundColor Yellow
    Start-Process "code" -ArgumentList "." -Wait:$false
    
    Start-Sleep -Seconds 3
    
    # 尝试运行任务
    Write-Host "Running VSCode task..." -ForegroundColor Yellow
    Start-Process "code" -ArgumentList "--command", "workbench.action.tasks.runTask", "Start All Services" -Wait:$false
    
    Write-Host ""
    Write-Host "VSCode should now be open with services starting..." -ForegroundColor Green
    Write-Host ""
    Write-Host "If tasks don't start automatically:" -ForegroundColor Cyan
    Write-Host "1. In VSCode, press Ctrl+Shift+P" -ForegroundColor Yellow
    Write-Host "2. Type 'Tasks: Run Task'" -ForegroundColor Yellow
    Write-Host "3. Select 'Start All Services'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Wait 10-15 seconds, then visit: http://localhost:8081" -ForegroundColor Green
    
} catch {
    Write-Host "Error starting VSCode tasks: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use manual method:" -ForegroundColor Cyan
    Write-Host "  .\start-vscode.ps1 -Tasks" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Commands:" -ForegroundColor Cyan
Write-Host "  .\start-vscode.ps1          # Auto start (this)" -ForegroundColor Gray
Write-Host "  .\start-vscode.ps1 -Tasks   # Show task instructions" -ForegroundColor Gray
Write-Host "  .\start-vscode.ps1 -Status  # Check service status" -ForegroundColor Gray
Write-Host "  .\start-vscode.ps1 -Stop    # Stop all services" -ForegroundColor Gray
