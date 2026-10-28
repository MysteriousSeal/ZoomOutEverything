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


def chime(p=1.0):
    """Soft singing-bowl chime (ASMR): a few inharmonic partials, slow decay, gentle beating."""
    t = T(5.0)
    f = 523.25 * p
    x = sum(a * np.sin(2 * np.pi * f * r * t + ph) * np.exp(-t * dk)
            for r, a, dk, ph in ((1.0, 1.0, 0.7, 0), (1.004, 0.6, 0.75, 1.1), (2.76, 0.3, 1.6, 0.4), (5.40, 0.12, 3.0, 2.0)))
    return norm(x * np.minimum(1, t / 0.02))


def hush(p=1.0, d=2.4):
    """Airy breath-like swell (ASMR): dark filtered noise that rises and falls."""
    t = T(d)
    n = filt(rng.standard_normal(len(t)), "bandpass", [250 * p, 2600 * p])
    return norm(n * np.sin(np.pi * t / d) ** 2)


# ---------------------------------------------------------------- ASMR triggers (close, dry, detailed)

def _grains(d, rate, f_lo, f_hi, decay, seed, shape=None):
    """A granular texture: `rate` tiny filtered clicks per second over d seconds, with an optional amplitude shape."""
    r = np.random.default_rng(seed)
    n = int(d * SR)
    x = np.zeros(n)
    k = int(rate * d)
    idx = r.integers(0, max(1, n - 1), k)
    np.add.at(x, idx, r.standard_normal(k) * r.uniform(0.2, 1, k) ** 2)
    x = np.convolve(x, np.exp(-np.arange(int(decay * SR)) / (decay * SR / 4)), mode="full")[:n]
    x = filt(x, "bandpass", [f_lo, min(f_hi, SR / 2 - 1000)], order=2)
    if shape is not None:
        x *= shape(np.arange(n) / n)
    return x


def drop(p=1.0):
    """A raindrop on a window: a tiny click, a short glassy ring and a soft low knock."""
    t = T(0.35)
    click = filt(rng.standard_normal(len(t)), "bandpass", [2500 * p, 9000]) * np.exp(-t * 900)
    ring = np.sin(2 * np.pi * 3100 * p * t) * np.exp(-t * 55) * 0.35 + np.sin(2 * np.pi * 5230 * p * t) * np.exp(-t * 90) * 0.15
    knock = np.sin(2 * np.pi * 240 * p * t) * np.exp(-t * 60) * 0.5
    return norm(click + ring + knock)


def trickle(p=1.0, d=2.2):
    """Water running down glass: soft, wobbling, bubbly."""
    t = T(d)
    env = np.sin(np.pi * t / d) ** 0.8
    x = _grains(d, 260, 1200 * p, 5200 * p, 0.004, int(p * 1000) % 97 + 3) * (0.7 + 0.3 * np.sin(2 * np.pi * 5.3 * t))
    return norm(x * env)


def sandcut(p=1.0, d=0.6):
    """A blade through kinetic sand: a dense, crisp, crunchy hiss that swells and stops."""
    shape = lambda u: np.minimum(1, u / 0.12) ** 1.5 * (0.75 + 0.25 * u) * np.minimum(1, (1 - u) / 0.06)
    x = _grains(d, 9000, 1800 * p, 11000, 0.0012, int(p * 977) % 89 + 11, shape)
    x += 0.35 * _grains(d, 2500, 500 * p, 2400 * p, 0.003, int(p * 331) % 83 + 5, shape)
    return norm(x)


def crumble(p=1.0, d=1.0):
    """Kinetic sand breaking apart: soft, sparse, lower crunches that thin out."""
    shape = lambda u: np.minimum(1, u / 0.03) * np.exp(-u * 3.2)
    return norm(_grains(d, 1800, 700 * p, 6500, 0.003, int(p * 541) % 79 + 7, shape))


def thud(p=1.0):
    """A soft slab landing on a padded table."""
    t = T(0.4)
    body = np.sin(2 * np.pi * (85 + 40 * np.exp(-t * 30)) * p * t) * np.exp(-t * 16)
    pad = filt(rng.standard_normal(len(t)), "lowpass", 900) * np.exp(-t * 40) * 0.6
    return norm(body + pad)


def rain_bed(total, seed=21):
    """Rain heard from inside: a dense stereo patter of tiny drops, a soft wash, and the occasional closer drop."""
    n = int(total * SR)
    out = np.zeros((n, 2))
    for ch in range(2):
        x = _grains(total, 520, 1500, 9000, 0.0015, seed + ch)
        x += 0.5 * _grains(total, 140, 600, 3000, 0.004, seed + 10 + ch)
        r = np.random.default_rng(seed + 20 + ch)
        x += 0.35 * filt(r.standard_normal(n), "bandpass", [300, 2400])
        out[:, ch] = filt(x, "lowpass", 7000)
    return out / (np.max(np.abs(out)) + 1e-9)


SFX = {f.__name__: f for f in [impact, deep, whoosh, swish, dive, shimmer, blip, tick, ping, sonar, bubbles, whale,
                               creak, riser, swell, bloom, count, splash, chime, hush, drop, trickle, sandcut, crumble, thud]}


# ---------------------------------------------------------------- score presets

PRESETS = {
    # dark, slow, wide: minor-ish pads + sub pulse
    "deep": {"bar": 3.2, "lp": 2200, "pulse": 0.10,
             "chords": [[38, 53, 57, 60, 64], [34, 50, 53, 57, 62], [41, 53, 57, 60, 65], [36, 52, 55, 59, 62]]},
    # long-form space: slow, wide, 8-chord progression so 5 minutes never loops audibly
    "vast": {"bar": 4.2, "lp": 2600, "pulse": 0.08,
             "chords": [[38, 53, 57, 60, 64], [34, 50, 53, 57, 62], [41, 53, 57, 60, 65], [36, 52, 55, 59, 62],
                        [33, 52, 57, 60, 64], [38, 50, 57, 62, 65], [43, 55, 58, 62, 67], [36, 55, 60, 64, 67]]},
    # ASMR bed: very slow, dark, warm major-ninth pads, no pulse, already sounding on frame 1
    "drift": {"bar": 7.4, "lp": 1300, "pulse": 0.0, "fadeIn": 0.05, "attack": 2.4,
              "chords": [[38, 50, 57, 61, 64], [35, 50, 54, 57, 61], [31, 50, 55, 59, 62], [33, 49, 57, 61, 64]]},
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
            x = pad_voice(midi(m), bar, attack=P.get("attack", 1.0) if k else min(0.02, P.get("attack", 1.0))) * (0.55 if j == 0 else 0.2)   # the first chord sounds on frame 1
            pan = 0.5 if j == 0 else (0.3 if j % 2 else 0.7)
            seg = slice(i, min(n, i + len(x)))
            left[seg] += x[: seg.stop - i] * (1 - pan)
            right[seg] += x[: seg.stop - i] * pan
        for s in range(8 if P["pulse"] else 0):
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
    fade_in = np.minimum(1, np.arange(len(m)) / (P.get("fadeIn", 0.8) * SR))
    fade_out = np.minimum(1, np.arange(len(m))[::-1] / (2.0 * SR))
    return m / np.max(np.abs(m)) * (fade_in * fade_out)[:, None]


SHORT_IR = None


def short_ir():
    global SHORT_IR
    if SHORT_IR is None:
        r = np.random.default_rng(11)
        tt = T(0.9)
        SHORT_IR = filt((r.standard_normal((len(tt), 2)) * np.exp(-tt * 7)[:, None]).T, "lowpass", 3200).T * 0.05
    return SHORT_IR


def short_room(st):
    ir = short_ir()
    return np.stack([fftconvolve(st[:, ch], ir[:, ch])[: len(st)] for ch in range(2)], axis=1)


def asmr_voice(vo, total):
    """ASMR voice chain: close-mic warmth (+~3 dB low shelf), a hard de-esser on 5–9 kHz, a high cut, a short dark room
    and a slow binaural drift (the voice wanders ±12 % left/right over 20 s, equal-power)."""
    x = vo + 0.45 * filt(vo, "lowpass", 220)
    # de-ess: duck the sibilant band wherever its envelope stands out
    band = filt(x, "bandpass", [5000, 9000], order=4)
    env = np.convolve(np.abs(band), np.ones(int(0.005 * SR)) / int(0.005 * SR), mode="same")
    thr = 0.02
    gr = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** 0.75, 1.0)
    x = x - band * (1 - gr)
    x = filt(x, "lowpass", 11500)
    t = np.arange(len(x)) / SR
    pan = 0.5 + 0.12 * np.sin(2 * np.pi * t / 20.0)
    st = np.stack([x * np.cos(pan * np.pi / 2), x * np.sin(pan * np.pi / 2)], axis=1) * np.sqrt(2)
    return st + short_room(st) * 0.6


def air_bed(total):
    """Soft stereo air (ASMR bed under the pads): dark decorrelated noise with a slow swell."""
    n = int(total * SR)
    r = np.random.default_rng(5)
    x = np.stack([filt(r.standard_normal(n), "lowpass", 700, order=2) for _ in range(2)], axis=1)
    t = np.arange(n) / SR
    x *= (0.75 + 0.25 * np.sin(2 * np.pi * t / 11.0))[:, None]
    return x / (np.max(np.abs(x)) + 1e-9)


def main(ep_dir):
    ep = json.load(open(os.path.join(ep_dir, "episode.json")))
    b = os.path.join(ep_dir, "build")
    tl = json.load(open(os.path.join(b, "timeline.json")))
    cues = json.load(open(os.path.join(b, "cues.json"))) if os.path.exists(os.path.join(b, "cues.json")) else []
    total = tl["total"]
    n = int(total * SR)
    vo = wavfile.read(os.path.join(b, "vo.wav"))[1].astype(np.float32) / 32768
    vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]

    # "dip" cues ({"t", "d", "gain"}) pull the music bed and effects down to (1 − gain) for d seconds, with soft edges:
    # a moment of real silence under the voice (e.g. a silent supernova). A cue with "nodip": true plays through the dip
    # (the rumble that belongs to that silence).
    dip = np.ones(n)
    for q in [q for q in cues if q["name"] == "dip"]:
        i0, i1 = int(q["t"] * SR), int((q["t"] + q.get("d", 2.0)) * SR)
        f = int(0.6 * SR)
        env = np.ones(n)
        env[max(0, i0):max(0, i1)] = 1 - q.get("gain", 0.8)
        dip = np.minimum(dip, np.convolve(env, np.ones(f) / f, mode="same"))
    cues = [q for q in cues if q["name"] != "dip"]
    # cues are stereo: "pan" −1 (left) … 1 (right), a balance law that keeps centred cues at full level in both ears
    sfx = np.zeros((n, 2))
    sfx_nd = np.zeros((n, 2))
    unknown = set()
    for q in cues:
        if q["name"] not in SFX:
            unknown.add(q["name"])
            continue
        f = SFX[q["name"]]
        x = (f(q.get("pitch", 1.0), d=q["d"]) if "d" in q else f(q.get("pitch", 1.0))) * q.get("gain", 0.4)
        pan = float(q.get("pan", 0.0))
        i = int(q["t"] * SR)
        if i < 0:   # a cue that started before frame 1 (a loop's event already under way): keep its tail
            x, i = x[-i:], 0
        if 0 <= i < n and len(x):
            m = min(len(x), n - i)
            dst = sfx_nd if q.get("nodip") else sfx
            dst[i:i + m, 0] += x[:m] * min(1.0, 1.0 - pan)
            dst[i:i + m, 1] += x[:m] * min(1.0, 1.0 + pan)
    if unknown:
        print(f"warning: unknown sfx {sorted(unknown)}; available: {sorted(SFX)}")
    def room(x):
        x = np.tanh(x / 0.6) * 0.6  # tame stacked hits
        if ep.get("sfxRoom") == "close":   # ASMR triggers: dry and close, only the short dark room
            return x + short_room(x) * 0.35
        return reverb(x, 0.6)
    sfx = room(sfx)
    sfx_nd = room(sfx_nd) if sfx_nd.any() else sfx_nd

    active = np.zeros(n)
    for ln in tl["lines"]:
        active[int((ln["start"] - 0.05) * SR): int((ln["end"] + 0.1) * SR)] = 1
    win = np.hanning(int(0.3 * SR))
    duck = np.convolve(active, win / win.sum(), mode="same")
    bg = music(total, ep.get("music", "deep")) * (0.28 - 0.14 * duck)[:, None]

    if ep.get("mix") == "asmr":
        # quieter, closer, no limiter pumping: pads + air sit low, the voice is close and binaural
        # episode.json: "bedGain" scales the pads, "sfxGain" the cues (triggers are the content: louder, barely ducked),
        # "ambience": {"type": "rain", "gain": g} adds a continuous trigger bed
        bg = music(total, ep.get("music", "drift")) * (0.42 - 0.2 * duck)[:, None] * ep.get("bedGain", 1.0) + air_bed(total) * 0.06
        amb = ep.get("ambience")
        if amb and amb.get("type") == "rain":
            bg = bg + rain_bed(total) * amb.get("gain", 0.2) * (1 - 0.25 * duck)[:, None]
        g = ep.get("sfxGain", 0.30)
        mix = (bg + sfx * (g - 0.4 * g * duck)[:, None]) * dip[:, None] + sfx_nd * (g - 0.4 * g * duck)[:, None] + asmr_voice(vo, total)
    else:
        mix = (bg + sfx * (0.45 - 0.2 * duck)[:, None]) * dip[:, None] + sfx_nd * (0.45 - 0.2 * duck)[:, None] + reverb(np.stack([vo, vo], axis=1), 0.08)
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    wavfile.write(os.path.join(b, "mix.wav"), SR, (mix * 32767).astype(np.int16))
    print(f"mix: {total:.2f}s, {len(cues)} cues")


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "."))
