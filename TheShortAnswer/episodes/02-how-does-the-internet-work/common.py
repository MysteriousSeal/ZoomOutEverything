"""Shared drawing toolkit — documentary motion-graphics style.

Flat vector shapes on a supersampled canvas, a separate light layer that is
blurred and screened on top (glow), plus vignette and film grain.
"""
import math
import random
from functools import lru_cache

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
SS = 2    # main canvas supersampling
GS = 0.5  # glow layer scale (cheap blur at half resolution)

FONT_AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
FONT_HELV = "/System/Library/Fonts/HelveticaNeue.ttc"  # has λ, subscripts, superscripts
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"
HEAVY, DEMI, MEDIUM = 8, 2, 5

WHITE = (255, 255, 255)
SPACE = (5, 8, 22)
ACCENT = (125, 200, 255)
WARM = (255, 170, 90)

SKY_DAY = ((0.0, (18, 70, 170)), (0.5, (52, 128, 225)), (1.0, (150, 200, 245)))
SKY_DEEP = ((0.0, (4, 8, 24)), (0.6, (10, 22, 52)), (1.0, (16, 36, 78)))
SKY_SUNSET = ((0.0, (28, 22, 70)), (0.45, (150, 60, 90)), (0.75, (240, 120, 70)), (1.0, (255, 190, 110)))
SKY_DUSK_DEEP = ((0.0, (14, 10, 34)), (0.6, (40, 22, 60)), (1.0, (70, 34, 70)))


def wavelength_rgb(nm):
    """Approximate visible colour of a wavelength (380–750 nm)."""
    if nm < 440:
        r, g, b = -(nm - 440) / 60, 0.0, 1.0
    elif nm < 490:
        r, g, b = 0.0, (nm - 440) / 50, 1.0
    elif nm < 510:
        r, g, b = 0.0, 1.0, -(nm - 510) / 20
    elif nm < 580:
        r, g, b = (nm - 510) / 70, 1.0, 0.0
    elif nm < 645:
        r, g, b = 1.0, -(nm - 645) / 65, 0.0
    else:
        r, g, b = 1.0, 0.0, 0.0
    f = 0.3 + 0.7 * (nm - 380) / 40 if nm < 420 else 0.3 + 0.7 * (750 - nm) / 50 if nm > 700 else 1.0
    return tuple(int(255 * (c * f) ** 0.8) for c in (r, g, b))


SPECTRUM = [680, 620, 580, 530, 475, 445, 410]  # nm: red ... violet
SPECTRUM_RGB = [wavelength_rgb(nm) for nm in SPECTRUM]
BLUE_RGB = (70, 150, 255)
RED_RGB = (255, 70, 60)


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_col(c1, c2, t):
    return tuple(int(round(lerp(a, b, t))) for a, b in zip(c1, c2))


def prog(t, start, dur):
    if dur <= 0:
        return float(t >= start)
    return clamp((t - start) / dur)


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_in(t):
    return t ** 3


def ease_in_out(t):
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def mix_stops(s1, s2, k):
    return tuple((p, lerp_col(c1, c2, k)) for (p, c1), (_, c2) in zip(s1, s2))


@lru_cache(maxsize=8)
def sky_image(stops):
    ys = np.linspace(0, 1, H * SS)
    pos = [p for p, _ in stops]
    col = np.stack([np.interp(ys, pos, [c[i] for _, c in stops]) for i in range(3)], axis=1)
    arr = np.broadcast_to(col.astype(np.uint8)[:, None, :], (H * SS, W * SS, 3))
    return Image.fromarray(np.ascontiguousarray(arr), "RGB")


@lru_cache(maxsize=None)
def font(size, index=HEAVY, path=FONT_AVENIR):
    return ImageFont.truetype(path, int(size * SS), index=index)


def _vignette():
    y, x = np.mgrid[0:H, 0:W]
    d = np.sqrt(((x - W / 2) / (W * 0.75)) ** 2 + ((y - H / 2) / (H * 0.7)) ** 2)
    v = np.clip(1.05 - 0.55 * d ** 2, 0.55, 1.0)
    return (v * 255).astype(np.uint8)


VIGNETTE = Image.fromarray(_vignette(), "L").convert("RGB")
_grain_rng = np.random.default_rng(1)
# film grain at half resolution: reads as organic grain and keeps the H.264 bitrate sane
GRAIN = [np.repeat(np.repeat(_grain_rng.normal(0, 3.5, (H // 2, W // 2)), 2, 0), 2, 1)[:, :, None].astype(np.int16)
         for _ in range(6)]


class Canvas:
    """All coordinates are in final 1080x1920 pixels."""

    def __init__(self, bg, frame=0):
        self.img = bg.copy()
        self.d = ImageDraw.Draw(self.img, "RGBA")
        self.glow = Image.new("RGB", (int(W * GS), int(H * GS)))
        self.g = ImageDraw.Draw(self.glow, "RGBA")
        self.frame = frame
        self.fade = 0.0  # dip to black, 0..1

    @staticmethod
    def _box(cx, cy, rx, ry, s):
        return [(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s]

    # --- sharp layer
    def ellipse(self, cx, cy, rx, ry, fill=None, outline=None, width=0):
        if rx > 0.3 and ry > 0.3:
            self.d.ellipse(self._box(cx, cy, rx, ry, SS), fill=fill, outline=outline,
                           width=max(1, int(width * SS)))

    def circle(self, cx, cy, r, fill=None, outline=None, width=0):
        self.ellipse(cx, cy, r, r, fill, outline, width)

    def line(self, pts, fill=WHITE, width=4):
        self.d.line([(x * SS, y * SS) for x, y in pts], fill=fill, width=max(1, int(width * SS)), joint="curve")

    def poly(self, pts, fill):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=fill)

    def rect(self, x0, y0, x1, y1, fill):
        self.d.rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=fill)

    def rrect(self, x0, y0, x1, y1, r, fill=None, outline=None, width=0):
        if x1 - x0 > 1 and y1 - y0 > 1:
            self.d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=min(r, (x1 - x0) / 2.01, (y1 - y0) / 2.01) * SS,
                                     fill=fill, outline=outline, width=max(1, int(width * SS)))

    def arc(self, cx, cy, r, a0, a1, fill, width):
        self.d.arc(self._box(cx, cy, r, r, SS), a0, a1, fill=fill, width=max(1, int(width * SS)))

    def text(self, x, y, s, size, fill=WHITE, index=HEAVY, path=FONT_AVENIR, anchor="mm", stroke=0,
             stroke_fill=(0, 0, 0, 150)):
        self.d.text((x * SS, y * SS), s, font=font(size, index, path), fill=fill, anchor=anchor,
                    stroke_width=int(stroke * SS), stroke_fill=stroke_fill)

    def tint(self, rgba):
        self.d.rectangle([0, 0, W * SS, H * SS], fill=rgba)

    # --- light layer (blurred + screened on top)
    def gcircle(self, cx, cy, r, fill):
        if r > 0.3:
            self.g.ellipse(self._box(cx, cy, r, r, GS), fill=fill)

    def gline(self, pts, fill, width):
        self.g.line([(x * GS, y * GS) for x, y in pts], fill=fill, width=max(1, int(width * GS)), joint="curve")

    def garc(self, cx, cy, r, a0, a1, fill, width):
        self.g.arc(self._box(cx, cy, r, r, GS), a0, a1, fill=fill, width=max(1, int(width * GS)))

    def glow_line(self, pts, color, width, glow=3.0):
        """A bright stroke: sharp core + soft halo."""
        self.gline(pts, color, width * glow)
        self.line(pts, color, width)

    def out(self):
        img = self.img.reduce(SS)
        g1 = self.glow.filter(ImageFilter.GaussianBlur(5))
        g2 = self.glow.filter(ImageFilter.GaussianBlur(22))
        img = ImageChops.screen(img, ImageChops.add(g1, g2).resize((W, H), Image.BILINEAR))
        img = ImageChops.multiply(img, VIGNETTE)
        arr = np.asarray(img).astype(np.int16) + GRAIN[self.frame % len(GRAIN)]
        if self.fade:
            arr = arr * (1 - self.fade)
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


# ---------------------------------------------------------------- scene elements

rng = random.Random(11)
STARS = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(0.8, 2.4), rng.uniform(0, 6.28)) for _ in range(160)]


def draw_stars(c, gt, alpha=1.0, max_y=H):
    for x, y, r, ph in STARS:
        if y < max_y:
            a = alpha * (0.55 + 0.45 * math.sin(gt * 2 + ph))
            c.circle(x, y, r, fill=(255, 255, 255, int(220 * a)))


def soft_glow(c, x, y, r, color, intensity=1.0, steps=12, behind=False):
    """Radial falloff built from stacked translucent discs.

    By default it goes on the light layer (screened over everything); with
    behind=True it is painted on the main canvas so later shapes occlude it.
    """
    a = int(clamp(intensity) * 255 / steps * 2.2)
    draw = c.circle if behind else c.gcircle
    for k in range(steps):
        rr = r * (1 - k / steps) ** 1.4
        if behind:
            draw(x, y, rr, fill=color + (a,))
        else:
            draw(x, y, rr, color + (a,))


def draw_sun(c, x, y, r, core=(255, 250, 235), halo=(255, 220, 150), glow=1.0, behind=False):
    soft_glow(c, x, y, r * 4.5, halo, 0.55 * glow, steps=20 if behind else 12, behind=behind)
    if behind:
        soft_glow(c, x, y, r * 1.8, lerp_col(halo, core, 0.5), 0.9, steps=10, behind=True)
    else:
        c.gcircle(x, y, r * 1.5, tuple(int(clamp(v * 0.9 * glow / 255) * 255) for v in halo))
    c.circle(x, y, r, fill=core)


def sine_points(x0, y0, x1, y1, wavelength, amp, phase, step=4, y_spread=0.0):
    """Points of a sine wave travelling along the segment (x0,y0)->(x1,y1)."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    if length < 1:
        return [(x0, y0), (x0, y0)]
    ux, uy = dx / length, dy / length
    pts = []
    for i in range(int(length / step) + 1):
        s = i * step
        o = amp * math.sin(2 * math.pi * s / wavelength - phase)
        pts.append((x0 + ux * s - uy * o, y0 + uy * s + ux * o + y_spread * s / length))
    return pts


def draw_molecule(c, x, y, ang, r, kind="N", alpha=1.0):
    """Diatomic molecule (N2 or O2) as two shaded spheres."""
    base = (150, 170, 205) if kind == "N" else (215, 150, 150)
    dx, dy = math.cos(ang) * r * 0.62, math.sin(ang) * r * 0.62
    a = int(255 * alpha)
    for sx in (-1, 1):
        px, py = x + sx * dx, y + sx * dy
        c.circle(px, py, r, fill=lerp_col(base, (20, 25, 50), 0.45) + (a,))
        c.circle(px - r * 0.12, py - r * 0.14, r * 0.82, fill=base + (a,))
        c.circle(px - r * 0.35, py - r * 0.38, r * 0.25, fill=(255, 255, 255, int(110 * alpha)))


def hills(c, layers, gt=0.0):
    """Layered silhouettes: list of (base_y, amplitude, freq, phase, color)."""
    for base, amp, freq, ph, col in layers:
        pts = [(x, base - amp * (0.6 * math.sin(x * freq + ph) + 0.4 * math.sin(x * freq * 2.3 + ph * 1.7)))
               for x in range(-20, W + 40, 20)]
        c.poly(pts + [(W + 40, H + 10), (-20, H + 10)], fill=col)


def draw_person(c, x, y, s=1.0, col=(8, 10, 22), head_tilt=-0.35):
    """Standing adult silhouette seen from behind, feet at (x, y), looking up."""
    def P(px, py):
        return x + px * s, y + py * s
    for sx in (-1, 1):
        c.poly([P(sx * 1, -98), P(sx * 17, -98), P(sx * 14, -4), P(sx * 4, -4)], fill=col)
        c.ellipse(*P(sx * 10, -3), 9 * s, 5 * s, fill=col)
        c.line([P(sx * 23, -142), P(sx * 27, -112), P(sx * 26, -82)], fill=col, width=9 * s)
        c.circle(*P(sx * 26, -80), 5 * s, fill=col)
        c.circle(*P(sx * 19, -144), 8 * s, fill=col)
    c.poly([P(-20, -152), P(20, -152), P(26, -142), P(18, -96), P(-18, -96), P(-26, -142)], fill=col)
    c.rect(*P(-6, -166), *P(6, -148), fill=col)
    hx, hy = P(4 * math.sin(head_tilt), -174)
    c.ellipse(hx, hy, 13 * s, 16 * s, fill=col)


def eye_point(x, y, s=1.0):
    return x, y - 176 * s


# ---------------------------------------------------------------- typography

def spaced_text(c, x, y, s, size, fill, tracking=0.18, index=DEMI, anchor_center=True):
    f = font(size, index)
    gap = size * tracking * SS
    widths = [f.getlength(ch) for ch in s]
    total = sum(widths) + gap * (len(s) - 1)
    px = x * SS - total / 2 if anchor_center else x * SS
    for ch, w in zip(s, widths):
        c.d.text((px, y * SS), ch, font=f, fill=fill, anchor="lm")
        px += w + gap
    return total / SS


def draw_chapter(c, num, label, t, accent=ACCENT, y=255):
    """Small chapter marker at the top: '02 ─── THE SPECTRUM'."""
    k = ease_out(prog(t, 0.0, 0.5))
    if k <= 0:
        return
    a = int(255 * k)
    shift = (1 - k) * 14
    tw = spaced_text(c, 540 + shift, y, label, 34, (255, 255, 255, int(a * 0.92)))
    left = 540 - tw / 2 + shift
    c.text(left - 76, y, num, 34, fill=accent + (a,), index=HEAVY, anchor="mm")
    c.line([(left - 44, y), (left - 18, y)], fill=accent + (a,), width=2.5)


def annotation(c, x, y, s, t, size=36, fill=(220, 232, 255), anchor="lm", path=FONT_HELV, index=0):
    k = ease_out(prog(t, 0, 0.4))
    if k <= 0:
        return
    y += (1 - k) * 10
    l, tp, r, b = c.d.textbbox((x * SS, y * SS), s, font=font(size, index, path), anchor=anchor)
    pad = 12 * SS
    c.d.rounded_rectangle([l - pad, tp - pad * 0.7, r + pad, b + pad * 0.7], radius=10 * SS,
                          fill=(4, 8, 24, int(150 * k)))
    c.text(x, y, s, size, fill=fill + (int(245 * k),), path=path, index=index, anchor=anchor)


CAPTION_Y = 1300


def draw_caption(c, words, active, age, accent=ACCENT):
    size = 70
    while True:
        f = font(size, HEAVY)
        space = f.getlength(" ")
        widths = [f.getlength(w) for w in words]
        total = sum(widths) + space * (len(words) - 1)
        if total <= 920 * SS or size <= 44:
            break
        size -= 4
    k = ease_out(prog(age, 0, 0.15))
    y = (CAPTION_Y + (1 - k) * 10) * SS
    x = 540 * SS - total / 2
    for i, (w, ww) in enumerate(zip(words, widths)):
        col = accent if i == active else WHITE
        c.d.text((x, y), w, font=f, fill=col + (int(255 * (0.4 + 0.6 * k)),), anchor="lm",
                 stroke_width=int(4 * SS), stroke_fill=(5, 8, 20, 170))
        x += ww + space
