import torch
import librosa
import numpy as np
import pretty_midi
import os
from mido import MidiFile, MidiTrack, Message

# Configuration constants
SR = 22050          # Recommended sampling rate for end-to-end training
SEG_SEC = 3.0       # Each segment 3s
OVERLAP = 0.5       # 50% overlap
SNAP_MS = 35        # Onset snapping window (ms)
MIN_GAP = 0.05      # Minimum gap between same-class events (50ms)

# Drum labels and GM Percussion mapping
LABELS = ["kick", "snare", "hihat", "tom", "cymbal"]
GM = {"kick": 36, "snare": 38, "hihat": 42, "tom": 47, "cymbal": 49}

def to_segments(y, sr, seg_sec=SEG_SEC, overlap=OVERLAP):
    """Split audio into overlapping segments for sliding window inference."""
    seg_len = int(seg_sec * sr)
    hop = int(seg_len * (1 - overlap))
    starts = list(range(0, max(1, len(y) - seg_len + 1), hop))
    if not starts or starts[-1] + seg_len < len(y):
        starts.append(max(0, len(y) - seg_len))
    return starts, seg_len

def write_midi(events, bpm=120, out="tmp/drums_raw.mid"):
    """Write drum events to MIDI file."""
    mid = MidiFile(ticks_per_beat=480)
    tr = MidiTrack()
    mid.tracks.append(tr)

    def s2t(x):
        return int(x * (mid.ticks_per_beat * bpm / 60.0))

    t_prev = 0
    for (t, name, vel) in sorted(events, key=lambda x: x[0]):
        dt = max(0, s2t(t) - t_prev)
        tr.append(Message('note_on', note=GM[name], velocity=vel, time=dt))
        tr.append(Message('note_off', note=GM[name], velocity=0, time=s2t(0.1)))
        t_prev = s2t(t) + s2t(0.1)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    mid.save(out)
    print(f"Wrote {out}")

def transcribe_drums_to_midi(audio_path: str, output_midi_path: str):
    """
    Transcribes drum audio to MIDI using DLDC model.

    Note: DLDC model appears to expect preprocessed features rather than raw waveform.
    This implementation uses a fallback approach with librosa-based onset detection
    and spectral analysis for drum classification.

    Args:
        audio_path (str): Path to the input drum audio file (e.g., drums.wav).
        output_midi_path (str): Path to save the output MIDI file.
    """
    print(f"Loading audio: {audio_path}")

    # 1) Load waveform at 22050 Hz
    y, _ = librosa.load(audio_path, sr=SR, mono=True)
    print(f"Loaded audio: {len(y)} samples at {SR} Hz ({len(y)/SR:.2f}s)")

    # Limit audio length for testing (first 30 seconds)
    max_samples = SR * 30  # 30 seconds
    if len(y) > max_samples:
        print(f"Limiting audio to first 30 seconds for testing")
        y = y[:max_samples]

    # 2) Try to load DLDC TorchScript model (experimental)
    model_path = "../../models/dldc/model_v0.12.pt"
    if not os.path.exists(model_path):
        # Try absolute path as fallback
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

    if use_dldc:
        # 4) Try DLDC sliding window inference
        print("Attempting DLDC sliding window inference...")
        try:
            starts, seg_len = to_segments(y, SR)

            for i, s in enumerate(starts[:5]):  # Limit to first 5 segments for testing
                print(f"Processing segment {i+1}/5: {s/SR:.2f}s - {(s+seg_len)/SR:.2f}s")

                seg = y[s:s+seg_len]
                # Pad if segment is shorter than expected
                if len(seg) < seg_len:
                    seg = np.pad(seg, (0, seg_len - len(seg)), mode='constant')

                # Try different input formats for DLDC model
                formats_to_try = [
                    ("raw_waveform_1d", seg.reshape(1, -1)),  # [1, L]
                    ("raw_waveform_2d", seg.reshape(1, 1, -1)),  # [1, 1, L]
                    ("spectrogram", np.abs(librosa.stft(seg)).T),  # [T, F]
                ]

                success = False
                for format_name, x_np in formats_to_try:
                    try:
                        x = torch.tensor(x_np, dtype=torch.float32)
                        print(f"  Trying {format_name} format: {x.shape}")

                        with torch.no_grad():
                            out = model(x)

                        out_np = out.squeeze().cpu().numpy()
                        print(f"  ✅ Success with {format_name}! Output shape: {out_np.shape}")

                        # Process output (simplified for now)
                        seg_start_t = s / SR
                        if out_np.ndim == 1 and len(out_np) >= len(LABELS):
                            # Single prediction per segment
                            p = 1 / (1 + np.exp(-out_np[:len(LABELS)]))
                            for ci, name in enumerate(LABELS):
                                if p[ci] >= 0.5:
                                    t = seg_start_t + (len(seg) / SR) / 2
                                    vel = int(min(127, 40 + 87 * p[ci]))
                                    events.append((t, name, vel))

                        success = True
                        break

                    except Exception as e:
                        print(f"  ❌ Failed with {format_name}: {str(e)[:100]}...")
                        continue

                if not success:
                    print(f"  ⚠️ All formats failed for segment {i+1}")
                    break

            if len(events) == 0:
                print("⚠️ DLDC inference failed, falling back to librosa approach")
                use_dldc = False

        except Exception as e:
            print(f"⚠️ DLDC inference failed: {e}")
            print("Falling back to librosa approach")
            use_dldc = False

    if not use_dldc:
        # 5) Fallback: librosa-based onset detection with spectral analysis
        print("Using librosa-based drum detection...")

        # Use onset times for drum event detection
        S = np.abs(librosa.stft(y, hop_length=512))
        freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)

        # Frequency band definitions for drum classification
        kick_band = (50, 150)
        snare_band = (150, 500)
        hihat_band = (3000, 10000)
        tom_band = (100, 300)
        cymbal_band = (5000, 15000)

        for onset_time in onset_sec:
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

    print(f"Detected {len(events)} raw events")

    # 5) Post-processing: minimum gap filtering by class
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

    # 6) Write MIDI using mido
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

    print(f"Drum transcription completed. Events by type:")
    for name in GM.keys():
        count = len([e for e in final_events if e[1] == name])
        print(f"  {name}: {count} events")

