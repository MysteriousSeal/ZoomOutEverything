# Audit brief: Zoom Out Shorts 04b and 05b (READ-ONLY review)

- Root: the repo root. Episodes live in ZoomOut/episodes/<slug>/.
- Each folder holds:
  - the final video, `out/<slug>.mp4` (1080x1920, 30 fps);
  - the thumbnail, `out/thumbnail.png`;
  - `episode.json` (narration lines; the `preroll` cold open plays before the main film);
  - `build/timeline.json` (beat/phrase times, main timeline);
  - `scenes/*.js`, `camera.js`, `env.js`;
  - `script.md` (fact-check), `youtube.md`.
- The channel is a premium, adult documentary motion-graphics brand. The user is a demanding viewer: they have caught overflowing text, cramped cards, ghosting labels and a wrong clock before.

**You do NOT edit any project file.** You produce a precise defect list. Work only in your own scratch folder: a scratch folder outside the repo, e.g. $TMPDIR/audit/<your-id>/ (create it), and delete your extracted frames when done.

## Tools
- Frames from the FINAL MP4 (this is what viewers see):
  - full resolution: `ffmpeg -v error -ss <t> -i <mp4> -frames:v 1 <out>.png`
  - a range: `ffmpeg -v error -ss <a> -t <len> -i <mp4> -vf fps=4 <dir>/f%04d.png`
- Montages: `magick montage <files> -tile 6x -geometry 540x960+2+2 <out>.jpg`, then Read the result.
- Crops for detail: `magick <png> -crop WxH+X+Y <out>.png`.
- Audio transcription:
  ```
  ffmpeg -y -i <mp4> -ac 1 -ar 48000 <wav>
  tools/stt-venv/bin/python -I tools/stt.py <wav>
  ```
  The wav must be 48 kHz.

## What counts as a defect (report ALL, even small ones)
- Text:
  - overflowing its box or card, clipped by the frame edge, or overlapping other text or subjects;
  - cramped spacing, or misaligned baselines and columns;
  - inconsistent styles;
  - typos, wrong units, wrong numbers;
  - readable for less than ~1 s.
- Ghosting or half-faded labels lingering over the next scene; elements popping in or out abruptly; flicker; moiré; aliasing.
- Safe zones:
  - YouTube Shorts UI covers x > 940 from y ≈ 1100 down, and the bottom ~18% (y > 1580);
  - the HUD band is y < 300;
  - captions sit at y ≈ 1380–1520 and must not collide with labels or focal subjects.
- Realism:
  - wrong anatomy or proportions;
  - impossible depth order, e.g. people drawn over cars;
  - a fake-looking Earth (it must have real coastlines);
  - inconsistent scale.
- Composition:
  - empty or dead frames;
  - focal subject cropped or tiny;
  - camera arriving after the narration names the subject;
  - visuals out of sync with the voice (compare with timeline.json phrase times).
- HUD: clocks and readouts that are wrong (e.g. a "00:60" or "00:75" clock), jump backwards, or contradict the narration.

Each defect needs:
- the exact timestamp(s) in the FINAL MP4 timeline (seconds; the preroll is included and starts at 0);
- screen position;
- severity (high, medium or low);
- a description;
- the responsible file, if you can find it (grep the scenes for the text string);
- a concrete fix.
