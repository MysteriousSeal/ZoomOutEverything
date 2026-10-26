# ELI5Shorts workspace

Faceless YouTube channels, rendered entirely from code: Canvas 2D drawn in headless Chrome → PNG frames → ffmpeg, with an ElevenLabs voiceover and a soundtrack synthesized in numpy. There's no editor, no stock footage and no video model.

| Folder | What |
|--------|------|
| [`MOTION-PRINCIPLES.md`](MOTION-PRINCIPLES.md) | The quality bar for every video: dynamic, premium motion design that's never too fast to understand |
| [`engine/`](engine/README.md) | Shared renderer: scenes, camera, captions, voice (`py/voice.py`), sound effects and music (`py/audio.py`), render and thumbnail scripts |
| [`ZoomOut/`](ZoomOut/README.md) | Channel 2: **Zoom Out**, broad viral motion-graphics Shorts (science, space, history, culture, money), plus long-form in `ZoomOut/long/` |
| [`TheShortAnswer/`](TheShortAnswer/README.md) | Channel 1: big questions explained simply in 30 s (01–02 rendered with the older Pillow renderer; 03–05 scripted) |
| [`tools/`](tools/README.md) | Render queue, render script, quality checks (dark frames, captions, speech-to-text, loudness) and the briefs given to builder and auditor agents |
| [`docs/notes/`](docs/notes/README.md) | Production notes: style rules, realism and text-layout lessons, channel history, decisions |

## Status

- **Zoom Out:** Shorts 01–24 rendered, with `b` hook versions for 03–19 and `c` short cuts for 10–19 (51 Shorts in total), and long-form L01 (4:53, 16:9).
- **The Short Answer:** 01–02 rendered, 03–05 scripted.

## Episode folders

Each episode lives in `ZoomOut/episodes/<NN-slug>/`:

| Suffix | What |
|--------|------|
| `NN-…` | The original episode. Left untouched once it's final. |
| `NNb-…-hook` | Hook version: a cold-open question and a replay of the payoff before the film, ending on a question for the comments. |
| `NNc-…-short` | 48–54 s cut of the hook version, with its own title and thumbnail. |

Inside each folder: `script.md`, `episode.json` (lines, voice, timing, music), `camera.js`, `env.js`, `scenes/` (one file per beat), `build/` (timing files in git; voice, mix and frames are regenerated) and `out/` (the final mp4, thumbnail and cover).

## Voice

New episodes use **ElevenLabs Brittney** (`eleven_multilingual_v2`, speed 1.1) by default. Older episodes name a Kokoro voice in `episode.json` and keep it. Every generated line is cached in `.tts_cache/`, so re-running `voice.py` reuses the same takes and spends no credits. The key goes in `.env` as `ELEVENLABS_API_KEY` and is never committed.

## Making a video

```sh
PY=TheShortAnswer/.venv/bin/python
EP=ZoomOut/episodes/<slug>
$PY engine/py/voice.py $EP      # voice + timeline
tools/rend.sh <slug>            # cues, mix, frames, mp4, thumbnail, then checks
```

`tools/rend.sh` prints the length, decode errors, loudness (target −14 LUFS) and any dark frames. To render several in a row, start `tools/qworker.sh` and append slugs to `tools/queue.txt`. See [`engine/README.md`](engine/README.md) for the full pipeline and scene API.

## New computer

```sh
brew install ffmpeg node python@3.13 imagemagick     # and install Google Chrome
git clone https://github.com/MysteriousSeal/ZoomOutEverything.git
cd ZoomOutEverything && ./setup.sh
```

`setup.sh` installs the Node packages (`engine/node_modules`), the Python environments (`TheShortAnswer/.venv` and `tools/stt-venv`), downloads the Kokoro model and creates `.env`; paste the ElevenLabs key into it. To give Claude the same context, copy `docs/notes/` into its memory folder for the project (`README.md` becomes `MEMORY.md`).

## Not in git

- `.env` (the API key).
- `build/vo.wav`, `build/mix.wav` and frames: rebuilt from the voice cache and timing files.
- The Kokoro model, `node_modules` and the Python environments: installed by `setup.sh`.
- The long-form video `ZoomOut/long/01-…/out/01-….mp4`, which is over GitHub's 100 MB file limit.
