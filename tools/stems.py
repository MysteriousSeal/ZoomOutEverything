import sys, os, json, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "engine", "py"))
import audio as A
from scipy.io import wavfile
ep_dir = sys.argv[1]; out = sys.argv[2]
ep = json.load(open(os.path.join(ep_dir, "episode.json"))); b = os.path.join(ep_dir, "build")
tl = json.load(open(os.path.join(b, "timeline.json"))); cues = json.load(open(os.path.join(b, "cues.json")))
n = int(tl["total"] * A.SR)
vo = wavfile.read(os.path.join(b, "vo.wav"))[1].astype(np.float32) / 32768
vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
sfx = np.zeros(n)
for q in cues:
    if q["name"] not in A.SFX: continue
    x = A.SFX[q["name"]](q.get("pitch", 1.0)) * q.get("gain", 0.4); i = int(q["t"] * A.SR)
    if 0 <= i < n: sfx[i:i + len(x)] += x[: n - i]
sfx = A.reverb(np.stack([sfx, sfx], axis=1), 0.6) * 0.7
v = A.reverb(np.stack([vo, vo], axis=1), 0.08)
for name, s in (("vo", v), ("sfx", sfx)):
    wavfile.write(f"{out}_{name}.wav", A.SR, (np.clip(s, -1, 1) * 32767).astype(np.int16))
print(len(cues), "cues; sfx peak", round(float(np.abs(sfx).max()), 2), "vo peak", round(float(np.abs(v).max()), 2))
