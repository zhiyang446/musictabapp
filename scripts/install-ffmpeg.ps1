# Install ffmpeg on Windows
# This script downloads and installs ffmpeg binary

Write-Host "🔧 Installing ffmpeg for T47 Audio Preprocessing" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Create ffmpeg directory
$ffmpegDir = "C:\ffmpeg"
$ffmpegBin = "$ffmpegDir\bin"

Write-Host "📁 Creating ffmpeg directory: $ffmpegDir"

if (!(Test-Path $ffmpegDir)) {
    New-Item -ItemType Directory -Path $ffmpegDir -Force | Out-Null
}

if (!(Test-Path $ffmpegBin)) {
    New-Item -ItemType Directory -Path $ffmpegBin -Force | Out-Null
}

# Download ffmpeg (using a stable release)
$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$zipPath = "$env:TEMP\ffmpeg.zip"

Write-Host "⬇️  Downloading ffmpeg from: $ffmpegUrl"

try {
    # Download with progress
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($ffmpegUrl, $zipPath)
    Write-Host "✅ Download completed"
} catch {
    Write-Host "❌ Download failed: $_" -ForegroundColor Red
    exit 1
}

# Extract ffmpeg
Write-Host "📦 Extracting ffmpeg..."

try {
    # Use built-in Expand-Archive
    Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
    
    # Find the extracted folder (it has a version number)
    $extractedFolder = Get-ChildItem -Path $env:TEMP -Directory | Where-Object { $_.Name -like "ffmpeg-*" } | Select-Object -First 1
    
    if ($extractedFolder) {
        Write-Host "📂 Found extracted folder: $($extractedFolder.Name)"
        
        # Copy binaries
        $sourceBin = "$($extractedFolder.FullName)\bin\*"
        Copy-Item -Path $sourceBin -Destination $ffmpegBin -Force
        
        Write-Host "✅ ffmpeg binaries copied to: $ffmpegBin"
        
        # Cleanup
        Remove-Item -Path $zipPath -Force
        Remove-Item -Path $extractedFolder.FullName -Recurse -Force
        
    } else {
        Write-Host "❌ Could not find extracted ffmpeg folder" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Extraction failed: $_" -ForegroundColor Red
    exit 1
}

# Add to PATH
Write-Host "🔧 Adding ffmpeg to PATH..."

# Get current PATH
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

# Check if ffmpeg is already in PATH
if ($currentPath -notlike "*$ffmpegBin*") {
    # Add ffmpeg to user PATH
    $newPath = "$currentPath;$ffmpegBin"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    
    # Also add to current session PATH
    $env:PATH += ";$ffmpegBin"
    
    Write-Host "✅ ffmpeg added to PATH"
} else {
    Write-Host "ℹ️  ffmpeg already in PATH"
}

# Test installation
Write-Host "🧪 Testing ffmpeg installation..."

try {
    $ffmpegVersion = & "$ffmpegBin\ffmpeg.exe" -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $versionLine = ($ffmpegVersion -split "`n")[0]
        Write-Host "✅ ffmpeg installed successfully!" -ForegroundColor Green
        Write-Host "   Version: $versionLine" -ForegroundColor Green
        
        # Test ffprobe too
        $ffprobeVersion = & "$ffmpegBin\ffprobe.exe" -version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ ffprobe also available" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ ffmpeg test failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ ffmpeg test error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 ffmpeg Installation Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "📍 Installation path: $ffmpegBin"
Write-Host "🔄 Please restart your terminal or IDE to use ffmpeg"
Write-Host "🧪 Test with: ffmpeg -version"
Write-Host ""
Write-Host "📋 Next steps:"
Write-Host "   1. Restart terminal/IDE"
Write-Host "   2. Run: python scripts/test-t47-simple.py"
Write-Host "   3. Verify ffmpeg binary test passes"
