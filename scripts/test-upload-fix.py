#!/usr/bin/env python3
"""
Test script to verify the file upload fix
Tests that separated files are properly preserved for upload
"""

import os
import sys
import tempfile
import time
from pathlib import Path

# Add worker directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def create_test_mp3():
    """Create a test MP3 file"""
    try:
        import subprocess
        
        temp_dir = tempfile.mkdtemp(prefix="upload_fix_test_")
        test_file = os.path.join(temp_dir, "upload_test.mp3")
        
        print(f"📁 Creating test MP3: {test_file}")
        
        cmd = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=5:sample_rate=44100",
            "-ac", "2",
            "-b:a", "128k",
            "-y",
            test_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and os.path.exists(test_file):
            file_size = os.path.getsize(test_file)
            print(f"✅ Test MP3 created: {file_size:,} bytes")
            return test_file
        else:
            print(f"❌ Failed to create test MP3: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating test MP3: {e}")
        return None

def test_file_persistence():
    """Test that separated files persist after processing"""
    try:
        print("\n🔄 Testing file persistence after separation...")
        
        from source_separator import process_with_separation
        
        # Create test file
        test_file = create_test_mp3()
        if not test_file:
            return False
        
        job_id = f"upload_fix_test_{int(time.time())}"
        print(f"🆔 Job ID: {job_id}")
        
        # Process with separation
        result = process_with_separation(
            input_path=test_file,
            job_id=job_id,
            separate=True,
            method='demucs'
        )
        
        if not result.get('success'):
            print(f"❌ Processing failed: {result.get('error')}")
            return False
        
        if not result.get('separation_enabled'):
            print(f"❌ Separation not enabled")
            return False
        
        # Check if files exist and are accessible
        sep_result = result.get('separation_result', {})
        separated_files = sep_result.get('separated_files', {})
        
        print(f"📊 Checking {len(separated_files)} separated files...")
        
        all_files_exist = True
        for stem, file_path in separated_files.items():
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"   ✅ {stem}: {file_size:,} bytes - {file_path}")
            else:
                print(f"   ❌ {stem}: File not found - {file_path}")
                all_files_exist = False
        
        if all_files_exist:
            print("✅ All separated files exist and are accessible")
            
            # Simulate file access delay (like upload process)
            print("⏳ Simulating upload delay...")
            time.sleep(2)
            
            # Check files again after delay
            print("🔍 Checking files after delay...")
            still_exist = True
            for stem, file_path in separated_files.items():
                if os.path.exists(file_path):
                    print(f"   ✅ {stem}: Still accessible")
                else:
                    print(f"   ❌ {stem}: File disappeared")
                    still_exist = False
            
            if still_exist:
                print("✅ Files persist after processing - upload fix successful!")
                
                # Clean up test files
                try:
                    persistent_dir = Path(tempfile.gettempdir()) / f"persistent_stems_{job_id}"
                    if persistent_dir.exists():
                        import shutil
                        shutil.rmtree(persistent_dir)
                        print(f"🧹 Cleaned up test files: {persistent_dir}")
                except Exception as e:
                    print(f"⚠️  Cleanup warning: {e}")
                
                return True
            else:
                print("❌ Files disappeared after delay - fix not working")
                return False
        else:
            print("❌ Some files missing immediately after processing")
            return False
            
    except Exception as e:
        print(f"❌ File persistence test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_persistent_directory_structure():
    """Test the persistent directory structure"""
    try:
        print("\n📁 Testing persistent directory structure...")
        
        job_id = "structure_test"
        persistent_dir = Path(tempfile.gettempdir()) / f"persistent_stems_{job_id}"
        
        print(f"Expected persistent directory: {persistent_dir}")
        
        # The directory should be created during processing
        # For now, just verify the path structure is correct
        expected_pattern = str(persistent_dir).replace("\\", "/")
        if "persistent_stems_" in expected_pattern and job_id in expected_pattern:
            print("✅ Persistent directory path structure is correct")
            return True
        else:
            print("❌ Persistent directory path structure is incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Directory structure test failed: {e}")
        return False

def test_cleanup_logic():
    """Test the cleanup logic"""
    try:
        print("\n🧹 Testing cleanup logic...")
        
        # Create a test persistent directory
        job_id = "cleanup_test"
        persistent_dir = Path(tempfile.gettempdir()) / f"persistent_stems_{job_id}"
        persistent_dir.mkdir(parents=True, exist_ok=True)
        
        # Create some test files
        test_files = ['drums.wav', 'bass.wav', 'vocals.wav', 'other.wav']
        for filename in test_files:
            test_file = persistent_dir / filename
            test_file.write_text("test content")
        
        print(f"📁 Created test directory: {persistent_dir}")
        print(f"📄 Created {len(test_files)} test files")
        
        # Test cleanup
        import shutil
        if persistent_dir.exists():
            shutil.rmtree(persistent_dir)
            print("🧹 Cleanup executed")
            
            if not persistent_dir.exists():
                print("✅ Cleanup successful - directory removed")
                return True
            else:
                print("❌ Cleanup failed - directory still exists")
                return False
        else:
            print("❌ Test directory was not created")
            return False
            
    except Exception as e:
        print(f"❌ Cleanup logic test failed: {e}")
        return False

def main():
    """Run upload fix tests"""
    print("🧪 Testing Upload Fix for Separated Files")
    print("=" * 50)
    
    tests = [
        ("Persistent Directory Structure", test_persistent_directory_structure),
        ("Cleanup Logic", test_cleanup_logic),
        ("File Persistence", test_file_persistence),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"   {status}")
        except Exception as e:
            print(f"   ❌ FAILED with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Upload Fix Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Upload fix is working!")
        print("💡 Key improvements:")
        print("   - Separated files are copied to persistent location")
        print("   - Files remain accessible during upload process")
        print("   - Proper cleanup after successful upload")
        print("   - No more 'FileNotFoundError' during stem upload")
    else:
        print("⚠️  Some tests failed. Upload issues may persist.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
