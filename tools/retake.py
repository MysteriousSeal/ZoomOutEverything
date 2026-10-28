"""Try fresh takes of flagged phrases and keep the best one per phrase.

  tools/stt-venv/bin/python -I tools/retake.py ZoomOut/episodes/<slug> 5.1 2.0 … [--seeds 3,7,11,19]

For each seed it writes voice.retake {"line.phrase": seed} into episode.json, re-runs engine/py/voice.py
(only the retaken phrases call ElevenLabs; the rest come from .tts_cache), then scores every target phrase:
words must match the spoken text (isolated STT) and the ending must not rise. The best seed per phrase is
written back to episode.json and the voice is rebuilt with it. Costs a few hundred credits per phrase.
"""
import json, re, subprocess, sys
import numpy as np, librosa
from faster_whisper import WhisperModel

ROOT = __file__.rsplit("/tools/", 1)[0]
d = sys.argv[1]
keys = [a for a in sys.argv[2:] if re.fullmatch(r"\d+\.\d+", a)]
seeds = [int(s) for s in (sys.argv[sys.argv.index("--seeds") + 1].split(",") if "--seeds" in sys.argv else "3,7,11,19".split(","))]
ep_path = d + "/episode.json"
model = WhisperModel("small.en", device="cpu", compute_type="int8")
words = lambda s: re.sub(r"[^a-z0-9 ]", "", re.sub(r"\{([^~}]*)~([^}]*)\}", r"\2", s).lower().replace("-", " ")).split()


def spoken(key):
    li, pi = map(int, key.split("."))
    return [p.strip() for p in json.load(open(ep_path))["lines"][li].split("|")][pi]


def run(retake):
    ep = json.load(open(ep_path))
    ep["voice"]["retake"] = retake
    json.dump(ep, open(ep_path, "w"), indent=1, ensure_ascii=False)
    open(ep_path, "a").write("\n")
    subprocess.run([ROOT + "/TheShortAnswer/.venv/bin/python", ROOT + "/engine/py/voice.py", d], check=True, capture_output=True)


def score(key):
    li, pi = map(int, key.split("."))
    p = json.load(open(d + "/build/timeline.json"))["lines"][li]["phrases"][pi]
    y, sr = librosa.load(d + "/build/vo.wav", sr=16000, offset=max(0, p["start"] - 0.1), duration=p["end"] - p["start"] + 0.2)
    text = " ".join(s.text for s in model.transcribe(y.astype(np.float32), beam_size=5)[0])
    want, got = words(spoken(key)), words(text)
    num = {"1": "one", "2": "two", "3": "three", "4": "four"}   # whisper writes small numbers as digits
    got = [num.get(w, w) for w in got]
    got = [w.replace("meters", "metres").replace("recognized", "recognised") for w in got]   # US vs UK spelling
    miss = len(set(want) - set(got))
    f0 = librosa.pyin(y, fmin=110, fmax=500, sr=sr)[0]
    f = f0[~np.isnan(f0)]
    rise = 12 * np.log2(np.median(f[-5:]) / np.median(f[-20:-10])) if len(f) >= 20 else 0.0
    if spoken(key).rstrip().endswith("?"):
        rise = 0.0
    return miss * 10 + max(0.0, rise), miss, rise, text


base = json.load(open(ep_path))["voice"].get("retake", {})
best = {k: (score(k), base.get(k)) for k in keys}
print("current:", {k: (round(v[0][2], 1), v[0][1]) for k, v in best.items()})
for s in seeds:
    run({**base, **{k: s for k in keys}})
    for k in keys:
        sc = score(k)
        print(f"seed {s} {k}: miss {sc[1]} end {sc[2]:+.1f} st | {sc[3].strip()}")
        if sc[0] < best[k][0][0]:
            best[k] = (sc, s)
final = {**base, **{k: v[1] for k, v in best.items() if v[1] is not None}}
final = {k: v for k, v in final.items() if v is not None}
run(final)
print("chosen:", final)
