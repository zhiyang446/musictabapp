@echo off
echo 🔧 Installing ffmpeg for T47 Audio Preprocessing
echo =================================================

REM Create ffmpeg directory
set FFMPEG_DIR=C:\ffmpeg
set FFMPEG_BIN=%FFMPEG_DIR%\bin

echo 📁 Creating ffmpeg directory: %FFMPEG_DIR%

if not exist "%FFMPEG_DIR%" mkdir "%FFMPEG_DIR%"
if not exist "%FFMPEG_BIN%" mkdir "%FFMPEG_BIN%"

echo.
echo ⬇️  Please download ffmpeg manually:
echo.
echo 1. Go to: https://www.gyan.dev/ffmpeg/builds/
echo 2. Download: ffmpeg-release-essentials.zip
echo 3. Extract the zip file
echo 4. Copy ffmpeg.exe, ffprobe.exe from bin folder to: %FFMPEG_BIN%
echo 5. Run this script again to add to PATH
echo.

REM Check if ffmpeg already exists
if exist "%FFMPEG_BIN%\ffmpeg.exe" (
    echo ✅ ffmpeg.exe found in %FFMPEG_BIN%
    goto :test_ffmpeg
) else (
    echo ❌ ffmpeg.exe not found in %FFMPEG_BIN%
    echo Please download and extract ffmpeg first
    pause
    exit /b 1
)

:test_ffmpeg
echo 🧪 Testing ffmpeg installation...

REM Test ffmpeg
"%FFMPEG_BIN%\ffmpeg.exe" -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ffmpeg is working
    "%FFMPEG_BIN%\ffmpeg.exe" -version | findstr "ffmpeg version"
) else (
    echo ❌ ffmpeg test failed
    pause
    exit /b 1
)

REM Test ffprobe
"%FFMPEG_BIN%\ffprobe.exe" -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ffprobe is working
) else (
    echo ❌ ffprobe test failed
)

echo.
echo 🔧 Adding ffmpeg to PATH...

REM Add to PATH (this only affects current session)
set PATH=%PATH%;%FFMPEG_BIN%

echo ✅ ffmpeg added to current session PATH
echo.
echo 🎉 ffmpeg Installation Complete!
echo =================================
echo 📍 Installation path: %FFMPEG_BIN%
echo 🔄 To make permanent, add to system PATH manually
echo 🧪 Test with: ffmpeg -version
echo.
echo 📋 Next steps:
echo    1. Run: python scripts/test-t47-simple.py
echo    2. Verify ffmpeg binary test passes
echo.
pause
