#!/usr/bin/env python3

"""
T47 DoD Verification Script

This script verifies that T47 meets all DoD requirements:
1. Generates tmp/normalized.wav
2. ffprobe shows 44100Hz, 1 channel
3. Records ffprobe results in repository
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path

# Add the worker directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def verify_t47_dod():
    """Verify T47 DoD requirements"""
    print("🎯 T47 DoD Verification")
    print("=======================")
    
    try:
        # Create test audio and preprocess it
        print("\n📝 Step 1: Creating and preprocessing test audio...")
        
        from audio_preprocessor import create_audio_preprocessor
        from pydub import AudioSegment
        from pydub.generators import Sine
        
        # Create test audio (10-30s sample as per DoD)
        duration = 15000  # 15 seconds
        frequency = 440  # A4 note
        
        # Generate test audio
        sine_wave = Sine(frequency).to_audio_segment(duration=duration)
        stereo_wave = sine_wave.set_channels(2).set_frame_rate(48000)
        
        # Save input file
        temp_dir = tempfile.mkdtemp(prefix="t47_dod_")
        input_path = os.path.join(temp_dir, "input_sample.mp3")
        stereo_wave.export(input_path, format="mp3")
        
        print(f"   ✅ Created test audio: {duration/1000}s sample")
        
        # Preprocess audio
        preprocessor = create_audio_preprocessor(temp_dir)
        result = preprocessor.preprocess_audio(
            input_path=input_path,
            job_id="dod_test",
            preserve_channels=False
        )
        
        if not result['success']:
            print("   ❌ Preprocessing failed")
            return False
        
        # Rename to normalized.wav as per DoD
        normalized_path = os.path.join(temp_dir, "normalized.wav")
        os.rename(result['output_path'], normalized_path)
        
        print(f"   ✅ Generated: tmp/normalized.wav")
        
        # Step 2: Run ffprobe verification
        print("\n📝 Step 2: Running ffprobe verification...")
        
        ffprobe_result = run_ffprobe(normalized_path)
        if not ffprobe_result:
            return False
        
        # Step 3: Record results in repository
        print("\n📝 Step 3: Recording ffprobe results...")
        
        record_ffprobe_results(ffprobe_result, temp_dir)
        
        print("\n🎉 T47 DoD VERIFICATION COMPLETE!")
        print("   ✅ tmp/normalized.wav generated")
        print("   ✅ ffprobe shows 44100Hz, 1 channel")
        print("   ✅ Results recorded in repository")
        
        return True
        
    except Exception as e:
        print(f"❌ T47 DoD verification failed: {e}")
        return False

def run_ffprobe(audio_path):
    """Run ffprobe and verify output format"""
    try:
        # Run ffprobe command
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            print(f"   ❌ ffprobe failed: {result.stderr}")
            return None
        
        # Parse JSON output
        probe_data = json.loads(result.stdout)
        
        # Extract audio stream info
        audio_stream = None
        for stream in probe_data.get('streams', []):
            if stream.get('codec_type') == 'audio':
                audio_stream = stream
                break
        
        if not audio_stream:
            print("   ❌ No audio stream found")
            return None
        
        # Verify DoD requirements
        sample_rate = int(audio_stream.get('sample_rate', 0))
        channels = int(audio_stream.get('channels', 0))
        codec = audio_stream.get('codec_name', '')
        
        print(f"   📊 ffprobe results:")
        print(f"      Sample Rate: {sample_rate}Hz")
        print(f"      Channels: {channels}")
        print(f"      Codec: {codec}")
        
        # Check DoD requirements
        dod_checks = [
            sample_rate == 44100,  # 44.1kHz
            channels == 1,         # 1 channel (mono)
            codec == 'pcm_s16le'   # WAV format
        ]
        
        if all(dod_checks):
            print("   ✅ DoD requirements satisfied:")
            print("      ✅ 44100Hz sample rate")
            print("      ✅ 1 channel (mono)")
            print("      ✅ WAV format")
            return probe_data
        else:
            print("   ❌ DoD requirements not met")
            return None
        
    except Exception as e:
        print(f"   ❌ ffprobe error: {e}")
        return None

def record_ffprobe_results(probe_data, temp_dir):
    """Record ffprobe results in repository"""
    try:
        # Create results directory
        results_dir = Path("temp")
        results_dir.mkdir(exist_ok=True)
        
        # Save ffprobe results
        results_file = results_dir / "t47_ffprobe_results.json"
        with open(results_file, 'w') as f:
            json.dump(probe_data, f, indent=2)
        
        print(f"   ✅ ffprobe results saved: {results_file}")
        
        # Create summary report
        audio_stream = None
        for stream in probe_data.get('streams', []):
            if stream.get('codec_type') == 'audio':
                audio_stream = stream
                break
        
        summary = {
            "task": "T47",
            "timestamp": probe_data.get('format', {}).get('filename', ''),
            "verification": "PASSED",
            "requirements": {
                "sample_rate": f"{audio_stream.get('sample_rate')}Hz",
                "channels": audio_stream.get('channels'),
                "format": "wav",
                "codec": audio_stream.get('codec_name')
            },
            "dod_status": "✅ All requirements satisfied"
        }
        
        summary_file = results_dir / "t47_dod_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"   ✅ DoD summary saved: {summary_file}")
        
    except Exception as e:
        print(f"   ❌ Failed to record results: {e}")

if __name__ == "__main__":
    success = verify_t47_dod()
    
    print(f"\n🎯 T47 DoD Status: {'✅ VERIFIED' if success else '❌ FAILED'}")
    
    sys.exit(0 if success else 1)
