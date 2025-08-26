import pretty_midi
import os
import numpy as np
from midi_standardizer import standardize_drum_midi

def test_t50_midi_standardization():
    """Tests the T50 MIDI standardization process."""
    print("\n--- Running T50 Test: MIDI Standardization ---")
    # --- Setup ---
    input_midi_path = "output/t49_real_audio_drums_raw.mid"
    output_midi_path = "output/t50_drums_standard.mid"
    
    assert os.path.exists(input_midi_path), f"Input MIDI file for T50 test not found at: {input_midi_path}"

    # --- Run Standardization ---
    standardize_drum_midi(input_midi_path, output_midi_path, grid='1/16')

    # --- Verification ---
    assert os.path.exists(output_midi_path), "Standardized MIDI file was not created."
    
    midi_data = pretty_midi.PrettyMIDI(output_midi_path)
    assert len(midi_data.instruments) > 0, "No instruments found in standardized MIDI."
    
    notes = midi_data.instruments[0].notes
    assert len(notes) > 0, "No notes found in standardized MIDI."

    # Verify quantization
    try:
        tempo = midi_data.get_tempo_changes()[1][0]
    except IndexError:
        tempo = 120.0
    
    grid_resolution = 16
    beats_per_second = tempo / 60.0
    seconds_per_beat = 1.0 / beats_per_second
    seconds_per_grid = seconds_per_beat / (grid_resolution / 4.0)

    for note in notes:
        # Check if the note's start time is very close to a grid line
        remainder = note.start % seconds_per_grid
        # Allow for a small floating point tolerance
        assert np.isclose(remainder, 0) or np.isclose(remainder, seconds_per_grid), \
            f"Note at {note.start}s is not quantized to a 1/16 grid. Remainder: {remainder}"

    print(f"✅ T50 Test Passed: MIDI standardization complete and quantization verified.")
    print("--- T50 Test Finished ---")

if __name__ == '__main__':
    test_t50_midi_standardization()
