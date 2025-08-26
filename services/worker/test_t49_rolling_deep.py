#!/usr/bin/env python3
"""
Test T49 drum transcription with Rolling In The Deep drum cover.
"""

import os
import sys
import pretty_midi
import mido
from transcribe_drums import transcribe_drums_to_midi

def test_rolling_deep_drum_cover():
    """Test T49 with Rolling In The Deep drum cover."""
    print("🎵 T49 Test: Demucs Separated Drums Track")
    print("=" * 60)
    
    # Input and output paths
    input_audio = "../../temp/t48_demucs_output/test_t48_job_drums.wav"
    output_midi = "output/t49_demucs_separated_drums.mid"
    
    # Check if input file exists
    if not os.path.exists(input_audio):
        print(f"❌ Input file not found: {input_audio}")
        return False
    
    print(f"📁 Input:  {input_audio}")
    print(f"📁 Output: {output_midi}")
    
    # Create output directory
    os.makedirs("output", exist_ok=True)
    
    try:
        print("\n🔄 Running drum transcription...")
        transcribe_drums_to_midi(input_audio, output_midi)
        
        print("\n✅ Transcription completed!")
        
        # Verify output
        if not os.path.exists(output_midi):
            print("❌ Output MIDI file was not created")
            return False
        
        # Analyze results with mido
        print("\n📊 Analyzing results...")
        midi_file = mido.MidiFile(output_midi)
        
        note_events = []
        for track in midi_file.tracks:
            for msg in track:
                if msg.type == 'note_on' and msg.velocity > 0:
                    note_events.append((msg.time, msg.note, msg.velocity))
        
        print(f"📝 Total note events: {len(note_events)}")
        
        # Group by drum type
        drum_counts = {}
        gm_names = {36: "Kick", 38: "Snare", 42: "Hi-Hat Closed", 47: "Tom", 49: "Cymbal"}
        
        for _, pitch, _ in note_events:
            name = gm_names.get(pitch, f"Unknown({pitch})")
            drum_counts[name] = drum_counts.get(name, 0) + 1
        
        print("\n🥁 Drum events detected:")
        for drum_type, count in sorted(drum_counts.items()):
            print(f"   {drum_type}: {count} events")
        
        # Check for expected drum types
        expected_types = ["Kick", "Snare", "Hi-Hat Closed"]
        found_types = [t for t in expected_types if t in drum_counts]
        
        print(f"\n🎯 Expected drum types found: {len(found_types)}/{len(expected_types)}")
        for drum_type in found_types:
            print(f"   ✅ {drum_type}")
        
        missing_types = [t for t in expected_types if t not in drum_counts]
        for drum_type in missing_types:
            print(f"   ❌ {drum_type} (missing)")
        
        # Success criteria
        success = len(note_events) > 0 and len(found_types) >= 2
        
        print(f"\n{'✅ SUCCESS' if success else '❌ FAILED'}: T49 Rolling Deep Test")
        
        if success:
            print("📋 Test Results:")
            print(f"   - Generated MIDI with {len(note_events)} drum events")
            print(f"   - Detected {len(found_types)} expected drum types")
            print(f"   - Output file: {output_midi}")
        
        return success
        
    except Exception as e:
        print(f"❌ Error during transcription: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function."""
    success = test_rolling_deep_drum_cover()
    
    if success:
        print("\n🎉 Rolling Deep drum transcription test PASSED!")
        print("The T49 implementation successfully processed a real drum cover.")
    else:
        print("\n💥 Rolling Deep drum transcription test FAILED!")
        print("Check the error messages above for details.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
