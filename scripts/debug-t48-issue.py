#!/usr/bin/env python3

"""
Debug T48 Issue Script

This script debugs the T48 separation issue with real audio files.
"""

import os
import sys
import logging
import tempfile
from pathlib import Path

# Add the worker directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def debug_t48_issue():
    """Debug T48 separation issue"""
    print("🔍 T48 Debug Session")
    print("===================")
    
    # Use a simple test file first
    test_audio = create_simple_test_file()
    if not test_audio:
        print("❌ Could not create test file")
        return False
    
    print(f"📁 Using test file: {test_audio}")
    print(f"📊 File size: {os.path.getsize(test_audio):,} bytes")
    
    try:
        # Test 1: Direct SourceSeparator usage
        print("\n🧪 Test 1: Direct SourceSeparator usage...")
        if test_direct_separator(test_audio):
            print("✅ Direct separator works")
        else:
            print("❌ Direct separator failed")
        
        # Test 2: process_with_separation function
        print("\n🧪 Test 2: process_with_separation function...")
        if test_process_function(test_audio):
            print("✅ Process function works")
        else:
            print("❌ Process function failed")
        
        # Test 3: With real Queen audio
        queen_audio = r"C:\Users\zhiya\Documents\MyProject\musictabapp\temp\Queen - Another One Bites the Dust (Official Video).wav"
        if os.path.exists(queen_audio):
            print(f"\n🧪 Test 3: With Queen audio...")
            if test_with_queen_audio(queen_audio):
                print("✅ Queen audio works")
            else:
                print("❌ Queen audio failed")
        
        return True
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        return False

def create_simple_test_file():
    """Create a simple test audio file"""
    try:
        temp_dir = tempfile.mkdtemp(prefix="t48_debug_")
        test_file = os.path.join(temp_dir, "debug_test.wav")
        
        # Create with ffmpeg
        import subprocess
        cmd = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=2:sample_rate=44100",
            "-ac", "1",  # mono
            "-y",
            test_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and os.path.exists(test_file):
            return test_file
        else:
            print(f"   ❌ ffmpeg failed: {result.stderr}")
            return None
        
    except Exception as e:
        print(f"   ❌ Test file creation error: {e}")
        return None

def test_direct_separator(audio_path):
    """Test SourceSeparator directly"""
    try:
        from source_separator import SourceSeparator
        
        # Create with explicit temp dir
        temp_dir = tempfile.mkdtemp(prefix="debug_separator_")
        print(f"   📁 Using temp dir: {temp_dir}")
        
        separator = SourceSeparator(temp_dir=temp_dir, cleanup=False)
        print(f"   📁 Separator temp dir: {separator.temp_dir}")
        print(f"   📊 Temp dir exists: {separator.temp_dir.exists()}")
        
        # Test separation
        result = separator.separate(
            input_path=audio_path,
            job_id="debug_test",
            method='none'
        )
        
        print(f"   📊 Separation result: {result['success']}")
        print(f"   📊 Method: {result['method']}")
        print(f"   📊 Stems: {list(result['stems'].keys())}")
        
        # Check if files exist
        for stem, file_path in result['stems'].items():
            exists = os.path.exists(file_path)
            size = os.path.getsize(file_path) if exists else 0
            print(f"      {stem}: exists={exists}, size={size:,}")
        
        return result['success']
        
    except Exception as e:
        print(f"   ❌ Direct separator error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_process_function(audio_path):
    """Test process_with_separation function"""
    try:
        from source_separator import process_with_separation
        
        result = process_with_separation(
            input_path=audio_path,
            job_id="debug_process",
            separate=True
        )
        
        print(f"   📊 Process result: {result['success']}")
        print(f"   📊 Separation enabled: {result['separation_enabled']}")
        
        if 'error' in result:
            print(f"   ❌ Error: {result['error']}")
        
        if result.get('separation_result'):
            sep_result = result['separation_result']
            print(f"   📊 Method: {sep_result['method']}")
            print(f"   📊 Sources: {sep_result['sources']}")
            
            for source, file_path in sep_result['separated_files'].items():
                exists = os.path.exists(file_path)
                size = os.path.getsize(file_path) if exists else 0
                print(f"      {source}: exists={exists}, size={size:,}")
        
        return result['success'] and result['separation_enabled']
        
    except Exception as e:
        print(f"   ❌ Process function error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_with_queen_audio(audio_path):
    """Test with Queen audio file"""
    try:
        # First preprocess with T47
        from audio_preprocessor import create_audio_preprocessor
        
        preprocessor = create_audio_preprocessor()
        preprocess_result = preprocessor.preprocess_audio(
            input_path=audio_path,
            job_id="debug_queen",
            preserve_channels=False
        )
        
        if not preprocess_result['success']:
            print("   ❌ T47 preprocessing failed")
            return False
        
        preprocessed_path = preprocess_result['output_path']
        print(f"   ✅ T47 completed: {Path(preprocessed_path).name}")
        
        # Now test T48
        from source_separator import process_with_separation
        
        result = process_with_separation(
            input_path=preprocessed_path,
            job_id="debug_queen",
            separate=True
        )
        
        print(f"   📊 T48 result: {result['success']}")
        print(f"   📊 Separation enabled: {result['separation_enabled']}")
        
        if 'error' in result:
            print(f"   ❌ Error: {result['error']}")
            return False
        
        if result.get('separation_result'):
            sep_result = result['separation_result']
            print(f"   📊 Method: {sep_result['method']}")
            print(f"   📊 Files: {len(sep_result['separated_files'])}")
        
        return result['success'] and result['separation_enabled']
        
    except Exception as e:
        print(f"   ❌ Queen audio error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.DEBUG)
    
    # Run debug
    success = debug_t48_issue()
    
    if success:
        print("\n🎉 T48 DEBUG COMPLETE")
    else:
        print("\n❌ T48 DEBUG FOUND ISSUES")
    
    sys.exit(0 if success else 1)
