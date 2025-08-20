#!/usr/bin/env python3

"""
Install ffmpeg binary for T47 Audio Preprocessing
"""

import os
import sys
import urllib.request
import zipfile
import tempfile
import shutil
from pathlib import Path

def install_ffmpeg():
    """Install ffmpeg binary on Windows"""
    print("🔧 Installing ffmpeg for T47 Audio Preprocessing")
    print("=================================================")
    
    # Define paths
    ffmpeg_dir = Path("C:/ffmpeg")
    ffmpeg_bin = ffmpeg_dir / "bin"
    
    print(f"📁 Creating ffmpeg directory: {ffmpeg_dir}")
    
    # Create directories
    ffmpeg_dir.mkdir(exist_ok=True)
    ffmpeg_bin.mkdir(exist_ok=True)
    
    # Check if already installed
    ffmpeg_exe = ffmpeg_bin / "ffmpeg.exe"
    if ffmpeg_exe.exists():
        print("✅ ffmpeg already installed, testing...")
        return test_ffmpeg(ffmpeg_bin)
    
    # Download URL
    ffmpeg_url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    
    print(f"⬇️  Downloading ffmpeg from: {ffmpeg_url}")
    print("   This may take a few minutes...")
    
    try:
        # Download to temp file
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_file:
            temp_path = temp_file.name
            
        # Download with progress
        def progress_hook(block_num, block_size, total_size):
            if total_size > 0:
                percent = min(100, (block_num * block_size * 100) // total_size)
                if block_num % 100 == 0:  # Update every 100 blocks
                    print(f"   Progress: {percent}%")
        
        urllib.request.urlretrieve(ffmpeg_url, temp_path, progress_hook)
        print("✅ Download completed")
        
        # Extract zip
        print("📦 Extracting ffmpeg...")
        
        with tempfile.TemporaryDirectory() as extract_dir:
            with zipfile.ZipFile(temp_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Find the extracted folder
            extracted_folders = [d for d in Path(extract_dir).iterdir() if d.is_dir() and d.name.startswith('ffmpeg-')]
            
            if not extracted_folders:
                print("❌ Could not find extracted ffmpeg folder")
                return False
            
            source_bin = extracted_folders[0] / "bin"
            
            if not source_bin.exists():
                print("❌ Could not find bin folder in extracted ffmpeg")
                return False
            
            # Copy binaries
            print(f"📂 Copying binaries from {source_bin} to {ffmpeg_bin}")
            
            for exe_file in source_bin.glob("*.exe"):
                dest_file = ffmpeg_bin / exe_file.name
                shutil.copy2(exe_file, dest_file)
                print(f"   Copied: {exe_file.name}")
        
        # Cleanup temp file
        os.unlink(temp_path)
        
        print("✅ ffmpeg binaries installed")
        
        # Test installation
        return test_ffmpeg(ffmpeg_bin)
        
    except Exception as e:
        print(f"❌ Installation failed: {e}")
        return False

def test_ffmpeg(ffmpeg_bin):
    """Test ffmpeg installation"""
    print("🧪 Testing ffmpeg installation...")
    
    ffmpeg_exe = ffmpeg_bin / "ffmpeg.exe"
    ffprobe_exe = ffmpeg_bin / "ffprobe.exe"
    
    try:
        # Test ffmpeg
        import subprocess
        
        result = subprocess.run([str(ffmpeg_exe), '-version'], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✅ ffmpeg working: {version_line}")
            
            # Test ffprobe
            result2 = subprocess.run([str(ffprobe_exe), '-version'], 
                                   capture_output=True, text=True, timeout=10)
            
            if result2.returncode == 0:
                print("✅ ffprobe also working")
            else:
                print("⚠️  ffprobe test failed")
            
            # Add to PATH for current session
            current_path = os.environ.get('PATH', '')
            if str(ffmpeg_bin) not in current_path:
                os.environ['PATH'] = f"{current_path};{ffmpeg_bin}"
                print("✅ Added to current session PATH")
            
            return True
        else:
            print(f"❌ ffmpeg test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ ffmpeg test error: {e}")
        return False

def add_to_system_path(ffmpeg_bin):
    """Add ffmpeg to system PATH (Windows)"""
    print("🔧 Adding ffmpeg to system PATH...")
    
    try:
        import winreg
        
        # Open registry key for user environment variables
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment', 0, winreg.KEY_ALL_ACCESS)
        
        try:
            # Get current PATH
            current_path, _ = winreg.QueryValueEx(key, 'PATH')
        except FileNotFoundError:
            current_path = ''
        
        # Add ffmpeg if not already present
        if str(ffmpeg_bin) not in current_path:
            new_path = f"{current_path};{ffmpeg_bin}" if current_path else str(ffmpeg_bin)
            winreg.SetValueEx(key, 'PATH', 0, winreg.REG_EXPAND_SZ, new_path)
            print("✅ Added to system PATH")
        else:
            print("ℹ️  Already in system PATH")
        
        winreg.CloseKey(key)
        return True
        
    except Exception as e:
        print(f"⚠️  Could not add to system PATH: {e}")
        print("   You may need to add manually or restart as administrator")
        return False

if __name__ == "__main__":
    print("🎯 ffmpeg Installation for T47")
    print("==============================")
    
    if sys.platform != "win32":
        print("❌ This installer is for Windows only")
        print("   Please install ffmpeg using your system package manager")
        sys.exit(1)
    
    success = install_ffmpeg()
    
    if success:
        print("\n🎉 ffmpeg Installation Complete!")
        print("=================================")
        print("📍 Installation path: C:/ffmpeg/bin")
        print("🧪 Test with: ffmpeg -version")
        print("\n📋 Next steps:")
        print("   1. Run: python scripts/test-t47-simple.py")
        print("   2. Verify ffmpeg binary test passes")
        print("   3. Continue with T47 development")
        
        # Try to add to system PATH
        ffmpeg_bin = Path("C:/ffmpeg/bin")
        add_to_system_path(ffmpeg_bin)
        
    else:
        print("\n❌ ffmpeg installation failed")
        print("   Please try manual installation:")
        print("   1. Download from: https://www.gyan.dev/ffmpeg/builds/")
        print("   2. Extract to C:/ffmpeg/")
        print("   3. Add C:/ffmpeg/bin to PATH")
        sys.exit(1)
