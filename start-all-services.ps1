# Music Tab App - 启动所有服务
# PowerShell 脚本

Write-Host "🎵 启动 Music Tab App 所有服务..." -ForegroundColor Green

# 检查虚拟环境
$venvPath = "C:\Users\zhiya\Documents\MyProject\musictabapp\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPath)) {
    Write-Host "❌ 虚拟环境未找到: $venvPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 虚拟环境已找到" -ForegroundColor Green

# 启动 Redis (如果需要)
Write-Host "🔄 检查 Redis..." -ForegroundColor Yellow
try {
    $redisTest = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet
    if ($redisTest) {
        Write-Host "✅ Redis 已运行" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis 未运行，请手动启动 Redis" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  无法检查 Redis 状态" -ForegroundColor Yellow
}

# 启动 Worker
Write-Host "🔄 启动 Worker..." -ForegroundColor Yellow
$workerPath = "C:\Users\zhiya\Documents\MyProject\musictabapp\services\worker"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workerPath'; & '$venvPath' -m celery -A tasks worker --loglevel=info --pool=solo" -WindowStyle Normal

Start-Sleep -Seconds 3

# 启动 Orchestrator
Write-Host "🔄 启动 Orchestrator API..." -ForegroundColor Yellow
$orchestratorPath = "C:\Users\zhiya\Documents\MyProject\musictabapp\services\orchestrator"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$orchestratorPath'; & '$venvPath' -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload" -WindowStyle Normal

Start-Sleep -Seconds 3

# 启动 Expo App
Write-Host "🔄 启动 Expo App..." -ForegroundColor Yellow
$mobileAppPath = "C:\Users\zhiya\Documents\MyProject\musictabapp\apps\mobile"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mobileAppPath'; npx expo start" -WindowStyle Normal

Write-Host ""
Write-Host "🎉 所有服务启动完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 服务列表:" -ForegroundColor Cyan
Write-Host "  • Worker: 后台运行" -ForegroundColor White
Write-Host "  • Orchestrator API: http://localhost:8080" -ForegroundColor White
Write-Host "  • Expo App: http://localhost:8081" -ForegroundColor White
Write-Host "  • Supabase: https://jvmcekqjavgesucxytwh.supabase.co" -ForegroundColor White
Write-Host ""
Write-Host "⏳ 等待服务启动完成 (约 10-15 秒)..." -ForegroundColor Yellow
Write-Host "然后您可以在浏览器中访问: http://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
