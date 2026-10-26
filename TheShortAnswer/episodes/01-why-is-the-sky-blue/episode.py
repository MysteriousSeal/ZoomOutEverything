"""Episode 01 — Why Is the Sky Blue? Script lines and the seven scenes.

Each scene maps to one narration line. Scene timing comes from the recorded
voice (build/timeline.json): every scene gets its local time `t`, its duration
`d`, and the global time `gt`. `cues(d)` lists sound effects as
(local_time, sfx_name, gain, pitch).
"""
import math
import random

from common import (ACCENT, BLUE_RGB, FONT_AVENIR, HEAVY, RED_RGB, SKY_DAY, SKY_DEEP, SKY_SUNSET, SPECTRUM,
                    SPECTRUM_RGB, WARM, WHITE, annotation, clamp, draw_molecule, draw_person, draw_stars,
                    draw_sun, ease_in_out, soft_glow, ease_out, eye_point, hills, lerp, lerp_col, mix_stops, prog,
                    sine_points)

TITLE = "Why Is the Sky Blue?"

LINES = [
    "Why is the sky blue?",
    "Sunlight looks white, but it's actually every color mixed together.",
    "In the atmosphere, it crashes into trillions of tiny air molecules.",
    "Blue light travels in short, choppy waves, so it gets scattered everywhere.",
    "Red light's long, lazy waves mostly pass straight through.",
    "So wherever you look, scattered blue light is coming at you.",
    "At sunset, light crosses so much more air that the blue scatters away, leaving the reds and oranges.",
]

rng = random.Random(5)
# x, y, radius, kind, angle, spin, drift phase — the first is the "hero" molecule at screen centre
FIELD = [(540, 960, 26, "N", 0.4, 0.5, 0.0)]
while len(FIELD) < 40:
    x, y = rng.uniform(50, 1030), rng.uniform(390, 1720)
    if all(math.hypot(x - fx, y - fy) > 120 for fx, fy, *_ in FIELD):
        FIELD.append((x, y, rng.uniform(12, 22), "N" if rng.random() < 0.78 else "O",
                      rng.uniform(0, 6.28), rng.uniform(-0.8, 0.8), rng.uniform(0, 6.28)))
CALLOUT_N = next(i for i, m in enumerate(FIELD) if m[3] == "N" and i and 250 < m[0] < 800 and m[1] < 900)
CALLOUT_O = next(i for i, m in enumerate(FIELD) if m[3] == "O" and 200 < m[0] < 850)


def field_pos(i, gt):
    x, y, r, kind, ang, spin, ph = FIELD[i]
    return x + math.sin(gt * 0.6 + ph) * 10, y + math.cos(gt * 0.5 + ph * 1.3) * 10, r, kind, ang + spin * gt


def draw_field(c, gt, t=None, alpha=1.0):
    for i in range(len(FIELD)):
        x, y, r, kind, ang = field_pos(i, gt)
        k = 1.0 if t is None else ease_out(prog(t, 0.02 * i, 0.4))
        if k > 0:
            draw_molecule(c, x, y, ang, r * (0.6 + 0.4 * k), kind, alpha * k)


def ring(c, x, y, radius, alpha, color=BLUE_RGB, width=3):
    if radius > 1 and alpha > 0.01:
        c.arc(x, y, radius, 0, 360, color + (int(200 * alpha),), width)
        c.garc(x, y, radius, 0, 360, tuple(int(v * alpha * 0.9) for v in color), width * 5)


SCATTER_SKY = ((0.0, (8, 26, 70)), (0.6, (18, 60, 140)), (1.0, (30, 90, 180)))
SUNSET_LAYERS = [(1500, 40, 0.004, 1.0, (130, 62, 82)), (1585, 50, 0.006, 2.0, (66, 30, 58)),
                 (1665, 30, 0.009, 0.5, (16, 10, 26))]
DAY_LAYERS = [(1500, 40, 0.004, 1.0, (78, 128, 180)), (1585, 50, 0.006, 2.0, (40, 74, 112)),
              (1665, 30, 0.009, 0.5, (12, 20, 38))]
PERSON = (540, 1652, 1.35)


class Scene:
    chapter = None
    captions = True

    def sky(self, t, d):
        return SKY_DEEP

    def accent(self, t, d):
        return ACCENT

    def cues(self, d):
        return []

    def draw(self, c, t, d, gt):
        raise NotImplementedError


class Hook(Scene):
    captions = False

    def cues(self, d):
        return [(0.0, "impact", 0.7, 1.0), (0.45, "shimmer", 0.35, 1.0)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt)
        z = ease_out(prog(gt, 0, 3))
        r, top = lerp(1750, 1850, z), lerp(1190, 1120, z)
        cy = top + r
        c.circle(540, cy, r, fill=(10, 32, 80))
        c.circle(600, cy + 90, r - 110, fill=(16, 56, 128))
        for k in range(5):
            c.arc(540, cy, r - 40 - k * 32, 250 + k * 4, 300 - k * 3, (255, 255, 255, 34), 12)
        c.arc(540, cy, r + 2, 180, 360, (170, 220, 255, 230), 3)
        c.garc(540, cy, r + 8, 180, 360, (110, 180, 255), 22)
        c.garc(540, cy, r + 30, 180, 360, (40, 100, 220), 70)
        sx = 880
        sy = cy - math.sqrt(r * r - (sx - 540) ** 2) - 26
        draw_sun(c, sx, sy, 16, glow=1.8)
        c.gline([(sx - 420, sy), (sx + 420, sy)], (90, 140, 230), 5)
        for line, y, size, col, st in [("WHY IS THE SKY", 640, 88, WHITE, 0.0), ("BLUE?", 770, 150, ACCENT, 0.4)]:
            k = ease_out(prog(t, st, 0.5))
            if k > 0:
                c.text(540, y + (1 - k) * 24, line, size, fill=col + (int(255 * k),), index=HEAVY, path=FONT_AVENIR)


class Spectrum(Scene):
    chapter = ("01", "SUNLIGHT")
    SUN, SPLIT = (120, 760), (430, 960)

    def cues(self, d):
        return [(0.0, "blip", 0.3, 1.0), (0.05, "whoosh", 0.4, 1.0), (0.55, "shimmer", 0.45, 1.0)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.35)
        (sx, sy), (px, py) = self.SUN, self.SPLIT
        draw_sun(c, sx, sy, 62, glow=1.3)
        p = ease_in_out(prog(t, 0.0, 0.6))
        c.glow_line([(sx, sy), (lerp(sx, px, p), lerp(sy, py, p))], WHITE, 9, glow=4)
        if t < 0.55:
            return
        c.gcircle(px, py, 40, (200, 200, 200))
        x_end = lerp(px, 1110, ease_out(prog(t, 0.55, 1.0)))
        frac = (x_end - px) / (1110 - px)
        for i, (nm, col) in enumerate(zip(SPECTRUM, SPECTRUM_RGB)):
            pts = sine_points(px, py, x_end, py + (i - 3) * 58 * frac, nm * 0.16, 13, gt * 9)
            c.glow_line(pts, col, 4, glow=3.5)
        annotation(c, 700, 745, "700 nm · red", t - 1.1)
        annotation(c, 700, 1175, "400 nm · violet", t - 1.25)


class Atmosphere(Scene):
    chapter = ("02", "THE ATMOSPHERE")

    def cues(self, d):
        return [(0.0, "blip", 0.3, 1.0), (0.3, "whoosh", 0.35, 0.8), (0.9, "tick", 0.3, 1.0),
                (1.15, "tick", 0.3, 1.2)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.2)
        draw_field(c, gt, t)
        p = ease_in_out(prog(t, 0.3, 1.4))
        c.glow_line([(-40, 480), (lerp(-40, 1120, p), lerp(480, 1390, p))], WHITE, 6, glow=4)
        for idx, label, st in [(CALLOUT_N, "N₂ · nitrogen", 0.9), (CALLOUT_O, "O₂ · oxygen", 1.15)]:
            k = ease_out(prog(t, st, 0.4))
            if k <= 0:
                continue
            x, y, r, *_ = field_pos(idx, gt)
            right = x < 640
            lx = x + 60 if right else x - 60
            c.line([(x + (r + 6) * (1 if right else -1), y - r), (lx, y - r - 46 * k)], (220, 232, 255, int(200 * k)), 2)
            annotation(c, lx + (8 if right else -8), y - r - 46, label, t - st, anchor="lm" if right else "rm")
        annotation(c, 540, 420, "≈ 2.5 × 10²⁵ molecules in every m³ of air", t - 1.5, anchor="mm")


class BlueScatters(Scene):
    chapter = ("03", "BLUE LIGHT")
    Y = 960

    def hit(self, d):
        return 0.28 * d

    def sky(self, t, d):
        k = round(ease_out(prog(t, self.hit(d), d - self.hit(d))) * 60) / 60
        return mix_stops(SKY_DEEP, SCATTER_SKY, k)

    def cues(self, d):
        th = self.hit(d)
        prng = random.Random(9)
        return ([(0.0, "blip", 0.3, 1.0), (0.0, "whoosh", 0.3, 1.3), (th, "ping", 0.45, 1.0),
                 (th + 0.1, "shimmer", 0.4, 1.0)]
                + [(th + 0.3 + prng.uniform(0, d - th - 0.6), "ping", 0.12, prng.uniform(1.2, 2.0)) for _ in range(6)])

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.15)
        th = self.hit(d)
        x_head = lerp(-20, 540, ease_in_out(prog(t, 0, th)))
        if t < th + 0.4:
            fade = 1 - prog(t, th, 0.4)
            pts = sine_points(-20, self.Y, x_head, self.Y, 42, 18, gt * 16)
            c.glow_line(pts, lerp_col((0, 0, 0), BLUE_RGB, fade), 4, glow=3.5)
        annotation(c, 40, self.Y - 70, "λ ≈ 450 nm", t - 0.15)
        if t > th:
            prng = random.Random(4)
            for i in range(len(FIELD)):
                x, y, r, *_ = field_pos(i, gt)
                start = th if i == 0 else th + 0.15 + prng.uniform(0, 1.2)
                period = 0.35 if i == 0 else prng.uniform(0.5, 0.9)
                max_r = 520 if i == 0 else 230
                if t < start:
                    continue
                n = int((t - start) / period) + 1
                for k in range(max(0, n - 4), n):
                    rad = (t - start - k * period) * (900 if i == 0 else 380)
                    if 0 < rad < max_r:
                        ring(c, x, y, rad, (1 - rad / max_r) * (1.0 if i == 0 else 0.6))
            c.gcircle(540, self.Y, 70 * (1 - prog(t, th, 0.5)), (150, 200, 255))
        draw_field(c, gt)
        annotation(c, 540, 420, "scattered ≈ 6× more than red light", t - th - 0.4, anchor="mm")


class RedPasses(Scene):
    chapter = ("04", "RED LIGHT")
    Y = 1070

    def sky(self, t, d):
        return mix_stops(SCATTER_SKY, SKY_DEEP, round(ease_out(prog(t, 0, 0.8)) * 30) / 30)

    def cues(self, d):
        return [(0.0, "blip", 0.3, 1.0), (0.05, "whoosh", 0.4, 0.55)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.15)
        x_head = lerp(-20, 1120, prog(t, 0.05, 0.75 * d))
        c.glow_line(sine_points(-20, self.Y, x_head, self.Y, 120, 24, gt * 7), RED_RGB, 5, glow=3.5)
        for i in range(len(FIELD)):
            x, y, r, *_ = field_pos(i, gt)
            if abs(y - self.Y) < 140 and x < x_head:
                age = (x_head - x) / 1500
                ring(c, x, y, 20 + age * 160, 0.25 * (1 - clamp(age / 0.4)), RED_RGB, 2)
        draw_field(c, gt)
        annotation(c, 40, self.Y - 80, "λ ≈ 700 nm", t - 0.2)
        annotation(c, 540, 420, "barely scattered", t - 0.6, anchor="mm")


SKY_POINTS = [(rng.uniform(60, 1020), rng.uniform(380, 1250), rng.uniform(0, 1)) for _ in range(42)]


class Everywhere(Scene):
    chapter = ("05", "WHY IT LOOKS BLUE")

    def sky(self, t, d):
        return SKY_DAY

    def cues(self, d):
        return [(0.0, "swell", 0.45, 1.0), (0.15, "blip", 0.3, 1.0), (0.3, "shimmer", 0.3, 0.9)]

    def draw(self, c, t, d, gt):
        soft_glow(c, 1150, 120, 750, (255, 235, 190), 0.32, steps=28)
        hills(c, DAY_LAYERS)
        px, py, s = PERSON
        draw_person(c, px, py, s)
        ex, ey = eye_point(px, py, s)
        for j, (x, y, ph) in enumerate(SKY_POINTS):
            k = ease_out(prog(t, 0.2 + j * 0.025, 0.4))
            if k <= 0:
                continue
            c.line([(x, y), (ex, ey)], (210, 235, 255, int(26 * k)), 1.5)
            c.gcircle(x, y, 14 * k, (110, 170, 255))
            c.circle(x, y, 3.5 * k, fill=(230, 242, 255, int(255 * k)))
            f = (t * 0.8 + ph) % 1
            p1 = (lerp(x, ex, f), lerp(y, ey, f))
            p2 = (lerp(x, ex, min(1.0, f + 0.07)), lerp(y, ey, min(1.0, f + 0.07)))
            c.gline([p1, p2], tuple(int(v * k * (1 - f)) for v in (140, 200, 255)), 7)
            c.line([p1, p2], (200, 230, 255, int(230 * k * (1 - f * 0.6))), 2.5)


class Sunset(Scene):
    chapter = ("06", "SUNSET")
    EARTH = (540, 2550, 1350)
    SHELL = 150
    Y = 1193

    def dip(self, d):
        return 0.56 * d

    def sky(self, t, d):
        return SKY_DEEP if t < self.dip(d) else SKY_SUNSET

    def accent(self, t, d):
        return WARM if t > self.dip(d) else ACCENT

    def cues(self, d):
        dp = self.dip(d)
        return [(0.0, "blip", 0.3, 1.0), (0.12 * d, "whoosh", 0.3, 1.0), (0.22 * d, "whoosh", 0.35, 0.8),
                (0.3 * d, "shimmer", 0.3, 1.1), (dp - 1.0, "riser", 0.4, 1.0), (dp, "impact", 0.5, 0.8),
                (dp + 0.05, "bloom", 0.5, 1.0)]

    def draw_diagram(self, c, t, d, gt):
        draw_stars(c, gt, 0.5, max_y=1100)
        ex, ey, r = self.EARTH
        c.circle(ex, ey, r + self.SHELL, fill=(40, 110, 220, 60))
        c.garc(ex, ey, r + self.SHELL, 200, 340, (40, 90, 180), 10)
        c.circle(ex, ey, r, fill=(10, 30, 70))
        c.arc(ex, ey, r, 180, 360, (120, 180, 255, 160), 2)
        c.circle(540, ey - r, 7, fill=WHITE)
        c.gcircle(540, ey - r, 20, (180, 200, 255))
        annotation(c, 556, ey - r + 30, "you", t - 0.1)
        # noon: a short trip through the air
        p = ease_out(prog(t, 0.05, 0.12 * d))
        c.glow_line([(540, 430), (540, lerp(430, ey - r, p))], WHITE, 5, glow=3.5)
        annotation(c, 556, 560, "noon · thin layer of air", t - 0.12 * d)
        # sunset: a long, grazing path that stays inside the atmosphere
        q = ease_in_out(prog(t, 0.22 * d, 0.3 * d))
        x_head = lerp(1110, 548, q)
        pts = [(lerp(1110, x_head, i / 40), self.Y) for i in range(41)]
        for a, b in zip(pts, pts[1:]):
            travelled = (1110 - b[0]) / (1110 - 548)
            col = lerp_col(lerp_col(WHITE, (255, 190, 90), clamp(travelled * 1.8)), (255, 90, 50),
                           clamp(travelled * 1.6 - 0.6))
            c.glow_line([a, b], col, 6, glow=3.5)
        for k in range(14):
            bx = 1080 - k * 38
            if bx < x_head:
                break
            age = (bx - x_head) / 600
            ang = math.radians(-90 + (k * 47 % 70) - 35)
            ln = 50 + 60 * clamp(age * 3)
            a = (1 - clamp(age * 1.2)) * 0.9
            if a > 0:
                tip = (bx + math.cos(ang) * ln, self.Y + math.sin(ang) * ln)
                c.line([(bx, self.Y - 6), tip], BLUE_RGB + (int(230 * a),), 3)
                c.gline([(bx, self.Y - 6), tip], tuple(int(v * a) for v in BLUE_RGB), 12)
        annotation(c, 1000, 1060, "sunset · up to 40× more air", t - 0.25 * d, anchor="rm")

    def draw_landscape(self, c, t, gt):
        rise = ease_out(prog(t, 0, 2.5))
        draw_sun(c, 700, 1478 - 12 * rise, 62, core=(255, 236, 200), halo=(255, 150, 80), glow=1.6, behind=True)
        c.line([(-50, 1482), (1130, 1482)], (255, 170, 110, 70), 26)
        hills(c, SUNSET_LAYERS)
        px, py, s = PERSON
        draw_person(c, px, py, s, col=(10, 6, 16), head_tilt=0.25)

    def draw(self, c, t, d, gt):
        dp = self.dip(d)
        if t < dp:
            self.draw_diagram(c, t, d, gt)
        else:
            self.draw_landscape(c, t - dp, gt)
        c.fade = clamp(1 - abs(t - dp) / 0.3)


SCENES = [Hook(), Spectrum(), Atmosphere(), BlueScatters(), RedPasses(), Everywhere(), Sunset()]
