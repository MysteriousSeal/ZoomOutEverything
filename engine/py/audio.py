"""Sound design + score + mix for an engine episode.

  <venv>/python engine/py/audio.py <episodeDir>

Reads build/timeline.json, build/cues.json (from engine/node/cues.mjs), build/vo.wav and
episode.json "music" (preset name). Writes build/mix.wav (48 kHz stereo).
Every sound is synthesized with numpy: no samples, no licensing.
Cue format: {"t": seconds, "name": sfx name, "gain": 0..1, "pitch": 1.0}
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def T(d):
    return np.arange(int(d * SR)) / SR


def osc(freq):
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x)


def norm(x):
    n = np.arange(len(x))
    x = x * np.minimum(1, n / (0.004 * SR)) * np.minimum(1, n[::-1] / (0.03 * SR))
    return x / (np.max(np.abs(x)) + 1e-9)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def reverb_ir(seconds=2.6, seed=3):
    r = np.random.default_rng(seed)
    t = T(seconds)
    ir = r.standard_normal((len(t), 2)) * np.exp(-t * 2.8)[:, None]
    return filt(ir.T, "lowpass", 5000).T * 0.03


IR = reverb_ir()


def reverb(stereo, wet):
    tail = np.stack([fftconvolve(stereo[:, ch], IR[:, ch])[: len(stereo)] for ch in range(2)], axis=1)
    return stereo + tail * wet


# ---------------------------------------------------------------- sfx library

def impact(p=1.0):
    t = T(2.4)
    sub = osc(40 * p + 45 * p * np.exp(-t * 10)) * np.exp(-t * 1.8)
    body = filt(rng.standard_normal(len(t)), "lowpass", 260) * np.exp(-t * 8) * 3
    return norm(sub + body)


def deep(p=1.0):
    """Huge low boom for the reveal."""
    t = T(4.0)
    sub = osc(30 * p + 30 * p * np.exp(-t * 4)) * np.exp(-t * 0.9)
    rumble = filt(rng.standard_normal(len(t)), "lowpass", 120) * np.exp(-t * 1.5) * 2
    return norm(sub + rumble)


def whoosh(p=1.0, d=0.8):
    t = T(d)
    n = rng.standard_normal(len(t))
    m = t / d
    x = filt(n, "bandpass", [200 * p, 900 * p]) * (1 - m) + filt(n, "bandpass", [900 * p, min(4500 * p, 20000)]) * m
    return norm(x * np.sin(np.pi * m) ** 2)


def swish(p=1.0):
    return whoosh(p * 1.4, 0.35)


def dive(p=1.0, d=1.6):
    """Long descending underwater whoosh for camera travel."""
    t = T(d)
    m = t / d
    n = rng.standard_normal(len(t))
    lo = filt(n, "lowpass", 500 * p) * 1.5
    hi = filt(n, "bandpass", [300 * p, 1600 * p])
    return norm((lo * m + hi * (1 - m)) * np.sin(np.pi * m) ** 1.5)


def shimmer(p=1.0):
    out = np.zeros(int(1.6 * SR))
    for _ in range(14):
        t = T(1.0)
        f = midi(rng.choice([84, 86, 88, 91, 93, 96])) * p
        ping = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) * np.minimum(1, t / 0.01)
        i = int(rng.uniform(0, 0.5) * SR)
        out[i:i + len(ping)] += ping * rng.uniform(0.3, 1)
    return norm(out)


def blip(p=1.0):
    t = T(0.09)
    return norm(np.sin(2 * np.pi * 1400 * p * t) * np.exp(-t * 60))


def tick(p=1.0):
    t = T(0.05)
    return norm(filt(rng.standard_normal(len(t)), "bandpass", [2500 * p, 7000]) * np.exp(-t * 120))


def ping(p=1.0):
    t = T(1.4)
    f = 1046 * p
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t * 4)
    return norm(x * np.exp(-t * 3.5) * np.minimum(1, t / 0.003))


def sonar(p=1.0):
    t = T(2.6)
    x = np.sin(2 * np.pi * 1250 * p * t) * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)
    echo = np.zeros_like(x)
    d = int(0.55 * SR)
    echo[d:] = x[:-d] * 0.35
    return norm(x + echo)


def bubbles(p=1.0, d=1.2):
    out = np.zeros(int(d * SR))
    for _ in range(int(d * 22)):
        t = T(0.06)
        f0 = rng.uniform(300, 900) * p
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * t / 0.06)) / SR) * np.exp(-t * 60)
        i = int(rng.uniform(0, d - 0.07) * SR)
        out[i:i + len(b)] += b * rng.uniform(0.2, 1)
    return norm(out)


def whale(p=1.0, d=2.4):
    """Low tonal moan with a slow pitch bend."""
    t = T(d)
    f = (110 + 70 * np.sin(np.pi * t / d) - 30 * t / d) * p
    x = osc(f) + 0.4 * osc(2 * f) + 0.2 * osc(3.01 * f)
    env = np.sin(np.pi * t / d) ** 1.3
    return norm(filt(x * env, "lowpass", 900))


def creak(p=1.0, d=1.6):
    """Metal groan (Titanic)."""
    t = T(d)
    f = (55 + 25 * np.sin(2 * np.pi * 0.6 * t)) * p
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    x = filt(saw, "bandpass", [80, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return norm(x * np.sin(np.pi * t / d))


def riser(p=1.0, d=1.2):
    t = T(d)
    m = t / d
    tone = osc(200 * p + 900 * p * m ** 2) * 0.4
    n = filt(rng.standard_normal(len(t)), "highpass", 2000) * 0.5
    return norm((tone + n) * m ** 2.5)


def swell(p=1.0, d=1.6):
    t = T(d)
    n = filt(rng.standard_normal(len(t)), "bandpass", [400, 5000])
    tone = sum(np.sin(2 * np.pi * midi(m) * p * t) for m in (67, 72, 76)) * 0.15
    return norm((n * 0.6 + tone) * (t / d) ** 2 * np.minimum(1, (d - t) / 0.15))


def bloom(p=1.0):
    t = T(3.5)
    x = sum(np.sin(2 * np.pi * midi(m) * p * t) * np.exp(-t * (0.9 + k * 0.2)) for k, m in enumerate([53, 60, 64, 69, 72]))
    return norm(x * np.minimum(1, t / 0.08))


def count(p=1.0, d=0.9):
    out = np.zeros(int(d * SR))
    k, tt = 0, 0.0
    while tt < d - 0.05:
        b = blip(p * (1 + k * 0.03))[: int(0.03 * SR)]
        i = int(tt * SR)
        out[i:i + len(b)] += b
        tt += 0.02 + 0.06 * (tt / d) ** 2
        k += 1
    return norm(out)


def splash(p=1.0):
    t = T(1.2)
    n = filt(rng.standard_normal(len(t)), "bandpass", [400 * p, 6000]) * np.exp(-t * 4)
    return norm(n + bubbles(p, 1.2)[: len(t)] * 0.6)


SFX = {f.__name__: f for f in [impact, deep, whoosh, swish, dive, shimmer, blip, tick, ping, sonar, bubbles, whale,
                               creak, riser, swell, bloom, count, splash]}


# ---------------------------------------------------------------- score presets

PRESETS = {
    # dark, slow, wide: minor-ish pads + sub pulse
    "deep": {"bar": 3.2, "lp": 2200, "pulse": 0.10,
             "chords": [[38, 53, 57, 60, 64], [34, 50, 53, 57, 62], [41, 53, 57, 60, 65], [36, 52, 55, 59, 62]]},
    # long-form space: slow, wide, 8-chord progression so 5 minutes never loops audibly
    "vast": {"bar": 4.2, "lp": 2600, "pulse": 0.08,
             "chords": [[38, 53, 57, 60, 64], [34, 50, 53, 57, 62], [41, 53, 57, 60, 65], [36, 52, 55, 59, 62],
                        [33, 52, 57, 60, 64], [38, 50, 57, 62, 65], [43, 55, 58, 62, 67], [36, 55, 60, 64, 67]]},
    # brighter documentary
    "bright": {"bar": 2.6, "lp": 3500, "pulse": 0.25,
               "chords": [[41, 57, 60, 64, 69], [36, 55, 59, 64, 67], [45, 57, 60, 64, 67], [43, 55, 59, 62, 69]]},
}


def pad_voice(f, d, attack=1.2, release=1.8):
    t = T(d + release)
    x = sum(np.sin(2 * np.pi * f * det * t + ph) for det, ph in ((0.997, 0), (1.0, 1.3), (1.003, 2.1)))
    x += 0.3 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / attack) * np.where(t < d, 1, np.exp(-(t - d) * 3 / release))
    return x * env


def music(total, preset):
    P = PRESETS[preset]
    bar, chords = P["bar"], P["chords"]
    n = int((total + 5) * SR)
    left, right = np.zeros(n), np.zeros(n)
    k = 0
    while k * bar < total + 1:
        chord = chords[k % len(chords)]
        i = int(k * bar * SR)
        for j, m in enumerate(chord):
            x = pad_voice(midi(m), bar, attack=1.0) * (0.55 if j == 0 else 0.2)
            pan = 0.5 if j == 0 else (0.3 if j % 2 else 0.7)
            seg = slice(i, min(n, i + len(x)))
            left[seg] += x[: seg.stop - i] * (1 - pan)
            right[seg] += x[: seg.stop - i] * pan
        for s in range(8):
            m = chord[1 + (s * 3) % 4] + 12
            note = np.sin(2 * np.pi * midi(m) * T(0.6)) * np.exp(-T(0.6) * 7) * P["pulse"]
            st = i + int(s * bar / 8 * SR)
            seg = slice(st, min(n, st + len(note)))
            pan = 0.35 if s % 2 else 0.65
            left[seg] += note[: seg.stop - st] * (1 - pan)
            right[seg] += note[: seg.stop - st] * pan
        k += 1
    m = np.stack([filt(left, "lowpass", P["lp"]), filt(right, "lowpass", P["lp"])], axis=1)[: int(total * SR)]
    m = reverb(m, 0.9)
    fade_in = np.minimum(1, np.arange(len(m)) / (0.8 * SR))
    fade_out = np.minimum(1, np.arange(len(m))[::-1] / (2.0 * SR))
    return m / np.max(np.abs(m)) * (fade_in * fade_out)[:, None]


def main(ep_dir):
    ep = json.load(open(os.path.join(ep_dir, "episode.json")))
    b = os.path.join(ep_dir, "build")
    tl = json.load(open(os.path.join(b, "timeline.json")))
    cues = json.load(open(os.path.join(b, "cues.json"))) if os.path.exists(os.path.join(b, "cues.json")) else []
    total = tl["total"]
    n = int(total * SR)
    vo = wavfile.read(os.path.join(b, "vo.wav"))[1].astype(np.float32) / 32768
    vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]

    sfx = np.zeros(n)
    unknown = set()
    for q in cues:
        if q["name"] not in SFX:
            unknown.add(q["name"])
            continue
        x = SFX[q["name"]](q.get("pitch", 1.0)) * q.get("gain", 0.4)
        i = int(q["t"] * SR)
        if 0 <= i < n:
            sfx[i:i + len(x)] += x[: n - i]
    if unknown:
        print(f"warning: unknown sfx {sorted(unknown)}; available: {sorted(SFX)}")
    sfx = np.tanh(sfx / 0.6) * 0.6  # tame stacked hits
    sfx = reverb(np.stack([sfx, sfx], axis=1), 0.6)

    active = np.zeros(n)
    for ln in tl["lines"]:
        active[int((ln["start"] - 0.05) * SR): int((ln["end"] + 0.1) * SR)] = 1
    win = np.hanning(int(0.3 * SR))
    duck = np.convolve(active, win / win.sum(), mode="same")
    bg = music(total, ep.get("music", "deep")) * (0.28 - 0.14 * duck)[:, None]

    mix = bg + reverb(np.stack([vo, vo], axis=1), 0.08) + sfx * (0.45 - 0.2 * duck)[:, None]
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    wavfile.write(os.path.join(b, "mix.wav"), SR, (mix * 32767).astype(np.int16))
    print(f"mix: {total:.2f}s, {len(cues)} cues")


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "."))
