# Tools

| File | What it does |
|---|---|
| `rend.sh <episode>` | Full render of `ZoomOut/episodes/<episode>`: cues, mix, frames, mp4, thumbnail, then length, decode errors, loudness and dark-frame check. |
| `qworker.sh` | Render queue, one at a time: append episode names to `tools/queue.txt`. Exits after 3 h idle. |
| `darkscan.mjs <mp4>` | Lists frames much darker than their neighbours (dead-canvas frames). Flags that survive render.mjs's repair passes are usually intentional; check them by eye. |
| `capsim.mjs <timeline.json>` | Simulates the caption grouping from `engine/runtime/main.js` to spot short or overlong caption groups. |
| `stt.py <48 kHz wav>` | Transcribes a voice track (faster-whisper, `tools/stt-venv`) to check the narration. |
| `stems.py <episode dir> <prefix>` | Writes the voice and sound-effect stems separately, to measure their loudness. |
| `briefs/` | Instructions given to builder and auditor agents: `hookbrief.md` (b hook versions), `cbrief.md` (c short cuts), `audit.md` (audits), `fixbrief.md`, `hooklessons.md`. |
