import pretty_midi
import numpy as np
import os

# GM Percussion Map from task.md
GM_PERC_MAP = {
    'kick': 36,
    'snare': 38,
    'hihat_closed': 42,
    'hihat_open': 46,
    'hihat_pedal': 44,
    'crash': 49,
    'ride': 51,
}

def quantize_to_grid(time, grid_resolution, tempo):
    """Quantizes a time value to the nearest grid line."""
    beats_per_second = tempo / 60.0
    seconds_per_beat = 1.0 / beats_per_second
    # grid_resolution is like 16 for 1/16th notes
    seconds_per_grid = seconds_per_beat / (grid_resolution / 4.0)
    return round(time / seconds_per_grid) * seconds_per_grid

def standardize_drum_midi(input_midi_path: str, output_midi_path: str, grid: str = '1/16'):
    """
    Standardizes a raw drum MIDI file by applying quantization, merging notes,
    and applying velocity rules.

    Args:
        input_midi_path (str): Path to the raw input MIDI file.
        output_midi_path (str): Path to save the standardized MIDI file.
        grid (str): The quantization grid, e.g., '1/16' or '1/12'.
    """
    print(f"Standardizing MIDI: {input_midi_path}")

    # 1. Load MIDI
    try:
        midi_data = pretty_midi.PrettyMIDI(input_midi_path)
    except Exception as e:
        print(f"Error loading MIDI file {input_midi_path}: {e}")
        return

    if not midi_data.instruments or not midi_data.instruments[0].is_drum:
        print("Error: MIDI file does not contain a valid drum track.")
        return

    drum_track = midi_data.instruments[0]

    # 2. Get tempo
    try:
        tempo = midi_data.get_tempo_changes()[1][0]
    except IndexError:
        print("No tempo found, using default 120 BPM.")
        tempo = 120.0
    
    grid_resolution = int(grid.split('/')[1])

    # 3. Apply standardization rules
    quantized_events = {}

    for note in drum_track.notes:
        # Rule 1: Quantize start time
        quantized_start = quantize_to_grid(note.start, grid_resolution, tempo)

        # Rule 4: Handle ghost notes and remove glitches
        if note.end - note.start < 0.025: # remove glitches < 25ms
            continue
        if note.velocity < 40:
            note.velocity = max(25, note.velocity)
        
        # Rule 2 & 3: Group notes by quantized time for merging
        if quantized_start not in quantized_events:
            quantized_events[quantized_start] = []
        
        if not any(n.pitch == note.pitch for n in quantized_events[quantized_start]):
             quantized_events[quantized_start].append(note)

    # Reconstruct notes from the grouped events
    standardized_notes = []
    for start_time, notes_at_time in sorted(quantized_events.items()):
        for note in notes_at_time:
            new_note = pretty_midi.Note(
                velocity=note.velocity,
                pitch=note.pitch,
                start=start_time,
                end=start_time + 0.1 # Use a fixed, short duration
            )
            standardized_notes.append(new_note)

    # 4. Create new MIDI file
    standardized_midi = pretty_midi.PrettyMIDI()
    standardized_drum_track = pretty_midi.Instrument(program=0, is_drum=True, name="Standardized Drums")
    standardized_drum_track.notes.extend(standardized_notes)
    standardized_midi.instruments.append(standardized_drum_track)

    os.makedirs(os.path.dirname(output_midi_path), exist_ok=True)
    standardized_midi.write(output_midi_path)
    print(f"Standardized MIDI saved to {output_midi_path}")
