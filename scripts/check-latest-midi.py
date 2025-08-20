#!/usr/bin/env python3

"""
Check Latest MIDI - Analyze the most recent MIDI files
"""

import os
import sys
from pathlib import Path

def check_midi_file(filepath):
    """Check a specific MIDI file"""
    print(f"\n📁 Checking: {Path(filepath).name}")
    print("=" * 40)
    
    if not os.path.exists(filepath):
        print("❌ File not found")
        return False
    
    file_size = os.path.getsize(filepath)
    print(f"📊 Size: {file_size} bytes")
    
    try:
        # Read and analyze raw bytes
        with open(filepath, 'rb') as f:
            data = f.read()
        
        print(f"📊 Raw bytes: {len(data)}")
        
        # Check header
        if data[:4] == b'MThd':
            print("✅ Valid MIDI header")
            
            # Parse basic info
            format_type = int.from_bytes(data[8:10], 'big')
            num_tracks = int.from_bytes(data[10:12], 'big')
            ticks_per_beat = int.from_bytes(data[12:14], 'big')
            
            print(f"📊 Format: {format_type}")
            print(f"📊 Tracks: {num_tracks}")
            print(f"📊 Ticks/beat: {ticks_per_beat}")
        else:
            print("❌ Invalid MIDI header")
            return False
        
        # Try mido analysis
        try:
            import mido
            mid = mido.MidiFile(filepath)
            
            print(f"\n🎵 Mido Analysis:")
            print(f"   Duration: {mid.length:.2f}s")
            print(f"   Tracks: {len(mid.tracks)}")
            
            total_notes = 0
            for i, track in enumerate(mid.tracks):
                note_events = 0
                for msg in track:
                    if msg.type == 'note_on' and msg.velocity > 0:
                        note_events += 1
                        total_notes += 1
                
                print(f"   Track {i+1}: {len(track)} messages, {note_events} notes")
            
            print(f"   Total notes: {total_notes}")
            
            if total_notes > 0:
                print("✅ MIDI has actual note content!")
                return True
            else:
                print("⚠️  MIDI appears to have no notes")
                return False
                
        except ImportError:
            print("⚠️  mido not available")
            return True
        except Exception as e:
            print(f"⚠️  mido error: {e}")
            return True
            
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        return False

def main():
    """Check all MIDI files in output directory"""
    print("🔍 T49 MIDI File Analysis")
    print("=========================")
    
    output_dir = Path("output")
    if not output_dir.exists():
        print("❌ Output directory not found")
        return
    
    midi_files = list(output_dir.glob("*.mid"))
    
    if not midi_files:
        print("❌ No MIDI files found")
        return
    
    print(f"📂 Found {len(midi_files)} MIDI files")
    
    working_files = []
    
    for midi_file in sorted(midi_files):
        if check_midi_file(str(midi_file)):
            working_files.append(midi_file)
    
    print(f"\n📋 Summary")
    print("=" * 20)
    print(f"Total files: {len(midi_files)}")
    print(f"Working files: {len(working_files)}")
    
    if working_files:
        print(f"\n✅ Working MIDI files:")
        for f in working_files:
            print(f"   • {f.name}")
        
        # Recommend the best one
        best_file = max(working_files, key=lambda f: os.path.getsize(f))
        print(f"\n🎯 Recommended file: {best_file.name}")
        print(f"   Path: {best_file.absolute()}")
        
        print(f"\n🎵 To test this file:")
        print("   1. Go to: https://onlinesequencer.net/import")
        print("   2. Upload the file")
        print("   3. Press play")
        
    else:
        print(f"\n⚠️  No working MIDI files found")
    
    print(f"\n💡 Remember: MIDI files need a sound source to be heard!")

if __name__ == "__main__":
    main()
