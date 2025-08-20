"""
T45 - YouTube Audio Downloader Module

This module handles downloading audio from YouTube URLs using yt-dlp,
converting to appropriate formats, and uploading to Supabase Storage.
"""

import os
import tempfile
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import yt_dlp
import ffmpeg
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class YouTubeDownloader:
    """
    YouTube audio downloader using yt-dlp
    """
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize YouTube downloader
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.temp_dir = tempfile.mkdtemp(prefix="youtube_audio_")
        
    def __del__(self):
        """Cleanup temporary directory"""
        try:
            import shutil
            if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory: {e}")
    
    def download_audio(self, youtube_url: str, job_id: str) -> Dict[str, Any]:
        """
        Download audio from YouTube URL
        
        Args:
            youtube_url: YouTube video URL
            job_id: Job ID for file naming
            
        Returns:
            Dict containing download info and file paths
            
        Raises:
            Exception: If download fails
        """
        logger.info(f"🎬 T45: Starting YouTube audio download for job {job_id}")
        logger.info(f"   URL: {youtube_url}")
        
        try:
            # Configure yt-dlp options
            output_template = os.path.join(self.temp_dir, f"{job_id}_%(title)s.%(ext)s")
            
            ydl_opts = {
                'format': 'bestaudio/best',  # Download best audio quality
                'outtmpl': output_template,
                'extractaudio': True,
                'audioformat': 'm4a',  # Prefer m4a format
                'audioquality': '192',  # Good quality
                'noplaylist': True,  # Only download single video
                'no_warnings': False,
                'quiet': False,
                'verbose': True,
            }
            
            # Download video info first
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                video_title = info.get('title', 'Unknown')
                duration = info.get('duration', 0)
                
            logger.info(f"   Video: {video_title}")
            logger.info(f"   Duration: {duration} seconds")
            
            # Download audio
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
            
            # Find downloaded file
            downloaded_files = list(Path(self.temp_dir).glob(f"{job_id}_*"))
            if not downloaded_files:
                raise Exception("No files were downloaded")
            
            downloaded_file = downloaded_files[0]
            logger.info(f"✅ T45: Downloaded audio file: {downloaded_file.name}")
            
            return {
                'success': True,
                'file_path': str(downloaded_file),
                'file_name': downloaded_file.name,
                'video_title': video_title,
                'duration': duration,
                'file_size': downloaded_file.stat().st_size
            }
            
        except Exception as e:
            logger.error(f"❌ T45: YouTube download failed: {str(e)}")
            raise Exception(f"YouTube download failed: {str(e)}")
    
    def convert_audio_format(self, input_path: str, target_format: str = 'm4a') -> str:
        """
        Convert audio to target format using ffmpeg
        
        Args:
            input_path: Path to input audio file
            target_format: Target audio format (m4a, mp3, etc.)
            
        Returns:
            Path to converted audio file
        """
        logger.info(f"🔄 T45: Converting audio to {target_format}")
        
        try:
            input_file = Path(input_path)
            output_file = input_file.with_suffix(f'.{target_format}')
            
            # Skip conversion if already in target format
            if input_file.suffix.lower() == f'.{target_format}':
                logger.info(f"   Already in {target_format} format, skipping conversion")
                return str(input_file)
            
            # Convert using ffmpeg
            (
                ffmpeg
                .input(str(input_file))
                .output(str(output_file), acodec='aac' if target_format == 'm4a' else 'mp3')
                .overwrite_output()
                .run(quiet=True)
            )
            
            logger.info(f"✅ T45: Audio converted to {output_file.name}")
            
            # Remove original file to save space
            if input_file != output_file:
                input_file.unlink()
            
            return str(output_file)
            
        except Exception as e:
            logger.error(f"❌ T45: Audio conversion failed: {str(e)}")
            raise Exception(f"Audio conversion failed: {str(e)}")
    
    def upload_to_storage(self, file_path: str, job_id: str) -> str:
        """
        Upload audio file to Supabase Storage
        
        Args:
            file_path: Path to audio file
            job_id: Job ID for storage path
            
        Returns:
            Storage path of uploaded file
        """
        logger.info(f"☁️ T45: Uploading audio to Supabase Storage")
        
        try:
            file_path_obj = Path(file_path)
            file_extension = file_path_obj.suffix
            storage_path = f"audio-input/{job_id}_youtube_audio{file_extension}"
            
            # Read file content
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            # Upload to Supabase Storage
            result = self.supabase.storage.from_('audio-input').upload(
                path=storage_path,
                file=file_content,
                file_options={
                    'content-type': 'audio/m4a' if file_extension == '.m4a' else 'audio/mpeg',
                    'upsert': True
                }
            )
            
            if result.error:
                raise Exception(f"Storage upload failed: {result.error}")
            
            logger.info(f"✅ T45: Audio uploaded to storage: {storage_path}")
            
            # Clean up local file
            file_path_obj.unlink()
            
            return storage_path
            
        except Exception as e:
            logger.error(f"❌ T45: Storage upload failed: {str(e)}")
            raise Exception(f"Storage upload failed: {str(e)}")
    
    def process_youtube_audio(self, youtube_url: str, job_id: str, 
                            target_format: str = 'm4a') -> Dict[str, Any]:
        """
        Complete YouTube audio processing pipeline
        
        Args:
            youtube_url: YouTube video URL
            job_id: Job ID
            target_format: Target audio format
            
        Returns:
            Dict containing processing results
        """
        logger.info(f"🎬 T45: Starting YouTube audio processing pipeline")
        logger.info(f"   Job ID: {job_id}")
        logger.info(f"   URL: {youtube_url}")
        logger.info(f"   Target format: {target_format}")
        
        try:
            # Step 1: Download audio from YouTube
            download_result = self.download_audio(youtube_url, job_id)
            
            # Step 2: Convert audio format if needed
            converted_path = self.convert_audio_format(
                download_result['file_path'], 
                target_format
            )
            
            # Step 3: Upload to Supabase Storage
            storage_path = self.upload_to_storage(converted_path, job_id)
            
            # Return processing results
            result = {
                'success': True,
                'storage_path': storage_path,
                'video_title': download_result['video_title'],
                'duration': download_result['duration'],
                'file_size': download_result['file_size'],
                'format': target_format
            }
            
            logger.info(f"🎉 T45: YouTube audio processing completed successfully")
            logger.info(f"   Storage path: {storage_path}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ T45: YouTube audio processing failed: {str(e)}")
            raise Exception(f"YouTube audio processing failed: {str(e)}")


def create_youtube_downloader() -> YouTubeDownloader:
    """
    Factory function to create YouTube downloader instance
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase configuration")
    
    return YouTubeDownloader(supabase_url, supabase_key)
