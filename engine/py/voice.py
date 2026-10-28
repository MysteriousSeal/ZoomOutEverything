"""Voiceover + master timeline for an engine episode.

  <venv>/python engine/py/voice.py <episodeDir>

Reads episode.json ("lines", "voice": {name, speed, lineGap, lead, tail, hookHold, phraseGap, holds}),
The default voice is ElevenLabs Brittney on eleven_v4 at its natural pace; "id", "model" and "settings" override it.
A "voice" block with a Kokoro "name" (or "engine": "kokoro") uses Kokoro instead. ElevenLabs needs ELEVENLABS_API_KEY in the
environment or the project .env; each phrase is cached in .tts_cache/ by its text, voice, model and settings, so re-runs
never spend credits twice.
"holds": {"<line index>": seconds} adds a pause after that line; "phraseAt" / "lineAt" pin starts to a grid (see main); "{shown~spoken}" in a line = caption text ~ TTS text.
writes build/vo.wav and build/timeline.json. Recordings in voice_override/lineN.wav win.
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODELS = os.path.join(ROOT, "TheShortAnswer", "models")
CACHE = os.path.join(ROOT, ".tts_cache")
EL_DEFAULT = {"id": "kPzsL2i3teMYv0FxEYQ6", "model": "eleven_v4", "settings": {}}  # Brittney, natural pace (v4 ignores speed)
LAST_WORDS = []
EL_SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True}


def el_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    for ln in open(os.path.join(ROOT, ".env")):
        k, _, v = ln.strip().partition("=")
        if k == "ELEVENLABS_API_KEY":
            return v.strip().strip('"').strip("'")
    raise SystemExit("ELEVENLABS_API_KEY not found (environment or .env)")


def eleven(text, cfg, prev="", nxt=""):
    """One phrase from ElevenLabs as mono float32 at 48 kHz, cut exactly at its first and last character (the API's
    character timings), so no breath or bleed of the neighbouring words (which previous_text/next_text can cause) is
    left at the edges. The neighbouring text steers the intonation; the result is cached on disk."""
    body = {"text": text, "model_id": cfg.get("model", "eleven_multilingual_v2"), "voice_settings": {**EL_SETTINGS, **cfg.get("settings", {})}}
    if prev:
        body["previous_text"] = prev
    if nxt:
        body["next_text"] = nxt
    if cfg.get("seed") is not None:   # a fresh take for one phrase: voice.retake {"line.phrase": seed} in episode.json
        body["seed"] = int(cfg["seed"])
    key = hashlib.sha1(json.dumps([cfg["id"], body, "ts"], sort_keys=True).encode()).hexdigest()
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + ".json")
    if not os.path.exists(path):
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['id']}/with-timestamps?output_format=mp3_44100_192",
                                     data=json.dumps(body).encode(), method="POST",
                                     headers={"xi-api-key": el_key(), "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
        open(path + ".part", "wb").write(data)
        os.replace(path + ".part", path)
    res = json.load(open(path))
    mp3 = base64.b64decode(res["audio_base64"])
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         input=mp3, capture_output=True, check=True).stdout
    a = np.frombuffer(pcm, dtype=np.float32).copy()
    al = res.get("normalized_alignment") or res.get("alignment") or {}
    chars, t0s, t1s = al.get("characters", []), al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", [])
    spoken_idx = [i for i, ch in enumerate(chars) if ch.strip() and ch not in ".,;:!?\"'"]
    if spoken_idx:
        # head: generous pre-roll (a 30 ms one clipped first consonants), then back to the real onset, 10 ms margin
        i0 = max(0, int((t0s[spoken_idx[0]] - 0.12) * SR))
        on = np.flatnonzero(np.abs(a[i0:]) > 0.003)
        if len(on):
            i0 = max(i0, i0 + int(on[0]) - int(0.01 * SR))
        # tail: the alignment's last end time sometimes runs long, and a fixed +90 ms cut then kept the first sound of
        # the NEXT phrase (generated as context). Cut at the first 100 ms of silence after the last character instead.
        t1 = t1s[spoken_idx[-1]]
        i1 = min(len(a), int((t1 + 0.09) * SR))
        win, hop = int(0.08 * SR), int(0.01 * SR)
        j = max(0, int((t1 - 0.06) * SR))
        while j + win <= min(len(a), int((t1 + 0.6) * SR)):
            if np.sqrt(np.mean(a[j:j + win] ** 2)) < 0.01:   # −40 dBFS (raw ElevenLabs gaps sit around −45…−50)
                i1 = min(len(a), j + int(0.04 * SR))
                break
            j += hop
        a = a[i0:i1]
        # safety net: if the last 0.7 s still holds a gap (≥ 250 ms under −40 dBFS) followed by sound, that sound is
        # the next phrase leaking in: cut at the gap
        fr = int(0.01 * SR)
        tail0 = max(0, len(a) - int(0.7 * SR))
        seg = a[tail0: tail0 + (len(a) - tail0) // fr * fr]
        if len(seg) >= 12 * fr:
            db = 20 * np.log10(np.sqrt((seg.reshape(-1, fr) ** 2).mean(axis=1)) + 1e-9)
            run = 0
            for k, v in enumerate(db):
                run = run + 1 if v < -40 else 0
                # ≥ 250 ms: leaked blips follow 0.4–0.6 s gaps; stop closures inside speech ("fight | it") last < 150 ms
                if run >= 25 and (db[k + 1:] > -36).any():
                    a = a[: tail0 + (k - run + 1) * fr + int(0.04 * SR)]
                    break
        # word start times (s, relative to the cut) from the character alignment, for captions that follow the voice
        global LAST_WORDS
        LAST_WORDS = []
        for i, ch in enumerate(chars):
            if ch.strip() and (i == 0 or not chars[i - 1].strip()):
                j = i
                while j < len(chars) and chars[j].strip():
                    j += 1
                w = "".join(chars[i:j])
                if any(c.isalnum() for c in w):
                    LAST_WORDS.append([round(max(0.0, t0s[i] - i0 / SR), 3), w])
    return a


def edge_fades(a, fin=0.01, fout=0.035):
    """Short fades so a cut never clicks."""
    n0, n1 = min(len(a), int(fin * SR)), min(len(a), int(fout * SR))
    a[:n0] *= np.linspace(0, 1, n0, dtype=np.float32)
    a[len(a) - n1:] *= np.linspace(1, 0, n1, dtype=np.float32)
    return a


def level(a, target=0.16, peak=0.95):   # ≈ −16 dB voiced RMS ≈ the Kokoro tracks' −17.4 LUFS
    """Level a phrase by the RMS of its voiced part (not its peak), so joins between phrases don't jump in loudness."""
    win = int(0.02 * SR)
    frames = a[: len(a) // win * win].reshape(-1, win) if len(a) >= win else a.reshape(1, -1)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    voiced = rms[rms > rms.max() * 0.1]
    g = target / max(1e-6, float(np.sqrt((voiced ** 2).mean())) if len(voiced) else 1e-6)
    a = a * g
    # soft-knee limiter instead of capping the gain at the peak: one loud consonant no longer makes a whole phrase quiet
    knee = 0.8
    over = np.abs(a) > knee
    a[over] = np.sign(a[over]) * (knee + (peak - knee) * np.tanh((np.abs(a[over]) - knee) / (peak - knee)))
    return a


def to_48k(a, sr):
    a = a.astype(np.float32)
    if a.ndim > 1:
        a = a.mean(axis=1)
    return resample_poly(a, SR, sr).astype(np.float32) if sr != SR else a


def trim(a, thr=0.006):
    idx = np.flatnonzero(np.abs(a) > thr)
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - int(0.01 * SR)): idx[-1] + int(0.06 * SR)]


SAY = re.compile(r"\{([^~{}]+)~([^{}]+)\}")   # "{Laniakea~lah-nee-ah-KAY-ah}": shown text ~ spoken text


def shown(text):
    return SAY.sub(lambda m: m.group(1), text)


def spoken(text):
    return SAY.sub(lambda m: m.group(2), text)


def main(ep_dir):
    ep = json.load(open(os.path.join(ep_dir, "episode.json")))
    cfg = ep.get("voice", {})
    # default voice: ElevenLabs Brittney; an episode that names a Kokoro voice ("name") stays on Kokoro
    engine = cfg.get("engine", "kokoro" if "name" in cfg else "elevenlabs")
    if engine == "elevenlabs":
        cfg = {**EL_DEFAULT, **cfg}
    voice = os.environ.get("VOICE", cfg.get("id") if engine == "elevenlabs" else cfg.get("name", "af_heart"))
    speed = float(os.environ.get("SPEED", cfg.get("speed", 0.92)))
    lead, gap, tail = cfg.get("lead", 0.3), cfg.get("lineGap", 0.4), cfg.get("tail", 1.8)
    hook_hold = cfg.get("hookHold", 0.0)  # extra time after the hook line for the headline to breathe
    phrase_gap = cfg.get("phraseGap", 0.8)  # pause at a "|" inside a line
    holds = {int(k): v for k, v in cfg.get("holds", {}).items()}  # extra seconds after line index k (0-based)
    build = os.path.join(ep_dir, "build")
    os.makedirs(build, exist_ok=True)

    tts = None
    t, segments, lines = lead, [], []
    # a preroll (cold-open hook) line plays first; hookHold still follows the film's own first line
    pre = 1 if ep.get("preroll") else 0
    all_lines = ([ep["preroll"]["line"]] if pre else []) + ep["lines"]
    for li, text in enumerate(all_lines, 1):
        override = os.path.join(ep_dir, "voice_override", f"line{li}.wav")
        if os.path.exists(override):
            sr, a = wavfile.read(override)
            a = to_48k(a / np.iinfo(a.dtype).max if a.dtype.kind == "i" else a, sr)
            a = trim(a)
            a /= max(1e-6, np.max(np.abs(a))) / 0.9
            segments.append((t, a))
            phrases = [{"text": shown(text).replace("|", "").replace("  ", " ").strip(), "start": round(t, 3), "end": round(t + len(a) / SR, 3)}]
            t += len(a) / SR
        else:
            # "first part. | second part." = two phrases with a deliberate pause (phraseGap) between them
            phrases = []
            parts = [p.strip() for p in text.split("|")]
            for pi, part in enumerate(parts):
                if engine == "elevenlabs":
                    prev = " ".join(spoken(q) for q in ([all_lines[li - 2]] if li > 1 else []) + parts[:pi]).replace("|", "")
                    nxt = " ".join(spoken(q) for q in parts[pi + 1:] + ([all_lines[li]] if li < len(all_lines) else [])).replace("|", "")
                    seed = cfg.get("retake", {}).get(f"{li - 1 - pre}.{pi}")   # 0-based film line index . phrase index
                    a = level(edge_fades(eleven(spoken(part), {**cfg, "id": voice, "seed": seed}, prev[-600:], nxt[:600])))
                    words = [w for w in LAST_WORDS if w[0] < len(a) / SR]
                else:
                    if tts is None:
                        from kokoro_onnx import Kokoro
                        tts = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
                    samples, sr = tts.create(spoken(part), voice=voice, speed=speed, lang="en-gb" if voice[0] == "b" else "en-us")
                    a = trim(to_48k(samples, sr))
                    a /= max(1e-6, np.max(np.abs(a))) / 0.9
                    words = None
                if pi:
                    t += phrase_gap
                    # "phraseAt": {"<line>.<phrase>": s} pins a phrase's start to s after its line's start (breath grids)
                    at = cfg.get("phraseAt", {}).get(f"{li - 1 - pre}.{pi}")
                    if at is not None:
                        t = max(t - phrase_gap + 0.25, phrases[0]["start"] + at)
                segments.append((t, a))
                phrases.append({"text": shown(part), "start": round(t, 3), "end": round(t + len(a) / SR, 3)})
                if words:   # spoken words with their start times (main.js captions use them when they match the shown words)
                    phrases[-1]["words"] = [[round(t + ws, 3), w] for ws, w in words]
                t += len(a) / SR
        lines.append({"text": " ".join(ph["text"] for ph in phrases), "start": phrases[0]["start"], "end": phrases[-1]["end"],
                      "phrases": phrases})
        # "lineAt": {"<line>": s} pins a line's start to s after the previous line's start
        at = cfg.get("lineAt", {}).get(str(li - pre))
        if at is not None:
            t = max(t + 0.25, lines[-1]["start"] + at)
            continue
        t += gap + (hook_hold if li == 1 + pre else 0) + (ep["preroll"].get("hold", 0) if pre and li == 1 else 0) + holds.get(li - 1 - pre, 0)
    total = lines[-1]["end"] + tail
    starts = [0.0] + [ln["start"] - 0.15 for ln in lines[1:]]
    scenes = [{"start": round(s, 3), "end": round(e, 3)} for s, e in zip(starts, starts[1:] + [total])]

    vo = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for start, a in segments:
        i = int(start * SR)
        vo[i:i + len(a)] += a
    vo = vo[: int(total * SR)]
    wavfile.write(os.path.join(build, "vo.wav"), SR, (np.clip(vo, -1, 1) * 32767).astype(np.int16))
    json.dump({"voice": voice, "speed": speed, "total": round(total, 3), "preroll": pre, "lines": lines, "scenes": scenes},
              open(os.path.join(build, "timeline.json"), "w"), indent=1)
    print(f"engine={engine} voice={voice} " + (f"model={cfg.get('model', 'eleven_multilingual_v2')} {cfg.get('settings', {})}" if engine == "elevenlabs" else f"speed={speed}") + f" total={total:.2f}s")
    for i, (ln, sc) in enumerate(zip(lines, scenes)):
        print(f"  beat {i}: {sc['start']:5.2f}-{sc['end']:5.2f}s  vo {ln['end'] - ln['start']:.2f}s  {ln['text'][:50]}")


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "."))
