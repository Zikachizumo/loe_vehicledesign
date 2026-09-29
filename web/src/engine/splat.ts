import { ctx2d, makeCanvas, rng } from './util';

// Prosedurel boya sicramasi. Ayni (seed, energy, droplets, drips) -> ayni sekil.
// Cizim birim kutusu: 1024x1024, merkez (512, 512). Katman w/h ile olceklenir.

export const SPLAT_RES = 1024;
const cache = new Map<string, HTMLCanvasElement>();

export function splatKey(seed: number, color: string, energy: number, droplets: number, drips: boolean) {
  return `${seed}|${color}|${energy}|${droplets}|${drips ? 1 : 0}`;
}

export function getSplat(seed: number, color: string, energy: number, droplets: number, drips: boolean): HTMLCanvasElement {
  const key = splatKey(seed, color, energy, droplets, drips);
  const hit = cache.get(key);
  if (hit) return hit;
  const c = renderSplat(seed, color, energy, droplets, drips);
  cache.set(key, c);
  if (cache.size > 96) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return c;
}

function renderSplat(seed: number, color: string, energy: number, droplets: number, drips: boolean) {
  const S = SPLAT_RES;
  const c = makeCanvas(S);
  const g = ctx2d(c);
  const r = rng(seed);
  const cx = S / 2;
  const cy = S / 2;
  const e = energy / 100;
  const R = S * 0.13; // govde yaricapi
  g.fillStyle = color;
  g.strokeStyle = color;

  // 1) Govde: gurultulu kapali egri
  const N = 26;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = R * (0.72 + r() * (0.35 + e * 0.45));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  g.beginPath();
  const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as const;
  const m0 = mid(pts[N - 1], pts[0]);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % N]);
    g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  g.closePath();
  g.fill();

  // 2) Kollar: sivrilen isinlar + uc damlasi
  const arms = Math.round(5 + e * 14 + r() * 4);
  for (let i = 0; i < arms; i++) {
    const a = r() * Math.PI * 2;
    const len = R * (0.9 + r() * (0.8 + e * 2.2));
    const w0 = R * (0.12 + r() * 0.22);
    const bx = cx + Math.cos(a) * R * 0.5;
    const by = cy + Math.sin(a) * R * 0.5;
    const tx = cx + Math.cos(a) * len;
    const ty = cy + Math.sin(a) * len;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const tipW = w0 * (0.18 + r() * 0.25);
    g.beginPath();
    g.moveTo(bx + nx * w0, by + ny * w0);
    g.quadraticCurveTo(
      (bx + tx) / 2 + nx * w0 * 0.35,
      (by + ty) / 2 + ny * w0 * 0.35,
      tx + nx * tipW,
      ty + ny * tipW,
    );
    g.lineTo(tx - nx * tipW, ty - ny * tipW);
    g.quadraticCurveTo(
      (bx + tx) / 2 - nx * w0 * 0.35,
      (by + ty) / 2 - ny * w0 * 0.35,
      bx - nx * w0,
      by - ny * w0,
    );
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(tx, ty, tipW * (1.4 + r() * 1.2), 0, Math.PI * 2);
    g.fill();
  }

  // 3) Damlaciklar: merkezden uzaklastikca kuculur
  const drops = Math.round((droplets / 100) * 60);
  for (let i = 0; i < drops; i++) {
    const a = r() * Math.PI * 2;
    const t = r();
    const dist = R * (1.25 + t * (1.6 + e * 1.8));
    const rad = R * (0.02 + (1 - t) * 0.1 * (0.4 + r()));
    const x = cx + Math.cos(a) * dist;
    const y = cy + Math.sin(a) * dist;
    if (x < rad || y < rad || x > S - rad || y > S - rad) continue;
    g.beginPath();
    g.ellipse(x, y, rad * (1 + r() * 0.5), rad, a, 0, Math.PI * 2);
    g.fill();
  }

  // 4) Akintilar: asagi dogru sarkan damlalar
  if (drips) {
    const n = 3 + Math.round(r() * 4);
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * R * 1.5;
      const y0 = cy + R * (0.2 + r() * 0.4);
      const len = R * (0.8 + r() * 2.4);
      const w = R * (0.06 + r() * 0.1);
      const y1 = Math.min(S - w * 3, y0 + len);
      g.beginPath();
      g.moveTo(x - w, y0);
      g.lineTo(x - w * 0.8, y1);
      g.arc(x, y1, w * 1.25, Math.PI, 0, true);
      g.lineTo(x + w, y0);
      g.closePath();
      g.fill();
    }
  }
  return c;
}
