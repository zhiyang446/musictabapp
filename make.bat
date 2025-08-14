@echo off
REM Music Tab App - CI/CD Batch Script (Windows make alternative)

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="fmt" goto fmt
if "%1"=="lint" goto lint
if "%1"=="test" goto test
if "%1"=="ci" goto ci
if "%1"=="clean" goto clean

echo Unknown command: %1
goto help

:help
echo Available commands:
echo   install  - Install all dependencies (Node.js + Python)
echo   fmt      - Format all code (Prettier + Black)
echo   lint     - Lint all code (ESLint + Ruff)
echo   test     - Run all tests (Jest + Pytest)
echo   ci       - Run full CI pipeline (fmt + lint + test)
echo   clean    - Clean build artifacts and dependencies
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
echo Formatting JavaScript/TypeScript code...
call npm run format
if errorlevel 1 exit /b 1
echo Formatting Python code...
call poetry run black .
if errorlevel 1 exit /b 1
echo Code formatting completed!
goto end

:lint
echo Linting JavaScript/TypeScript code...
call npm run lint
if errorlevel 1 exit /b 1
echo Linting Python code...
call poetry run ruff check .
if errorlevel 1 exit /b 1
echo Code linting completed!
goto end

:test
echo Running JavaScript/TypeScript tests...
call npm run test
if errorlevel 1 exit /b 1
echo Running Python tests...
call poetry run pytest --tb=short -q
REM pytest returns 5 when no tests are collected, which is OK for now
if errorlevel 1 if not errorlevel 6 exit /b 1
echo All tests completed!
goto end

:ci
echo Starting CI pipeline...
call make.bat fmt
if errorlevel 1 exit /b 1
call make.bat lint
if errorlevel 1 exit /b 1
call make.bat test
if errorlevel 1 exit /b 1
echo ✅ CI pipeline completed successfully!
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
