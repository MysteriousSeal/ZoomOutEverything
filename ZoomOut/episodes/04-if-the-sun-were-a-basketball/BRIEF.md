# Creative brief — Zoom Out 04: If the Sun Were a Basketball (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references for house style and code quality: `../03-how-deep-is-the-ocean/scenes/` and `../01-a-billion-dollars-in-cash/scenes/`.

## The film

**One continuous top-down pull-back.**
- A glowing basketball Sun sits on a dark plaza. With each line the camera pulls out and a new **orbit ring draws itself** around the Sun, until the rings span a whole town (Neptune at 776 m).
- Then the camera lifts off the map onto a **globe**: the Sun was in New York the whole time, and the nearest star is a ping-pong ball in Rome.
- The planets are mostly far too small to see at the ring's zoom, which is the point. Show each one with an elegant **magnifier callout**: a circular inset with a leader line to the body's true position, showing the object large (grain of sand, peppercorn, grape…) with its true size.

**Look:** premium night-time cartography. A dark ground; the ground texture (plaza tiles → park → town blocks) is handled by `env.js`. Thin warm orbit lines, a glowing Sun, refined planet renders inside the insets (subtle shading, Jupiter's bands, Saturn's ring, Mars rust, Earth's blue). Accent `[255, 160, 70]` for numbers and the active ring. No cartoon faces or emoji.

**Motion:** each orbit ring draws on from the Sun's direction with an eased sweep while the camera pulls back. The inset pops open (scale with overshoot), and the leader line draws itself. One focal point per beat: the new ring + its inset + its label. Earlier rings stay faint.

## Timing (build/timeline.json, ~59.7 s; lines with "|" have a pause, see `phrases`)

| beat | time | line | camera |
|------|------|------|--------|
| 0 | 0.00–4.26 | "Shrink the Sun down to the size of a basketball." | basketball close-up (0.75 mm/px) |
| 1 | 4.26–8.29 | "Mercury becomes a grain of sand, ten meters away." | Mercury ring (r 10 m) |
| 2 | 8.29–12.09 | "Venus, a peppercorn, about nineteen meters out." | Venus ring (18.7 m) |
| 3 | 12.09–16.00 | "Earth is a peppercorn too, twenty-six meters away." | Earth ring (25.8 m) |
| 4 | 16.00–20.04 | "And the Moon? A speck of dust, a hand's width from Earth." | macro on Earth (0.28 mm/px) |
| 5 | 20.04–23.85 | "Mars, a mustard seed, thirty-nine meters out." | Mars ring (39.3 m) |
| 6 | 23.85–27.86 | "Jupiter, a grape, a hundred and thirty meters away." | Jupiter ring (134 m), park scale |
| 7 | 27.86–32.09 | "Saturn, a smaller grape, two hundred and fifty meters out." | Saturn ring (247 m) |
| 8 | 32.09–39.04 | "Uranus and Neptune, two coffee beans, … half a kilometer and nearly eight hundred meters away." | whole system, town scale |
| 9 | 39.04–44.87 | "That's the whole solar system: … a basketball, a few crumbs, and a lot of nothing." | hold, breathing room |
| 10 | 44.87–49.72 | "And the nearest star? … Another ball, a ping-pong ball this time…" | lift off to the globe (13 km/px) |
| 11 | 49.72–52.71 | "as far away as New York is from Rome." | the flight arc |
| 12 | 52.71–59.66 | "Space isn't crowded. … It's almost entirely empty." | wide, dim globe |

## World layout (camera.js header + exports)

- Top-down metres; the Sun at the origin, 24 cm across.
- `PLANETS[name] = [orbit radius m, angle °, scaled diameter m]`, plus `pos(name)`, `MOON`, `moonPos()`.
- `env.js` exports:
  - `orbitRing(ctx, v, r, k, a0, alpha)`
  - globe helpers: `globeXY(lat, lon)` (NY = origin), `GLOBE_C`, `R_EARTH`, `NEW_YORK`, `ROME`
  - `globeK(v)`: the ground → globe hand-over, 0..1 by zoom.

## Scenes

### s00-sun.js (beat 0; hook, no captions, no chapter)
- The **basketball Sun**: a hot glowing sphere with a soft limb-darkened surface and faint granulation shimmer. In this hook it's also clearly a basketball-sized object: overlay faint basketball seam lines that cross-fade into the Sun's glow, and stand a 1.75 m person silhouette beside it (top-down that reads poorly, so use a short side-on hook card that then tilts or cross-fades to the top-down view by the end of the beat).
- **Headline:** `IF THE SUN WERE A` / `BASKETBALL` (accent), masked and staggered, readable ≥ 1.2 s, gone by the end of the beat. A small "24 cm" dimension.
- The Sun must be drawn in world space at true size (0.24 m) for every later beat too. It stays the anchor of the whole film, always glowing (glow radius clamped in px so it stays visible as a dot at town scale).

### s01-mercury.js … s07-saturn.js (one body per beat)
For each: draw its orbit ring (`orbitRing`, drawn on during the beat, faint afterwards), the body at `pos(name)` as a tiny true-size dot with a min-px marker, and a **magnifier inset** (≈ 220–260 px circle) with a leader line to the body. Inside the inset: the body rendered large, with a real-world comparison object drawn beside it (grain of sand, peppercorn, mustard seed, grape) and the true size.
- Label: `bigLabel` with the scaled size and the distance, e.g. "0.8 mm" / "10 m · 33 ft from the Sun".
- **s04-moon.js:** the macro beat. Earth (2.2 mm) and the Moon (0.6 mm, 6.6 cm away) at true size, plus a refined hand silhouette (fingertips) for scale: "a hand's width". Label "6.6 cm" / "Earth to Moon".
- Keep every inset clear of the caption band (y 1280–1390) and the top HUD (y < 300).

### s08-icegiants.js, s09-system.js
- **s08:** Uranus (495 m) and Neptune (776 m) rings plus two coffee-bean insets that open one after the other on their phrases.
- **s09:** the whole system at town scale. All rings faint, all bodies as tiny glowing markers, a "≈ 1.6 km" dimension across Neptune's orbit, and the words "a lot of nothing" landing on emptiness (the insets close).

### s10-star.js, s11-nyrome.js, s12-empty.js (one builder: they share the globe)
- **s10:** as `globeK` rises, a refined **globe** fades in: an ocean sphere, a subtle graticule, simplified but recognisable coastlines of North America, Europe and North Africa (hand-made polygons are fine; front hemisphere only via `globeXY(...).front`), and an atmosphere rim. The solar system collapses to a glowing point at New York (the origin). A **red ping-pong ball** (Proxima, 3.7 cm) appears at Rome with an inset.
- **s11:** a great-circle **flight arc** draws from New York to Rome, with a distance label "≈ 6,900 km" / "4,300 mi".
- **s12:** the globe dims to near-black and only two points of light remain, the Sun and the star. Final hold.

## Ownership

Each builder owns **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests".
