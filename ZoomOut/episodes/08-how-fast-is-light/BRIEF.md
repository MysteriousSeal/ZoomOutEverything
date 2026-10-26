# Creative brief — Zoom Out 08: How Fast Is Light, Really? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../03-how-deep-is-the-ocean/scenes/`, `../01-a-billion-dollars-in-cash/scenes/`.

## The film

**Follow one photon outward.** A single glowing pulse of light leaves Earth. Each beat, it reaches a farther destination and the camera has to zoom out again.
- A **travel-time clock** is the hero UI element, a precise digital readout shared across the film: 1.3 s → 8:20 → 4 h → 23 h → 4.2 years → tens of thousands of years → 13+ billion years.
- The scale bar (env) reads in light-travel time.

**World:** top-down space in metres, Earth at the origin. `camera.js` exports `C`, `LY`, `R_EARTH`, `MOON`, `SUN`, `NEPTUNE`, `VOYAGER`, `PROXIMA`, `GALAXY{x, y, r}`, `DEEP_R`. `env.js` exports `lightTime(m)`. Objects at true positions and sizes, with min-px markers when sub-pixel.

**Look:** premium astronomy visualisation. Deep black, the Earth as a refined small globe, the Moon in grey, the Sun as a glowing disc, thin orbit lines, Voyager as a tiny probe silhouette, the Milky Way as a refined spiral (arms, dust lanes, a core glow), and a deep field of many small galaxies. The photon is a bright, hot white-gold head with a long fading trail (additive). Accent `[255, 225, 140]`. No cartoon faces or emoji.

**Motion:** the photon is the focal point of every travel. It **arrives** exactly when the narrator names the destination, then the clock locks with a tick and the label lands. Zooms are the camera's job (keys in `camera.js`); you animate the photon, trail, clock and destination reveals.

## Timing (build/timeline.json, ~58.9 s)

Beats start at: 0.0, 3.1, 7.2, 11.7, 14.9, 18.0, 22.9, 26.1, 32.5, 37.8, 44.1, 50.6, 53.7.

| beat | content | camera |
|---|---|---|
| 0 | hook "How fast is light, really?" | Earth, 26 km/px |
| 1 | 299,792 km/s | Earth |
| 2 | 7.5 laps around Earth in 1 s | Earth |
| 3 | Moon 1.28 s | 470 km/px |
| 4 | Sun 8 min 20 s | 1.9e5 km/px |
| 5 | "you're seeing it as it was 8 min ago" | hold |
| 6 | Neptune ≈ 4 h | 1e7 km/px |
| 7 | Voyager 1 ≈ 23 h ("almost a full day") | 3.2e7 km/px |
| 8 | Proxima 4.24 years | 4.8e10 km/px |
| 9 | Milky Way: far side tens of thousands of years | galaxy |
| 10 | deep field: 13+ billion years | 1.45e20 km/px |
| 11–12 | "fastest thing… still too big for it" | hold |

## Scenes

- **s00-hook.js** (no captions, no chapter): a photon streaking across black, leaving a trail that writes the headline's underline. Headline `HOW FAST IS` / `LIGHT?` ("LIGHT?" in accent), readable ≥ 1.2 s. Earth enters by the end.
- **s01-one-second.js:** the Earth globe (refined: ocean, land hints, terminator, atmosphere) drawn in world space at the origin; it stays for the whole film. A large speed readout "299,792 km/s" counts up.
- **s02-around-earth.js:** the photon wraps around Earth's limb **7.5 times in exactly 1.0 s** (a lap counter 1 → 7.5), then a "1 second" stamp. Label "7.5 laps" / "around Earth in one second".
- **s03-moon.js:** the Moon at `MOON` (true size and distance); the photon travels Earth → Moon in true-to-life 1.28 s while the clock runs. Label "1.3 s" / "Earth to Moon".
- **s04-sun.js:** the Sun at `SUN`; the photon travels from the Sun to Earth (timeline-compressed). The clock runs to 8:20. Label "8 min 20 s".
- **s05-old-light.js:** the Sun shown as a "photograph" of the past: a subtle frame and a "8 MINUTES AGO" timestamp overlay.
- **s06-neptune.js, s07-voyager.js:** Neptune's orbit and Neptune; the clock runs to ≈ 4 h. Voyager 1 as a tiny probe far beyond the planets at `VOYAGER`; clock ≈ 23 h ("almost a full day").
- **s08-proxima.js:** zoom out; the solar system collapses into a point. Proxima (a red dwarf glow) at `PROXIMA`; clock 4.24 years.
- **s09-milky-way.js:** a refined Milky Way spiral at `GALAXY` (radius 50,000 ly) with "you are here". The far side is marked: "light from here: ~75,000 years".
- **s10-deep-field.js, s11-fastest.js, s12-too-big.js** (one builder): a deep field of thousands of tiny galaxies (deterministic, LOD), with the clock racing to "13+ billion years". Then the photon trail is drawn across everything ("the fastest thing"), and a final hold on the vast field.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests". If several scenes need the same clock component, the beat-1 builder may export it from `s01-one-second.js` for the others to import (import only; never edit another builder's file).
