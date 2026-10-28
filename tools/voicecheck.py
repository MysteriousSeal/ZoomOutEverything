"""Per-phrase voice check for an episode: leaked blips at phrase ends and statements that end rising.

  tools/stt-venv/bin/python -I tools/voicecheck.py ZoomOut/episodes/<slug>

For every phrase in build/timeline.json it prints the duration, whether the tail holds a gap followed by sound
(a blip of the next phrase), and the pitch change over the last voiced 0.25 s (semitones; a statement ending
+3 st or more can sound like a question). Re-take a flagged phrase with voice.retake {"line.phrase": seed}.
"""
import json
import sys

import librosa
import numpy as np

d = sys.argv[1]
t = json.load(open(d + "/build/timeline.json"))
y, sr = librosa.load(d + "/build/vo.wav", sr=16000)
for li, line in enumerate(t["lines"]):
    for pi, p in enumerate(line["phrases"]):
        seg = y[int(p["start"] * sr): int(p["end"] * sr)]
        win = int(0.02 * sr)
        db = 20 * np.log10(np.sqrt(np.mean(seg[: len(seg) // win * win].reshape(-1, win) ** 2, axis=1)) + 1e-9)
        tail = db[-40:]
        q = np.flatnonzero(tail < -42)
        blip = bool(len(q) >= 8 and (tail[q[0]:] > -32).any() and (tail[q[-1]:] > -32).any())
        f0, _, _ = librosa.pyin(seg, fmin=110, fmax=500, sr=sr)
        f = f0[~np.isnan(f0)]
        rise = 12 * np.log2(np.median(f[-5:]) / np.median(f[-20:-10])) if len(f) >= 20 else 0.0
        q_mark = p["text"].rstrip().endswith("?")
        flag = ("BLIP " if blip else "") + ("RISING " if rise >= 3 and not q_mark else "")
        print(f'{li}.{pi} {p["start"]:6.2f} {p["end"] - p["start"]:4.2f}s  end {rise:+5.1f} st  {flag:13s}| {p["text"][:52]}')
