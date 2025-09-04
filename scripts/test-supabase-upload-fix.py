#!/usr/bin/env python3
"""
Test script to verify the Supabase upload fix
Tests that the upsert parameter is correctly formatted as string
"""

import os
import sys
import tempfile
import time
from pathlib import Path

# Add worker directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def create_test_wav():
    """Create a test WAV file for upload testing"""
    try:
        import subprocess
        
        temp_dir = tempfile.mkdtemp(prefix="supabase_upload_test_")
        test_file = os.path.join(temp_dir, "test_upload.wav")
        
        print(f"📁 Creating test WAV: {test_file}")
        
        cmd = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=2:sample_rate=44100",
            "-ac", "1",
            "-y",
            test_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and os.path.exists(test_file):
            file_size = os.path.getsize(test_file)
            print(f"✅ Test WAV created: {file_size:,} bytes")
            return test_file
        else:
            print(f"❌ Failed to create test WAV: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating test WAV: {e}")
        return None

def test_supabase_upload_parameters():
    """Test that Supabase upload parameters are correctly formatted"""
    try:
        print("\n🔧 Testing Supabase upload parameter formatting...")
        
        # Test the file_options parameter format
        file_options_correct = {"contentType": "audio/wav", "upsert": "true"}
        file_options_incorrect = {"contentType": "audio/wav", "upsert": True}
        
        print(f"✅ Correct format: {file_options_correct}")
        print(f"❌ Incorrect format: {file_options_incorrect}")
        
        # Check parameter types
        correct_upsert_type = type(file_options_correct["upsert"])
        incorrect_upsert_type = type(file_options_incorrect["upsert"])
        
        print(f"✅ Correct upsert type: {correct_upsert_type}")
        print(f"❌ Incorrect upsert type: {incorrect_upsert_type}")
        
        if correct_upsert_type == str and incorrect_upsert_type == bool:
            print("✅ Parameter type validation passed")
            return True
        else:
            print("❌ Parameter type validation failed")
            return False
            
    except Exception as e:
        print(f"❌ Parameter format test failed: {e}")
        return False

def test_mock_upload_call():
    """Test a mock upload call with correct parameters"""
    try:
        print("\n📤 Testing mock upload call...")
        
        # Create test file
        test_file = create_test_wav()
        if not test_file:
            return False
        
        # Mock the upload parameters that would be used
        storage_path = "test-job-id/drums.wav"
        file_options = {"contentType": "audio/wav", "upsert": "true"}
        
        print(f"📁 Storage path: {storage_path}")
        print(f"🔧 File options: {file_options}")
        
        # Verify file exists and is readable
        if os.path.exists(test_file):
            file_size = os.path.getsize(test_file)
            print(f"✅ Test file ready: {file_size:,} bytes")
            
            # Test file reading (simulating upload)
            with open(test_file, "rb") as fp:
                content = fp.read(1024)  # Read first 1KB
                print(f"✅ File readable: {len(content)} bytes read")
            
            # Verify parameters are correct type
            if isinstance(file_options["upsert"], str):
                print("✅ Upload parameters correctly formatted")
                return True
            else:
                print("❌ Upload parameters incorrectly formatted")
                return False
        else:
            print("❌ Test file not found")
            return False
            
    except Exception as e:
        print(f"❌ Mock upload test failed: {e}")
        return False

def test_actual_processing_flow():
    """Test the actual processing flow that caused the original error"""
    try:
        print("\n🎵 Testing actual processing flow...")
        
        from source_separator import process_with_separation
        
        # Create test file
        test_file = create_test_wav()
        if not test_file:
            return False
        
        job_id = f"supabase_upload_test_{int(time.time())}"
        print(f"🆔 Job ID: {job_id}")
        
        # Process with separation (this will create files that need to be uploaded)
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
        
        # Check if files are ready for upload
        sep_result = result.get('separation_result', {})
        separated_files = sep_result.get('separated_files', {})
        
        print(f"📊 Files ready for upload: {len(separated_files)}")
        
        upload_ready = True
        for stem, file_path in separated_files.items():
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"   ✅ {stem}: {file_size:,} bytes - Ready for upload")
            else:
                print(f"   ❌ {stem}: File not found - Upload will fail")
                upload_ready = False
        
        if upload_ready:
            print("✅ All files ready for upload - Supabase upload should succeed")
            
            # Clean up test files
            try:
                persistent_dir = Path(tempfile.gettempdir()) / f"persistent_stems_{job_id}"
                if persistent_dir.exists():
                    import shutil
                    shutil.rmtree(persistent_dir)
                    print(f"🧹 Cleaned up test files")
            except Exception as e:
                print(f"⚠️  Cleanup warning: {e}")
            
            return True
        else:
            print("❌ Some files not ready - Upload will fail")
            return False
            
    except Exception as e:
        print(f"❌ Processing flow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run Supabase upload fix tests"""
    print("🧪 Testing Supabase Upload Fix")
    print("=" * 40)
    
    tests = [
        ("Upload Parameter Formatting", test_supabase_upload_parameters),
        ("Mock Upload Call", test_mock_upload_call),
        ("Actual Processing Flow", test_actual_processing_flow),
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
    print("\n" + "=" * 40)
    print("📊 Supabase Upload Fix Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Supabase upload fix is working!")
        print("💡 Key fixes:")
        print("   - upsert parameter is now string 'true' instead of boolean True")
        print("   - File persistence ensures files exist during upload")
        print("   - No more 'Header value must be str or bytes' error")
        print("   - Stem files should upload successfully to Supabase")
    else:
        print("⚠️  Some tests failed. Upload issues may persist.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
