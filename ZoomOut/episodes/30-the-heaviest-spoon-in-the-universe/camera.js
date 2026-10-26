// Camera for "The Heaviest Spoon in the Universe" (Zoom Out 30, True Scale, ≈ 52.8 s).
//
// WORLD (metres, y DOWN): the neutron star's centre is the origin, radius R = 10 km (20 km wide). The teaspoon floats
// 2.6 km above its north limb (SPOON). Everything is drawn at TRUE SCALE in this one world, so the opening pull-back
// from a 14 cm teaspoon to a 20 km star is one continuous zoom (≈ 13 nats).
//
// SHOTS (start = voice timeline, so the camera follows a re-cut voice):
//   hook      beat 0   spoon macro: bowl at screen (420, 1300), slow pull-back from 0.86× (mpp 8.6e-5)
//   star      beat 1   PULL OUT spoon → star (1.7 s): star centre (540, 900), r ≈ 200 px (mpp 50)
//   balance   beat 2   small push while the mass card is up
//   city      beat 2   phrase 1: top-down over the city at true scale, star r ≈ 320 px (mpp 31)
//   dive      beat 3   dive INTO the star (0.9 s) as the inside backdrop takes over
//   dollop    beat 3   hidden cut (backdrop opaque) to an extreme close-up of the spoon's dollop (its lattice)
//   spoon     beat 4   pull out of the dollop: the packed neutrons shrink into the spoon (bowl at (330, 640))
//   spin      beat 5   PULL OUT spoon → star again: star centre (540, 1010), r ≈ 220 px
//   surface   beat 6   low over the north limb: surface top at y ≈ 1250 (mpp 15, r ≈ 667 px)
//   question  beat 7   star low under the card (centre y 1560)
import * as L from '../../../engine/runtime/lib.js';

const { W, H } = L;
export const R = 10000;                         // neutron-star radius (m): 20 km across
export const SPOON = { x: 0, y: -R - 700 };       // teaspoon bowl centre (world)
export const SPOON_ANG = (25 * Math.PI) / 180;   // spoon axis (bowl → handle), clockwise from +x
// dollop centre: slightly toward the tip of the bowl from the bowl centre
export const DOLLOP = { x: SPOON.x - 0.0015 * Math.cos(SPOON_ANG) - 0.0006 * Math.sin(SPOON_ANG), y: SPOON.y - 0.0015 * Math.sin(SPOON_ANG) + 0.0006 * Math.cos(SPOON_ANG) };   // = env DOL
export const DOLLOP_SCREEN = { x: 330, y: 590 };  // where the dollop sits on screen through the beat-4 pull-out
export const MPP_CUT = 5.2e-6;                    // dollop close-up: the dollop covers the whole frame
export const MPP_SPOON4 = 1.9e-4;

/** beat i start (+dt) */
export const B = (i, dt = 0) => (tl) => tl.scenes[i].start + dt;
/** phrase j of line i (+dt) */
export const PH = (i, j, edge = 'start', dt = 0) => (tl) => {
  const ln = tl.lines[i], ph = ln.phrases ?? [ln];
  return ph[Math.min(j, ph.length - 1)][edge] + dt;
};
/** camera that puts world point p at screen (sx, sy) (anchor 0.5) */
export const place = (p, sx, sy, mpp) => ({ x: p.x - (sx - W / 2) * mpp, y: p.y - (sy - H / 2) * mpp, mpp });

const O = { x: 0, y: 0 };
export const FRAME = {
  hook: place(SPOON, 420, 1300, 8.6e-5),
  star: place(O, 540, 900, 50),
  balance: place(O, 540, 930, 46),
  city: place(O, 540, 900, 31),
  dive: place({ x: 0, y: -R * 0.25 }, 540, 960, 0.9),
  dollop: place(DOLLOP, DOLLOP_SCREEN.x, DOLLOP_SCREEN.y, MPP_CUT),
  spoon: place(DOLLOP, DOLLOP_SCREEN.x, DOLLOP_SCREEN.y, MPP_SPOON4),
  spin: place(O, 540, 1010, 45),
  surface: place(O, 540, 1250 + R / 15, 15),
  question: place(O, 540, 1560, 40),
};

// at: start time (fn of tl) · travel (s) · push: mpp factor over the hold that follows
export const SHOTS = [
  { name: 'star', at: B(1, -0.35), ...FRAME.star, travel: 1.8, push: 0.95, ease: 'whoosh' },
  { name: 'balance', at: B(2, -0.1), ...FRAME.balance, travel: 0.8, push: 0.97 },
  { name: 'city', at: PH(2, 1, 'start', -0.2), ...FRAME.city, travel: 1.2, push: 0.96 },
  { name: 'dive', at: B(3, -0.3), ...FRAME.dive, travel: 0.9, push: 0.9 },
  { name: 'dollop', at: B(3, 1.6), ...FRAME.dollop, travel: 0, push: 1 },
  { name: 'spoon', at: B(4, -0.02), ...FRAME.spoon, travel: 1.25, push: 0.97 },
  { name: 'spin', at: B(5, -0.5), ...FRAME.spin, travel: 1.6, push: 0.95, ease: 'whoosh' },
  { name: 'surface', at: B(6, -0.2), ...FRAME.surface, travel: 0.95, push: 0.985 },
  { name: 'question', at: B(7, -0.15), ...FRAME.question, travel: 1.5, push: 0.97 },
];

// 'whoosh': the true-scale spoon → star pull-outs cross ≈ 4 nats where neither the spoon nor the star reads; an
// inOutQuint profile spends the time at the ends (spoon shrinking, star arriving) and rushes that dead middle (≈ 0.13 s)
const EASES = { whoosh: (k) => (k < 0.5 ? 16 * k ** 5 : 1 - 16 * (1 - k) ** 5) };
function travel(a, b, k, ease) {
  const e = (EASES[ease] ?? L.ease.inOutCubic)(k);
  const la = Math.log(a.mpp), lb = Math.log(b.mpp);
  const mpp = Math.exp(L.lerp(la, lb, e));
  // big zooms: pan linear in mpp, so the point both framings share stays put on screen
  const ep = Math.abs(lb - la) > 1 ? L.clamp((mpp - a.mpp) / (b.mpp - a.mpp)) : e;
  return { x: L.lerp(a.x, b.x, ep), y: L.lerp(a.y, b.y, ep), mpp };
}

function base(gt, tl) {
  const h = FRAME.hook;
  const t1 = SHOTS[0].at(tl);
  if (gt < t1) return { x: h.x, y: h.y, mpp: h.mpp * L.lerp(0.86, 1, L.ease.inOutCubic(L.prog(gt, 0, t1))) };
  let state = { x: h.x, y: h.y, mpp: h.mpp };
  for (let i = 0; i < SHOTS.length; i++) {
    const s = SHOTS[i], t0 = s.at(tl);
    if (gt < t0) break;
    const k = s.travel > 0 ? L.prog(gt, t0, s.travel) : 1;
    if (k < 1) return travel(state, s, k, s.ease);
    const next = SHOTS[i + 1] ? SHOTS[i + 1].at(tl) : tl.total;
    const hold = Math.max(0.01, next - (t0 + s.travel));
    const pk = L.ease.inOutCubic(L.prog(gt, t0 + s.travel, hold));
    // the push zooms about the same screen point the shot frames (camera centre scaled about the framed point)
    state = { x: s.x, y: s.y, mpp: s.mpp * L.lerp(1, s.push ?? 0.97, pk) };
    if (s.name === 'spoon' || s.name === 'dollop') {
      const f = state.mpp / s.mpp;   // keep the dollop pinned at DOLLOP_SCREEN while pushing
      state.x = DOLLOP.x - (DOLLOP_SCREEN.x - W / 2) * s.mpp * f;
      state.y = DOLLOP.y - (DOLLOP_SCREEN.y - H / 2) * s.mpp * f;
    }
    if (gt < next) return state;
  }
  return state;
}

export function at(gt, tl) {
  const cam = base(gt, tl);
  const drift = 3;
  cam.x += L.noise1(gt * 0.3, 1) * drift * cam.mpp;
  cam.y += L.noise1(gt * 0.27, 2) * drift * cam.mpp;
  cam.anchor = 0.5;
  return cam;
}
export const KEYS = SHOTS;
