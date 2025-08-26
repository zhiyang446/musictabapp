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

    def _separate_demucs(self, input_path: str) -> Dict[str, Path]:
        """Separates sources using Demucs."""
        logger.info("Separating sources with Demucs...")
        output_dir = self.temp_dir / "demucs_output"

        # Command to run Demucs with a pre-trained model
        command = [
            sys.executable, "-m", "demucs.separate",
            "-n", "htdemucs_ft",  # High-quality fine-tuned model
            "--out", str(output_dir),
            str(input_path)
        ]
        self._run_command(command)

        # Demucs creates a subdirectory based on the model name
        model_output_dir = output_dir / "htdemucs_ft" / Path(input_path).stem
        if not model_output_dir.exists():
             model_output_dir = output_dir / Path(input_path).stem

        # Map Demucs output files to standardized stem names
        stem_paths = {stem: model_output_dir / f"{stem}.wav" for stem in self.supported_stems}

        # Verify that the expected output files were created
        for stem, path in stem_paths.items():
            if not path.exists():
                logger.warning(f"Demucs output file not found for stem '{stem}': {path}")

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
                 method: SeparationMethod = 'none') -> Dict[str, Any]:
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
                shutil.copy2(input_path, placeholder_path)
                stem_files[stem] = str(placeholder_path)

        elif method == 'demucs':
            raw_stems = self._separate_demucs(input_path)
            # Rename files to a standardized format for the job
            for stem, path in raw_stems.items():
                final_path = self.temp_dir / f"{job_id}_{stem}.wav"
                shutil.move(str(path), str(final_path))
                stem_files[stem] = str(final_path)

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
                          method: SeparationMethod = 'none') -> Dict[str, Any]:
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
                    method=method if method != 'none' else 'none'
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
