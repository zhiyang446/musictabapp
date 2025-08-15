@echo off
REM Music Tab App - CI/CD Batch Script (Windows make alternative)

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="fmt" goto fmt
if "%1"=="fmt-check" goto fmt-check
if "%1"=="lint" goto lint
if "%1"=="test" goto test
if "%1"=="ci" goto ci
if "%1"=="clean" goto clean

echo Unknown command: %1
goto help

:help
echo Music Tab App - Available Commands:
echo.
echo Setup:
echo   install     Install all dependencies (Node.js + Python)
echo.
echo Code Quality:
echo   fmt         Format all code (Prettier + Black + isort)
echo   fmt-check   Check code formatting without changes
echo   lint        Run all linters (ESLint + ruff + mypy)
echo   test        Run all tests (JavaScript + Python)
echo.
echo CI/CD:
echo   ci          Run complete CI pipeline (fmt-check + lint + test)
echo.
echo Cleanup:
echo   clean       Clean build artifacts and caches
echo.
echo Usage: make.bat ^<command^>
goto end

:install
echo Installing Node.js dependencies...
call npm install
if errorlevel 1 exit /b 1
echo Installing Python dependencies...
call poetry install
if errorlevel 1 exit /b 1
echo Dependencies installed successfully!
goto end

:fmt
echo 🎨 Formatting code...
call npm run fmt
if errorlevel 1 exit /b 1
echo ✅ Code formatting complete
goto end

:fmt-check
echo 🔍 Checking code formatting...
call npm run fmt:check
if errorlevel 1 exit /b 1
echo ✅ Code formatting check complete
goto end

:lint
echo 🔍 Running linters...
echo   → ESLint (JavaScript/TypeScript)
call npm run lint:js
if errorlevel 1 exit /b 1
echo   → ruff (Python)
call npm run lint:py
if errorlevel 1 exit /b 1
echo ✅ Linting complete
goto end

:test
echo 🧪 Running tests...
echo   → JavaScript tests
call npm run test:js
if errorlevel 1 exit /b 1
echo   → Python tests
call npm run test:py
if errorlevel 1 exit /b 1
echo ✅ Testing complete
goto end

:ci
echo 🚀 Running CI pipeline...
echo.
echo Step 1/3: Code formatting check
call make.bat fmt-check
if errorlevel 1 exit /b 1
echo.
echo Step 2/3: Linting
call make.bat lint
if errorlevel 1 exit /b 1
echo.
echo Step 3/3: Testing
call make.bat test
if errorlevel 1 exit /b 1
echo.
echo 🎉 CI pipeline completed successfully!
goto end

:clean
echo Cleaning Node.js artifacts...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo Cleaning Python artifacts...
call poetry env remove --all 2>nul
if exist .pytest_cache rmdir /s /q .pytest_cache
for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
del /s /q *.pyc 2>nul
echo Clean completed!
goto end

:end
