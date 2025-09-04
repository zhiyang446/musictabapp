#!/usr/bin/env python3
"""
Test script for Demucs audio loading fix
Tests the improved audio preprocessing and error handling
"""

import os
import sys
import tempfile
import time
from pathlib import Path

# Add worker directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def create_test_audio_file():
    """Create a test MP3 file with potential encoding issues"""
    try:
        import subprocess
        
        # Create temp directory with special characters (like the error case)
        temp_dir = tempfile.mkdtemp(prefix="tmp", suffix="nn")
        test_file = os.path.join(temp_dir, "input_audio_test.mp3")
        
        print(f"📁 Creating test file: {test_file}")
        
        # Create MP3 file using ffmpeg
        cmd = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=3:sample_rate=44100",
            "-ac", "2",  # stereo
            "-b:a", "128k",  # 128kbps
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
        print(f"❌ Test file creation error: {e}")
        return None

def test_audio_preparation():
    """Test the new audio preparation logic"""
    try:
        from source_separator import SourceSeparator
        
        print("\n🔧 Testing audio preparation...")
        
        # Create test file
        test_file = create_test_audio_file()
        if not test_file:
            print("❌ Cannot create test file, skipping test")
            return False
        
        # Create separator
        separator = SourceSeparator(cleanup=False)
        
        # Test preparation
        print(f"🔍 Testing preparation of: {test_file}")
        prepared_file = separator._prepare_audio_for_demucs(test_file)
        
        print(f"✅ Preparation successful")
        print(f"   Original: {test_file}")
        print(f"   Prepared: {prepared_file}")
        
        # Check prepared file
        if os.path.exists(prepared_file):
            size = os.path.getsize(prepared_file)
            print(f"   Prepared file size: {size:,} bytes")
            print(f"   Format: {Path(prepared_file).suffix}")
            return True
        else:
            print(f"❌ Prepared file not found: {prepared_file}")
            return False
            
    except Exception as e:
        print(f"❌ Audio preparation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_demucs_with_problematic_file():
    """Test Demucs with a file similar to the error case"""
    try:
        from source_separator import process_with_separation
        
        print("\n🎵 Testing Demucs with problematic file...")
        
        # Create test file in temp directory (similar to error case)
        test_file = create_test_audio_file()
        if not test_file:
            print("❌ Cannot create test file, skipping test")
            return False
        
        print(f"🔄 Testing Demucs separation...")
        
        def progress_callback(progress, message):
            print(f"   Progress: {progress}% - {message}")
        
        result = process_with_separation(
            input_path=test_file,
            job_id="demucs_fix_test",
            separate=True,
            method='demucs',
            progress_callback=progress_callback
        )
        
        print(f"📊 Test result:")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Separation enabled: {result.get('separation_enabled', False)}")
        
        if result.get('error'):
            print(f"   Error: {result['error']}")
            print(f"   Note: {result.get('note', 'N/A')}")
        
        if result.get('separation_result'):
            sep_result = result['separation_result']
            print(f"   Method: {sep_result.get('method', 'N/A')}")
            print(f"   Files: {list(sep_result.get('separated_files', {}).keys())}")
        
        return result.get('success', False)
        
    except Exception as e:
        print(f"❌ Demucs test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_error_handling():
    """Test improved error handling with invalid files"""
    try:
        from source_separator import SourceSeparator
        
        print("\n🚨 Testing error handling...")
        
        # Test with non-existent file
        separator = SourceSeparator(cleanup=False)
        
        try:
            separator._prepare_audio_for_demucs("/nonexistent/file.mp3")
            print("❌ Should have failed with non-existent file")
            return False
        except Exception as e:
            print(f"✅ Correctly caught error for non-existent file: {type(e).__name__}")
        
        # Test with empty file
        temp_dir = tempfile.mkdtemp()
        empty_file = os.path.join(temp_dir, "empty.mp3")
        with open(empty_file, 'wb') as f:
            pass  # Create empty file
        
        try:
            separator._prepare_audio_for_demucs(empty_file)
            print("❌ Should have failed with empty file")
            return False
        except Exception as e:
            print(f"✅ Correctly caught error for empty file: {type(e).__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Demucs audio loading fix")
    print("=" * 50)
    
    tests = [
        ("Audio Preparation", test_audio_preparation),
        ("Error Handling", test_error_handling),
        ("Demucs with Problematic File", test_demucs_with_problematic_file),
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
    print("📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The fix appears to be working.")
    else:
        print("⚠️  Some tests failed. Please review the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
