@echo off
echo 🎵 启动 Music Tab App 所有服务...

REM 设置路径
set VENV_PYTHON=C:\Users\zhiya\Documents\MyProject\musictabapp\.venv\Scripts\python.exe
set PROJECT_ROOT=C:\Users\zhiya\Documents\MyProject\musictabapp

REM 检查虚拟环境
if not exist "%VENV_PYTHON%" (
    echo ❌ 虚拟环境未找到: %VENV_PYTHON%
    pause
    exit /b 1
)

echo ✅ 虚拟环境已找到

REM 启动 Worker
echo 🔄 启动 Worker...
start "Worker" cmd /k "cd /d %PROJECT_ROOT%\services\worker && %VENV_PYTHON% -m celery -A tasks worker --loglevel=info --pool=solo"

REM 等待 3 秒
timeout /t 3 /nobreak >nul

REM 启动 Orchestrator
echo 🔄 启动 Orchestrator API...
start "Orchestrator" cmd /k "cd /d %PROJECT_ROOT%\services\orchestrator && %VENV_PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload"

REM 等待 3 秒
timeout /t 3 /nobreak >nul

REM 启动 Expo App
echo 🔄 启动 Expo App...
start "Expo App" cmd /k "cd /d %PROJECT_ROOT%\apps\mobile && npx expo start"

echo.
echo 🎉 所有服务启动完成！
echo.
echo 📋 服务列表:
echo   • Worker: 后台运行
echo   • Orchestrator API: http://localhost:8080
echo   • Expo App: http://localhost:8081
echo   • Supabase: https://jvmcekqjavgesucxytwh.supabase.co
echo.
echo ⏳ 等待服务启动完成 (约 10-15 秒)...
echo 然后您可以在浏览器中访问: http://localhost:8081
echo.
pause
