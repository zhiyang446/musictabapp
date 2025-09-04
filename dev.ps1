# Music Tab App - Development Script
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
    
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "  • Orchestrator (8080): " -NoNewline
    if ($orchestrator) { Write-Host "Running" -ForegroundColor Green } else { Write-Host "Not Running" -ForegroundColor Red }
    
    Write-Host "  • Expo App (8081): " -NoNewline
    if ($expo) { Write-Host "Running" -ForegroundColor Green } else { Write-Host "Not Running" -ForegroundColor Red }
    
    Write-Host "  • Redis (6379): " -NoNewline
    if ($redis) { Write-Host "Running" -ForegroundColor Green } else { Write-Host "Not Running" -ForegroundColor Yellow }
    
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

# Start services
Write-Host "Starting Music Tab App development environment..." -ForegroundColor Green

# Check virtual environment
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    return
}

Write-Host "Virtual environment found" -ForegroundColor Green

# Check existing services
$orchestratorRunning = Test-Port 8080
$expoRunning = Test-Port 8081

if (-not $orchestratorRunning) {
    Write-Host "Starting Orchestrator API..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\services\orchestrator'; & '$PWD\.venv\Scripts\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "Orchestrator already running on port 8080" -ForegroundColor Yellow
}

if (-not $expoRunning) {
    Write-Host "Starting Expo App..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\mobile'; npx expo start" -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "Expo App already running on port 8081" -ForegroundColor Yellow
}

Write-Host "Starting Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\services\worker'; & '$PWD\.venv\Scripts\python.exe' -m celery -A tasks worker --loglevel=info --pool=solo" -WindowStyle Normal

Write-Host ""
Write-Host "Development environment started!" -ForegroundColor Green
Write-Host ""
Write-Host "Service Information:" -ForegroundColor Cyan
Write-Host "  • Worker: Running in background"
Write-Host "  • Orchestrator API: http://localhost:8080"
Write-Host "  • Expo App: http://localhost:8081"
Write-Host "  • Supabase: https://jvmcekqjavgesucxytwh.supabase.co"
Write-Host ""
Write-Host "Wait for services to start (about 10-15 seconds)..." -ForegroundColor Yellow
Write-Host "Then visit: http://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Gray
Write-Host "  .\dev.ps1          # Start all services" -ForegroundColor Gray
Write-Host "  .\dev.ps1 -Status  # Check service status" -ForegroundColor Gray
Write-Host "  .\dev.ps1 -Stop    # Stop all services" -ForegroundColor Gray
