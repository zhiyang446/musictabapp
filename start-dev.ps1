# Music Tab App - 简单启动脚本
param(
    [switch]$Status,
    [switch]$Stop
)

function Write-Info($Message) {
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning($Message) {
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error($Message) {
    Write-Host $Message -ForegroundColor Red
}

function Test-Port($Port) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

if ($Status) {
    Write-Info "📊 检查服务状态..."
    
    $orchestrator = Test-Port 8080
    $expo = Test-Port 8081
    $redis = Test-Port 6379
    
    Write-Host "服务状态:" -ForegroundColor Cyan
    Write-Host "  • Orchestrator (8080): " -NoNewline
    if ($orchestrator) { Write-Host "✅ 运行中" -ForegroundColor Green } else { Write-Host "❌ 未运行" -ForegroundColor Red }
    
    Write-Host "  • Expo App (8081): " -NoNewline
    if ($expo) { Write-Host "✅ 运行中" -ForegroundColor Green } else { Write-Host "❌ 未运行" -ForegroundColor Red }
    
    Write-Host "  • Redis (6379): " -NoNewline
    if ($redis) { Write-Host "✅ 运行中" -ForegroundColor Green } else { Write-Host "⚠️ 未运行" -ForegroundColor Yellow }
    
    return
}

if ($Stop) {
    Write-Info "🛑 停止所有服务..."
    
    # 停止端口占用的进程
    $ports = @(8080, 8081)
    foreach ($port in $ports) {
        try {
            $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($connection) {
                $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                    Write-Warning "  ✅ 已停止端口 $port 的服务"
                }
            }
        } catch {
            # 忽略错误
        }
    }
    
    Write-Info "🎉 服务停止完成"
    return
}

# 启动服务
Write-Info "🎵 启动 Music Tab App 开发环境..."

# 检查虚拟环境
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Error "❌ 虚拟环境未找到"
    Write-Warning "请确保在项目根目录运行此脚本"
    return
}

Write-Info "✅ 虚拟环境已找到"

# 检查现有服务
$orchestratorRunning = Test-Port 8080
$expoRunning = Test-Port 8081

if ($orchestratorRunning) {
    Write-Warning "⚠️ Orchestrator 已在运行 (端口 8080)"
} else {
    Write-Warning "🌐 启动 Orchestrator API..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\services\orchestrator'; & '$PWD\.venv\Scripts\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -WindowStyle Normal
}

if ($expoRunning) {
    Write-Warning "⚠️ Expo App 已在运行 (端口 8081)"
} else {
    Write-Warning "📱 启动 Expo App..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\mobile'; npx expo start" -WindowStyle Normal
}

Write-Warning "📋 启动 Worker..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\services\worker'; & '$PWD\.venv\Scripts\python.exe' -m celery -A tasks worker --loglevel=info --pool=solo" -WindowStyle Normal

Write-Info ""
Write-Info "🎉 开发环境启动完成！"
Write-Host ""
Write-Host "📋 服务信息:" -ForegroundColor Cyan
Write-Host "  • Worker: 后台运行"
Write-Host "  • Orchestrator API: http://localhost:8080"
Write-Host "  • Expo App: http://localhost:8081"
Write-Host "  • Supabase: https://jvmcekqjavgesucxytwh.supabase.co"
Write-Host ""
Write-Warning "⏳ 等待服务启动完成 (约 10-15 秒)..."
Write-Info "🌐 然后访问: http://localhost:8081"
Write-Host ""
Write-Host "💡 使用方法:" -ForegroundColor Gray
Write-Host "  .\start-dev.ps1          # 启动所有服务" -ForegroundColor Gray
Write-Host "  .\start-dev.ps1 -Status  # 检查服务状态" -ForegroundColor Gray
Write-Host "  .\start-dev.ps1 -Stop    # 停止所有服务" -ForegroundColor Gray
