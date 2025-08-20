#!/usr/bin/env python3

"""
T45 Real Test - Actual YouTube Audio Download Test

This script tests the actual YouTube downloader functionality
by running the YouTube downloader module directly.
"""

import os
import sys
import tempfile
import logging
from pathlib import Path

# Add the worker directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def test_t45_real():
    """Test T45 YouTube downloader functionality"""
    print("🎬 T45 Real Test - Actual YouTube Audio Download")
    print("===============================================")
    
    try:
        # Set up logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
        
        # Step 1: Test yt-dlp installation
        print("\nStep 1: Testing yt-dlp installation...")
        
        try:
            import yt_dlp
            print(f"✅ yt-dlp version: {yt_dlp.version.__version__}")
        except ImportError as e:
            print(f"❌ yt-dlp not installed: {e}")
            return False
        
        # Step 2: Test ffmpeg-python installation
        print("\nStep 2: Testing ffmpeg-python installation...")
        
        try:
            import ffmpeg
            print("✅ ffmpeg-python installed")
        except ImportError as e:
            print(f"❌ ffmpeg-python not installed: {e}")
            return False
        
        # Step 3: Test YouTube downloader module
        print("\nStep 3: Testing YouTube downloader module...")
        
        try:
            from youtube_downloader import YouTubeDownloader
            print("✅ YouTube downloader module imported successfully")
        except ImportError as e:
            print(f"❌ Failed to import YouTube downloader: {e}")
            return False
        
        # Step 4: Test with a short YouTube video
        print("\nStep 4: Testing with actual YouTube video...")
        
        # Use a short, copyright-free test video
        test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"  # Short test video
        test_job_id = "test_t45_real"
        
        print(f"📹 Test URL: {test_url}")
        print(f"🆔 Test Job ID: {test_job_id}")
        
        # Check if we have Supabase credentials
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            print("⚠️  Supabase credentials not found, testing download only...")
            
            # Test just the download part without Supabase
            test_download_only(test_url, test_job_id)
        else:
            print("✅ Supabase credentials found, testing full pipeline...")
            
            # Test full pipeline with Supabase
            test_full_pipeline(test_url, test_job_id, supabase_url, supabase_key)
        
        print("\n🎉 T45 Real Test completed!")
        return True
        
    except Exception as e:
        print(f"❌ T45 Real Test failed: {e}")
        return False

def test_download_only(youtube_url, job_id):
    """Test only the download functionality without Supabase"""
    print("\n🔧 Testing download-only functionality...")
    
    try:
        import yt_dlp
        import tempfile
        import os
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix="t45_test_")
        print(f"📁 Temp directory: {temp_dir}")
        
        # Configure yt-dlp
        output_template = os.path.join(temp_dir, f"{job_id}_%(title)s.%(ext)s")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'extractaudio': True,
            'audioformat': 'm4a',
            'audioquality': '192',
            'noplaylist': True,
            'quiet': False,
        }
        
        print("⬇️  Starting download...")
        
        # Download video info first
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            video_title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
        print(f"📺 Video: {video_title}")
        print(f"⏱️  Duration: {duration} seconds")
        
        # Download audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        
        # Check downloaded files
        downloaded_files = list(Path(temp_dir).glob(f"{job_id}_*"))
        
        if downloaded_files:
            downloaded_file = downloaded_files[0]
            file_size = downloaded_file.stat().st_size
            
            print(f"✅ Download successful!")
            print(f"   File: {downloaded_file.name}")
            print(f"   Size: {file_size} bytes")
            print(f"   Path: {downloaded_file}")
            
            # Cleanup
            downloaded_file.unlink()
            os.rmdir(temp_dir)
            
            return True
        else:
            print("❌ No files were downloaded")
            return False
            
    except Exception as e:
        print(f"❌ Download test failed: {e}")
        return False

def test_full_pipeline(youtube_url, job_id, supabase_url, supabase_key):
    """Test the full YouTube processing pipeline"""
    print("\n🔧 Testing full pipeline with Supabase...")
    
    try:
        from youtube_downloader import YouTubeDownloader
        
        # Create downloader instance
        downloader = YouTubeDownloader(supabase_url, supabase_key)
        
        print("⬇️  Starting full pipeline...")
        
        # Process YouTube audio
        result = downloader.process_youtube_audio(
            youtube_url=youtube_url,
            job_id=job_id,
            target_format='m4a'
        )
        
        print("✅ Full pipeline successful!")
        print(f"   Storage path: {result['storage_path']}")
        print(f"   Video title: {result['video_title']}")
        print(f"   Duration: {result['duration']} seconds")
        print(f"   File size: {result['file_size']} bytes")
        print(f"   Format: {result['format']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Full pipeline test failed: {e}")
        return False

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    success = test_t45_real()
    sys.exit(0 if success else 1)
