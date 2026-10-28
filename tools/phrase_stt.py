"""Transcribe single phrases of an episode in isolation: tools/stt-venv/bin/python -I tools/phrase_stt.py <ep dir> 5.1 0.0 …"""
import json, sys, numpy as np, librosa
from faster_whisper import WhisperModel
d = sys.argv[1]; t = json.load(open(d + "/build/timeline.json"))
y, sr = librosa.load(d + "/build/vo.wav", sr=16000)
m = WhisperModel("small.en", device="cpu", compute_type="int8")
for key in sys.argv[2:]:
    li, pi = map(int, key.split("."))
    p = t["lines"][li]["phrases"][pi]
    seg = y[max(0, int((p["start"] - 0.1) * sr)): int((p["end"] + 0.1) * sr)].astype(np.float32)
    segs, _ = m.transcribe(seg, beam_size=5)
    print(key, "|", p["text"], "|", " ".join(s.text.strip() for s in segs))
