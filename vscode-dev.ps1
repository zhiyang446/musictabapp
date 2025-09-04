# Music Tab App - VSCode Terminal Script
# 在 VSCode Terminal 中运行所有服务

param(
    [switch]$Status,
    [switch]$Stop,
    [switch]$Help
)

function Test-Port($Port) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

if ($Help) {
    Write-Host ""
    Write-Host "Music Tab App - VSCode Development Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\vscode-dev.ps1           # Show this help" -ForegroundColor Gray
    Write-Host "  .\vscode-dev.ps1 -Status   # Check service status" -ForegroundColor Gray
    Write-Host "  .\vscode-dev.ps1 -Stop     # Stop all services" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To start services in VSCode Terminal:" -ForegroundColor Cyan
    Write-Host "  1. Open 3 new Terminal tabs in VSCode (Ctrl+Shift+`)" -ForegroundColor Yellow
    Write-Host "  2. In Terminal 1: cd services/worker && ..\..\..\.venv\Scripts\python.exe -m celery -A tasks worker --loglevel=info --pool=solo" -ForegroundColor Gray
    Write-Host "  3. In Terminal 2: cd services/orchestrator && ..\..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -ForegroundColor Gray
    Write-Host "  4. In Terminal 3: cd apps/mobile && npx expo start" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "  • Expo App: http://localhost:8081" -ForegroundColor White
    Write-Host "  • Orchestrator API: http://localhost:8080" -ForegroundColor White
    Write-Host "  • Supabase: https://jvmcekqjavgesucxytwh.supabase.co" -ForegroundColor White
    Write-Host ""
    return
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
        Write-Host "All services are running! Visit: http://localhost:8081" -ForegroundColor Green
    } else {
        Write-Host "Some services are not running. Use .\vscode-dev.ps1 -Help for startup instructions." -ForegroundColor Yellow
    }
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
    Write-Host ""
    return
}

# Default: Show help
Write-Host ""
Write-Host "Music Tab App - VSCode Development Environment" -ForegroundColor Green
Write-Host ""
Write-Host "To start all services in VSCode Terminal tabs:" -ForegroundColor Cyan
Write-Host ""

# Check virtual environment
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    Write-Host ""
    return
}

Write-Host "Step 1: Open 3 new Terminal tabs in VSCode" -ForegroundColor Yellow
Write-Host "  Press Ctrl+Shift+` to open new terminals" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Run these commands in separate Terminal tabs:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Terminal Tab 1 (Worker):" -ForegroundColor Cyan
Write-Host "  cd services/worker" -ForegroundColor White
Write-Host "  ..\..\..\.venv\Scripts\python.exe -m celery -A tasks worker --loglevel=info --pool=solo" -ForegroundColor White
Write-Host ""

Write-Host "Terminal Tab 2 (Orchestrator API):" -ForegroundColor Cyan  
Write-Host "  cd services/orchestrator" -ForegroundColor White
Write-Host "  ..\..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -ForegroundColor White
Write-Host ""

Write-Host "Terminal Tab 3 (Expo App):" -ForegroundColor Cyan
Write-Host "  cd apps/mobile" -ForegroundColor White
Write-Host "  npx expo start" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Wait for all services to start (10-15 seconds)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 4: Visit http://localhost:8081 in your browser" -ForegroundColor Yellow
Write-Host ""

Write-Host "Commands:" -ForegroundColor Cyan
Write-Host "  .\vscode-dev.ps1 -Status   # Check if services are running" -ForegroundColor Gray
Write-Host "  .\vscode-dev.ps1 -Stop     # Stop all services" -ForegroundColor Gray
Write-Host "  .\vscode-dev.ps1 -Help     # Show detailed help" -ForegroundColor Gray
Write-Host ""
