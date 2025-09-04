"""
T48 - Source Separation Module

This module implements audio source separation using Demucs and Spleeter.
It provides a unified interface to separate audio into different stems like
drums, bass, vocals, and other instruments.
"""

import os
import logging
import shutil
import sys
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Literal

# Configure logger for the module
logger = logging.getLogger(__name__)

# Define supported separation methods
SeparationMethod = Literal['none', 'demucs', 'spleeter']


class SourceSeparator:
    """
    Provides audio source separation using different models.
    Manages temporary directories and execution of separation commands.
    """

    def __init__(self, temp_dir: Optional[str] = None, cleanup: bool = True):
        """
        Initializes the SourceSeparator.

        Args:
            temp_dir: A dedicated temporary directory for separation outputs.
            cleanup: If True, automatically cleans up the temp directory.
        """
        if temp_dir:
            self.temp_dir = Path(temp_dir)
        else:
            self.temp_dir = Path(tempfile.gettempdir()) / f"separation_{os.getpid()}"
        self.cleanup = cleanup
        self.supported_stems = ['drums', 'bass', 'other', 'vocals']

        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        logger.info(f"🎵 T48: SourceSeparator initialized. Temp dir: {self.temp_dir}")

    def _run_command(self, command: List[str]):
        """Runs a shell command and logs its output."""
        logger.info(f"Running command: {' '.join(command)}")
        try:
            process = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            logger.info(f"Command stdout:\n{process.stdout}")
            if process.stderr:
                logger.warning(f"Command stderr:\n{process.stderr}")
        except FileNotFoundError as e:
            logger.error(f"Command not found: {e.filename}. Is it installed and in PATH?")
            raise
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}")
            logger.error(f"Stdout: {e.stdout}")
            logger.error(f"Stderr: {e.stderr}")
            raise

    def _run_command_with_progress(self, command: List[str], progress_callback=None):
        """Runs a shell command with real-time progress monitoring."""
        logger.info(f"Running command with progress: {' '.join(command)}")

        try:
            import re
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                bufsize=1,
                universal_newlines=True
            )

            # Track progress through Demucs output
            current_progress = 0
            total_models = 4  # htdemucs_ft is a bag of 4 models
            current_model = 0

            output_lines = []

            for line in iter(process.stdout.readline, ''):
                output_lines.append(line.strip())
                logger.info(f"Demucs: {line.strip()}")

                # Parse Demucs progress indicators
                if "Selected model is a bag of" in line:
                    # Extract number of models
                    match = re.search(r'bag of (\d+) models', line)
                    if match:
                        total_models = int(match.group(1))
                        logger.info(f"🎵 T48: Detected {total_models} models in ensemble")

                elif "Separating track" in line:
                    current_progress = 10  # Starting separation
                    if progress_callback:
                        progress_callback(current_progress, "Starting source separation...")

                elif "%" in line and ("it/s" in line or "s/it" in line):
                    # Parse tqdm progress bars: "  0%|          | 0/100 [00:00<?, ?it/s]"
                    match = re.search(r'(\d+)%', line)
                    if match:
                        model_progress = int(match.group(1))
                        # Calculate overall progress: 10% start + (model_progress * 80% / total_models)
                        overall_progress = 10 + int((model_progress * 80) / total_models) + (current_model * 80 // total_models)
                        overall_progress = min(90, overall_progress)  # Cap at 90%, final 10% for file processing

                        if overall_progress > current_progress:
                            current_progress = overall_progress
                            if progress_callback:
                                progress_callback(current_progress, f"Separating with model {current_model + 1}/{total_models}...")

                elif "100%" in line and current_model < total_models - 1:
                    current_model += 1
                    logger.info(f"🎵 T48: Completed model {current_model}/{total_models}")

            process.wait()

            if process.returncode == 0:
                # Final progress update
                if progress_callback:
                    progress_callback(95, "Processing separated files...")
                logger.info("✅ Demucs separation completed successfully")
            else:
                error_output = ''.join(output_lines)
                logger.error(f"❌ Demucs command failed with return code {process.returncode}")
                logger.error(f"Command: {' '.join(command)}")
                logger.error(f"Error output: {error_output}")

                # Check for specific error patterns
                if "Could not load file" in error_output:
                    logger.error("🔍 File loading error detected - this may be due to:")
                    logger.error("   - Unsupported audio format")
                    logger.error("   - Corrupted audio file")
                    logger.error("   - File path encoding issues")
                    logger.error("   - Missing audio codecs")
                elif "FFmpeg could not read the file" in error_output:
                    logger.error("🔍 FFmpeg error detected - this may be due to:")
                    logger.error("   - FFmpeg not properly installed")
                    logger.error("   - Missing audio codecs in FFmpeg")
                    logger.error("   - File format not supported by FFmpeg")
                elif "torchaudio" in error_output and "error: 7" in error_output:
                    logger.error("🔍 Torchaudio error 7 detected - this may be due to:")
                    logger.error("   - Audio file format incompatibility")
                    logger.error("   - Corrupted audio data")
                    logger.error("   - Memory issues during loading")

                raise subprocess.CalledProcessError(process.returncode, command, error_output)

        except FileNotFoundError as e:
            logger.error(f"❌ Command not found: {e.filename}")
            logger.error("🔍 This may be due to:")
            logger.error("   - Demucs not installed: pip install demucs")
            logger.error("   - Python environment issues")
            logger.error("   - PATH configuration problems")
            raise Exception(f"Demucs command not found. Please ensure Demucs is installed: {e}")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Demucs process failed: {e}")
            raise Exception(f"Demucs separation failed: {e}")
        except Exception as e:
            logger.error(f"❌ Unexpected error during command execution: {e}")
            logger.error(f"Command: {' '.join(command) if 'command' in locals() else 'Unknown'}")
            raise Exception(f"Demucs execution error: {e}")

    def _prepare_audio_for_demucs(self, input_path: str, progress_callback=None) -> str:
        """
        Prepare audio file for Demucs processing by ensuring proper format and accessibility.

        Args:
            input_path: Path to the input audio file
            progress_callback: Optional progress callback function

        Returns:
            Path to the processed audio file ready for Demucs
        """
        try:
            input_file = Path(input_path)
            logger.info(f"🔍 T48: Preparing audio for Demucs: {input_file.name}")

            # Check if file exists and is accessible
            if not input_file.exists():
                raise FileNotFoundError(f"Input file not found: {input_path}")

            file_size = input_file.stat().st_size
            logger.info(f"   📊 Input file size: {file_size:,} bytes")

            if file_size == 0:
                raise ValueError(f"Input file is empty: {input_path}")

            # Check file format and validate with ffprobe
            try:
                import ffmpeg
                probe = ffmpeg.probe(str(input_file))
                audio_stream = next(
                    (stream for stream in probe['streams'] if stream['codec_type'] == 'audio'),
                    None
                )

                if not audio_stream:
                    raise ValueError(f"No audio stream found in file: {input_path}")

                duration = float(probe['format'].get('duration', 0))
                sample_rate = int(audio_stream.get('sample_rate', 0))
                channels = int(audio_stream.get('channels', 0))
                codec = audio_stream.get('codec_name', 'unknown')

                logger.info(f"   🎵 Audio info: {duration:.1f}s, {sample_rate}Hz, {channels}ch, {codec}")

                if duration <= 0:
                    raise ValueError(f"Invalid audio duration: {duration}s")

            except Exception as probe_error:
                logger.warning(f"   ⚠️  ffprobe failed: {probe_error}")
                # Continue with processing, but log the warning

            # For MP3 files or files with potential encoding issues, convert to WAV
            if (input_file.suffix.lower() in ['.mp3', '.m4a', '.aac'] or
                'tmp' in str(input_file) or
                any(char in str(input_file) for char in ['中', '文', '(', ')', ' '])):

                logger.info(f"   🔄 Converting to WAV for better Demucs compatibility")
                return self._convert_to_wav_for_demucs(input_path, progress_callback)
            else:
                logger.info(f"   ✅ File format acceptable for Demucs")
                return str(input_file)

        except Exception as e:
            logger.error(f"   ❌ Audio preparation failed: {e}")
            raise Exception(f"Failed to prepare audio for Demucs: {e}")

    def _convert_to_wav_for_demucs(self, input_path: str, progress_callback=None) -> str:
        """
        Convert audio file to WAV format for Demucs compatibility.

        Args:
            input_path: Path to the input audio file
            progress_callback: Optional progress callback function

        Returns:
            Path to the converted WAV file
        """
        try:
            import ffmpeg

            input_file = Path(input_path)
            # Create a safe filename for the converted file
            safe_name = f"demucs_input_{int(time.time())}_{os.getpid()}.wav"
            output_path = self.temp_dir / safe_name

            logger.info(f"   🔧 Converting {input_file.name} to {safe_name}")

            if progress_callback:
                progress_callback(5, "Converting audio format...")

            # Use ffmpeg to convert to WAV with standard settings
            stream = ffmpeg.input(str(input_file))
            stream = ffmpeg.output(
                stream,
                str(output_path),
                acodec='pcm_s16le',  # 16-bit PCM
                ar=44100,            # 44.1kHz sample rate
                f='wav'              # WAV format
            )

            # Run conversion
            ffmpeg.run(stream, overwrite_output=True, quiet=True)

            # Verify the converted file
            if not output_path.exists():
                raise Exception("Converted file was not created")

            converted_size = output_path.stat().st_size
            if converted_size == 0:
                raise Exception("Converted file is empty")

            logger.info(f"   ✅ Conversion completed: {converted_size:,} bytes")

            if progress_callback:
                progress_callback(10, "Audio format conversion completed")

            return str(output_path)

        except Exception as e:
            logger.error(f"   ❌ Audio conversion failed: {e}")
            logger.error(f"   🔍 Input file: {input_path}")
            logger.error(f"   🔍 Output path: {output_path if 'output_path' in locals() else 'Not created'}")

            # Check for specific FFmpeg errors
            error_str = str(e).lower()
            if "no such file or directory" in error_str:
                logger.error("   💡 FFmpeg not found. Please install FFmpeg:")
                logger.error("      - Windows: Download from https://ffmpeg.org/download.html")
                logger.error("      - Or run: scripts/install-ffmpeg.ps1")
            elif "invalid data found" in error_str:
                logger.error("   💡 Invalid audio data detected")
                logger.error("      - The input file may be corrupted")
                logger.error("      - Try with a different audio file")
            elif "permission denied" in error_str:
                logger.error("   💡 Permission error")
                logger.error("      - Check file permissions")
                logger.error("      - Ensure temp directory is writable")

            raise Exception(f"Failed to convert audio to WAV: {e}")

    def _separate_demucs(self, input_path: str, progress_callback=None) -> Dict[str, Path]:
        """Separates sources using Demucs with real-time progress reporting."""
        logger.info("Separating sources with Demucs...")
        output_dir = self.temp_dir / "demucs_output"

        # Ensure input file exists
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Input audio file not found: {input_path}")

        # Validate and preprocess audio file for Demucs compatibility
        processed_input_path = self._prepare_audio_for_demucs(input_path, progress_callback)

        # Command to run Demucs with a pre-trained model
        command = [
            sys.executable, "-m", "demucs.separate",
            "-n", "htdemucs_ft",  # High-quality fine-tuned model
            "--out", str(output_dir),
            str(processed_input_path)
        ]

        logger.info(f"Running command: {' '.join(command)}")
        logger.info(f"Input file: {processed_input_path}")
        logger.info(f"Input file size: {os.path.getsize(processed_input_path):,} bytes")

        # Run command with real-time progress monitoring
        self._run_command_with_progress(command, progress_callback)

        # Demucs creates a subdirectory based on the model name and input filename
        # The structure is: output_dir/model_name/input_filename_without_extension/
        # Use the processed input file for path calculation
        processed_input_file = Path(processed_input_path)
        input_stem = processed_input_file.stem  # filename without extension
        model_output_dir = output_dir / "htdemucs_ft" / input_stem

        logger.info(f"Looking for Demucs output in: {model_output_dir}")
        logger.info(f"Based on processed input stem: {input_stem}")

        if not model_output_dir.exists():
            # Try alternative path structure
            alt_model_output_dir = output_dir / input_stem
            logger.info(f"Primary path not found, trying: {alt_model_output_dir}")
            if alt_model_output_dir.exists():
                model_output_dir = alt_model_output_dir
            else:
                # List what actually exists for debugging
                if output_dir.exists():
                    logger.warning(f"Output directory contents: {list(output_dir.iterdir())}")
                    if (output_dir / "htdemucs_ft").exists():
                        logger.warning(f"Model directory contents: {list((output_dir / 'htdemucs_ft').iterdir())}")
                        # Try to find any subdirectory in the model directory
                        model_subdirs = [d for d in (output_dir / "htdemucs_ft").iterdir() if d.is_dir()]
                        if model_subdirs:
                            logger.info(f"Found model subdirectories: {[d.name for d in model_subdirs]}")
                            # Use the first available subdirectory
                            model_output_dir = model_subdirs[0]
                            logger.info(f"Using found subdirectory: {model_output_dir}")
                        else:
                            raise FileNotFoundError(f"No subdirectories found in model output: {output_dir / 'htdemucs_ft'}")
                    else:
                        raise FileNotFoundError(f"Model directory not found: {output_dir / 'htdemucs_ft'}")
                else:
                    raise FileNotFoundError(f"Demucs output directory not created: {output_dir}")

        # Map Demucs output files to standardized stem names
        stem_paths = {stem: model_output_dir / f"{stem}.wav" for stem in self.supported_stems}

        # Verify that the expected output files were created
        missing_stems = []
        for stem, path in stem_paths.items():
            if not path.exists():
                logger.warning(f"Demucs output file not found for stem '{stem}': {path}")
                missing_stems.append(stem)

        if missing_stems:
            logger.warning(f"Missing stems: {missing_stems}")
            if model_output_dir.exists():
                logger.warning(f"Available files in output dir: {list(model_output_dir.iterdir())}")

        return {k: v for k, v in stem_paths.items() if v.exists()}

    def _separate_spleeter(self, input_path: str) -> Dict[str, Path]:
        """Separates sources using Spleeter."""
        logger.info("Separating sources with Spleeter...")
        output_dir = self.temp_dir / "spleeter_output"

        # Command to run Spleeter with a 5-stem model
        command = [
            "spleeter", "separate",
            "-p", "spleeter:5stems",
            "-o", str(output_dir),
            str(input_path)
        ]
        self._run_command(command)

        # Spleeter creates a subdirectory based on the input file name
        spleeter_output_dir = output_dir / Path(input_path).stem

        # Spleeter 5-stem model includes 'piano', map it to 'other'
        spleeter_map = {
            'vocals': 'vocals.wav',
            'drums': 'drums.wav',
            'bass': 'bass.wav',
            'other': 'other.wav',
            'piano': 'piano.wav' # will be merged into 'other' if needed
        }

        stem_paths = {stem: spleeter_output_dir / fname for stem, fname in spleeter_map.items()
                      if (spleeter_output_dir / fname).exists()}

        # For simplicity, we'll just use the main stems. If piano exists, it's available.
        return {k: v for k, v in stem_paths.items() if k in self.supported_stems}

    def separate(self, input_path: str, job_id: str,
                 method: SeparationMethod = 'none', progress_callback=None) -> Dict[str, Any]:
        """
        Main separation method to orchestrate different models.

        Args:
            input_path: Path to the preprocessed audio file.
            job_id: Unique identifier for the job.
            method: The separation method to use ('none', 'demucs', 'spleeter').

        Returns:
            A dictionary containing paths to the separated stem files.
        """
        logger.info(f"🎵 T48: Starting source separation for job {job_id} with method '{method}'")

        stem_files = {}
        if method == 'none':
            logger.info("Separation method is 'none'. Copying original file as placeholder.")
            # As a placeholder, copy the original file for required stems
            for stem in ['drums', 'bass']: # Only create placeholders for what's needed next
                placeholder_path = self.temp_dir / f"{job_id}_{stem}.wav"
                # Ensure temp directory exists
                self.temp_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(input_path, placeholder_path)
                stem_files[stem] = str(placeholder_path)

        elif method == 'demucs':
            raw_stems = self._separate_demucs(input_path, progress_callback)
            # Rename files to a standardized format for the job
            if progress_callback:
                progress_callback(95, "Processing separated files...")

            logger.info(f"🔄 Processing {len(raw_stems)} separated stems")
            for stem, path in raw_stems.items():
                logger.info(f"   Processing {stem}: {path}")

                # Check if source file exists
                if not Path(path).exists():
                    logger.error(f"   ❌ Source file not found: {path}")
                    continue

                final_path = self.temp_dir / f"{job_id}_{stem}.wav"
                logger.info(f"   Moving to: {final_path}")

                try:
                    # Ensure target directory exists
                    final_path.parent.mkdir(parents=True, exist_ok=True)

                    # Move the file
                    shutil.move(str(path), str(final_path))

                    # Verify the move was successful
                    if final_path.exists():
                        file_size = final_path.stat().st_size
                        logger.info(f"   ✅ {stem} moved successfully: {file_size:,} bytes")
                        stem_files[stem] = str(final_path)
                    else:
                        logger.error(f"   ❌ File move failed for {stem}: target not found")

                except Exception as e:
                    logger.error(f"   ❌ Error moving {stem} file: {e}")

            if progress_callback:
                progress_callback(100, "Source separation completed!")

            logger.info(f"✅ Final stem files: {list(stem_files.keys())}")

        elif method == 'spleeter':
            raw_stems = self._separate_spleeter(input_path)
            for stem, path in raw_stems.items():
                final_path = self.temp_dir / f"{job_id}_{stem}.wav"
                shutil.move(str(path), str(final_path))
                stem_files[stem] = str(final_path)
        else:
            raise ValueError(f"Unsupported separation method: {method}")

        result = {
            'success': True,
            'method': method,
            'job_id': job_id,
            'stems': stem_files
        }

        logger.info(f"✅ T48: Separation complete. Stems created: {list(stem_files.keys())}")
        return result

    def get_separation_info(self) -> Dict[str, Any]:
        """Get information about the separation capabilities."""
        return {
            'method': 'placeholder',
            'supported_methods': ['none', 'demucs', 'spleeter'],
            'supported_stems': self.supported_stems,
            'temp_dir': str(self.temp_dir)
        }

    @property
    def supported_sources(self) -> List[str]:
        """Get list of supported source types."""
        return self.supported_stems.copy()

    def __del__(self):
        """Cleans up the temporary directory on object destruction."""
        if self.cleanup:
            try:
                if hasattr(self, 'temp_dir') and Path(self.temp_dir).exists():
                    shutil.rmtree(self.temp_dir)
                    logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
            except Exception as e:
                logger.error(f"Failed to clean up temp directory {self.temp_dir}: {e}")


def create_source_separator(temp_dir: Optional[str] = None) -> SourceSeparator:
    """
    Factory function to create a SourceSeparator instance.

    Args:
        temp_dir: Optional temporary directory path

    Returns:
        SourceSeparator instance
    """
    return SourceSeparator(temp_dir=temp_dir)


def process_with_separation(input_path: str, job_id: str, separate: bool = False,
                          sources: Optional[List[str]] = None,
                          method: SeparationMethod = 'none', progress_callback=None) -> Dict[str, Any]:
    """
    Process audio with optional source separation.

    This is the main interface function that T48 tests expect.

    Args:
        input_path: Path to input audio file
        job_id: Job identifier
        separate: Whether to enable separation
        sources: List of sources to separate (optional)
        method: Separation method to use

    Returns:
        Dictionary with processing results
    """
    logger.info(f"🎵 T48: Processing with separation - separate={separate}, method={method}")

    try:
        # Create separator instance
        separator = create_source_separator()

        if not separate:
            # Separation disabled - return original file
            result = {
                'success': True,
                'separation_enabled': False,
                'original_file': input_path,
                'note': 'Separation disabled, using original audio'
            }
            logger.info("   ✅ Separation disabled, returning original file")
            return result

        else:
            # Separation enabled - use separator
            try:
                separation_result = separator.separate(
                    input_path=input_path,
                    job_id=job_id,
                    method=method if method != 'none' else 'none',
                    progress_callback=progress_callback
                )

                result = {
                    'success': True,
                    'separation_enabled': True,
                    'separation_result': {
                        'method': separation_result['method'],
                        'sources': list(separation_result['stems'].keys()),
                        'separated_files': separation_result['stems']
                    }
                }
                logger.info(f"   ✅ Separation completed with method '{method}'")
                return result

            except Exception as e:
                # Fallback to original file on separation error
                logger.warning(f"   ⚠️  Separation failed, falling back to original: {e}")
                result = {
                    'success': True,
                    'separation_enabled': False,
                    'original_file': input_path,
                    'error': str(e),
                    'note': 'Separation failed, fell back to original audio'
                }
                return result

    except Exception as e:
        logger.error(f"   ❌ Processing with separation failed: {e}")
        return {
            'success': False,
            'separation_enabled': False,
            'error': str(e)
        }
