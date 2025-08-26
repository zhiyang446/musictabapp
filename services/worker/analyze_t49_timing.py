#!/usr/bin/env python3
"""
Analyze T49 MIDI output timing to understand the alignment issues.
"""

import mido
import pretty_midi
import numpy as np

def analyze_midi_timing(midi_path):
    """Analyze timing issues in T49 MIDI output."""
    print(f"🔍 Analyzing MIDI timing: {midi_path}")
    
    # Load with mido
    midi_file = mido.MidiFile(midi_path)
    
    print(f"📊 MIDI File Info:")
    print(f"   Ticks per beat: {midi_file.ticks_per_beat}")
    print(f"   Tracks: {len(midi_file.tracks)}")
    
    # Extract note events with absolute timing
    events = []
    current_time = 0
    
    for track in midi_file.tracks:
        track_time = 0
        for msg in track:
            track_time += msg.time
            if msg.type == 'note_on' and msg.velocity > 0:
                events.append({
                    'time_ticks': track_time,
                    'time_seconds': track_time / midi_file.ticks_per_beat * (60/120),  # Assume 120 BPM
                    'note': msg.note,
                    'velocity': msg.velocity
                })
    
    print(f"\n🎵 Found {len(events)} note events")
    
    # Analyze timing patterns
    if len(events) > 0:
        times_sec = [e['time_seconds'] for e in events]
        times_ticks = [e['time_ticks'] for e in events]
        
        print(f"\n⏱️ Timing Analysis:")
        print(f"   First event: {times_sec[0]:.3f}s ({times_ticks[0]} ticks)")
        print(f"   Last event: {times_sec[-1]:.3f}s ({times_ticks[-1]} ticks)")
        print(f"   Duration: {times_sec[-1] - times_sec[0]:.3f}s")
        
        # Check for quantization
        print(f"\n📏 Quantization Check:")
        sixteenth_note_ticks = midi_file.ticks_per_beat / 4  # 1/16 note
        eighth_note_ticks = midi_file.ticks_per_beat / 2     # 1/8 note
        quarter_note_ticks = midi_file.ticks_per_beat        # 1/4 note
        
        quantized_16th = 0
        quantized_8th = 0
        quantized_quarter = 0
        
        for tick_time in times_ticks:
            if tick_time % sixteenth_note_ticks == 0:
                quantized_16th += 1
            if tick_time % eighth_note_ticks == 0:
                quantized_8th += 1
            if tick_time % quarter_note_ticks == 0:
                quantized_quarter += 1
        
        print(f"   1/16 note aligned: {quantized_16th}/{len(events)} ({quantized_16th/len(events)*100:.1f}%)")
        print(f"   1/8 note aligned: {quantized_8th}/{len(events)} ({quantized_8th/len(events)*100:.1f}%)")
        print(f"   1/4 note aligned: {quantized_quarter}/{len(events)} ({quantized_quarter/len(events)*100:.1f}%)")
        
        # Show first 10 events with timing details
        print(f"\n📝 First 10 Events (showing timing issues):")
        gm_names = {36: "Kick", 38: "Snare", 42: "Hi-Hat", 47: "Tom", 49: "Cymbal"}
        
        for i, event in enumerate(events[:10]):
            drum_name = gm_names.get(event['note'], f"Unknown({event['note']})")
            tick_time = event['time_ticks']
            
            # Check alignment to common grids
            sixteenth_offset = tick_time % sixteenth_note_ticks
            eighth_offset = tick_time % eighth_note_ticks
            
            alignment = "UNALIGNED"
            if sixteenth_offset == 0:
                alignment = "1/16 ALIGNED"
            elif eighth_offset == 0:
                alignment = "1/8 ALIGNED"
            
            print(f"   {i+1:2d}. {event['time_seconds']:6.3f}s | {tick_time:5.0f} ticks | {drum_name:8s} | {alignment}")
    
    return events

def main():
    """Analyze T49 outputs."""
    print("🎯 T49 MIDI Timing Analysis")
    print("=" * 50)
    
    midi_files = [
        "output/t49_demucs_separated_drums.mid",
        "output/t49_full_audio_drums.mid"
    ]
    
    for midi_file in midi_files:
        try:
            print(f"\n{'='*60}")
            events = analyze_midi_timing(midi_file)
            
            if len(events) == 0:
                print("❌ No events found in MIDI file")
            else:
                print(f"✅ Analysis complete for {len(events)} events")
                
        except Exception as e:
            print(f"❌ Error analyzing {midi_file}: {e}")
    
    print(f"\n{'='*60}")
    print("🎯 CONCLUSION:")
    print("T49 generates RAW timing events that need T50 standardization:")
    print("1. Quantize to 1/16 note grid")
    print("2. Add proper tempo/time signature")
    print("3. Merge simultaneous events")
    print("4. Apply proper drum notation mapping")

if __name__ == "__main__":
    main()
