#!/usr/bin/env python3

"""
T47 + T48 Integration Test Script

This script tests the integration between T47 (ffmpeg preprocessing) 
and T48 (source separation) to ensure they work together correctly.
"""

import os
import sys
import tempfile
import logging
from pathlib import Path

# Add the worker directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def test_t47_t48_integration():
    """Test T47 + T48 integration"""
    print("🎵 T47 + T48 Integration Test")
    print("=============================")
    
    success_count = 0
    total_tests = 4
    
    try:
        # Test 1: Create test audio
        print("\n🧪 Test 1: Creating test audio...")
        test_audio_path = create_test_audio()
        if test_audio_path:
            print(f"✅ Test audio created: {Path(test_audio_path).name}")
            success_count += 1
        else:
            print("❌ Test audio creation failed")
            return False
        
        # Test 2: T47 preprocessing
        print("\n🧪 Test 2: T47 preprocessing...")
        if test_t47_preprocessing(test_audio_path):
            print("✅ T47 preprocessing passed")
            success_count += 1
        else:
            print("❌ T47 preprocessing failed")
        
        # Test 3: T48 separation (disabled)
        print("\n🧪 Test 3: T48 separation disabled...")
        if test_t48_separation_disabled(test_audio_path):
            print("✅ T48 separation disabled passed")
            success_count += 1
        else:
            print("❌ T48 separation disabled failed")
        
        # Test 4: T47 + T48 pipeline
        print("\n🧪 Test 4: T47 + T48 pipeline...")
        if test_full_pipeline(test_audio_path):
            print("✅ Full pipeline passed")
            success_count += 1
        else:
            print("❌ Full pipeline failed")
        
        # Results
        print(f"\n📊 Integration Test Results: {success_count}/{total_tests} passed")
        
        if success_count == total_tests:
            print("\n🎉 T47 + T48 INTEGRATION SUCCESSFUL!")
            return True
        else:
            print("\n❌ T47 + T48 INTEGRATION ISSUES DETECTED")
            return False
            
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False

def create_test_audio():
    """Create test audio file"""
    try:
        temp_dir = tempfile.mkdtemp(prefix="t47_t48_test_")
        test_file = os.path.join(temp_dir, "test_stereo_48k.wav")
        
        # Create with ffmpeg
        import subprocess
        cmd = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=3:sample_rate=48000",
            "-ac", "2",  # stereo
            "-y",
            test_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and os.path.exists(test_file):
            file_size = os.path.getsize(test_file)
            print(f"   📁 Created: 48kHz stereo, {file_size:,} bytes")
            return test_file
        else:
            print(f"   ❌ ffmpeg failed: {result.stderr}")
            return None
        
    except Exception as e:
        print(f"   ❌ Test audio creation error: {e}")
        return None

def test_t47_preprocessing(audio_path):
    """Test T47 preprocessing functionality"""
    try:
        from audio_preprocessor import create_audio_preprocessor
        
        preprocessor = create_audio_preprocessor()
        
        result = preprocessor.preprocess_audio(
            input_path=audio_path,
            job_id="integration_test",
            preserve_channels=False  # Convert to mono
        )
        
        if not result['success']:
            print("   ❌ Preprocessing failed")
            return False
        
        # Verify T47 DoD requirements
        output_info = result['output_info']
        dod_checks = [
            output_info['sample_rate'] == 44100,
            output_info['channels'] == 1,
            result['output_path'].endswith('.wav')
        ]
        
        if all(dod_checks):
            print("   ✅ T47 DoD requirements satisfied")
            print(f"      Output: {output_info['sample_rate']}Hz, {output_info['channels']} channels")
            return result['output_path']  # Return preprocessed file path
        else:
            print("   ❌ T47 DoD requirements not met")
            return False
        
    except Exception as e:
        print(f"   ❌ T47 preprocessing error: {e}")
        return False

def test_t48_separation_disabled(audio_path):
    """Test T48 with separation disabled"""
    try:
        from source_separator import process_with_separation
        
        result = process_with_separation(
            input_path=audio_path,
            job_id="integration_disabled",
            separate=False
        )
        
        if result['success'] and not result['separation_enabled']:
            print("   ✅ T48 separation disabled working correctly")
            return True
        else:
            print("   ❌ T48 separation disabled not working")
            return False
        
    except Exception as e:
        print(f"   ❌ T48 separation disabled error: {e}")
        return False

def test_full_pipeline(original_audio_path):
    """Test full T47 + T48 pipeline"""
    try:
        from audio_preprocessor import create_audio_preprocessor
        from source_separator import process_with_separation
        
        print("   🔄 Step 1: T47 preprocessing...")
        
        # Step 1: T47 preprocessing
        preprocessor = create_audio_preprocessor()
        preprocess_result = preprocessor.preprocess_audio(
            input_path=original_audio_path,
            job_id="pipeline_test",
            preserve_channels=False
        )
        
        if not preprocess_result['success']:
            print("   ❌ Pipeline step 1 (T47) failed")
            return False
        
        preprocessed_path = preprocess_result['output_path']
        print(f"   ✅ T47 completed: {Path(preprocessed_path).name}")
        
        print("   🔄 Step 2: T48 separation (placeholder)...")
        
        # Step 2: T48 separation
        separation_result = process_with_separation(
            input_path=preprocessed_path,
            job_id="pipeline_test",
            separate=True  # Enable separation (placeholder)
        )
        
        if not separation_result['success']:
            print("   ❌ Pipeline step 2 (T48) failed")
            return False
        
        print("   ✅ T48 completed: placeholder separation")
        
        # Verify pipeline results
        if separation_result['separation_enabled']:
            sep_result = separation_result['separation_result']
            print(f"      Method: {sep_result['method']}")
            print(f"      Sources: {', '.join(sep_result['sources'])}")
            print(f"      Files: {len(sep_result['separated_files'])}")
        
        print("   ✅ Full pipeline completed successfully")
        return True
        
    except Exception as e:
        print(f"   ❌ Full pipeline error: {e}")
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Run integration test
    success = test_t47_t48_integration()
    
    # Final summary
    if success:
        print("\n🎉 T47 + T48 INTEGRATION VERIFIED!")
        print("   ✅ T47 preprocessing working")
        print("   ✅ T48 separation working")
        print("   ✅ Pipeline integration successful")
        print("   ✅ Ready for next phase (T49+)")
    else:
        print("\n🔧 T47 + T48 INTEGRATION NEEDS WORK")
        print("   Some components require fixes")
    
    sys.exit(0 if success else 1)
