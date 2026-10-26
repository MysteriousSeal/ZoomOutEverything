# Creative brief — Zoom Out 07: How Small Is an Atom, Really? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../03-how-deep-is-the-ocean/scenes/`, `../01-a-billion-dollars-in-cash/scenes/`.

## The film

A powers-of-ten **zoom into a single hair**:
- hair (70 µm) → ten red blood cells across it → a bacterium → a virus → a DNA strand → its atoms;
- back out to show half a million atoms across that hair;
- back in to one atom, which is almost entirely empty: scaled to a football stadium, the nucleus is a grain of sand on the centre spot and the electrons a faint haze in the stands;
- finally, all the way out to a person: "including the atoms that make up you".

**World:** metres, everything nested near the origin. `camera.js` exports `P` (positions: cell, bact, virus, dna, atom) and `SIZE`. Draw in world space with true sizes. Each object must still be correctly placed when the camera is 10–1000× further out or in (draw it, or cull when < 1 px).

**Look:** a premium "scientific visualisation" look, like a high-end microscopy and molecular animation. Dark background with soft bokeh (`env.js`) and a microscope lens vignette while zoomed in.
- **Hair:** a cylinder with cuticle scales.
- **Red blood cells:** biconcave discs in deep red.
- **Bacterium:** a translucent rod with pili.
- **Virus:** a spiky capsid.
- **DNA:** a glowing double helix with base-pair rungs.
- **Atoms:** soft electron-cloud spheres.

Accent `[110, 240, 200]` for numbers and measuring lines. No cartoon faces or emoji.

**Motion:** each new level is **already there** inside the previous frame before the camera dives. The new object brightens and its size bracket draws in during the hold. Use a `dimension()` bracket or measure line for each size. One focal point per beat.

## Timing (build/timeline.json, ~59.5 s)

Beats start at: 0.0, 3.3, 7.9, 11.9, 16.7, 20.1, 24.9, 28.9, 34.5, 39.7, 46.9, 51.5, 54.5.

Camera (mpp = metres/px):
- **0–2:** hair (~1e-7)
- **3:** cell + bacterium (1.25e-8)
- **4:** bacterium + virus (1.6e-9)
- **5:** DNA (3e-11)
- **6:** atom (1.2e-12)
- **7:** back out to the hair (9e-8)
- **8–11:** one atom (≈ 4e-13)
- **12:** out to a 1.75 m person (3.6e-3), head at the origin

## Scenes

- **s00-hook.js** (no captions, no chapter): a macro hair crossing the frame diagonally into horizontal, with a soft rim light. Headline `HOW SMALL IS` / `AN ATOM?` ("ATOM?" in accent), readable ≥ 1.2 s.
- **s01-hair.js:** the hair (70 µm wide along y = 0, cuticle detail) with a width bracket. Label "≈ 70 µm" / "a human hair".
- **s02-blood-cells.js:** ten red blood cells (7 µm) line up ACROSS the hair, staggered in. Label "≈ 7 µm" / "ten span the hair".
- **s03-bacterium.js:** the camera dives toward cell #5 (`P.cell`); a rod bacterium (1 µm × 2 µm) at `P.bact`. Label "≈ 1 µm" / "7× smaller than the cell".
- **s04-virus.js:** a virus (100 nm) at `P.virus` beside the bacterium. Label "≈ 100 nm" / "10× smaller still".
- **s05-dna.js:** a double helix strand (2 nm wide) passing `P.dna`. Label "2 nm" / "the DNA double helix".
- **s06-atom.js:** atoms on the strand as glowing spheres; one highlighted at `P.atom`. Label "≈ 0.1 nm" / "one atom".
- **s07-half-million.js:** back out at the hair; a counter climbs to ≈ 500,000 as a line of atoms "spans" the hair (a dense glowing line with a bracket). Label "≈ 500,000" / "atoms across one hair".
- **s08-empty.js:** one atom up close: a faint electron haze and a tiny bright nucleus point. Most of it is visibly empty.
- **s09-stadium.js, s10-electrons.js, s11-empty-space.js** (one builder): the atom **morphs into a football stadium** (overlay, screen space: a refined top-down stadium with a pitch, stands and lights). The nucleus becomes a **grain of sand on the centre spot** with an inset. The electrons become a faint haze over the stands. Then everything between dims ("99.9999…% empty").
- **s12-you.js:** the camera pulls all the way out through the levels to a person silhouette (head at the origin), ending on the final line.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests".
