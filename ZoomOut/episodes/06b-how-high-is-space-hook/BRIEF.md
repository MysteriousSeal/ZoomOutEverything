# Creative brief — Zoom Out 06: How High Is Space, Really? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../03-how-deep-is-the-ocean/scenes/` (this film is its mirror image, going *up*) and `../01-a-billion-dollars-in-cash/scenes/`.

## The film

One continuous **ascent**:
- From a person looking up, past the tallest structures, Everest, the jets, the thinning air and a balloon jump, to the **Kármán line at 100 km**.
- Then "it's only an hour's drive straight up", the ISS at 400 km, and a pull-back where the whole climb becomes **a thin glowing skin on a globe** (ISS ≈ 1 cm above a 30 cm classroom globe).

`env.js` draws the sky (it darkens with altitude), the stars (above ~40 km), the curved ground (a circle of radius R, so the limb appears naturally as you climb), the altitude gauge and the readout. `camera.js` exports `ALT`, `X`, `R_EARTH`.

**Look:** premium aerospace infographic. Refined silhouettes:
- an accurate Statue of Liberty, an Eiffel Tower lattice, the Burj Khalifa's stepped profile, Everest's ridge line with snow;
- a jet with a contrail, a stratospheric balloon with a capsule, the ISS with its truss and solar arrays.

Side view, true vertical scale. Accent `[150, 170, 255]` for numbers and lines. No cartoon faces or emoji.

**Motion:** each landmark rises into frame *before* the camera settles on it, holds while it's named, and stays in the world (it becomes tiny as we climb). Altitude lines (30 km, 100 km) draw across the sky. One focal point per beat.

## Timing (build/timeline.json, ~60.9 s; "|" = pause, see `phrases`)

Beats start at: 0.0, 3.2, 7.0, 10.1, 13.3, 17.9, 22.7, 27.9, 34.6, 40.1, 44.5, 49.7, 54.6.

| beat | line | camera |
|---|---|---|
| 0 | How far up is space, really? | person, 5.5 mm/px |
| 1 | Statue of Liberty, 93 m | 0.13 m/px |
| 2 | Eiffel Tower, 330 m | 0.4 m/px |
| 3 | Burj Khalifa, 828 m | 1 m/px |
| 4 | Everest, almost 9 km | 10.5 m/px |
| 5 | jets ~11 km | 13 m/px |
| 6 | 30 km: 99% of the air below | 33 m/px |
| 7 | balloon jump at 39 km, broke the sound barrier | 44 m/px |
| 8 | Kármán line, 100 km | 105 m/px |
| 9 | "drive straight up… about an hour" | 100 m/px (hold) |
| 10 | ISS ~400 km | 420 m/px |
| 11 | classroom globe: ≈ 1 cm | → 15.5 km/px globe |
| 12 | Space isn't far away. It's just straight up. | globe hold |

## Scenes

- **s00-hook.js** (no captions, no chapter): a person silhouette (1.75 m, true scale) standing, head tilted up. Headline `HOW FAR UP` / `IS SPACE?` with "SPACE?" in the accent colour, masked, readable ≥ 1.2 s.
- **s01-liberty.js, s02-eiffel.js, s03-burj.js:** each structure at true height at `X.*`, rising or wiping in with a glint. bigLabel e.g. "93 m" / "305 ft · Statue of Liberty". Earlier landmarks stay visible and get smaller.
- **s04-everest.js:** a massif silhouette (true height 8,849 m; base ≈ 20 km wide) at `X.everest`, with snow and ridge shading. The towers become specks at its foot (a small leader "Burj Khalifa" helps).
- **s05-jets.js:** a jet silhouette at 11 km drawing a contrail across the frame. Label "≈ 11 km" / "36,000 ft · cruising altitude".
- **s06-thin-air.js:** a 30 km line draws across; an air-density column/bar drains to show "99% of the air below". Label "30 km" / "99% of the air below you".
- **s07-balloon.js:** a stratospheric balloon rising to 39 km; a tiny figure drops and a Mach shock ring pulses. Label "39 km" / "broke the sound barrier, 2012".
- **s08-karman.js:** the Kármán line draws across as a glowing band; the sky is black and stars are out. Label "100 km" / "the Kármán line: officially space".
- **s09-one-hour.js:** a refined car speedometer (100 km/h) and a clock sweeping 1 hour, as an overlay on the held frame. Label "1 hour" / "at 100 km/h, straight up".
- **s10-iss.js:** the ISS silhouette at 400 km with a subtle orbital-motion streak. Label "≈ 400 km" / "250 mi · Space Station".
- **s11-globe.js, s12-straight-up.js:** the pull-back to the globe.
  - The globe body (ocean, soft land patches, terminator) is drawn **on top of env's flat disc** in world space at centre (0, R_EARTH).
  - The atmosphere is a thin glowing skin, and the ISS orbit is a circle at R + 400 km.
  - An inset or diagram: "on a 30 cm globe → ≈ 1 cm". Label "≈ 1 cm" / "on a classroom globe".
  - s12 holds with a final gentle push.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests".
