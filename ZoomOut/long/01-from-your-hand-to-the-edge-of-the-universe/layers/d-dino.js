// Builder D: a small silhouette of Eoraptor (an early, ~1 m long, bipedal dinosaur of the Late Triassic), facing right.
// Outline in a 120 x 62 box (y down); smoothed through its points.
const BODY = [
  [0, 25], [16, 22], [34, 18], [50, 14], [61, 12], [72, 13], [82, 16], [88, 15], [93, 10], [97, 5], [103, 2.5], [110, 3],
  [117, 5.5], [118, 7.5], [111, 9], [104, 10.5], [99, 13], [96, 19], [93, 26], [86, 31], [77, 33], [74, 37],
  [73, 44], [69, 53], [72, 56.5], [79, 58], [80, 60], [66, 60], [63.5, 57], [64, 49], [62, 41], [56, 34], [46, 30],
  [30, 28], [14, 27],
];
const ARM = [[90, 27], [95, 33], [100, 35.5], [100.5, 37.5], [96, 37], [91, 33], [87, 29]];
const FAR_LEG = [[66, 33], [64, 43], [59, 52], [62, 55.5], [70, 57.5], [70, 59.5], [57, 59.5], [55, 55], [57, 45], [56, 34]];

function smooth(c, pts) {
  c.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  for (let i = 1; i <= pts.length; i++) {
    const p = pts[i % pts.length], q = pts[(i + 1) % pts.length];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
}

/** Draw the silhouette with its box's top-left at (x, y), scaled by s. */
export function drawEoraptor(c, x, y, s, col, a = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.globalAlpha *= a;
  c.shadowColor = 'rgba(0,0,0,0.8)';
  c.shadowBlur = 8;
  c.fillStyle = col.replace('A', '0.62');
  c.beginPath(); smooth(c, FAR_LEG); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = col.replace('A', '1');
  c.beginPath(); smooth(c, BODY); c.fill();
  c.beginPath(); smooth(c, ARM); c.fill();
  // the eye
  c.fillStyle = 'rgba(10,12,18,0.9)';
  c.beginPath(); c.arc(107, 5.2, 1.1, 0, Math.PI * 2); c.fill();
  c.restore();
}
