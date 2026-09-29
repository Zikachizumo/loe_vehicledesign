import { S, set, toast, pushRecentColor } from '../store';
import { T } from '../i18n';
import { editor, type Pt, type PointerInfo, type ToolHandler } from './editor';
import { RasterEdit } from './doc';
import type { Layer, ShapeKind } from './types';
import { layerMatrix, measureText } from './render';
import { floodMask, maskToImage } from './floodfill';
import { clamp, copyCanvas, ctx2d, hexToRgb, makeCanvas, scratch } from './util';
import { runtime } from '../runtime';
import { decalPng } from './decals';

// ============ Ortak: firca ucu (dab) ============

type Tip = 'round' | 'marker' | 'square' | 'spray';

function makeDab(size: number, hardness: number, color: string, tip: Tip): HTMLCanvasElement {
  const d = Math.max(2, Math.ceil(size));
  const c = makeCanvas(d);
  const g = ctx2d(c);
  const r = d / 2;
  g.fillStyle = color;
  if (tip === 'square') {
    g.fillRect(0, 0, d, d);
  } else if (tip === 'marker') {
    g.translate(r, r);
    g.rotate(-Math.PI / 5);
    g.beginPath();
    g.ellipse(0, 0, r, r * 0.32, 0, 0, Math.PI * 2);
    g.fill();
  } else if (tip === 'spray') {
    // spray her dab'da rastgele cizilir (asagida)
  } else {
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    const [cr, cg, cb] = hexToRgb(color);
    const h = clamp(hardness, 0, 0.99);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
    grad.addColorStop(h, `rgba(${cr},${cg},${cb},1)`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function spray(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const r = size / 2;
  g.fillStyle = color;
  const n = Math.max(8, Math.round(size * 0.6));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * r;
    const s = Math.max(1, size * 0.018 * (0.6 + Math.random()));
    g.globalAlpha = 0.35 + Math.random() * 0.65;
    g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s);
  }
  g.globalAlpha = 1;
}

/** p0 -> p1 arasini esit aralikla dab'la. Dikis (UV ada) sicramalarinda boslugu atla. */
function stampLine(p0: Pt, p1: Pt, spacing: number, jumpLimit: number, fn: (p: Pt) => void) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.hypot(dx, dy);
  if (dist > jumpLimit) {
    fn(p1);
    return;
  }
  const n = Math.max(1, Math.floor(dist / spacing));
  for (let i = 1; i <= n; i++) fn({ x: p0.x + (dx * i) / n, y: p0.y + (dy * i) / n });
}

function newRasterLayer(name: string, opacity = 1): Layer | undefined {
  if (!editor.doc || !editor.canAdd()) return;
  const l = { ...editor.base('raster', name), type: 'raster', opacity } as Layer;
  editor.addLayer(l, { commit: false });
  return l;
}

function liveCanvas(): HTMLCanvasElement {
  const size = editor.doc!.size;
  const c = scratch('stroke', size);
  ctx2d(c).clearRect(0, 0, size, size);
  return c;
}

function mergeLive(): void {
  const doc = editor.doc!;
  const live = doc.live;
  if (!live) return;
  const g = ctx2d(doc.raster(live.layerId));
  g.save();
  g.globalAlpha = live.alpha;
  g.globalCompositeOperation = live.mode === 'erase' ? 'destination-out' : 'source-over';
  g.drawImage(live.canvas, 0, 0);
  g.restore();
  doc.live = null;
}

// ============ SEC / TASI ============

const select: ToolHandler & { wheel?: (dir: number, e: { shift: boolean; ctrl: boolean }) => void } = (() => {
  let drag: {
    id: string;
    kind: 'move' | 'scale' | 'rot';
    start: Pt;
    last: Pt;
    orig: Layer;
    moved: boolean;
  } | null = null;
  let wheelTimer = 0;
  return {
    down(p: Pt, e: PointerInfo) {
      const cur = editor.selected();
      if (e.handle && cur && !cur.locked) {
        drag = { id: cur.id, kind: e.handle === 'rot' ? 'rot' : 'scale', start: p, last: p, orig: { ...cur }, moved: false };
        return;
      }
      const hit = editor.hitTest(p);
      if (!hit) {
        editor.select(null);
        drag = null;
        return;
      }
      editor.select(hit.id);
      drag = { id: hit.id, kind: 'move', start: p, last: p, orig: { ...hit }, moved: false };
    },
    move(p: Pt, e: PointerInfo) {
      if (!drag) return;
      const l = editor.doc?.layer(drag.id);
      if (!l) return;
      const size = editor.doc!.size;
      if (drag.kind === 'move') {
        // 3D'de UV dikisleri arasinda sicrama olursa hareketi yut
        const jump = Math.hypot(p.x - drag.last.x, p.y - drag.last.y);
        if (e.source === '3d' && jump > size * 0.2) {
          drag.last = p;
          drag.start = { x: drag.start.x + (p.x - drag.last.x), y: drag.start.y + (p.y - drag.last.y) };
          return;
        }
        l.x += p.x - drag.last.x;
        l.y += p.y - drag.last.y;
        if (l.type === 'gradient') {
          /* konumsuz */
        }
        drag.last = p;
      } else if (drag.kind === 'scale') {
        const m = new DOMMatrix().translateSelf(drag.orig.x, drag.orig.y).rotateSelf(drag.orig.rotation).inverse();
        const q = m.transformPoint(new DOMPoint(p.x, p.y));
        let w = Math.max(4, Math.abs(q.x) * 2);
        let h = Math.max(4, Math.abs(q.y) * 2);
        if (e.shift || l.type === 'text' || l.type === 'splat') {
          const k = Math.max(w / drag.orig.w, h / drag.orig.h);
          w = drag.orig.w * k;
          h = drag.orig.h * k;
        }
        l.w = w;
        l.h = h;
      } else {
        let a = (Math.atan2(p.y - l.y, p.x - l.x) * 180) / Math.PI + 90;
        if (e.shift) a = Math.round(a / 15) * 15;
        l.rotation = ((a % 360) + 360) % 360;
      }
      drag.moved = true;
      l.rev++;
      editor.invalidate();
    },
    up() {
      if (drag?.moved) editor.commit(drag.kind === 'move' ? 'Katman taşındı' : drag.kind === 'scale' ? 'Katman boyutlandı' : 'Katman döndürüldü');
      drag = null;
    },
    cancel() {
      drag = null;
    },
    wheel(dir: number, e: { shift: boolean; ctrl: boolean }) {
      const l = editor.selected();
      if (!l || l.locked || l.type === 'fill' || l.type === 'gradient') return;
      if (e.shift) {
        const k = dir > 0 ? 0.94 : 1.06;
        l.w *= k;
        l.h *= k;
      } else if (e.ctrl) {
        l.rotation = (((l.rotation + (dir > 0 ? -4 : 4)) % 360) + 360) % 360;
      }
      l.rev++;
      editor.invalidate();
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => editor.commit('Katman düzenlendi'), 400);
    },
  };
})();

// ============ FIRCA ============

const brush: ToolHandler = (() => {
  let st: { layer: Layer; last: Pt; dab: HTMLCanvasElement; size: number; edit: RasterEdit | null; tip: Tip; color: string } | null = null;
  const dabAt = (p: Pt) => {
    if (!st) return;
    const g = ctx2d(editor.doc!.live!.canvas);
    if (st.tip === 'spray') spray(g, p.x, p.y, st.size, st.color);
    else g.drawImage(st.dab, p.x - st.dab.width / 2, p.y - st.dab.height / 2);
    st.edit?.mark(p.x, p.y, st.size);
  };
  return {
    down(p) {
      const doc = editor.doc;
      if (!doc) return;
      const o = S().opts.brush;
      const color = S().color;
      let layer = editor.selected();
      let edit: RasterEdit | null = null;
      let alpha = o.opacity;
      if (o.newLayer || !layer || layer.type !== 'raster' || layer.locked) {
        layer = newRasterLayer(T.layers.names.brush, o.opacity);
        if (!layer) return;
        alpha = 1;
      } else {
        edit = new RasterEdit(doc, layer.id);
      }
      const k = editor.rasterScale(layer);
      const size = o.size * k;
      doc.live = { layerId: layer.id, canvas: liveCanvas(), alpha, mode: 'paint' };
      const q = editor.toRaster(layer, p);
      st = { layer, last: q, dab: makeDab(size, o.hardness, color, o.tip), size, edit, tip: o.tip, color };
      dabAt(q);
      pushRecentColor(color);
      editor.invalidate();
    },
    move(p) {
      if (!st) return;
      const q = editor.toRaster(st.layer, p);
      stampLine(st.last, q, Math.max(1, st.size * (st.tip === 'spray' ? 0.3 : 0.12)), st.size * 6, dabAt);
      st.last = q;
      editor.invalidate();
    },
    up() {
      if (!st) return;
      mergeLive();
      const patch = st.edit?.finish(editor.doc!);
      st.layer.rev++;
      editor.commit(T.layers.names.brush, patch ? [patch] : []);
      st = null;
    },
    cancel() {
      if (editor.doc) editor.doc.live = null;
      st = null;
    },
  };
})();

// ============ SILGI ============

const eraser: ToolHandler = (() => {
  let st: { layer: Layer; last: Pt; dab: HTMLCanvasElement; size: number; edit: RasterEdit } | null = null;
  const dabAt = (p: Pt) => {
    if (!st) return;
    ctx2d(editor.doc!.live!.canvas).drawImage(st.dab, p.x - st.dab.width / 2, p.y - st.dab.height / 2);
    st.edit.mark(p.x, p.y, st.size);
  };
  return {
    down(p) {
      const doc = editor.doc;
      if (!doc) return;
      let layer = editor.selected();
      if (!layer || layer.locked) {
        toast(T.options.selectLayerFirst, 'info');
        return;
      }
      if (layer.type !== 'raster') layer = editor.rasterize(layer.id);
      if (!layer) return;
      const o = S().opts.eraser;
      const size = o.size * editor.rasterScale(layer);
      doc.live = { layerId: layer.id, canvas: liveCanvas(), alpha: o.opacity, mode: 'erase' };
      const q = editor.toRaster(layer, p);
      st = { layer, last: q, dab: makeDab(size, o.hardness, '#000000', 'round'), size, edit: new RasterEdit(doc, layer.id) };
      dabAt(q);
      editor.invalidate();
    },
    move(p) {
      if (!st) return;
      const q = editor.toRaster(st.layer, p);
      stampLine(st.last, q, Math.max(1, st.size * 0.12), st.size * 6, dabAt);
      st.last = q;
      editor.invalidate();
    },
    up() {
      if (!st) return;
      mergeLive();
      const patch = st.edit.finish(editor.doc!);
      st.layer.rev++;
      editor.commit('Silgi', patch ? [patch] : []);
      st = null;
    },
    cancel() {
      if (editor.doc) editor.doc.live = null;
      st = null;
    },
  };
})();

// ============ SICRAT ============

const splat: ToolHandler = {
  down(p) {
    const doc = editor.doc;
    if (!doc || !editor.canAdd()) return;
    const o = S().opts.splat;
    const color = S().color;
    // splat cizimi 1024 kutuda merkez govde yaricapi 0.13*1024 -> kutu = size / 0.13 / 2 * 2
    const box = (o.size / (0.13 * 1024)) * 1024 * 0.5;
    const l = {
      ...editor.base('splat', T.layers.names.splat),
      type: 'splat',
      seed: Math.floor(Math.random() * 1e9),
      color,
      energy: o.energy,
      droplets: o.droplets,
      drips: o.drips,
      x: p.x,
      y: p.y,
      w: box,
      h: box,
      rotation: Math.random() * 360,
    } as Layer;
    pushRecentColor(color);
    editor.addLayer(l, { index: doc.layers.length, commit: 'Boya fırlatıldı' });
  },
};

// ============ DOLGU ============

const fill: ToolHandler = {
  down(p) {
    const doc = editor.doc;
    if (!doc || !editor.canAdd()) return;
    const o = S().opts.fill;
    const color = S().color;
    pushRecentColor(color);
    const whole = () => {
      const l = { ...editor.base('fill', T.layers.names.fill), type: 'fill', color } as Layer;
      editor.addLayer(l, { index: 0, commit: 'Dolgu' });
    };
    if (o.mode === 'whole') return whole();
    let src: ImageData;
    let tol = o.tolerance;
    if (o.mode === 'panel') {
      if (!runtime.islandMask) {
        toast(T.toast.fillPanelNeeds3d, 'info');
        return;
      }
      src = ctx2d(runtime.islandMask).getImageData(0, 0, doc.size, doc.size);
      tol = 1;
    } else {
      doc.compose();
      src = ctx2d(doc.out).getImageData(0, 0, doc.size, doc.size);
    }
    const mask = floodMask(src, p.x, p.y, tol);
    const { img, count } = maskToImage(mask, doc.size, doc.size, hexToRgb(color));
    if (!count) return;
    if (o.mode === 'region' && count > doc.size * doc.size * 0.995) return whole();
    const l = { ...editor.base('raster', o.mode === 'panel' ? 'Panel Dolgusu' : T.layers.names.fill), type: 'raster' } as Layer;
    const c = doc.raster(l.id);
    const g = ctx2d(c);
    g.putImageData(img, 0, 0);
    // kenar boslugunu kapatmak icin 1px genislet
    const tmp = copyCanvas(c);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(tmp, dx, dy);
    editor.addLayer(l, { commit: o.mode === 'panel' ? 'Panel boyandı' : 'Bölge dolduruldu' });
  },
};

// ============ YAZI ============

const text: ToolHandler = {
  down(p) {
    const doc = editor.doc;
    if (!doc || !editor.canAdd()) return;
    const o = S().opts.text;
    if (!o.text.trim()) return;
    const max = S().config?.limits.maxTextLength ?? 64;
    const l = {
      ...editor.base('text', o.text.slice(0, 24)),
      type: 'text',
      text: o.text.slice(0, max),
      font: o.font,
      size: o.size,
      color: S().color,
      bold: o.bold,
      italic: o.italic,
      stroke: o.stroke,
      strokeWidth: o.strokeWidth,
      spacing: o.spacing,
      x: p.x,
      y: p.y,
    } as Layer;
    const m = measureText(l as Parameters<typeof measureText>[0]);
    l.w = m.w;
    l.h = m.h;
    editor.refitText(l);
    pushRecentColor(S().color);
    editor.addLayer(l, { index: doc.layers.length, commit: 'Yazı eklendi' });
  },
};

// ============ SEKIL ============

const shapeAspect: Record<ShapeKind, [number, number]> = {
  rect: [1.6, 1],
  roundrect: [1.6, 1],
  ellipse: [1, 1],
  ring: [1, 1],
  triangle: [1, 0.9],
  diamond: [0.8, 1],
  star: [1, 1],
  hexagon: [1.1, 1],
  chevron: [1, 0.7],
  arrow: [1.6, 0.8],
  stripes: [0.55, 2.4],
  bolt: [0.6, 1],
};

const shapes: ToolHandler = {
  down(p) {
    const doc = editor.doc;
    if (!doc || !editor.canAdd()) return;
    const o = S().opts.shapes;
    const [aw, ah] = shapeAspect[o.kind];
    const l = {
      ...editor.base('shape', T.layers.names.shape),
      type: 'shape',
      shape: o.kind,
      fill: S().color,
      filled: o.filled,
      stroke: o.filled ? o.stroke : S().color,
      strokeWidth: o.filled ? o.strokeWidth : Math.max(4, o.strokeWidth || 10),
      x: p.x,
      y: p.y,
      w: o.size * aw,
      h: o.size * ah,
    } as Layer;
    pushRecentColor(S().color);
    editor.addLayer(l, { index: doc.layers.length, commit: 'Şekil eklendi' });
  },
};

// ============ KALEM ============

const pen: ToolHandler = (() => {
  let st: { layer: Layer; pts: Pt[]; size: number; color: string } | null = null;
  const redraw = (shift: boolean) => {
    if (!st) return;
    const g = ctx2d(editor.doc!.live!.canvas);
    const size = editor.doc!.size;
    g.clearRect(0, 0, size, size);
    g.strokeStyle = st.color;
    g.lineWidth = st.size;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const pts = shift && st.pts.length > 1 ? [st.pts[0], st.pts[st.pts.length - 1]] : st.pts;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    if (pts.length < 3) {
      for (const q of pts.slice(1)) g.lineTo(q.x, q.y);
      if (pts.length === 1) g.lineTo(pts[0].x + 0.1, pts[0].y);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        // dikis sicramasinda cizgiyi kopar
        if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > st.size * 12) g.moveTo(pts[i].x, pts[i].y);
        else g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const last = pts[pts.length - 1];
      g.lineTo(last.x, last.y);
    }
    g.stroke();
  };
  return {
    down(p) {
      const doc = editor.doc;
      if (!doc) return;
      const o = S().opts.pen;
      const layer = newRasterLayer(T.layers.names.pen, o.opacity);
      if (!layer) return;
      doc.live = { layerId: layer.id, canvas: liveCanvas(), alpha: 1, mode: 'paint' };
      st = { layer, pts: [p], size: o.size, color: S().color };
      pushRecentColor(st.color);
      redraw(false);
      editor.invalidate();
    },
    move(p, e) {
      if (!st) return;
      const last = st.pts[st.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
      st.pts.push(p);
      redraw(e.shift);
      editor.invalidate();
    },
    up(_p, e) {
      if (!st) return;
      redraw(e.shift);
      mergeLive();
      st.layer.rev++;
      editor.commit(T.layers.names.pen);
      st = null;
    },
    cancel() {
      if (editor.doc) editor.doc.live = null;
      st = null;
    },
  };
})();

// ============ RENK GECISI ============

const gradient: ToolHandler = (() => {
  let st: { layer: Layer; start: Pt } | null = null;
  return {
    down(p) {
      const doc = editor.doc;
      if (!doc || !editor.canAdd()) return;
      const l = {
        ...editor.base('gradient', T.layers.names.gradient),
        type: 'gradient',
        kind: S().opts.gradient.kind,
        c1: S().color,
        c2: S().color2,
        x1: p.x,
        y1: p.y,
        x2: p.x + 1,
        y2: p.y + 1,
      } as Layer;
      editor.addLayer(l, { commit: false });
      st = { layer: l, start: p };
    },
    move(p) {
      if (!st || st.layer.type !== 'gradient') return;
      st.layer.x2 = p.x;
      st.layer.y2 = p.y;
      st.layer.rev++;
      editor.invalidate();
    },
    up(p) {
      if (!st || st.layer.type !== 'gradient') return;
      const size = editor.doc!.size;
      if (Math.hypot(p.x - st.start.x, p.y - st.start.y) < size * 0.01) {
        Object.assign(st.layer, { x1: size / 2, y1: 0, x2: size / 2, y2: size });
      }
      editor.commit('Renk geçişi');
      st = null;
    },
    cancel() {
      st = null;
    },
  };
})();

// ============ GORSEL / CIKARTMA ============

const image: ToolHandler = {
  down(p) {
    const src = S().pendingImage || S().recentImages[0]?.src;
    if (!src) {
      toast(T.hints.image, 'info');
      return;
    }
    void editor.addImage(src, T.layers.names.image, p, S().opts.image.size);
  },
};

const decal: ToolHandler = {
  down(p) {
    const o = S().opts.decal;
    const color = S().color;
    pushRecentColor(color);
    void decalPng(o.id, color).then((src) => {
      if (src) void editor.addImage(src, T.layers.names.decal, p, o.size, 'Çıkartma eklendi');
    });
  },
};

// ============ KLON ============

const clone: ToolHandler = (() => {
  let st: { layer: Layer; last: Pt; offset: Pt; src: HTMLCanvasElement; size: number; mask: HTMLCanvasElement } | null = null;
  const dabAt = (p: Pt) => {
    if (!st) return;
    const d = st.mask.width;
    const r = d / 2;
    const dc = scratch('cloneDab', d);
    const g = ctx2d(dc);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, d, d);
    g.drawImage(st.src, p.x + st.offset.x - r, p.y + st.offset.y - r, d, d, 0, 0, d, d);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(st.mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    ctx2d(editor.doc!.live!.canvas).drawImage(dc, p.x - r, p.y - r);
  };
  return {
    down(p, e) {
      const doc = editor.doc;
      if (!doc) return;
      if (e.alt) {
        set({ cloneSource: { x: p.x, y: p.y } });
        toast('Klon kaynağı seçildi', 'ok');
        return;
      }
      const source = S().cloneSource;
      if (!source) {
        toast(T.options.cloneSource, 'info');
        return;
      }
      doc.compose();
      const snap = copyCanvas(doc.out);
      const layer = newRasterLayer(T.layers.names.clone);
      if (!layer) return;
      const o = S().opts.clone;
      doc.live = { layerId: layer.id, canvas: liveCanvas(), alpha: 1, mode: 'paint' };
      st = {
        layer,
        last: p,
        offset: { x: source.x - p.x, y: source.y - p.y },
        src: snap,
        size: o.size,
        mask: makeDab(o.size, o.hardness, '#000000', 'round'),
      };
      dabAt(p);
      editor.invalidate();
    },
    move(p) {
      if (!st) return;
      stampLine(st.last, p, Math.max(1, st.size * 0.15), st.size * 6, dabAt);
      st.last = p;
      editor.invalidate();
    },
    up() {
      if (!st) return;
      mergeLive();
      st.layer.rev++;
      editor.commit(T.layers.names.clone);
      st = null;
    },
    cancel() {
      if (editor.doc) editor.doc.live = null;
      st = null;
    },
  };
})();

// ============ KARISTIR (SMUDGE) ============

const smudge: ToolHandler = (() => {
  let st: { layer: Layer; last: Pt; size: number; strength: number; mask: HTMLCanvasElement; edit: RasterEdit } | null = null;
  const step = (from: Pt, to: Pt) => {
    if (!st) return;
    const canvas = editor.doc!.raster(st.layer.id);
    const d = st.mask.width;
    const r = d / 2;
    const dc = scratch('smudgeDab', d);
    const g = ctx2d(dc);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, d, d);
    g.drawImage(canvas, from.x - r, from.y - r, d, d, 0, 0, d, d);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(st.mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    const cg = ctx2d(canvas);
    cg.save();
    cg.globalAlpha = st.strength;
    cg.drawImage(dc, to.x - r, to.y - r);
    cg.restore();
    st.edit.mark(to.x, to.y, d);
  };
  return {
    down(p) {
      const doc = editor.doc;
      if (!doc) return;
      let layer = editor.selected();
      if (!layer || layer.locked) {
        toast(T.options.selectLayerFirst, 'info');
        return;
      }
      if (layer.type !== 'raster') layer = editor.rasterize(layer.id);
      if (!layer) return;
      const o = S().opts.smudge;
      const size = o.size * editor.rasterScale(layer);
      st = {
        layer,
        last: editor.toRaster(layer, p),
        size,
        strength: o.strength,
        mask: makeDab(size, 0.2, '#000000', 'round'),
        edit: new RasterEdit(doc, layer.id),
      };
    },
    move(p) {
      if (!st) return;
      const q = editor.toRaster(st.layer, p);
      let prev = st.last;
      stampLine(st.last, q, Math.max(1, st.size * 0.2), st.size * 6, (pt) => {
        step(prev, pt);
        prev = pt;
      });
      st.last = q;
      st.layer.rev++;
      editor.invalidate();
    },
    up() {
      if (!st) return;
      const patch = st.edit.finish(editor.doc!);
      editor.commit('Karıştırma', patch ? [patch] : []);
      st = null;
    },
    cancel() {
      st = null;
    },
  };
})();

// ============ DAMLALIK ============

const pick: ToolHandler = {
  down(p) {
    const c = editor.samplePreview(p);
    if (!c) return;
    set({ color: c });
    pushRecentColor(c);
    toast(`Renk alındı: ${c.toUpperCase()}`, 'ok');
  },
};

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  select,
  brush,
  eraser,
  splat,
  fill,
  text,
  shapes,
  pen,
  gradient,
  image,
  decal,
  clone,
  smudge,
  pick,
};

export function wheelSelect(dir: number, e: { shift: boolean; ctrl: boolean }) {
  select.wheel?.(dir, e);
}

/** Bu arac 3D'de govdeye tiklayinca boyama yapar mi (yoksa kamera mi doner)? */
export function toolPaints(tool: string): boolean {
  return tool in TOOL_HANDLERS;
}

export function cursorFor(tool: string): string {
  if (tool === 'select') return 'default';
  if (tool === 'pick') return 'copy';
  return 'crosshair';
}

export { layerMatrix };
