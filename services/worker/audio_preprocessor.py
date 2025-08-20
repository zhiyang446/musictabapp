"""
T47 - Audio Preprocessor Module

This module handles audio preprocessing using ffmpeg to standardize audio formats.
Converts all audio to wav, 44.1kHz, mono (or preserves original channels) format.
"""

import os
import tempfile
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import ffmpeg
from pydub import AudioSegment
from pydub.utils import which

logger = logging.getLogger(__name__)


class AudioPreprocessor:
    """
    Audio preprocessor using ffmpeg and pydub for format standardization
    """
    
    def __init__(self, temp_dir: Optional[str] = None):
        """
        Initialize audio preprocessor
        
        Args:
            temp_dir: Optional temporary directory for processing
        """
        self.temp_dir = temp_dir or tempfile.mkdtemp(prefix="audio_preprocess_")
        self.target_sample_rate = 44100  # 44.1kHz
        self.target_format = 'wav'
        
        # Ensure temp directory exists
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        # Check ffmpeg availability
        self._check_ffmpeg()
        
    def __del__(self):
        """Cleanup temporary directory"""
        try:
            import shutil
            if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory: {e}")
    
    def _check_ffmpeg(self):
        """Check if ffmpeg is available"""
        ffmpeg_path = which("ffmpeg")
        if not ffmpeg_path:
            logger.warning("ffmpeg not found in PATH, some features may not work")
        else:
            logger.info(f"ffmpeg found at: {ffmpeg_path}")
    
    def get_audio_info(self, input_path: str) -> Dict[str, Any]:
        """
        Get audio file information using ffprobe
        
        Args:
            input_path: Path to input audio file
            
        Returns:
            Dict containing audio information
        """
        try:
            logger.info(f"🔍 T47: Getting audio info for {Path(input_path).name}")
            
            probe = ffmpeg.probe(input_path)
            audio_stream = next(
                (stream for stream in probe['streams'] if stream['codec_type'] == 'audio'),
                None
            )
            
            if not audio_stream:
                raise Exception("No audio stream found in file")
            
            info = {
                'duration': float(probe['format'].get('duration', 0)),
                'sample_rate': int(audio_stream.get('sample_rate', 0)),
                'channels': int(audio_stream.get('channels', 0)),
                'codec': audio_stream.get('codec_name', 'unknown'),
                'bit_rate': int(audio_stream.get('bit_rate', 0)) if audio_stream.get('bit_rate') else 0,
                'format': probe['format'].get('format_name', 'unknown'),
                'file_size': int(probe['format'].get('size', 0))
            }
            
            logger.info(f"   📊 Duration: {info['duration']:.2f}s")
            logger.info(f"   🎵 Sample Rate: {info['sample_rate']}Hz")
            logger.info(f"   🔊 Channels: {info['channels']}")
            logger.info(f"   🎧 Codec: {info['codec']}")
            
            return info
            
        except Exception as e:
            logger.error(f"❌ T47: Failed to get audio info: {e}")
            raise Exception(f"Failed to get audio info: {e}")
    
    def preprocess_audio(self, input_path: str, job_id: str, 
                        preserve_channels: bool = False) -> Dict[str, Any]:
        """
        Preprocess audio file to standardized format
        
        Args:
            input_path: Path to input audio file
            job_id: Job ID for output file naming
            preserve_channels: Whether to preserve original channel count
            
        Returns:
            Dict containing preprocessing results
        """
        logger.info(f"🔄 T47: Starting audio preprocessing for job {job_id}")
        logger.info(f"   Input: {Path(input_path).name}")
        
        try:
            # Get input audio information
            input_info = self.get_audio_info(input_path)
            
            # Determine target channels
            if preserve_channels:
                target_channels = input_info['channels']
                logger.info(f"   🔊 Preserving {target_channels} channels")
            else:
                target_channels = 1  # mono
                logger.info(f"   🔊 Converting to mono")
            
            # Generate output filename
            output_filename = f"{job_id}_preprocessed.{self.target_format}"
            output_path = os.path.join(self.temp_dir, output_filename)
            
            # Check if preprocessing is needed
            needs_processing = (
                input_info['sample_rate'] != self.target_sample_rate or
                input_info['channels'] != target_channels or
                not input_path.lower().endswith('.wav')
            )
            
            if not needs_processing:
                logger.info("   ✅ Audio already in target format, copying file")
                import shutil
                shutil.copy2(input_path, output_path)
                
                result = {
                    'success': True,
                    'output_path': output_path,
                    'output_filename': output_filename,
                    'processing_needed': False,
                    'input_info': input_info,
                    'output_info': input_info.copy()
                }
            else:
                logger.info("   🔄 Audio preprocessing required")
                result = self._process_audio_ffmpeg(
                    input_path, output_path, target_channels, input_info
                )
                result['output_filename'] = output_filename
                result['processing_needed'] = True
            
            logger.info(f"✅ T47: Audio preprocessing completed")
            logger.info(f"   Output: {result['output_filename']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ T47: Audio preprocessing failed: {e}")
            raise Exception(f"Audio preprocessing failed: {e}")
    
    def _process_audio_ffmpeg(self, input_path: str, output_path: str, 
                             target_channels: int, input_info: Dict) -> Dict[str, Any]:
        """
        Process audio using ffmpeg
        
        Args:
            input_path: Input file path
            output_path: Output file path
            target_channels: Target number of channels
            input_info: Input audio information
            
        Returns:
            Processing result dictionary
        """
        try:
            logger.info(f"   🔧 Processing with ffmpeg")
            logger.info(f"      {input_info['sample_rate']}Hz → {self.target_sample_rate}Hz")
            logger.info(f"      {input_info['channels']} channels → {target_channels} channels")
            
            # Build ffmpeg command
            input_stream = ffmpeg.input(input_path)
            
            # Apply audio filters
            audio_filters = []
            
            # Resample to target sample rate
            if input_info['sample_rate'] != self.target_sample_rate:
                audio_filters.append(f'aresample={self.target_sample_rate}')
            
            # Convert channels
            if input_info['channels'] != target_channels:
                if target_channels == 1:
                    audio_filters.append('pan=mono|c0=0.5*c0+0.5*c1')
                elif target_channels == 2 and input_info['channels'] == 1:
                    audio_filters.append('pan=stereo|c0=c0|c1=c0')
            
            # Apply filters if any
            if audio_filters:
                output_stream = input_stream.audio.filter(','.join(audio_filters))
            else:
                output_stream = input_stream.audio
            
            # Output to wav format
            output_stream = ffmpeg.output(
                output_stream,
                output_path,
                acodec='pcm_s16le',  # 16-bit PCM
                ar=self.target_sample_rate,
                ac=target_channels,
                f='wav'
            )
            
            # Run ffmpeg
            ffmpeg.run(output_stream, overwrite_output=True, quiet=True)
            
            # Get output file info
            output_info = self.get_audio_info(output_path)
            
            result = {
                'success': True,
                'output_path': output_path,
                'input_info': input_info,
                'output_info': output_info,
                'file_size': os.path.getsize(output_path)
            }
            
            logger.info(f"   ✅ ffmpeg processing completed")
            logger.info(f"      Output size: {result['file_size']:,} bytes")
            
            return result
            
        except Exception as e:
            logger.error(f"   ❌ ffmpeg processing failed: {e}")
            raise Exception(f"ffmpeg processing failed: {e}")
    
    def preprocess_audio_pydub(self, input_path: str, job_id: str,
                              preserve_channels: bool = False) -> Dict[str, Any]:
        """
        Alternative preprocessing using pydub (fallback method)
        
        Args:
            input_path: Path to input audio file
            job_id: Job ID for output file naming
            preserve_channels: Whether to preserve original channel count
            
        Returns:
            Dict containing preprocessing results
        """
        logger.info(f"🔄 T47: Using pydub for audio preprocessing")
        
        try:
            # Load audio with pydub
            audio = AudioSegment.from_file(input_path)
            
            # Get input info
            input_info = {
                'duration': len(audio) / 1000.0,
                'sample_rate': audio.frame_rate,
                'channels': audio.channels,
                'sample_width': audio.sample_width,
                'file_size': os.path.getsize(input_path)
            }
            
            logger.info(f"   📊 Input: {input_info['sample_rate']}Hz, {input_info['channels']} channels")
            
            # Convert sample rate
            if audio.frame_rate != self.target_sample_rate:
                audio = audio.set_frame_rate(self.target_sample_rate)
                logger.info(f"   🔄 Resampled to {self.target_sample_rate}Hz")
            
            # Convert channels
            if not preserve_channels and audio.channels > 1:
                audio = audio.set_channels(1)  # Convert to mono
                logger.info(f"   🔄 Converted to mono")
            
            # Generate output path
            output_filename = f"{job_id}_preprocessed.wav"
            output_path = os.path.join(self.temp_dir, output_filename)
            
            # Export as wav
            audio.export(output_path, format="wav")
            
            # Get output info
            output_info = {
                'duration': len(audio) / 1000.0,
                'sample_rate': audio.frame_rate,
                'channels': audio.channels,
                'sample_width': audio.sample_width,
                'file_size': os.path.getsize(output_path)
            }
            
            result = {
                'success': True,
                'output_path': output_path,
                'output_filename': output_filename,
                'input_info': input_info,
                'output_info': output_info,
                'processing_needed': True,
                'method': 'pydub'
            }
            
            logger.info(f"✅ T47: pydub preprocessing completed")
            logger.info(f"   Output: {output_info['sample_rate']}Hz, {output_info['channels']} channels")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ T47: pydub preprocessing failed: {e}")
            raise Exception(f"pydub preprocessing failed: {e}")


def create_audio_preprocessor(temp_dir: Optional[str] = None) -> AudioPreprocessor:
    """
    Factory function to create audio preprocessor instance
    """
    return AudioPreprocessor(temp_dir)
