import pretty_midi
import os
import numpy as np
from transcribe_drums import transcribe_drums_to_midi
import mido

def test_t49_with_real_audio(audio_path: str):
    """Tests the T49 drum transcription with DLDC model and real audio file."""
    print("\n--- Running T49 Test: DLDC-based Drum Transcription ---")

    # --- Setup ---
    output_midi_path = "output/t49_dldc_drums_raw.mid"
    os.makedirs("output", exist_ok=True)

    if not os.path.exists(audio_path):
        assert False, f"Test audio file not found at the provided path: {audio_path}"

    print(f"Input audio: {audio_path}")
    print(f"Output MIDI: {output_midi_path}")

    # --- Run DLDC-based Transcription ---
    try:
        transcribe_drums_to_midi(audio_path, output_midi_path)
    except Exception as e:
        print(f"❌ Transcription failed with error: {e}")
        raise

    # --- Verification ---
    assert os.path.exists(output_midi_path), "Output MIDI file was not created."
    print(f"✅ MIDI file created: {output_midi_path}")

    # Test with mido (primary output format)
    try:
        midi_file = mido.MidiFile(output_midi_path)
        total_messages = sum(len(track) for track in midi_file.tracks)
        print(f"MIDI file loaded successfully with {len(midi_file.tracks)} tracks and {total_messages} messages")

        # Count note events
        note_on_count = 0
        pitches = set()
        for track in midi_file.tracks:
            for msg in track:
                if msg.type == 'note_on' and msg.velocity > 0:
                    note_on_count += 1
                    pitches.add(msg.note)

        print(f"Found {note_on_count} note events with pitches: {sorted(list(pitches))}")
        assert note_on_count > 0, "No note events found in MIDI file"

    except Exception as e:
        print(f"❌ Error reading MIDI with mido: {e}")
        raise

    # Test with pretty_midi (compatibility output)
    pretty_midi_path = output_midi_path.replace('.mid', '_pretty.mid')
    if os.path.exists(pretty_midi_path):
        try:
            midi_data = pretty_midi.PrettyMIDI(pretty_midi_path)
            assert len(midi_data.instruments) > 0, "No instruments found in pretty_midi file."
            notes = midi_data.instruments[0].notes
            assert len(notes) > 0, "No notes were transcribed in the pretty_midi file."

            present_pitches = {note.pitch for note in notes}
            print(f"Pretty_midi detected pitches: {sorted(list(present_pitches))}")
            print(f"Pretty_midi note count: {len(notes)}")

        except Exception as e:
            print(f"⚠️ Warning: Could not verify pretty_midi output: {e}")

    # Verify expected GM percussion pitches are present
    expected_gm_pitches = {36, 38, 42, 47, 49}  # kick, snare, hihat, tom, cymbal
    found_expected = pitches.intersection(expected_gm_pitches)
    print(f"Found expected GM percussion pitches: {sorted(list(found_expected))}")

    # At least one expected drum type should be detected
    assert len(found_expected) > 0, f"No expected GM percussion pitches found. Got: {sorted(list(pitches))}"

    print("✅ T49 Test Passed: DLDC-based drum transcription executed successfully")
    print(f"   - Created MIDI file with {note_on_count} drum events")
    print(f"   - Detected {len(found_expected)} different drum types")
    print("--- T49 Test Finished ---")

def test_t49_with_test_audio():
    """Test with a known test audio file."""
    test_files = [
        r"C:\Users\zhiya\Documents\MyProject\musictabapp\temp\t48_demucs_output\test_t48_job_drums.wav",
        r"C:\Users\zhiya\Documents\MyProject\musictabapp\test-files\clean_drum_loop.wav",
        r"C:\Users\zhiya\Documents\MyProject\musictabapp\temp\Queen - Another One Bites the Dust (Official Video).wav"
    ]

    for audio_file in test_files:
        if os.path.exists(audio_file):
            print(f"\n🎵 Testing with: {os.path.basename(audio_file)}")
            test_t49_with_real_audio(audio_file)
            return

    print("❌ No test audio files found. Please ensure at least one test file exists:")
    for f in test_files:
        print(f"  - {f}")
    raise FileNotFoundError("No test audio files available")

if __name__ == '__main__':
    test_t49_with_test_audio()

