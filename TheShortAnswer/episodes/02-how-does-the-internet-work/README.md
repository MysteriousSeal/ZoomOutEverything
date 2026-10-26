# Episode 02 — How Does the Internet Work? (production)

Same pipeline and look as episode 01 (see `../01-why-is-the-sky-blue/README.md`), with a cyan "tech" accent.

## Outputs (`out/`)

| File | What |
|------|------|
| `02-how-does-the-internet-work.mp4` | Final Short: 1080×1920, 30fps, 29.8s, H.264/AAC, −14 LUFS |
| `02-how-does-the-internet-work.srt` | Subtitle file |
| `thumbnail.png` | 1080×1920 cover image |

## Rebuild

```sh
./build.sh                                     # everything (~45s)
VOICE=am_michael ./build.sh                    # different Kokoro voice
../../.venv/bin/python render.py --preview     # stills in build/preview/
```

You can also add your own recordings as `voice_override/line1.wav` … `line7.wav`.

## What's specific to this episode

- `episode.py`: script, scenes (phone, packet shatter, header card, seafloor fiber, router graph, reassembly, latency counter), `thumbnail()`.
- `audio.py`: adds `data`, `shatter`, `keys`, `underwater`, `alert` and `count` sounds.
- `common.py`: adds `Canvas.rrect` and the Menlo mono font.
- `render.py`: now generic. It reads `SLUG` and `thumbnail()` from `episode.py`.
