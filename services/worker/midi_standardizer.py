import pretty_midi
import numpy as np
import os
import mido
from collections import defaultdict

# GM Percussion Map - Comprehensive mapping for T50
GM_PERC_MAP = {
    # Core drums
    36: "Kick",           # Bass Drum 1
    38: "Snare",          # Acoustic Snare
    42: "Hi-Hat Closed",  # Closed Hi-Hat
    46: "Hi-Hat Open",    # Open Hi-Hat
    44: "Hi-Hat Pedal",   # Pedal Hi-Hat

    # Toms
    45: "Tom Low",        # Low Tom
    47: "Tom Mid",        # Low-Mid Tom
    48: "Tom High",       # Hi-Mid Tom
    50: "Tom High",       # High Tom

    # Cymbals
    49: "Crash",          # Crash Cymbal 1
    51: "Ride",           # Ride Cymbal 1
    52: "China",          # Chinese Cymbal
    57: "Crash",          # Crash Cymbal 2
}

# Reverse mapping for standardization
DRUM_TO_GM = {
    "kick": 36,
    "snare": 38,
    "hihat": 42,
    "tom": 47,
    "cymbal": 49
}

def quantize_to_grid(time_seconds, grid="1/16", tempo=120):
    """
    Quantize time to musical grid.

    Args:
        time_seconds: Time in seconds
        grid: Grid resolution ("1/16", "1/12" for swing)
        tempo: BPM

    Returns:
        Quantized time in seconds
    """
    beats_per_second = tempo / 60.0
    seconds_per_beat = 1.0 / beats_per_second

    if grid == "1/16":
        grid_divisions = 16
    elif grid == "1/12":
        grid_divisions = 12  # Swing/triplet feel
    elif grid == "1/8":
        grid_divisions = 8
    else:
        grid_divisions = 16  # Default to 1/16

    seconds_per_grid = seconds_per_beat / (grid_divisions / 4.0)
    quantized_beats = round(time_seconds / seconds_per_grid)
    return quantized_beats * seconds_per_grid

def normalize_gm_percussion(pitch):
    """
    Normalize pitch to standard GM Percussion mapping.

    Args:
        pitch: MIDI pitch number

    Returns:
        Standardized GM percussion pitch
    """
    # If already a standard GM percussion pitch, keep it
    if pitch in GM_PERC_MAP:
        return pitch

    # Map common variations to standard pitches
    pitch_mapping = {
        # Kick variations
        35: 36,  # Acoustic Bass Drum -> Bass Drum 1

        # Snare variations
        37: 38,  # Side Stick -> Acoustic Snare
        40: 38,  # Electric Snare -> Acoustic Snare

        # Hi-Hat variations
        43: 42,  # High Floor Tom -> Closed Hi-Hat (if misclassified)

        # Tom variations
        41: 45,  # Low Floor Tom -> Low Tom
        43: 47,  # High Floor Tom -> Low-Mid Tom

        # Cymbal variations
        53: 51,  # Ride Bell -> Ride Cymbal
        55: 49,  # Splash Cymbal -> Crash Cymbal
    }

    return pitch_mapping.get(pitch, pitch)

def standardize_drum_midi(input_midi_path: str, output_midi_path: str, grid: str = '1/16', tempo: float = 120):
    """
    Standardizes a raw drum MIDI file according to T50 requirements:
    1) Quantize to 1/16 grid (or 1/12 for swing)
    2) Parallel merge: same beat/tick multi-drums must be simultaneous (polyphonic)
    3) GM Percussion mapping: Kick=36, Snare=38, Hi-Hat Closed=42, etc.
    4) Ghost note: velocity < 40 -> 25-35; remove <25ms glitches

    Args:
        input_midi_path (str): Path to the raw input MIDI file.
        output_midi_path (str): Path to save the standardized MIDI file.
        grid (str): The quantization grid, e.g., '1/16' or '1/12'.
        tempo (float): BPM for quantization
    """
    print(f"🔧 T50 MIDI Standardization: {input_midi_path}")
    print(f"   Grid: {grid}, Tempo: {tempo} BPM")

    # 1. Load MIDI with both pretty_midi and mido for comprehensive handling
    try:
        midi_data = pretty_midi.PrettyMIDI(input_midi_path)
        mido_file = mido.MidiFile(input_midi_path)
    except Exception as e:
        print(f"❌ Error loading MIDI file {input_midi_path}: {e}")
        return

    if not midi_data.instruments:
        print("❌ Error: MIDI file contains no instruments.")
        return

    # Find drum track
    drum_track = None
    for instrument in midi_data.instruments:
        if instrument.is_drum:
            drum_track = instrument
            break

    if drum_track is None:
        print("⚠️ No drum track found, using first instrument")
        drum_track = midi_data.instruments[0]

    print(f"📊 Input: {len(drum_track.notes)} notes")

    # 2. Extract and process events
    raw_events = []
    for note in drum_track.notes:
        raw_events.append({
            'time': note.start,
            'pitch': note.pitch,
            'velocity': note.velocity,
            'duration': note.end - note.start
        })

    print(f"📝 Processing {len(raw_events)} raw events...")

    # 3. Apply T50 standardization rules
    processed_events = []

    for event in raw_events:
        # Rule 4: Remove glitches < 25ms
        if event['duration'] < 0.025:
            print(f"   🗑️ Removed glitch: {event['duration']*1000:.1f}ms duration")
            continue

        # Rule 1: Quantize to grid
        quantized_time = quantize_to_grid(event['time'], grid, tempo)

        # Rule 3: GM Percussion mapping
        standardized_pitch = normalize_gm_percussion(event['pitch'])

        # Rule 4: Ghost note handling
        velocity = event['velocity']
        if velocity < 40:
            # Ghost note: remap to 25-35 range
            velocity = int(25 + (velocity / 40.0) * 10)  # Scale 0-39 -> 25-35
            print(f"   👻 Ghost note: {event['velocity']} -> {velocity}")

        processed_events.append({
            'time': quantized_time,
            'pitch': standardized_pitch,
            'velocity': velocity,
            'original_time': event['time']
        })

    print(f"✅ Processed: {len(processed_events)} events after filtering")

    # 4. Rule 2: Parallel merge - group by quantized time for polyphonic playback
    time_groups = defaultdict(list)
    for event in processed_events:
        time_groups[event['time']].append(event)

    print(f"🎵 Grouped into {len(time_groups)} time slots for polyphonic merge")

    # 5. Create standardized MIDI
    standardized_midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)

    # Set time signature (4/4)
    time_sig = pretty_midi.TimeSignature(4, 4, 0)
    standardized_midi.time_signature_changes = [time_sig]

    # Create drum track
    standardized_drum_track = pretty_midi.Instrument(
        program=0,
        is_drum=True,
        name="Standardized Drums"
    )

    # Add notes with polyphonic grouping
    note_duration = 0.1  # Fixed short duration for drum hits

    for quantized_time, events_at_time in sorted(time_groups.items()):
        # Remove duplicates of same pitch at same time
        unique_events = {}
        for event in events_at_time:
            pitch = event['pitch']
            if pitch not in unique_events or event['velocity'] > unique_events[pitch]['velocity']:
                unique_events[pitch] = event

        # Add all unique drum hits at this time (polyphonic)
        for event in unique_events.values():
            note = pretty_midi.Note(
                velocity=event['velocity'],
                pitch=event['pitch'],
                start=quantized_time,
                end=quantized_time + note_duration
            )
            standardized_drum_track.notes.append(note)

    standardized_midi.instruments.append(standardized_drum_track)

    # 6. Save standardized MIDI
    os.makedirs(os.path.dirname(output_midi_path), exist_ok=True)
    standardized_midi.write(output_midi_path)

    print(f"💾 Standardized MIDI saved: {output_midi_path}")
    print(f"📊 Output: {len(standardized_drum_track.notes)} notes in {len(time_groups)} time slots")

    # 7. Summary statistics
    pitch_counts = defaultdict(int)
    for note in standardized_drum_track.notes:
        drum_name = GM_PERC_MAP.get(note.pitch, f"Unknown({note.pitch})")
        pitch_counts[drum_name] += 1

    print("🥁 Standardized drum events:")
    for drum_name, count in sorted(pitch_counts.items()):
        print(f"   {drum_name}: {count} events")

    return output_midi_path
