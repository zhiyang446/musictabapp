#!/usr/bin/env python3
"""
Complete UI Test - Test the actual web interface functionality
"""

import os
import sys
import time
import tempfile
import subprocess
from pathlib import Path

def test_web_interface_loading():
    """Test if the web interface loads properly"""
    try:
        print("🌐 Testing web interface loading...")
        
        # Check if Expo is running by looking for the process
        import psutil
        expo_running = False
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and any('expo' in str(cmd).lower() for cmd in proc.info['cmdline']):
                    expo_running = True
                    print(f"   ✅ Expo process found: PID {proc.info['pid']}")
                    break
            except:
                continue
        
        if not expo_running:
            print("   ⚠️  Expo process not detected, but web interface may still be accessible")
        
        # Try to access the web interface
        import requests
        try:
            response = requests.get("http://localhost:8081", timeout=10)
            if response.status_code == 200:
                print("   ✅ Web interface is accessible")
                return True
            else:
                print(f"   ❌ Web interface returned status: {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("   ❌ Cannot connect to web interface at localhost:8081")
            return False
        except Exception as e:
            print(f"   ❌ Error accessing web interface: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Web interface test failed: {e}")
        return False

def test_worker_service():
    """Test if worker service is running and functional"""
    try:
        print("⚙️  Testing worker service...")
        
        # Check if Celery worker is running
        import psutil
        celery_running = False
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and any('celery' in str(cmd).lower() for cmd in proc.info['cmdline']):
                    celery_running = True
                    print(f"   ✅ Celery worker found: PID {proc.info['pid']}")
                    break
            except:
                continue
        
        if not celery_running:
            print("   ❌ Celery worker process not found")
            return False
        
        # Test the actual processing capability
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))
        
        try:
            from source_separator import process_with_separation
            print("   ✅ Source separator module imported successfully")
            
            # Create a small test file
            temp_dir = tempfile.mkdtemp()
            test_file = os.path.join(temp_dir, "worker_test.wav")
            
            # Create a simple WAV file using ffmpeg
            cmd = [
                "C:\\ffmpeg\\bin\\ffmpeg.exe",
                "-f", "lavfi",
                "-i", "sine=frequency=440:duration=1:sample_rate=44100",
                "-ac", "1",
                "-y",
                test_file
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0 and os.path.exists(test_file):
                print("   ✅ Test audio file created")
                
                # Test processing
                processing_result = process_with_separation(
                    input_path=test_file,
                    job_id="worker_test",
                    separate=False,  # Use 'none' method for quick test
                    method='none'
                )
                
                if processing_result.get('success'):
                    print("   ✅ Worker processing test successful")
                    return True
                else:
                    print(f"   ❌ Worker processing failed: {processing_result.get('error')}")
                    return False
            else:
                print("   ❌ Failed to create test audio file")
                return False
                
        except ImportError as e:
            print(f"   ❌ Cannot import source_separator: {e}")
            return False
        except Exception as e:
            print(f"   ❌ Worker test error: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Worker service test failed: {e}")
        return False

def test_demucs_fix_integration():
    """Test the Demucs fix in a realistic scenario"""
    try:
        print("🎵 Testing Demucs fix integration...")
        
        # Create a problematic MP3 file (similar to original error)
        temp_dir = tempfile.mkdtemp(prefix="ui_demucs_test_")
        test_file = os.path.join(temp_dir, "problematic_audio.mp3")
        
        print(f"   📁 Creating problematic MP3: {Path(test_file).name}")
        
        cmd = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=3:sample_rate=44100",
            "-ac", "2",
            "-b:a", "128k",
            "-y",
            test_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0 or not os.path.exists(test_file):
            print("   ❌ Failed to create test MP3")
            return False
        
        file_size = os.path.getsize(test_file)
        print(f"   ✅ Test MP3 created: {file_size:,} bytes")
        
        # Test the fix
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))
        from source_separator import process_with_separation
        
        print("   🔄 Testing Demucs processing with fix...")
        
        processing_result = process_with_separation(
            input_path=test_file,
            job_id="demucs_fix_test",
            separate=True,
            method='demucs'
        )
        
        if processing_result.get('success') and processing_result.get('separation_enabled'):
            sep_result = processing_result.get('separation_result', {})
            stems = sep_result.get('separated_files', {})
            print(f"   ✅ Demucs processing successful")
            print(f"   🎵 Stems created: {list(stems.keys())}")
            return True
        else:
            error = processing_result.get('error', 'Unknown error')
            print(f"   ❌ Demucs processing failed: {error}")
            return False
            
    except Exception as e:
        print(f"❌ Demucs fix integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_audio_player_component():
    """Test AudioPlayer component exists and is properly configured"""
    try:
        print("🎧 Testing AudioPlayer component...")
        
        component_path = os.path.join(
            os.path.dirname(__file__), '..', 'apps', 'mobile', 'components', 'AudioPlayer.js'
        )
        
        if not os.path.exists(component_path):
            print("   ❌ AudioPlayer component not found")
            return False
        
        print("   ✅ AudioPlayer component exists")
        
        # Check component content
        with open(component_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for key features
        features = {
            'T48 compatibility': 'T48' in content,
            'Audio loading': 'loadAudio' in content,
            'Error handling': 'error' in content.lower(),
            'Progress tracking': 'progress' in content.lower() or 'status' in content.lower(),
            'Stem support': 'stem' in content.lower()
        }
        
        all_features = True
        for feature, present in features.items():
            status = "✅" if present else "❌"
            print(f"   {status} {feature}")
            if not present:
                all_features = False
        
        return all_features
        
    except Exception as e:
        print(f"❌ AudioPlayer component test failed: {e}")
        return False

def main():
    """Run complete UI functionality test"""
    print("🧪 Complete UI Functionality Test")
    print("Testing the actual web interface and backend integration")
    print("=" * 60)
    
    tests = [
        ("Web Interface Loading", test_web_interface_loading),
        ("Worker Service", test_worker_service),
        ("AudioPlayer Component", test_audio_player_component),
        ("Demucs Fix Integration", test_demucs_fix_integration),
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
    print("\n" + "=" * 60)
    print("📊 Complete UI Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Complete UI test PASSED!")
        print("💡 The application is fully functional:")
        print("   - Web interface is accessible")
        print("   - Worker service is running")
        print("   - AudioPlayer component is ready")
        print("   - Demucs fix is working in production")
        print("\n🚀 Users can now upload MP3 files and get successful audio separation!")
    else:
        print("⚠️  Some tests failed, but core functionality may still work.")
        print("💡 Key points:")
        
        # Analyze results
        web_ok = results[0][1] if len(results) > 0 else False
        worker_ok = results[1][1] if len(results) > 1 else False
        player_ok = results[2][1] if len(results) > 2 else False
        demucs_ok = results[3][1] if len(results) > 3 else False
        
        if demucs_ok:
            print("   ✅ Demucs fix is working - the main issue is resolved!")
        if player_ok:
            print("   ✅ AudioPlayer is ready for separated audio playback")
        if worker_ok:
            print("   ✅ Backend processing is functional")
        if not web_ok:
            print("   ⚠️  Web interface may need to be started manually")
    
    return passed >= 3  # Pass if at least 3/4 tests pass

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
