"""Generate the voiceover and the master timeline (build/vo.wav, build/timeline.json).

Uses Kokoro, an open-source neural TTS (Apache-2.0, runs offline). Options:
  VOICE=am_michael SPEED=1.0 ./build.sh       (voice auditions are in build/auditions/)
or drop your own recordings in voice_override/line1.wav ... line7.wav.
"""
import json
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

from episode import LINES

SR = 48000
VOICE = os.environ.get("VOICE", "af_heart")
SPEED = float(os.environ.get("SPEED", "1.0"))
MODELS = os.path.join(os.path.dirname(__file__), "..", "..", "models")
LEAD, LINE_GAP, TAIL = 0.3, 0.3, 1.6


def to_48k(a, sr):
    a = a.astype(np.float32)
    if a.ndim > 1:
        a = a.mean(axis=1)
    return resample_poly(a, SR, sr).astype(np.float32) if sr != SR else a


def load_override(path):
    sr, a = wavfile.read(path)
    if a.dtype.kind == "i":
        a = a / np.iinfo(a.dtype).max
    return to_48k(a, sr)


def trim(a, thr=0.006):
    idx = np.flatnonzero(np.abs(a) > thr)
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - int(0.01 * SR)): idx[-1] + int(0.06 * SR)]


def main():
    os.makedirs("build", exist_ok=True)
    tts = None
    t, segments, lines = LEAD, [], []
    for li, text in enumerate(LINES, 1):
        override = f"voice_override/line{li}.wav"
        if os.path.exists(override):
            a = load_override(override)
        else:
            if tts is None:
                from kokoro_onnx import Kokoro
                tts = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
            samples, sr = tts.create(text, voice=VOICE, speed=SPEED, lang="en-gb" if VOICE[0] == "b" else "en-us")
            a = to_48k(samples, sr)
        a = trim(a)
        a /= max(1e-6, np.max(np.abs(a))) / 0.9
        segments.append((t, a))
        lines.append({"text": text, "start": t, "end": t + len(a) / SR})
        t += len(a) / SR + LINE_GAP
    total = lines[-1]["end"] + TAIL

    starts = [0.0] + [ln["start"] - 0.15 for ln in lines[1:]]
    scenes = [{"start": s, "end": e} for s, e in zip(starts, starts[1:] + [total])]

    vo = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for start, a in segments:
        i = int(start * SR)
        vo[i:i + len(a)] += a
    vo = vo[:int(total * SR)]
    wavfile.write("build/vo.wav", SR, (np.clip(vo, -1, 1) * 32767).astype(np.int16))
    with open("build/timeline.json", "w") as f:
        json.dump({"voice": VOICE, "total": total, "lines": lines, "scenes": scenes}, f, indent=2)
    print(f"voice={VOICE} total={total:.2f}s")
    for i, (ln, sc) in enumerate(zip(lines, scenes), 1):
        print(f"  scene {i}: {sc['start']:5.2f}-{sc['end']:5.2f}s  vo {ln['end'] - ln['start']:.2f}s")


if __name__ == "__main__":
    main()
