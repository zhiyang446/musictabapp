"""
T50 - MusicXML Generator Module

This module generates MusicXML files from MIDI drum data using music21.
Creates basic drum notation with beats, bar lines, and note heads.
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List

try:
    import numpy as np
except ImportError:
    # Fallback for when numpy is not available
    class NumpyFallback:
        @staticmethod
        def ceil(x):
            import math
            return math.ceil(x)
    np = NumpyFallback()

logger = logging.getLogger(__name__)

# Try to import music21
try:
    from music21 import stream, note, meter, tempo, duration, pitch, instrument, bar, metadata
    from music21.percussion import PercussionChord
    from music21 import converter
    MUSIC21_AVAILABLE = True
except ImportError as e:
    logger.warning(f"music21 not available: {e}")
    stream = None
    note = None
    meter = None
    tempo = None
    duration = None
    pitch = None
    instrument = None
    bar = None
    metadata = None
    PercussionChord = None
    converter = None
    MUSIC21_AVAILABLE = False


class MusicXMLGenerator:
    """
    MusicXML generator for drum notation
    
    Converts MIDI drum data to MusicXML format using music21.
    Creates basic drum notation with proper beats, bar lines, and note heads.
    """
    
    def __init__(self, temp_dir: Optional[str] = None):
        """
        Initialize MusicXML generator
        
        Args:
            temp_dir: Optional temporary directory for MusicXML files
        """
        self.temp_dir = temp_dir or tempfile.mkdtemp(prefix="musicxml_gen_")
        
        # Standard drum kit mapping for percussion staff
        # Using standard GM percussion mapping with proper staff positions
        self.drum_pitches = {
            36: 'C4',   # Kick drum -> C4 (space below staff)
            38: 'E4',   # Snare drum -> E4 (first line)
            42: 'G5'    # Hi-hat -> G5 (above staff)
        }
        
        # Drum names for display
        self.drum_names = {
            36: 'Kick',
            38: 'Snare', 
            42: 'Hi-hat'
        }
        
        # Ensure temp directory exists
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info(f"🎼 T50: MusicXMLGenerator initialized")
        logger.info(f"   Temp directory: {self.temp_dir}")
        logger.info(f"   Drum mappings: {self.drum_pitches}")
    
    def __del__(self):
        """Cleanup temporary directory"""
        try:
            import shutil
            if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory: {e}")
    
    def create_drum_score(self, drum_onsets: Dict[str, np.ndarray], 
                         bpm: float = 120.0, job_id: str = "drums") -> stream.Score:
        """
        Create a music21 Score from drum onset data
        
        Args:
            drum_onsets: Dict of drum type -> onset times in seconds
            bpm: Beats per minute
            job_id: Job identifier
            
        Returns:
            music21.stream.Score object
        """
        logger.info(f"🎼 T50: Creating drum score")
        logger.info(f"   BPM: {bpm}")
        logger.info(f"   Job ID: {job_id}")
        
        if not MUSIC21_AVAILABLE:
            raise Exception("music21 library not available")
        
        try:
            # Create score
            score = stream.Score()
            
            # Add metadata
            score.append(metadata.Metadata())
            score.metadata.title = f'Drum Score - {job_id}'
            score.metadata.composer = 'T50 Drum Detection'
            
            # Add tempo
            metronome = tempo.TempoIndication(number=bpm)
            score.append(metronome)
            
            # Add time signature (4/4)
            time_sig = meter.TimeSignature('4/4')
            score.append(time_sig)
            
            # Create drum part
            drum_part = stream.Part()
            drum_part.partName = 'Drums'
            
            # Set up drum kit with proper percussion setup
            from music21 import clef, key

            # Add percussion clef first
            perc_clef = clef.PercussionClef()
            drum_part.append(perc_clef)

            # Add key signature (no key for percussion)
            no_key = key.KeySignature(0)
            drum_part.append(no_key)

            # Set up percussion instrument
            perc_instrument = instrument.Percussion()
            perc_instrument.instrumentName = 'Drum Kit'
            perc_instrument.midiProgram = 0  # Standard drum kit
            perc_instrument.midiChannel = 9  # Drum channel (10, 0-indexed)
            drum_part.append(perc_instrument)
            
            # Collect all events with timing
            all_events = []
            
            for drum_type, onsets in drum_onsets.items():
                if len(onsets) == 0:
                    continue
                
                # Map drum type to MIDI note
                midi_note_map = {'kick': 36, 'snare': 38, 'hihat': 42}
                midi_note = midi_note_map.get(drum_type, 36)
                
                if midi_note in self.drum_pitches:
                    pitch_name = self.drum_pitches[midi_note]
                    drum_name = self.drum_names[midi_note]
                    
                    for onset_time in onsets:
                        all_events.append({
                            'time': float(onset_time),
                            'pitch': pitch_name,
                            'drum': drum_name,
                            'midi_note': midi_note
                        })
            
            # Sort events by time
            all_events.sort(key=lambda x: x['time'])
            
            logger.info(f"   Total events: {len(all_events)}")
            
            if len(all_events) == 0:
                logger.warning("   No drum events to process")
                # Add empty measure
                rest = note.Rest(quarterLength=4.0)
                drum_part.append(rest)
            else:
                # Create measures and add notes
                from music21.stream import Measure

                # Group events by measure (4 beats per measure)
                measures_dict = {}
                for event in all_events:
                    beat_offset = event['time'] * (bpm / 60.0)
                    measure_num = int(beat_offset // 4) + 1
                    beat_in_measure = beat_offset % 4

                    if measure_num not in measures_dict:
                        measures_dict[measure_num] = []

                    measures_dict[measure_num].append({
                        'beat': beat_in_measure,
                        'event': event
                    })

                # Create measures
                for measure_num in sorted(measures_dict.keys()):
                    m = Measure(number=measure_num)

                    # Add notes to measure
                    for note_info in sorted(measures_dict[measure_num], key=lambda x: x['beat']):
                        event = note_info['event']

                        # Create unpitched note for proper drum notation
                        # According to MusicXML 4.0: "If percussion clef is used, the display-step
                        # and display-octave elements are interpreted as if in treble clef,
                        # with a G in octave 4 on line 2."
                        if event['midi_note'] == 36:  # Kick drum
                            drum_note = note.Unpitched(quarterLength=0.25)
                            drum_note.displayStep = 'C'  # Below staff (space below first line)
                            drum_note.displayOctave = 4
                            drum_note.notehead = 'normal'
                        elif event['midi_note'] == 38:  # Snare drum
                            drum_note = note.Unpitched(quarterLength=0.25)
                            drum_note.displayStep = 'E'  # First line of staff
                            drum_note.displayOctave = 4
                            drum_note.notehead = 'normal'
                        elif event['midi_note'] == 42:  # Hi-hat
                            drum_note = note.Unpitched(quarterLength=0.25)
                            drum_note.displayStep = 'G'  # Above staff (space above fifth line)
                            drum_note.displayOctave = 5
                            drum_note.notehead = 'x'
                        else:
                            drum_note = note.Unpitched(quarterLength=0.25)
                            drum_note.displayStep = 'E'
                            drum_note.displayOctave = 4
                            drum_note.notehead = 'normal'

                        # Set offset within measure
                        drum_note.offset = note_info['beat']
                        m.append(drum_note)

                        logger.debug(f"   Added {event['drum']} at measure {measure_num}, beat {note_info['beat']:.2f}")

                    # Fill measure to 4 beats if needed
                    if m.duration.quarterLength < 4.0:
                        rest_duration = 4.0 - m.duration.quarterLength
                        if rest_duration > 0:
                            rest = note.Rest(quarterLength=rest_duration)
                            m.append(rest)

                    drum_part.append(m)
            
            # Calculate number of measures created
            num_measures = len(measures_dict) if all_events else 1
            logger.info(f"   Added {num_measures} measures")
            
            # Add part to score
            score.append(drum_part)
            
            logger.info(f"✅ T50: Drum score created successfully")
            
            return score
            
        except Exception as e:
            logger.error(f"❌ T50: Drum score creation failed: {e}")
            raise Exception(f"Drum score creation failed: {e}")
    
    def score_to_musicxml(self, score: stream.Score, job_id: str) -> str:
        """
        Convert music21 Score to MusicXML file
        
        Args:
            score: music21.stream.Score object
            job_id: Job identifier for filename
            
        Returns:
            Path to created MusicXML file
        """
        logger.info(f"🎼 T50: Converting score to MusicXML")
        
        try:
            # Create filename
            filename = f"{job_id}_drums.musicxml"
            filepath = os.path.join(self.temp_dir, filename)
            
            # Write MusicXML
            score.write('musicxml', fp=filepath)
            
            file_size = os.path.getsize(filepath)
            logger.info(f"✅ T50: MusicXML file created: {filename}")
            logger.info(f"   File size: {file_size:,} bytes")
            
            return filepath
            
        except Exception as e:
            logger.error(f"❌ T50: MusicXML conversion failed: {e}")
            raise Exception(f"MusicXML conversion failed: {e}")
    
    def create_placeholder_musicxml(self, drum_onsets: Dict[str, np.ndarray], 
                                  bpm: float, job_id: str) -> str:
        """
        Create placeholder MusicXML when music21 is not available
        
        Args:
            drum_onsets: Dict of drum type -> onset times
            bpm: Beats per minute
            job_id: Job identifier
            
        Returns:
            Path to placeholder MusicXML file
        """
        logger.info(f"🎼 T50: Creating placeholder MusicXML")
        
        try:
            filename = f"{job_id}_drums.musicxml"
            filepath = os.path.join(self.temp_dir, filename)
            
            # Create basic MusicXML structure
            musicxml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Drum Score - {job_id}</work-title>
  </work>
  <identification>
    <creator type="composer">T50 Drum Detection</creator>
    <encoding>
      <software>T50 MusicXML Generator</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Drums</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Drum Kit</instrument-name>
      </score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>percussion</sign>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>{bpm}</per-minute>
          </metronome>
        </direction-type>
      </direction>
      <note>
        <unpitched>
          <display-step>C</display-step>
          <display-octave>4</display-octave>
        </unpitched>
        <duration>1</duration>
        <type>quarter</type>
        <notehead>normal</notehead>
      </note>
      <note>
        <unpitched>
          <display-step>E</display-step>
          <display-octave>4</display-octave>
        </unpitched>
        <duration>1</duration>
        <type>quarter</type>
        <notehead>normal</notehead>
      </note>
      <note>
        <unpitched>
          <display-step>G</display-step>
          <display-octave>5</display-octave>
        </unpitched>
        <duration>1</duration>
        <type>quarter</type>
        <notehead>x</notehead>
      </note>
      <note>
        <rest/>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>'''
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(musicxml_content)
            
            file_size = os.path.getsize(filepath)
            logger.info(f"✅ T50: Placeholder MusicXML created: {filename}")
            logger.info(f"   File size: {file_size:,} bytes")
            
            return filepath
            
        except Exception as e:
            logger.error(f"❌ T50: Placeholder MusicXML creation failed: {e}")
            raise Exception(f"Placeholder MusicXML creation failed: {e}")
    
    def generate_musicxml(self, drum_onsets: Dict[str, np.ndarray], 
                         bpm: float, job_id: str) -> Dict[str, Any]:
        """
        Generate MusicXML file from drum onsets
        
        Args:
            drum_onsets: Dict of drum type -> onset times
            bpm: Beats per minute
            job_id: Job identifier
            
        Returns:
            Dict containing MusicXML generation results
        """
        logger.info(f"🎼 T50: Generating MusicXML")
        logger.info(f"   Job ID: {job_id}")
        logger.info(f"   BPM: {bpm}")
        
        # Count total onsets
        total_onsets = sum(len(onsets) for onsets in drum_onsets.values())
        logger.info(f"   Total onsets: {total_onsets}")
        
        try:
            musicxml_path = None
            method = "unknown"
            
            if MUSIC21_AVAILABLE:
                try:
                    # Create score using music21
                    score = self.create_drum_score(drum_onsets, bpm, job_id)
                    musicxml_path = self.score_to_musicxml(score, job_id)
                    method = "music21"
                except Exception as e:
                    logger.warning(f"music21 method failed: {e}")
                    musicxml_path = self.create_placeholder_musicxml(drum_onsets, bpm, job_id)
                    method = "placeholder"
            else:
                musicxml_path = self.create_placeholder_musicxml(drum_onsets, bpm, job_id)
                method = "placeholder"
            
            # Create result
            result = {
                'success': True,
                'musicxml_path': musicxml_path,
                'musicxml_filename': Path(musicxml_path).name,
                'method': method,
                'bpm': bpm,
                'drum_types': list(drum_onsets.keys()),
                'onset_counts': {k: len(v) for k, v in drum_onsets.items()},
                'total_onsets': total_onsets,
                'file_size': os.path.getsize(musicxml_path)
            }
            
            logger.info(f"✅ T50: MusicXML generation completed")
            logger.info(f"   Method: {method}")
            logger.info(f"   File: {result['musicxml_filename']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ T50: MusicXML generation failed: {e}")
            raise Exception(f"MusicXML generation failed: {e}")


def create_musicxml_generator(temp_dir: Optional[str] = None) -> MusicXMLGenerator:
    """
    Factory function to create MusicXML generator instance
    
    Args:
        temp_dir: Optional temporary directory
        
    Returns:
        MusicXMLGenerator instance
    """
    return MusicXMLGenerator(temp_dir)


def process_drums_to_musicxml(drum_onsets: Dict[str, np.ndarray], 
                             bpm: float, job_id: str) -> Dict[str, Any]:
    """
    Complete pipeline: drum onsets to MusicXML file
    
    Args:
        drum_onsets: Dict of drum type -> onset times
        bpm: Beats per minute
        job_id: Job identifier
        
    Returns:
        Dict containing processing results
    """
    logger.info(f"🎼 T50: Processing drums to MusicXML")
    
    try:
        generator = create_musicxml_generator()
        result = generator.generate_musicxml(drum_onsets, bpm, job_id)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ T50: Drums to MusicXML processing failed: {e}")
        raise Exception(f"Drums to MusicXML processing failed: {e}")
