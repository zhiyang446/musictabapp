"""
T49 - Drum Detection Module

This module implements simple drum onset detection for kick, snare, and hihat.
Uses librosa for audio analysis and onset detection.
"""

import os
import logging
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

# Try to import audio analysis libraries
try:
    import librosa
    import scipy.signal
    LIBROSA_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Audio analysis libraries not available: {e}")
    librosa = None
    scipy = None
    LIBROSA_AVAILABLE = False


class DrumDetector:
    """
    Simple drum onset detector for kick, snare, and hihat
    
    This class provides basic drum detection functionality using
    frequency-based analysis and onset detection.
    """
    
    def __init__(self, sample_rate: int = 44100):
        """
        Initialize drum detector
        
        Args:
            sample_rate: Audio sample rate (default: 44100)
        """
        self.sample_rate = sample_rate
        
        # Frequency ranges for different drum types (Hz)
        self.kick_freq_range = (20, 120)      # Low frequencies for kick
        self.snare_freq_range = (150, 300)    # Mid frequencies for snare
        self.hihat_freq_range = (8000, 16000) # High frequencies for hihat
        
        # Detection parameters
        self.hop_length = 512
        self.frame_length = 2048
        self.onset_threshold = 0.3
        
        logger.info(f"🥁 T49: DrumDetector initialized")
        logger.info(f"   Sample rate: {self.sample_rate}Hz")
        logger.info(f"   Kick range: {self.kick_freq_range[0]}-{self.kick_freq_range[1]}Hz")
        logger.info(f"   Snare range: {self.snare_freq_range[0]}-{self.snare_freq_range[1]}Hz")
        logger.info(f"   Hihat range: {self.hihat_freq_range[0]}-{self.hihat_freq_range[1]}Hz")
    
    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """
        Load audio file using librosa
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Tuple of (audio_data, sample_rate)
        """
        if not LIBROSA_AVAILABLE:
            raise Exception("librosa not available for audio loading")
        
        logger.info(f"🎵 T49: Loading audio file: {Path(audio_path).name}")
        
        try:
            # Load audio file
            y, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
            
            duration = len(y) / sr
            logger.info(f"   Duration: {duration:.2f}s")
            logger.info(f"   Sample rate: {sr}Hz")
            logger.info(f"   Samples: {len(y):,}")
            
            return y, sr
            
        except Exception as e:
            logger.error(f"❌ T49: Failed to load audio: {e}")
            raise Exception(f"Failed to load audio: {e}")
    
    def detect_onsets_in_frequency_band(self, y: np.ndarray, sr: int, 
                                       freq_range: Tuple[int, int]) -> np.ndarray:
        """
        Detect onsets in a specific frequency band
        
        Args:
            y: Audio signal
            sr: Sample rate
            freq_range: Frequency range (low_hz, high_hz)
            
        Returns:
            Array of onset times in seconds
        """
        try:
            # Compute STFT
            stft = librosa.stft(y, hop_length=self.hop_length, n_fft=self.frame_length)
            magnitude = np.abs(stft)
            
            # Get frequency bins for the specified range
            freqs = librosa.fft_frequencies(sr=sr, n_fft=self.frame_length)
            freq_mask = (freqs >= freq_range[0]) & (freqs <= freq_range[1])
            
            # Extract magnitude in frequency band
            band_magnitude = magnitude[freq_mask, :]
            
            # Sum across frequency bins to get energy in band
            band_energy = np.sum(band_magnitude, axis=0)
            
            # Detect onsets using spectral flux
            onset_frames = librosa.onset.onset_detect(
                onset_envelope=band_energy,
                sr=sr,
                hop_length=self.hop_length,
                units='frames'
            )
            
            # Convert frames to time
            onset_times = librosa.frames_to_time(
                onset_frames, 
                sr=sr, 
                hop_length=self.hop_length
            )
            
            return onset_times
            
        except Exception as e:
            logger.error(f"❌ T49: Onset detection failed for {freq_range}: {e}")
            return np.array([])
    
    def detect_drum_onsets(self, audio_path: str) -> Dict[str, np.ndarray]:
        """
        Detect drum onsets for kick, snare, and hihat
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dict containing onset times for each drum type
        """
        logger.info(f"🥁 T49: Starting drum onset detection")
        
        if not LIBROSA_AVAILABLE:
            logger.warning("⚠️  librosa not available, using placeholder detection")
            return self._placeholder_detection(audio_path)
        
        try:
            # Load audio
            y, sr = self.load_audio(audio_path)
            
            # Detect onsets for each drum type
            logger.info("🔍 Detecting kick onsets...")
            kick_onsets = self.detect_onsets_in_frequency_band(y, sr, self.kick_freq_range)
            
            logger.info("🔍 Detecting snare onsets...")
            snare_onsets = self.detect_onsets_in_frequency_band(y, sr, self.snare_freq_range)
            
            logger.info("🔍 Detecting hihat onsets...")
            hihat_onsets = self.detect_onsets_in_frequency_band(y, sr, self.hihat_freq_range)
            
            # Results
            results = {
                'kick': kick_onsets,
                'snare': snare_onsets,
                'hihat': hihat_onsets
            }
            
            # Log results
            logger.info(f"✅ T49: Drum onset detection completed")
            logger.info(f"   Kick onsets: {len(kick_onsets)}")
            logger.info(f"   Snare onsets: {len(snare_onsets)}")
            logger.info(f"   Hihat onsets: {len(hihat_onsets)}")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ T49: Drum onset detection failed: {e}")
            raise Exception(f"Drum onset detection failed: {e}")
    
    def _placeholder_detection(self, audio_path: str) -> Dict[str, np.ndarray]:
        """
        Placeholder detection when librosa is not available
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dict with placeholder onset times
        """
        logger.info("🔄 T49: Using placeholder drum detection")
        
        try:
            # Get audio duration (estimate from file size)
            file_size = os.path.getsize(audio_path)
            estimated_duration = max(1.0, file_size / (44100 * 2))  # Rough estimate
            
            # Generate placeholder onsets
            # Kick: every beat (assuming 120 BPM)
            kick_interval = 60.0 / 120.0  # 0.5 seconds
            kick_onsets = np.arange(0, estimated_duration, kick_interval)
            
            # Snare: on beats 2 and 4 (assuming 4/4 time)
            snare_interval = kick_interval * 2  # Every 2 beats
            snare_onsets = np.arange(kick_interval, estimated_duration, snare_interval)
            
            # Hihat: eighth notes
            hihat_interval = kick_interval / 2  # 0.25 seconds
            hihat_onsets = np.arange(0, estimated_duration, hihat_interval)
            
            results = {
                'kick': kick_onsets,
                'snare': snare_onsets,
                'hihat': hihat_onsets
            }
            
            logger.info(f"✅ T49: Placeholder detection completed")
            logger.info(f"   Estimated duration: {estimated_duration:.2f}s")
            logger.info(f"   Kick onsets: {len(kick_onsets)}")
            logger.info(f"   Snare onsets: {len(snare_onsets)}")
            logger.info(f"   Hihat onsets: {len(hihat_onsets)}")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ T49: Placeholder detection failed: {e}")
            raise Exception(f"Placeholder detection failed: {e}")
    
    def quantize_onsets(self, onsets: np.ndarray, bpm: float = 120.0, 
                       quantize_to: str = '16th') -> np.ndarray:
        """
        Quantize onset times to musical grid
        
        Args:
            onsets: Array of onset times in seconds
            bpm: Beats per minute
            quantize_to: Quantization resolution ('16th', '8th', 'quarter')
            
        Returns:
            Quantized onset times
        """
        if len(onsets) == 0:
            return onsets
        
        # Calculate quantization interval
        beat_duration = 60.0 / bpm
        
        if quantize_to == '16th':
            quantize_interval = beat_duration / 4
        elif quantize_to == '8th':
            quantize_interval = beat_duration / 2
        elif quantize_to == 'quarter':
            quantize_interval = beat_duration
        else:
            quantize_interval = beat_duration / 4  # Default to 16th notes
        
        # Quantize onsets
        quantized = np.round(onsets / quantize_interval) * quantize_interval
        
        # Remove duplicates and sort
        quantized = np.unique(quantized)
        
        logger.info(f"🎵 T49: Quantized {len(onsets)} onsets to {len(quantized)} {quantize_to} notes")
        
        return quantized
    
    def process_drum_track(self, audio_path: str, bpm: float = 120.0) -> Dict[str, Any]:
        """
        Complete drum processing pipeline
        
        Args:
            audio_path: Path to audio file
            bpm: Beats per minute for quantization
            
        Returns:
            Dict containing processed drum data
        """
        logger.info(f"🥁 T49: Starting drum track processing")
        logger.info(f"   Audio: {Path(audio_path).name}")
        logger.info(f"   BPM: {bpm}")
        
        try:
            # Detect onsets
            onsets = self.detect_drum_onsets(audio_path)
            
            # Quantize onsets
            quantized_onsets = {}
            for drum_type, onset_times in onsets.items():
                quantized_onsets[drum_type] = self.quantize_onsets(onset_times, bpm)
            
            # Create result
            result = {
                'success': True,
                'audio_file': Path(audio_path).name,
                'bpm': bpm,
                'raw_onsets': onsets,
                'quantized_onsets': quantized_onsets,
                'drum_types': ['kick', 'snare', 'hihat'],
                'total_onsets': sum(len(q) for q in quantized_onsets.values())
            }
            
            logger.info(f"✅ T49: Drum track processing completed")
            logger.info(f"   Total quantized onsets: {result['total_onsets']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ T49: Drum track processing failed: {e}")
            raise Exception(f"Drum track processing failed: {e}")


def create_drum_detector(sample_rate: int = 44100) -> DrumDetector:
    """
    Factory function to create drum detector instance
    
    Args:
        sample_rate: Audio sample rate
        
    Returns:
        DrumDetector instance
    """
    return DrumDetector(sample_rate)
