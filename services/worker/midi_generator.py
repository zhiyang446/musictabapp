"""
T49 - MIDI Generator Module

This module generates MIDI files from drum onset data.
Creates 3-track MIDI files for kick, snare, and hihat.
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)

# Try to import MIDI libraries
try:
    import mido
    import pretty_midi
    MIDI_AVAILABLE = True
except ImportError as e:
    logger.warning(f"MIDI libraries not available: {e}")
    mido = None
    pretty_midi = None
    MIDI_AVAILABLE = False


class MIDIGenerator:
    """
    MIDI generator for drum tracks
    
    Creates MIDI files with separate tracks for kick, snare, and hihat.
    """
    
    def __init__(self, temp_dir: Optional[str] = None):
        """
        Initialize MIDI generator
        
        Args:
            temp_dir: Optional temporary directory for MIDI files
        """
        self.temp_dir = temp_dir or tempfile.mkdtemp(prefix="midi_gen_")
        
        # Standard drum MIDI note numbers (General MIDI)
        self.drum_notes = {
            'kick': 36,   # Bass Drum 1 (C2)
            'snare': 38,  # Acoustic Snare (D2)
            'hihat': 42   # Closed Hi-Hat (F#2)
        }
        
        # MIDI parameters
        self.velocity = 100  # Note velocity (0-127)
        self.note_duration = 0.1  # Note duration in seconds
        self.ticks_per_beat = 480  # MIDI ticks per quarter note
        
        # Ensure temp directory exists
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info(f"🎹 T49: MIDIGenerator initialized")
        logger.info(f"   Temp directory: {self.temp_dir}")
        logger.info(f"   Drum notes: {self.drum_notes}")
        logger.info(f"   Velocity: {self.velocity}")
    
    def __del__(self):
        """Cleanup temporary directory"""
        try:
            import shutil
            if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory: {e}")
    
    def create_midi_with_mido(self, drum_onsets: Dict[str, np.ndarray], 
                             bpm: float, job_id: str) -> str:
        """
        Create MIDI file using mido library
        
        Args:
            drum_onsets: Dict of drum type -> onset times
            bpm: Beats per minute
            job_id: Job ID for filename
            
        Returns:
            Path to created MIDI file
        """
        logger.info(f"🎹 T49: Creating MIDI with mido")
        
        try:
            # Create new MIDI file
            mid = mido.MidiFile(ticks_per_beat=self.ticks_per_beat)
            
            # Calculate tempo
            tempo = mido.bpm2tempo(bpm)
            
            # Create tracks for each drum type
            for drum_type, onsets in drum_onsets.items():
                if len(onsets) == 0:
                    continue
                
                # Create track
                track = mido.MidiTrack()
                track.name = f"{drum_type.capitalize()} Track"
                
                # Add tempo message to first track
                if len(mid.tracks) == 0:
                    track.append(mido.MetaMessage('set_tempo', tempo=tempo))
                    track.append(mido.MetaMessage('track_name', name=f'Drums - {drum_type}'))
                
                # Convert onset times to MIDI ticks
                note_number = self.drum_notes[drum_type]
                
                # Sort onsets
                sorted_onsets = np.sort(onsets)
                
                current_time = 0
                for onset_time in sorted_onsets:
                    # Calculate delta time in ticks
                    onset_ticks = int(onset_time * self.ticks_per_beat * bpm / 60)
                    delta_time = max(0, onset_ticks - current_time)
                    
                    # Note on
                    track.append(mido.Message('note_on', 
                                            channel=9,  # Channel 10 (0-indexed) for drums
                                            note=note_number, 
                                            velocity=self.velocity, 
                                            time=delta_time))
                    
                    # Note off (short duration)
                    note_off_ticks = int(self.note_duration * self.ticks_per_beat * bpm / 60)
                    track.append(mido.Message('note_off', 
                                            channel=9, 
                                            note=note_number, 
                                            velocity=0, 
                                            time=note_off_ticks))
                    
                    current_time = onset_ticks + note_off_ticks
                
                # Add track to MIDI file
                mid.tracks.append(track)
                logger.info(f"   Added {drum_type} track: {len(onsets)} notes")
            
            # Save MIDI file
            filename = f"{job_id}_drums.mid"
            filepath = os.path.join(self.temp_dir, filename)
            
            mid.save(filepath)
            
            logger.info(f"✅ T49: MIDI file created: {filename}")
            logger.info(f"   Tracks: {len(mid.tracks)}")
            logger.info(f"   File size: {os.path.getsize(filepath):,} bytes")
            
            return filepath
            
        except Exception as e:
            logger.error(f"❌ T49: MIDI creation with mido failed: {e}")
            raise Exception(f"MIDI creation failed: {e}")
    
    def create_midi_with_pretty_midi(self, drum_onsets: Dict[str, np.ndarray], 
                                   bpm: float, job_id: str) -> str:
        """
        Create MIDI file using pretty_midi library
        
        Args:
            drum_onsets: Dict of drum type -> onset times
            bpm: Beats per minute
            job_id: Job ID for filename
            
        Returns:
            Path to created MIDI file
        """
        logger.info(f"🎹 T49: Creating MIDI with pretty_midi")
        
        try:
            # Create PrettyMIDI object
            pm = pretty_midi.PrettyMIDI(initial_tempo=bpm)
            
            # Create instrument (drums)
            drum_program = 0  # Acoustic Grand Piano (will be overridden by channel 9)
            drums = pretty_midi.Instrument(program=drum_program, is_drum=True)
            drums.name = "Drum Kit"
            
            # Add notes for each drum type
            for drum_type, onsets in drum_onsets.items():
                if len(onsets) == 0:
                    continue
                
                note_number = self.drum_notes[drum_type]
                
                for onset_time in onsets:
                    # Create note
                    note = pretty_midi.Note(
                        velocity=self.velocity,
                        pitch=note_number,
                        start=float(onset_time),
                        end=float(onset_time + self.note_duration)
                    )
                    drums.notes.append(note)
                
                logger.info(f"   Added {drum_type}: {len(onsets)} notes")
            
            # Add instrument to MIDI
            pm.instruments.append(drums)
            
            # Save MIDI file
            filename = f"{job_id}_drums.mid"
            filepath = os.path.join(self.temp_dir, filename)
            
            pm.write(filepath)
            
            logger.info(f"✅ T49: MIDI file created: {filename}")
            logger.info(f"   Duration: {pm.get_end_time():.2f}s")
            logger.info(f"   Total notes: {len(drums.notes)}")
            logger.info(f"   File size: {os.path.getsize(filepath):,} bytes")
            
            return filepath
            
        except Exception as e:
            logger.error(f"❌ T49: MIDI creation with pretty_midi failed: {e}")
            raise Exception(f"MIDI creation failed: {e}")
    
    def create_placeholder_midi(self, drum_onsets: Dict[str, np.ndarray], 
                              bpm: float, job_id: str) -> str:
        """
        Create placeholder MIDI file when libraries are not available
        
        Args:
            drum_onsets: Dict of drum type -> onset times
            bpm: Beats per minute
            job_id: Job ID for filename
            
        Returns:
            Path to placeholder MIDI file
        """
        logger.info(f"🎹 T49: Creating placeholder MIDI file")
        
        try:
            # Create a minimal MIDI file manually
            filename = f"{job_id}_drums.mid"
            filepath = os.path.join(self.temp_dir, filename)
            
            # Write minimal MIDI header
            with open(filepath, 'wb') as f:
                # MIDI header chunk
                f.write(b'MThd')  # Header chunk type
                f.write(b'\x00\x00\x00\x06')  # Header length (6 bytes)
                f.write(b'\x00\x00')  # Format type 0
                f.write(b'\x00\x01')  # Number of tracks (1)
                f.write(b'\x01\xe0')  # Ticks per quarter note (480)
                
                # Track chunk
                f.write(b'MTrk')  # Track chunk type
                f.write(b'\x00\x00\x00\x04')  # Track length (4 bytes)
                f.write(b'\x00\xff\x2f\x00')  # End of track
            
            logger.info(f"✅ T49: Placeholder MIDI created: {filename}")
            logger.info(f"   File size: {os.path.getsize(filepath):,} bytes")
            
            return filepath
            
        except Exception as e:
            logger.error(f"❌ T49: Placeholder MIDI creation failed: {e}")
            raise Exception(f"Placeholder MIDI creation failed: {e}")
    
    def generate_drum_midi(self, drum_onsets: Dict[str, np.ndarray], 
                          bpm: float, job_id: str) -> Dict[str, Any]:
        """
        Generate MIDI file from drum onsets
        
        Args:
            drum_onsets: Dict of drum type -> onset times
            bpm: Beats per minute
            job_id: Job ID for filename
            
        Returns:
            Dict containing MIDI generation results
        """
        logger.info(f"🎹 T49: Generating drum MIDI")
        logger.info(f"   Job ID: {job_id}")
        logger.info(f"   BPM: {bpm}")
        
        # Count total onsets
        total_onsets = sum(len(onsets) for onsets in drum_onsets.values())
        logger.info(f"   Total onsets: {total_onsets}")
        
        try:
            midi_path = None
            method = "unknown"
            
            if MIDI_AVAILABLE:
                # Try pretty_midi first (more user-friendly)
                try:
                    midi_path = self.create_midi_with_pretty_midi(drum_onsets, bpm, job_id)
                    method = "pretty_midi"
                except Exception as e:
                    logger.warning(f"pretty_midi failed, trying mido: {e}")
                    try:
                        midi_path = self.create_midi_with_mido(drum_onsets, bpm, job_id)
                        method = "mido"
                    except Exception as e2:
                        logger.warning(f"mido also failed: {e2}")
                        midi_path = self.create_placeholder_midi(drum_onsets, bpm, job_id)
                        method = "placeholder"
            else:
                midi_path = self.create_placeholder_midi(drum_onsets, bpm, job_id)
                method = "placeholder"
            
            # Create result
            result = {
                'success': True,
                'midi_path': midi_path,
                'midi_filename': Path(midi_path).name,
                'method': method,
                'bpm': bpm,
                'drum_types': list(drum_onsets.keys()),
                'onset_counts': {k: len(v) for k, v in drum_onsets.items()},
                'total_onsets': total_onsets,
                'file_size': os.path.getsize(midi_path)
            }
            
            logger.info(f"✅ T49: MIDI generation completed")
            logger.info(f"   Method: {method}")
            logger.info(f"   File: {result['midi_filename']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ T49: MIDI generation failed: {e}")
            raise Exception(f"MIDI generation failed: {e}")


def create_midi_generator(temp_dir: Optional[str] = None) -> MIDIGenerator:
    """
    Factory function to create MIDI generator instance
    
    Args:
        temp_dir: Optional temporary directory
        
    Returns:
        MIDIGenerator instance
    """
    return MIDIGenerator(temp_dir)


def process_drums_to_midi(drum_onsets: Dict[str, np.ndarray], 
                         bpm: float, job_id: str) -> Dict[str, Any]:
    """
    Complete pipeline: drum onsets to MIDI file
    
    Args:
        drum_onsets: Dict of drum type -> onset times
        bpm: Beats per minute
        job_id: Job ID
        
    Returns:
        Dict containing processing results
    """
    logger.info(f"🥁 T49: Processing drums to MIDI")
    
    try:
        generator = create_midi_generator()
        result = generator.generate_drum_midi(drum_onsets, bpm, job_id)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ T49: Drums to MIDI processing failed: {e}")
        raise Exception(f"Drums to MIDI processing failed: {e}")
