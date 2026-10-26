# Episode 01 — Why Is the Sky Blue? (production)

Everything in this video is generated from code: the motion graphics, neural voiceover, sound design, score and captions. You don't need any stock assets or licenses.

## Outputs (`out/`)

| File | What |
|------|------|
| `01-why-is-the-sky-blue.mp4` | Final Short: 1080×1920, 30fps, 28.8s, H.264/AAC, loudness −14 LUFS |
| `01-why-is-the-sky-blue.srt` | Subtitle file (optional upload; captions are already burned in) |
| `thumbnail.png` | 1080×1920 cover image |

Intermediate files are in `build/`: `vo.wav`, `music.wav`, `sfx.wav`, `mix.wav`, `timeline.json`, `preview/` stills, and `auditions/` (voice samples).

## Rebuild

```sh
./build.sh                                     # everything (~45s)
../../.venv/bin/python render.py --preview     # just stills in build/preview/
```

## Voice

The narration uses **Kokoro**, an open-source neural TTS model (Apache-2.0, so commercial use is fine). It runs offline and the model lives in `../../models/`. The default voice is `af_heart`.

- **Compare voices:** play the files in `build/auditions/`, then run for example `VOICE=am_michael ./build.sh`. British voices start with `b`, for example `bm_george`.
- **Pacing:** `SPEED=0.95 ./build.sh` (default 1.0).
- **Your own voice / ElevenLabs:** save recordings as `voice_override/line1.wav` … `line7.wav` (the line text is in `LINES` in `episode.py`). The animation and captions re-time to match.

## Look

Documentary motion graphics: deep navy palettes, glowing light, real wavelengths (400–700 nm), N₂/O₂ molecules, Rayleigh scattering rings, and a geometry diagram for the sunset path. Each scene has a numbered chapter marker. Film grain and vignette are added on top.

## File map

- `episode.py`: script lines, the seven scenes and their sound cues.
- `common.py`: canvas with a glow layer, palette, typography, molecules, waves, silhouettes.
- `voice.py`: Kokoro TTS (or your override recordings) and the master timeline.
- `audio.py`: synthesized sound design, ambient score, reverb, voice ducking.
- `render.py`: frame renderer, captions, thumbnail and SRT, ffmpeg encode.
