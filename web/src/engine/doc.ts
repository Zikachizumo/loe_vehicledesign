import type { Layer, LayerFX, PaintSettings, SerializedDoc } from './types';
import { renderLayer, type RenderSources } from './render';
import { ctx2d, loadImage, makeCanvas, scratch } from './util';

export interface LiveStroke {
  layerId: string;
  canvas: HTMLCanvasElement; // raster piksel uzayinda (size x size)
  alpha: number;
  mode: 'paint' | 'erase';
}

export const defaultFx = (): LayerFX => ({
  shadow: { on: false, color: '#000000', blur: 18, dx: 8, dy: 8 },
  glow: { on: false, color: '#ffd36b', blur: 28 },
  outline: { on: false, color: '#000000', width: 6 },
});

export function cloneLayer<T extends Layer>(l: T): T {
  return {
    ...l,
    fx: {
      shadow: { ...l.fx.shadow },
      glow: { ...l.fx.glow },
      outline: { ...l.fx.outline },
    },
  };
}

/** Kaplama belgesi: katmanlar + raster pikselleri + birlesik cikti. */
export class LiveryDoc {
  size: number;
  model: string;
  name: string;
  paint: PaintSettings = { color: '#d9dbe0', finish: 'gloss', apply: false };
  fonts: { name: string; src: string }[] = [];
  layers: Layer[] = [];
  rasters = new Map<string, HTMLCanvasElement>();
  images = new Map<string, HTMLImageElement>();
  out: HTMLCanvasElement; // saydam kaplama (oyuna giden)
  preview: HTMLCanvasElement; // alt boya + kaplama (3D/UV onizleme)
  live: LiveStroke | null = null;
  version = 0;
  readonly src: RenderSources;

  constructor(size: number, model: string, name: string) {
    this.size = size;
    this.model = model;
    this.name = name;
    this.out = makeCanvas(size);
    this.preview = makeCanvas(size);
    this.src = {
      size,
      raster: (id) => this.rasterFor(id),
      image: (s) => this.images.get(s),
    };
  }

  private rasterFor(id: string) {
    const base = this.rasters.get(id);
    const live = this.live;
    if (!base || !live || live.layerId !== id) return base;
    const m = scratch('liveMerge', this.size);
    const g = ctx2d(m);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, this.size, this.size);
    g.drawImage(base, 0, 0);
    g.globalAlpha = live.alpha;
    g.globalCompositeOperation = live.mode === 'erase' ? 'destination-out' : 'source-over';
    g.drawImage(live.canvas, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    return m;
  }

  raster(id: string): HTMLCanvasElement {
    let c = this.rasters.get(id);
    if (!c) {
      c = makeCanvas(this.size);
      this.rasters.set(id, c);
    }
    return c;
  }

  layer(id: string | null | undefined): Layer | undefined {
    if (!id) return undefined;
    return this.layers.find((l) => l.id === id);
  }

  index(id: string) {
    return this.layers.findIndex((l) => l.id === id);
  }

  async ensureImage(src: string) {
    if (this.images.has(src)) return;
    const img = await loadImage(src);
    this.images.set(src, img);
  }

  compose() {
    const S = this.size;
    const g = ctx2d(this.out);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, S, S);
    for (const l of this.layers) renderLayer(g, l, this.src);

    const p = ctx2d(this.preview);
    p.globalCompositeOperation = 'source-over';
    p.globalAlpha = 1;
    p.fillStyle = this.paint.color;
    p.fillRect(0, 0, S, S);
    p.drawImage(this.out, 0, 0);
    this.version++;
  }

  /** Tek bir katmani kucuk onizleme tuvaline ciz (katman listesi icin). */
  thumb(l: Layer, target: HTMLCanvasElement) {
    const g = ctx2d(target);
    const t = target.width;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, t, t);
    const k = t / this.size;
    g.scale(k, k);
    renderLayer(g, { ...l, visible: true, opacity: 1, blend: 'source-over' } as Layer, this.src);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---- Kaydet / yukle ----
  serialize(): SerializedDoc {
    return {
      v: 1,
      model: this.model,
      size: this.size,
      name: this.name,
      paint: { ...this.paint },
      fonts: this.fonts.slice(),
      layers: this.layers.map((l) => {
        const { rev: _rev, ...rest } = l;
        void _rev;
        if (l.type === 'raster') {
          const c = this.rasters.get(l.id);
          return { ...rest, raster: c ? c.toDataURL('image/png') : undefined };
        }
        return rest;
      }),
    };
  }

  static async deserialize(data: SerializedDoc, size: number): Promise<LiveryDoc> {
    const doc = new LiveryDoc(size, data.model, data.name || 'Kaplama');
    if (data.paint) doc.paint = { ...doc.paint, ...data.paint };
    doc.fonts = Array.isArray(data.fonts) ? data.fonts : [];
    for (const f of doc.fonts) await registerFont(f.name, f.src).catch(() => undefined);
    const k = size / (data.size || size); // farkli doku boyutunda kaydedildiyse olcekle
    const layers: Layer[] = [];
    for (const raw of data.layers || []) {
      const { raster, ...rest } = raw as Layer & { raster?: string };
      const l = { ...(rest as Layer), rev: 0, fx: { ...defaultFx(), ...(rest as Layer).fx } } as Layer;
      if (k !== 1) scaleLayer(l, k);
      if (l.type === 'raster') {
        const c = doc.raster(l.id);
        if (raster) {
          try {
            const img = await loadImage(raster);
            ctx2d(c).drawImage(img, 0, 0, size, size);
          } catch {
            /* bozuk raster atlanir */
          }
        }
      }
      if (l.type === 'image') {
        try {
          await doc.ensureImage(l.src);
        } catch {
          continue;
        }
      }
      layers.push(l);
    }
    doc.layers = layers;
    doc.compose();
    return doc;
  }
}

function scaleLayer(l: Layer, k: number) {
  l.x *= k;
  l.y *= k;
  l.w *= k;
  l.h *= k;
  if (l.type === 'gradient') {
    l.x1 *= k;
    l.y1 *= k;
    l.x2 *= k;
    l.y2 *= k;
  }
  if (l.type === 'text') {
    l.size *= k;
    l.strokeWidth *= k;
  }
  if (l.type === 'shape') l.strokeWidth *= k;
}

const loadedFonts = new Set<string>();
export async function registerFont(name: string, src: string) {
  if (loadedFonts.has(name)) return;
  const face = new FontFace(name, `url(${src})`);
  await face.load();
  document.fonts.add(face);
  loadedFonts.add(name);
}

// ---------------- Gecmis (geri al / yinele) ----------------

export interface Snapshot {
  layers: Layer[];
  selected: string | null;
  paint: PaintSettings;
  name: string;
}

export interface RasterPatch {
  id: string;
  x: number;
  y: number;
  before: HTMLCanvasElement;
  after: HTMLCanvasElement;
}

export interface HistoryEntry {
  label: string;
  snap: Snapshot;
  patches: RasterPatch[];
}

const MAX_HISTORY = 60;

export class History {
  entries: HistoryEntry[] = [];
  index = -1;

  reset(label: string, snap: Snapshot) {
    this.entries = [{ label, snap, patches: [] }];
    this.index = 0;
  }

  push(label: string, snap: Snapshot, patches: RasterPatch[] = []) {
    this.entries.splice(this.index + 1);
    this.entries.push({ label, snap, patches });
    if (this.entries.length > MAX_HISTORY) this.entries.shift();
    this.index = this.entries.length - 1;
  }

  get canUndo() {
    return this.index > 0;
  }

  get canRedo() {
    return this.index < this.entries.length - 1;
  }
}

export function snapshotOf(doc: LiveryDoc, selected: string | null): Snapshot {
  return {
    layers: doc.layers.map(cloneLayer),
    selected,
    paint: { ...doc.paint },
    name: doc.name,
  };
}

export function applyPatch(doc: LiveryDoc, p: RasterPatch, which: 'before' | 'after') {
  const c = doc.raster(p.id);
  const g = ctx2d(c);
  const img = which === 'before' ? p.before : p.after;
  g.save();
  g.globalCompositeOperation = 'copy';
  g.beginPath();
  g.rect(p.x, p.y, img.width, img.height);
  g.clip();
  g.drawImage(img, p.x, p.y);
  g.restore();
}

/** Raster duzenlemesi icin once/sonra yamasi yakalayici. */
export class RasterEdit {
  id: string;
  private before: HTMLCanvasElement;
  private x0 = Infinity;
  private y0 = Infinity;
  private x1 = -Infinity;
  private y1 = -Infinity;

  constructor(doc: LiveryDoc, id: string) {
    this.id = id;
    const src = doc.raster(id);
    this.before = makeCanvas(src.width, src.height);
    ctx2d(this.before).drawImage(src, 0, 0);
  }

  mark(x: number, y: number, r: number) {
    this.x0 = Math.min(this.x0, x - r);
    this.y0 = Math.min(this.y0, y - r);
    this.x1 = Math.max(this.x1, x + r);
    this.y1 = Math.max(this.y1, y + r);
  }

  markAll(size: number) {
    this.x0 = 0;
    this.y0 = 0;
    this.x1 = size;
    this.y1 = size;
  }

  finish(doc: LiveryDoc): RasterPatch | null {
    const S = doc.size;
    const x = Math.max(0, Math.floor(this.x0));
    const y = Math.max(0, Math.floor(this.y0));
    const w = Math.min(S, Math.ceil(this.x1)) - x;
    const h = Math.min(S, Math.ceil(this.y1)) - y;
    if (w <= 0 || h <= 0) return null;
    const before = makeCanvas(w, h);
    ctx2d(before).drawImage(this.before, x, y, w, h, 0, 0, w, h);
    const after = makeCanvas(w, h);
    ctx2d(after).drawImage(doc.raster(this.id), x, y, w, h, 0, 0, w, h);
    return { id: this.id, x, y, before, after };
  }
}
