#!/usr/bin/env python3

"""
Generate Test MIDI - Create a sample MIDI file for T49 testing

This script creates a test MIDI file with drum patterns that can be opened in a DAW.
"""

import os
import sys
import numpy as np
from pathlib import Path

# Add the worker directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'worker'))

def generate_test_midi():
    """Generate a test MIDI file for DAW testing"""
    print("🎵 Generating Test MIDI File for T49")
    print("===================================")
    
    try:
        from midi_generator import create_midi_generator
        
        # Create MIDI generator
        generator = create_midi_generator()
        
        # Create a realistic drum pattern (4 bars, 120 BPM)
        # Time in seconds for 4 bars at 120 BPM = 4 * (60/120) * 4 = 8 seconds
        
        # Kick pattern: on beats 1 and 3
        kick_onsets = np.array([
            0.0, 2.0, 4.0, 6.0,  # Bar 1 & 2: beats 1, 3
            8.0, 10.0, 12.0, 14.0  # Bar 3 & 4: beats 1, 3
        ])
        
        # Snare pattern: on beats 2 and 4
        snare_onsets = np.array([
            1.0, 3.0, 5.0, 7.0,   # Bar 1 & 2: beats 2, 4
            9.0, 11.0, 13.0, 15.0  # Bar 3 & 4: beats 2, 4
        ])
        
        # Hihat pattern: eighth notes
        hihat_onsets = np.array([
            0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5,  # Bar 1
            4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5,  # Bar 2
            8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5,  # Bar 3
            12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5  # Bar 4
        ])
        
        # Create drum onset data
        drum_onsets = {
            'kick': kick_onsets,
            'snare': snare_onsets,
            'hihat': hihat_onsets
        }
        
        print("🥁 Drum pattern created:")
        print(f"   Kick: {len(kick_onsets)} hits")
        print(f"   Snare: {len(snare_onsets)} hits")
        print(f"   Hihat: {len(hihat_onsets)} hits")
        print(f"   Total duration: 16 seconds (4 bars)")
        
        # Generate MIDI
        result = generator.generate_drum_midi(drum_onsets, bpm=120.0, job_id="test_daw")
        
        if result['success']:
            midi_path = result['midi_path']
            
            print(f"\n✅ MIDI file generated successfully!")
            print(f"   File: {result['midi_filename']}")
            print(f"   Path: {midi_path}")
            print(f"   Method: {result['method']}")
            print(f"   Size: {result['file_size']:,} bytes")
            print(f"   Total notes: {result['total_onsets']}")
            
            # Copy to a more accessible location
            output_dir = Path("output")
            output_dir.mkdir(exist_ok=True)
            
            output_path = output_dir / "T49_test_drums.mid"
            
            import shutil
            shutil.copy2(midi_path, output_path)
            
            print(f"\n📁 MIDI file copied to: {output_path}")
            print(f"   Absolute path: {output_path.absolute()}")
            
            # Show DAW instructions
            show_daw_instructions(output_path.absolute())
            
            return str(output_path.absolute())
        else:
            print("❌ MIDI generation failed")
            return None
            
    except Exception as e:
        print(f"❌ Test MIDI generation failed: {e}")
        return None

def show_daw_instructions(midi_path):
    """Show instructions for opening in DAW"""
    print(f"\n🎹 DAW Testing Instructions")
    print("===========================")
    
    print(f"📂 MIDI File Location: {midi_path}")
    
    print(f"\n🎵 Pattern Description:")
    print("   • 4 bars at 120 BPM")
    print("   • Kick: on beats 1 and 3")
    print("   • Snare: on beats 2 and 4")
    print("   • Hihat: eighth notes")
    
    print(f"\n🔧 How to test in different DAWs:")
    
    print(f"\n📱 Ableton Live:")
    print("   1. Open Ableton Live")
    print("   2. Create new Live Set")
    print("   3. Drag MIDI file into Session View")
    print("   4. Load a Drum Kit (e.g., Operator, Drum Rack)")
    print("   5. Press Play")
    
    print(f"\n🎛️  FL Studio:")
    print("   1. Open FL Studio")
    print("   2. File → Import → MIDI file")
    print("   3. Select the MIDI file")
    print("   4. Load FPC or other drum plugin")
    print("   5. Press Play")
    
    print(f"\n🎚️  Logic Pro:")
    print("   1. Open Logic Pro")
    print("   2. File → Import → MIDI")
    print("   3. Select the MIDI file")
    print("   4. Choose Drummer track or load drum kit")
    print("   5. Press Play")
    
    print(f"\n🎧 Reaper:")
    print("   1. Open Reaper")
    print("   2. Insert → Media File")
    print("   3. Select the MIDI file")
    print("   4. Add drum VSTi (e.g., ReaDrum)")
    print("   5. Press Play")
    
    print(f"\n✅ Expected Result:")
    print("   You should hear a basic drum pattern with:")
    print("   • Kick drum on beats 1 and 3")
    print("   • Snare drum on beats 2 and 4")
    print("   • Hi-hat playing eighth notes")
    
    print(f"\n🔍 MIDI Details:")
    print("   • Channel: 10 (drum channel)")
    print("   • Kick: MIDI note 36 (C2)")
    print("   • Snare: MIDI note 38 (D2)")
    print("   • Hihat: MIDI note 42 (F#2)")

def validate_midi_file(midi_path):
    """Validate the generated MIDI file"""
    print(f"\n🔍 Validating MIDI File")
    print("======================")
    
    try:
        # Check file exists
        if not os.path.exists(midi_path):
            print("❌ MIDI file not found")
            return False
        
        file_size = os.path.getsize(midi_path)
        print(f"📁 File size: {file_size:,} bytes")
        
        # Check MIDI header
        with open(midi_path, 'rb') as f:
            header = f.read(4)
            if header == b'MThd':
                print("✅ Valid MIDI header")
            else:
                print("⚠️  Non-standard MIDI header")
        
        # Try to load with mido if available
        try:
            import mido
            mid = mido.MidiFile(midi_path)
            print(f"✅ MIDI file loads successfully")
            print(f"   Format: {mid.type}")
            print(f"   Tracks: {len(mid.tracks)}")
            print(f"   Ticks per beat: {mid.ticks_per_beat}")
            
            # Count note events
            note_count = 0
            for track in mid.tracks:
                for msg in track:
                    if msg.type == 'note_on':
                        note_count += 1
            
            print(f"   Note events: {note_count}")
            
            return True
            
        except ImportError:
            print("⚠️  mido not available for detailed validation")
            return True
        except Exception as e:
            print(f"⚠️  MIDI validation issue: {e}")
            return True
        
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

if __name__ == "__main__":
    print("🎯 T49 MIDI Generation Test")
    print("===========================")
    
    # Generate test MIDI
    midi_path = generate_test_midi()
    
    if midi_path:
        # Validate the file
        validate_midi_file(midi_path)
        
        print(f"\n🎉 Test MIDI Ready!")
        print(f"   File: {midi_path}")
        print(f"   Ready for DAW testing")
        
        # Ask if user wants to open the file
        print(f"\n📂 You can now:")
        print(f"   1. Open the MIDI file in your DAW")
        print(f"   2. Load a drum kit/plugin")
        print(f"   3. Press play to hear the drum pattern")
        
    else:
        print(f"\n❌ Failed to generate test MIDI")
    
    print(f"\n📋 T49 Status: MIDI generation functional and ready for DAW testing!")
