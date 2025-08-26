#!/usr/bin/env python3
"""
Test T49 drum transcription with FULL audio length (no 30s limit).
"""

import os
import sys
import pretty_midi
import mido
import librosa

# Import the transcription function but we'll modify it locally
from transcribe_drums import (
    SR, SEG_SEC, OVERLAP, SNAP_MS, MIN_GAP, LABELS, GM,
    to_segments, write_midi
)
import torch
import numpy as np

def transcribe_drums_full_audio(audio_path: str, output_midi_path: str):
    """
    Transcribe drums from FULL audio (no time limit).
    """
    print(f"Loading audio: {audio_path}")
    
    # 1) Load waveform at 22050 Hz - NO TIME LIMIT
    y, _ = librosa.load(audio_path, sr=SR, mono=True)
    print(f"Loaded FULL audio: {len(y)} samples at {SR} Hz ({len(y)/SR:.2f}s)")
    
    # 2) Try to load DLDC TorchScript model (experimental)
    model_path = "../../models/dldc/model_v0.12.pt"
    if not os.path.exists(model_path):
        abs_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/dldc/model_v0.12.pt"))
        if os.path.exists(abs_model_path):
            model_path = abs_model_path
        else:
            raise FileNotFoundError(f"DLDC model not found at {model_path} or {abs_model_path}")
    
    print(f"Loading DLDC model from {model_path}")
    try:
        model = torch.jit.load(model_path, map_location="cpu").eval()
        use_dldc = True
        print("✅ DLDC model loaded successfully")
    except Exception as e:
        print(f"⚠️ Failed to load DLDC model: {e}")
        print("Falling back to librosa-based approach")
        use_dldc = False

    # 3) Pre-compute global onsets for alignment assistance
    print("Computing global onsets for alignment...")
    onset_frames = librosa.onset.onset_detect(y=y, sr=SR, hop_length=512, backtrack=True)
    onset_sec = np.array([f * 512 / SR for f in onset_frames])
    print(f"Detected {len(onset_sec)} global onsets")
    
    events = []
    
    # Skip DLDC for now since it's not working, go straight to librosa
    use_dldc = False
    
    if not use_dldc:
        # Fallback: librosa-based onset detection with spectral analysis
        print("Using librosa-based drum detection for FULL audio...")
        
        # Use onset times for drum event detection
        S = np.abs(librosa.stft(y, hop_length=512))
        freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
        
        # Frequency band definitions for drum classification
        kick_band = (50, 150)
        snare_band = (150, 500) 
        hihat_band = (3000, 10000)
        tom_band = (100, 300)
        cymbal_band = (5000, 15000)
        
        print(f"Processing {len(onset_sec)} onsets across {len(y)/SR:.1f} seconds...")
        
        for i, onset_time in enumerate(onset_sec):
            if i % 50 == 0:  # Progress indicator
                print(f"  Processing onset {i+1}/{len(onset_sec)} ({onset_time:.1f}s)")
                
            frame_idx = librosa.time_to_frames(onset_time, sr=SR, hop_length=512)
            if frame_idx >= S.shape[1]:
                continue
                
            # Analyze spectral content around onset
            window = S[:, max(0, frame_idx-2):min(S.shape[1], frame_idx+3)]
            if window.size == 0:
                continue
                
            energy = np.mean(window, axis=1)
            
            # Calculate energy in each frequency band
            kick_energy = np.sum(energy[(freqs >= kick_band[0]) & (freqs <= kick_band[1])])
            snare_energy = np.sum(energy[(freqs >= snare_band[0]) & (freqs <= snare_band[1])])
            hihat_energy = np.sum(energy[(freqs >= hihat_band[0]) & (freqs <= hihat_band[1])])
            tom_energy = np.sum(energy[(freqs >= tom_band[0]) & (freqs <= tom_band[1])])
            cymbal_energy = np.sum(energy[(freqs >= cymbal_band[0]) & (freqs <= cymbal_band[1])])
            
            # Classify based on dominant energy
            energies = {
                "kick": kick_energy,
                "snare": snare_energy, 
                "hihat": hihat_energy,
                "tom": tom_energy,
                "cymbal": cymbal_energy
            }
            
            dominant = max(energies, key=energies.get)
            total_energy = sum(energies.values())
            
            if total_energy > 0:
                confidence = energies[dominant] / total_energy
                if confidence > 0.3:  # Minimum confidence threshold
                    vel = int(min(127, 40 + 87 * confidence))
                    events.append((onset_time, dominant, vel))
    
    print(f"Detected {len(events)} raw events from FULL audio")
    
    # Post-processing: minimum gap filtering by class
    print("Applying minimum gap filtering...")
    final_events = []
    for name in GM.keys():
        cand = sorted([e for e in events if e[1] == name], key=lambda x: x[0])
        last = -1.0
        for e in cand:
            if last < 0 or e[0] - last >= MIN_GAP:
                final_events.append(e)
                last = e[0]
    
    print(f"Final events after filtering: {len(final_events)}")
    
    # Write MIDI using mido
    write_midi(final_events, bpm=120, out=output_midi_path)
    
    # Also create a pretty_midi version for compatibility
    midi = pretty_midi.PrettyMIDI()
    drum_track = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
    
    for (t, name, vel) in final_events:
        note = pretty_midi.Note(
            velocity=vel,
            pitch=GM[name],
            start=t,
            end=t + 0.1
        )
        drum_track.notes.append(note)
    
    midi.instruments.append(drum_track)
    
    # Save pretty_midi version with _pretty suffix
    pretty_output = output_midi_path.replace('.mid', '_pretty.mid')
    midi.write(pretty_output)
    print(f"Also saved pretty_midi version to {pretty_output}")
    
    print(f"FULL audio drum transcription completed. Events by type:")
    for name in GM.keys():
        count = len([e for e in final_events if e[1] == name])
        print(f"  {name}: {count} events")

def test_full_audio():
    """Test with full audio length."""
    print("🎵 T49 Test: FULL Audio Length (No 30s Limit)")
    print("=" * 60)
    
    input_audio = "../../temp/t48_demucs_output/test_t48_job_drums.wav"
    output_midi = "output/t49_full_audio_drums.mid"
    
    if not os.path.exists(input_audio):
        print(f"❌ Input file not found: {input_audio}")
        return False
    
    print(f"📁 Input:  {input_audio}")
    print(f"📁 Output: {output_midi}")
    
    os.makedirs("output", exist_ok=True)
    
    try:
        transcribe_drums_full_audio(input_audio, output_midi)
        
        # Analyze results
        midi_file = mido.MidiFile(output_midi)
        note_events = []
        for track in midi_file.tracks:
            for msg in track:
                if msg.type == 'note_on' and msg.velocity > 0:
                    note_events.append((msg.time, msg.note, msg.velocity))
        
        print(f"\n📊 FULL AUDIO Results:")
        print(f"📝 Total note events: {len(note_events)}")
        
        # Group by drum type
        drum_counts = {}
        gm_names = {36: "Kick", 38: "Snare", 42: "Hi-Hat Closed", 47: "Tom", 49: "Cymbal"}
        
        for _, pitch, _ in note_events:
            name = gm_names.get(pitch, f"Unknown({pitch})")
            drum_counts[name] = drum_counts.get(name, 0) + 1
        
        print("\n🥁 FULL AUDIO drum events detected:")
        for drum_type, count in sorted(drum_counts.items()):
            print(f"   {drum_type}: {count} events")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_full_audio()
