#!/usr/bin/env python3

"""
Verify T47 is real - Create actual audio files and process them
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

def verify_t47_real():
    """Verify T47 functionality with real files"""
    print("🔍 Verifying T47 is REAL - Creating actual audio files")
    print("=====================================================")
    
    # Step 1: Create a real test audio file using ffmpeg
    print("\n1. Creating real test audio file...")
    
    temp_dir = tempfile.mkdtemp(prefix="verify_t47_")
    input_file = os.path.join(temp_dir, "real_test_48k_stereo.wav")
    
    # Create 3-second sine wave at 48kHz stereo
    cmd = [
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "-f", "lavfi",
        "-i", "sine=frequency=440:duration=3:sample_rate=48000",
        "-ac", "2",  # stereo
        "-y",  # overwrite
        input_file
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0 and os.path.exists(input_file):
        file_size = os.path.getsize(input_file)
        print(f"✅ Created real audio file: {Path(input_file).name}")
        print(f"   Size: {file_size:,} bytes")
    else:
        print("❌ Failed to create test file")
        return False
    
    # Step 2: Analyze input file with ffprobe
    print("\n2. Analyzing input file with ffprobe...")
    
    probe_cmd = [
        "C:\\ffmpeg\\bin\\ffprobe.exe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        input_file
    ]
    
    probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)
    
    if probe_result.returncode == 0:
        import json
        data = json.loads(probe_result.stdout)
        stream = data['streams'][0]
        
        print(f"✅ Input file analysis:")
        print(f"   Sample Rate: {stream['sample_rate']}Hz")
        print(f"   Channels: {stream['channels']}")
        print(f"   Duration: {float(stream['duration']):.2f}s")
        print(f"   Codec: {stream['codec_name']}")
    else:
        print("❌ Failed to analyze input file")
        return False
    
    # Step 3: Process with T47 AudioPreprocessor
    print("\n3. Processing with T47 AudioPreprocessor...")

    try:
        # Add worker to path
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

        # Add ffmpeg to PATH
        os.environ['PATH'] = f"{os.environ.get('PATH', '')};C:\\ffmpeg\\bin"

        from audio_preprocessor import create_audio_preprocessor
        
        preprocessor = create_audio_preprocessor(temp_dir)
        
        # Process the file
        result = preprocessor.preprocess_audio(
            input_path=input_file,
            job_id="verify_real",
            preserve_channels=False  # Convert to mono
        )
        
        if result['success']:
            print(f"✅ T47 processing successful!")
            print(f"   Output file: {result['output_filename']}")
            print(f"   Processing needed: {result['processing_needed']}")
            
            # Verify output file exists
            if os.path.exists(result['output_path']):
                output_size = os.path.getsize(result['output_path'])
                print(f"   Output size: {output_size:,} bytes")
                
                # Analyze output with ffprobe
                print("\n4. Verifying output with ffprobe...")
                
                output_probe = subprocess.run([
                    "C:\\ffmpeg\\bin\\ffprobe.exe",
                    "-v", "quiet",
                    "-print_format", "json",
                    "-show_streams",
                    result['output_path']
                ], capture_output=True, text=True)
                
                if output_probe.returncode == 0:
                    output_data = json.loads(output_probe.stdout)
                    output_stream = output_data['streams'][0]
                    
                    print(f"✅ Output file verification:")
                    print(f"   Sample Rate: {output_stream['sample_rate']}Hz")
                    print(f"   Channels: {output_stream['channels']}")
                    print(f"   Duration: {float(output_stream['duration']):.2f}s")
                    print(f"   Codec: {output_stream['codec_name']}")
                    
                    # Check T47 DoD requirements
                    dod_check = (
                        int(output_stream['sample_rate']) == 44100 and
                        int(output_stream['channels']) == 1 and
                        output_stream['codec_name'] == 'pcm_s16le'
                    )
                    
                    if dod_check:
                        print("\n🎉 T47 DoD VERIFIED!")
                        print("   ✅ 44.1kHz sample rate")
                        print("   ✅ Mono (1 channel)")
                        print("   ✅ WAV PCM format")
                        
                        # Keep files for manual inspection
                        print(f"\n📁 Files created for inspection:")
                        print(f"   Input:  {input_file}")
                        print(f"   Output: {result['output_path']}")
                        print(f"   Temp dir: {temp_dir}")
                        print("   (Files will be kept for manual verification)")
                        
                        return True
                    else:
                        print("\n❌ T47 DoD not satisfied")
                        return False
                else:
                    print("❌ Failed to verify output file")
                    return False
            else:
                print("❌ Output file not found")
                return False
        else:
            print("❌ T47 processing failed")
            return False
            
    except Exception as e:
        print(f"❌ T47 processing error: {e}")
        return False

if __name__ == "__main__":
    success = verify_t47_real()
    
    if success:
        print("\n🎯 VERIFICATION COMPLETE: T47 IS REAL!")
        print("=====================================")
        print("✅ Real audio files created and processed")
        print("✅ Actual ffmpeg binary used")
        print("✅ Real format conversion performed")
        print("✅ ffprobe verification confirms results")
        print("✅ T47 DoD requirements met with real data")
    else:
        print("\n❌ VERIFICATION FAILED")
    
    sys.exit(0 if success else 1)
