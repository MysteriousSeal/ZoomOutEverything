"""Render the animation, burn in captions, mux with audio.

  python render.py              -> out/01-why-is-the-sky-blue.mp4 (+ .srt, thumbnail.png)
  python render.py --preview    -> build/preview/*.png stills at key moments
"""
import json
import math
import os
import re
import subprocess
import sys
from multiprocessing import Pool

from common import FPS, H, SKY_DEEP, W, Canvas, draw_caption, draw_chapter, sky_image
from episode import SCENES, SLUG, thumbnail as draw_thumbnail

OUT = f"out/{SLUG}.mp4"
TL = json.load(open("build/timeline.json"))


def caption_groups():
    """Estimate word timings (weighted by length, commas add a pause) and chunk into 1–3 word groups."""
    groups = []
    for ln in TL["lines"]:
        words = ln["text"].upper().split()
        weights = [len(re.sub(r"\W", "", w)) + 1.5 + (3 if w[-1] in ",.?!" else 0) for w in words]
        total, acc, timed = sum(weights), 0.0, []
        for w, wt in zip(words, weights):
            timed.append((ln["start"] + (ln["end"] - ln["start"]) * acc / total, w.rstrip(",.")))
            acc += wt
        chunk = []
        for i, (st, w) in enumerate(timed):
            chunk.append((st, w))
            if len(chunk) == 3 or words[i][-1] in ",.?!" or i == len(timed) - 1:
                groups.append({"words": chunk, "start": chunk[0][0], "line_end": ln["end"]})
                chunk = []
    for g, nxt in zip(groups, groups[1:] + [None]):
        g["end"] = min(nxt["start"], g["line_end"] + 0.35) if nxt else g["line_end"] + 0.8
    return groups


GROUPS = caption_groups()
N_FRAMES = math.ceil(TL["total"] * FPS)


def render_frame(i):
    gt = i / FPS
    idx = max(k for k, sc in enumerate(TL["scenes"]) if sc["start"] <= gt + 1e-9)
    sc, scene = TL["scenes"][idx], SCENES[idx]
    t, d = gt - sc["start"], sc["end"] - sc["start"]
    c = Canvas(sky_image(scene.sky(t, d)), frame=i)
    scene.draw(c, t, d, gt)
    if scene.chapter:
        draw_chapter(c, *scene.chapter, t - 0.05, accent=scene.accent(t, d))
    if scene.captions:
        for g in GROUPS:
            if g["start"] <= gt < g["end"]:
                active = max(k for k, (st, _) in enumerate(g["words"]) if st <= gt)
                draw_caption(c, [w for _, w in g["words"]], active, gt - g["start"], scene.accent(t, d))
                break
    return c.out()


def thumbnail():
    c = Canvas(sky_image(SKY_DEEP))
    draw_thumbnail(c)
    c.out().save("out/thumbnail.png")


def srt():
    def ts(x):
        ms = int(round(x * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    with open(f"out/{SLUG}.srt", "w") as f:
        for k, ln in enumerate(TL["lines"], 1):
            f.write(f"{k}\n{ts(ln['start'])} --> {ts(ln['end'] + 0.2)}\n{ln['text']}\n\n")


def preview():
    os.makedirs("build/preview", exist_ok=True)
    for k, sc in enumerate(TL["scenes"]):
        d = sc["end"] - sc["start"]
        for f in (0.35, 0.8):
            gt = sc["start"] + d * f
            render_frame(int(gt * FPS)).save(f"build/preview/s{k + 1}_{gt:05.2f}.png")
    print("\n".join(sorted(os.listdir("build/preview"))))


def main():
    os.makedirs("out", exist_ok=True)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", "build/mix.wav",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000",
        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT,
    ], stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for n, frame in enumerate(pool.imap(render_frame, range(N_FRAMES), chunksize=4)):
            ff.stdin.write(frame.tobytes())
            if n % 120 == 0:
                print(f"frame {n}/{N_FRAMES}", flush=True)
    ff.stdin.close()
    ff.wait()
    thumbnail()
    srt()
    print(f"done -> {OUT}")


if __name__ == "__main__":
    preview() if "--preview" in sys.argv else main()
