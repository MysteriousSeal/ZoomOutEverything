"""Synthesize sound design + an ambient score, then mix with the voiceover.

Everything is generated from scratch with numpy (no samples, no licensing issues).
Output: build/mix.wav (48 kHz stereo), build/music.wav, build/sfx.wav.
"""
import json

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

from episode import SCENES

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


def reverb_ir(seconds=2.2, seed=3):
    r = np.random.default_rng(seed)
    t = T(seconds)
    ir = r.standard_normal((len(t), 2)) * np.exp(-t * 3.2)[:, None]
    return filt(ir.T, "lowpass", 6000).T * 0.03


IR = reverb_ir()


def reverb(stereo, wet):
    tail = np.stack([fftconvolve(stereo[:, ch], IR[:, ch])[: len(stereo)] for ch in range(2)], axis=1)
    return stereo + tail * wet


# ---------------------------------------------------------------- sound design

def impact(p=1.0):
    t = T(2.2)
    sub = osc(42 * p + 40 * p * np.exp(-t * 12)) * np.exp(-t * 2.2)
    body = filt(rng.standard_normal(len(t)), "lowpass", 300) * np.exp(-t * 9) * 3
    return norm(sub + body)


def whoosh(p=1.0, d=0.8):
    t = T(d)
    n = rng.standard_normal(len(t))
    m = t / d
    x = filt(n, "bandpass", [200 * p, 900 * p]) * (1 - m) + filt(n, "bandpass", [900 * p, 4500 * p]) * m
    return norm(x * np.sin(np.pi * m) ** 2)


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


def swell(p=1.0, d=1.6):
    t = T(d)
    n = filt(rng.standard_normal(len(t)), "bandpass", [400, 5000])
    tone = sum(np.sin(2 * np.pi * midi(m) * p * t) for m in (67, 72, 76)) * 0.15
    return norm((n * 0.6 + tone) * (t / d) ** 2 * np.minimum(1, (d - t) / 0.15))


def riser(p=1.0, d=1.0):
    t = T(d)
    m = t / d
    tone = osc(200 * p + 900 * p * m ** 2) * 0.4
    n = filt(rng.standard_normal(len(t)), "highpass", 2000) * 0.5
    return norm((tone + n) * m ** 2.5)


def bloom(p=1.0):
    t = T(3.5)
    x = sum(np.sin(2 * np.pi * midi(m) * p * t) * np.exp(-t * (0.9 + k * 0.2))
            for k, m in enumerate([53, 60, 64, 69, 72]))
    return norm(x * np.minimum(1, t / 0.08))


SFX = {f.__name__: f for f in [impact, whoosh, shimmer, blip, tick, ping, swell, riser, bloom]}


# ---------------------------------------------------------------- score

def pad_voice(f, d, attack=1.2, release=1.5):
    t = T(d + release)
    x = sum(np.sin(2 * np.pi * f * det * t + ph) for det, ph in ((0.997, 0), (1.0, 1.3), (1.003, 2.1)))
    x += 0.3 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / attack) * np.where(t < d, 1, np.exp(-(t - d) * 3 / release))
    return x * env


def music(total):
    bar = 2.6
    chords = [[41, 57, 60, 64, 69], [36, 55, 59, 64, 67], [45, 57, 60, 64, 67], [43, 55, 59, 62, 69]]  # Fmaj9 Cmaj7 Am7 G6/9
    n = int((total + 4) * SR)
    left, right = np.zeros(n), np.zeros(n)
    k = 0
    while k * bar < total + 1:
        chord = chords[k % 4]
        i = int(k * bar * SR)
        for j, m in enumerate(chord):
            x = pad_voice(midi(m), bar, attack=0.9) * (0.5 if j == 0 else 0.22)
            pan = 0.5 if j == 0 else (0.3 if j % 2 else 0.7)
            seg = slice(i, min(n, i + len(x)))
            left[seg] += x[: seg.stop - i] * (1 - pan)
            right[seg] += x[: seg.stop - i] * pan
        for s in range(8):  # soft pulse of eighth notes
            m = chord[1 + (s * 3) % 4] + 12
            note = np.sin(2 * np.pi * midi(m) * T(0.5)) * np.exp(-T(0.5) * 9) * 0.25
            st = i + int(s * bar / 8 * SR)
            seg = slice(st, min(n, st + len(note)))
            pan = 0.35 if s % 2 else 0.65
            left[seg] += note[: seg.stop - st] * (1 - pan)
            right[seg] += note[: seg.stop - st] * pan
        k += 1
    m = np.stack([filt(left, "lowpass", 3500), filt(right, "lowpass", 3500)], axis=1)[: int(total * SR)]
    m = reverb(m, 0.8)
    fade_in = np.minimum(1, np.arange(len(m)) / (0.6 * SR))
    fade_out = np.minimum(1, np.arange(len(m))[::-1] / (2.0 * SR))
    return m / np.max(np.abs(m)) * (fade_in * fade_out)[:, None]


def main():
    tl = json.load(open("build/timeline.json"))
    total = tl["total"]
    n = int(total * SR)
    vo = wavfile.read("build/vo.wav")[1].astype(np.float32) / 32768
    vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]

    sfx = np.zeros(n)
    for scene, sc in zip(SCENES, tl["scenes"]):
        for t, name, gain, pitch in scene.cues(sc["end"] - sc["start"]):
            x = SFX[name](pitch) * gain
            i = int((sc["start"] + t) * SR)
            if 0 <= i < n:
                sfx[i:i + len(x)] += x[: n - i]
    sfx = reverb(np.stack([sfx, sfx], axis=1), 0.6)

    active = np.zeros(n)
    for ln in tl["lines"]:
        active[int((ln["start"] - 0.05) * SR): int((ln["end"] + 0.1) * SR)] = 1
    win = np.hanning(int(0.3 * SR))
    duck = np.convolve(active, win / win.sum(), mode="same")
    bg = music(total) * (0.26 - 0.13 * duck)[:, None]

    vo_bus = reverb(np.stack([vo, vo], axis=1), 0.08)
    mix = bg + vo_bus + sfx * 0.7
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    wavfile.write("build/mix.wav", SR, (mix * 32767).astype(np.int16))
    wavfile.write("build/music.wav", SR, (bg / np.max(np.abs(bg)) * 0.9 * 32767).astype(np.int16))
    wavfile.write("build/sfx.wav", SR, (sfx / max(1, np.max(np.abs(sfx))) * 32767).astype(np.int16))
    print(f"mix: {total:.2f}s")


if __name__ == "__main__":
    main()
