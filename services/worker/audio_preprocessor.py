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

logger = logging.getLogger(__name__)

# Try to import pydub, but don't fail if it's not available
try:
    from pydub import AudioSegment
    from pydub.utils import which
    PYDUB_AVAILABLE = True
except ImportError as e:
    logger.warning(f"pydub not available: {e}")
    AudioSegment = None
    which = None
    PYDUB_AVAILABLE = False


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
        # Try multiple ways to find ffmpeg
        ffmpeg_path = None

        # Method 1: Use pydub's which if available
        if PYDUB_AVAILABLE and which:
            ffmpeg_path = which("ffmpeg")

        # Method 2: Try common installation paths
        if not ffmpeg_path:
            common_paths = [
                "C:\\ffmpeg\\bin\\ffmpeg.exe",
                "ffmpeg.exe",
                "ffmpeg"
            ]

            for path in common_paths:
                try:
                    import subprocess
                    result = subprocess.run([path, '-version'],
                                          capture_output=True, timeout=5)
                    if result.returncode == 0:
                        ffmpeg_path = path
                        break
                except:
                    continue

        if not ffmpeg_path:
            logger.warning("ffmpeg not found, will use ffmpeg-python with system PATH")
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

            # Use simpler ffmpeg approach
            output_stream = ffmpeg.input(input_path).output(
                output_path,
                acodec='pcm_s16le',  # 16-bit PCM
                ar=self.target_sample_rate,  # Sample rate
                ac=target_channels,  # Channel count
                f='wav'  # WAV format
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
        if not PYDUB_AVAILABLE:
            raise Exception("pydub not available for audio preprocessing")

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



# Test function for T47 verification
def test_t47_preprocessing(input_file: str, job_id: str = "test_t47") -> Dict[str, Any]:
    """
    Test function for T47 - ffmpeg preprocessing

    Args:
        input_file: Path to input audio file
        job_id: Job ID for testing

    Returns:
        Test results dictionary
    """
    import json
    import tempfile
    from pathlib import Path

    logger.info("T47 Test: Starting audio preprocessing test")

    try:
        # Create preprocessor with temp directory
        with tempfile.TemporaryDirectory(prefix="t47_test_") as temp_dir:
            preprocessor = AudioPreprocessor(temp_dir)

            # Test preprocessing
            result = preprocessor.preprocess_audio(input_file, job_id, preserve_channels=False)

            # Verify output file exists
            output_path = result['output_path']
            if not os.path.exists(output_path):
                raise Exception(f"Output file not created: {output_path}")

            # Get final audio info using ffprobe
            final_info = preprocessor.get_audio_info(output_path)

            # Verify DoD requirements
            dod_checks = {
                'file_exists': os.path.exists(output_path),
                'is_wav_format': output_path.endswith('.wav'),
                'sample_rate_44100': final_info['sample_rate'] == 44100,
                'is_mono': final_info['channels'] == 1,
                'duration_preserved': abs(final_info['duration'] - result['input_info']['duration']) < 1.0
            }

            # Create test summary
            test_summary = {
                'test_name': 'T47 - ffmpeg preprocessing',
                'input_file': Path(input_file).name,
                'job_id': job_id,
                'success': all(dod_checks.values()),
                'dod_checks': dod_checks,
                'input_info': result['input_info'],
                'output_info': final_info,
                'output_file': Path(output_path).name,
                'processing_needed': result.get('processing_needed', True),
                'file_size_bytes': os.path.getsize(output_path)
            }

            # Log results
            logger.info("📊 T47 Test Results:")
            logger.info(f"   ✅ File exists: {dod_checks['file_exists']}")
            logger.info(f"   ✅ WAV format: {dod_checks['is_wav_format']}")
            logger.info(f"   ✅ 44.1kHz sample rate: {dod_checks['sample_rate_44100']}")
            logger.info(f"   ✅ Mono channel: {dod_checks['is_mono']}")
            logger.info(f"   ✅ Duration preserved: {dod_checks['duration_preserved']}")
            logger.info(f"   📁 Output file: {test_summary['output_file']}")
            logger.info(f"   📏 File size: {test_summary['file_size_bytes']:,} bytes")

            if test_summary['success']:
                logger.info("🎉 T47 Test: All DoD requirements met!")
            else:
                logger.error("❌ T47 Test: Some DoD requirements failed")

            return test_summary

    except Exception as e:
        logger.error(f"❌ T47 Test failed: {e}")
        return {
            'test_name': 'T47 - ffmpeg preprocessing',
            'success': False,
            'error': str(e),
            'input_file': Path(input_file).name if input_file else 'unknown'
        }