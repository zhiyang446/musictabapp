# Music Tab App - VSCode Terminal 启动脚本
# 在 VSCode 中运行: .\dev-start.ps1

param(
    [switch]$StopAll,
    [switch]$Status
)

$ErrorActionPreference = "SilentlyContinue"

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    if ($args) {
        Write-Host $args -ForegroundColor $ForegroundColor
    }
}

# 检查端口是否被占用
function Test-Port($Port) {
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# 停止所有服务
if ($StopAll) {
    Write-ColorOutput Green "🛑 停止所有服务..."
    
    # 停止端口 8080 (Orchestrator)
    $orchestratorProcess = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    if ($orchestratorProcess) {
        $pid = (Get-Process -Id $orchestratorProcess.OwningProcess -ErrorAction SilentlyContinue).Id
        if ($pid) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-ColorOutput Yellow "  ✅ 已停止 Orchestrator (PID: $pid)"
        }
    }
    
    # 停止端口 8081 (Expo)
    $expoProcess = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
    if ($expoProcess) {
        $pid = (Get-Process -Id $expoProcess.OwningProcess -ErrorAction SilentlyContinue).Id
        if ($pid) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-ColorOutput Yellow "  ✅ 已停止 Expo (PID: $pid)"
        }
    }
    
    # 停止 Celery Worker
    $celeryProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*celery*" }
    foreach ($process in $celeryProcesses) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Write-ColorOutput Yellow "  ✅ 已停止 Worker (PID: $($process.Id))"
    }
    
    Write-ColorOutput Green "🎉 所有服务已停止"
    return
}

# 检查服务状态
if ($Status) {
    Write-ColorOutput Green "📊 检查服务状态..."

    $orchestratorRunning = Test-Port 8080
    $expoRunning = Test-Port 8081
    $redisRunning = Test-Port 6379

    Write-ColorOutput Cyan "服务状态:"
    Write-Host "  • Orchestrator (8080): " -NoNewline
    if ($orchestratorRunning) { Write-ColorOutput Green "✅ 运行中" } else { Write-ColorOutput Red "❌ 未运行" }

    Write-Host "  • Expo App (8081): " -NoNewline
    if ($expoRunning) { Write-ColorOutput Green "✅ 运行中" } else { Write-ColorOutput Red "❌ 未运行" }

    Write-Host "  • Redis (6379): " -NoNewline
    if ($redisRunning) { Write-ColorOutput Green "✅ 运行中" } else { Write-ColorOutput Yellow "⚠️ 未运行" }

    return
}

# 启动所有服务
Write-ColorOutput Green "🎵 启动 Music Tab App 开发环境..."

# 检查虚拟环境
$venvPath = ".\\.venv\\Scripts\\python.exe"
if (-not (Test-Path $venvPath)) {
    Write-ColorOutput Red "❌ 虚拟环境未找到: $venvPath"
    Write-ColorOutput Yellow "请确保在项目根目录运行此脚本"
    return
}

Write-ColorOutput Green "✅ 虚拟环境已找到"

# 检查 Redis
Write-ColorOutput Yellow "🔄 检查 Redis..."
$redisRunning = Test-Port 6379
if ($redisRunning) {
    Write-ColorOutput Green "✅ Redis 已运行"
} else {
    Write-ColorOutput Yellow "⚠️  Redis 未运行，Worker 可能无法正常工作"
    Write-ColorOutput Gray "   提示: 请启动 Redis 服务器"
}

# 检查端口占用
$orchestratorRunning = Test-Port 8080
$expoRunning = Test-Port 8081

if ($orchestratorRunning) {
    Write-ColorOutput Yellow "⚠️  端口 8080 已被占用 (Orchestrator 可能已运行)"
}

if ($expoRunning) {
    Write-ColorOutput Yellow "⚠️  端口 8081 已被占用 (Expo 可能已运行)"
}

Write-ColorOutput Cyan "🚀 启动服务..."

# 启动 Worker (在新的 PowerShell 窗口)
if (-not $orchestratorRunning) {
    Write-ColorOutput Yellow "📋 启动 Worker..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\\services\\worker'; & '$PWD\\.venv\\Scripts\\python.exe' -m celery -A tasks worker --loglevel=info --pool=solo" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

# 启动 Orchestrator (在新的 PowerShell 窗口)
if (-not $orchestratorRunning) {
    Write-ColorOutput Yellow "🌐 启动 Orchestrator API..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\\services\\orchestrator'; & '$PWD\\.venv\\Scripts\\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

# 启动 Expo App (在新的 PowerShell 窗口)
if (-not $expoRunning) {
    Write-ColorOutput Yellow "📱 启动 Expo App..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\\apps\\mobile'; npx expo start" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

Write-ColorOutput Green ""
Write-ColorOutput Green "🎉 开发环境启动完成！"
Write-ColorOutput Cyan ""
Write-ColorOutput Cyan "📋 服务信息:"
Write-ColorOutput White "  • Worker: 后台运行 (处理音频任务)"
Write-ColorOutput White "  • Orchestrator API: http://localhost:8080"
Write-ColorOutput White "  • Expo App: http://localhost:8081"
Write-ColorOutput White "  • Supabase: https://jvmcekqjavgesucxytwh.supabase.co"
Write-ColorOutput Cyan ""
Write-ColorOutput Yellow "⏳ 等待所有服务完全启动 (约 10-15 秒)..."
Write-ColorOutput Green "🌐 然后访问: http://localhost:8081"
Write-ColorOutput Cyan ""
Write-ColorOutput Gray "💡 使用方法:"
Write-ColorOutput Gray "  .\dev-start.ps1          # 启动所有服务"
Write-ColorOutput Gray "  .\dev-start.ps1 -Status  # 检查服务状态"
Write-ColorOutput Gray "  .\dev-start.ps1 -StopAll # 停止所有服务"
