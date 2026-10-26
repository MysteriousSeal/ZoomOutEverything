# ELI5Shorts workspace

Faceless YouTube Shorts channels, rendered entirely from code.

| Folder | What |
|--------|------|
| [`MOTION-PRINCIPLES.md`](MOTION-PRINCIPLES.md) | The quality bar for every video: dynamic, premium motion design that's never too fast to understand |
| [`engine/`](engine/README.md) | Shared renderer: Canvas 2D in headless Chrome → ffmpeg, Kokoro voice, synthesized audio, review tools |
| [`TheShortAnswer/`](TheShortAnswer/README.md) | Channel 1: big questions explained simply in 30 s (sky, internet, inflation, sleep, AI) |
| [`ZoomOut/`](ZoomOut/README.md) | Channel 2: **Zoom Out**, broad viral motion-graphics Shorts (science, space, history, culture, money); first series *True Scale* |

Python env (Kokoro, numpy, scipy): `TheShortAnswer/.venv`. Node deps: `engine/node_modules` (puppeteer-core, which uses the installed Google Chrome).

## New computer

Clone the repo, run `./setup.sh` (installs the Node and Python dependencies, downloads the Kokoro model, creates `.env`), then paste the ElevenLabs key into `.env`. Render tools and agent briefs are in `tools/`, production notes in `docs/notes/`.
