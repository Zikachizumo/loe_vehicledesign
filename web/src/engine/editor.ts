import { S, set, toast } from '../store';
import { T } from '../i18n';
import type { VehicleDef } from '../types';
import {
  LiveryDoc,
  History,
  applyPatch,
  cloneLayer,
  defaultFx,
  snapshotOf,
  type RasterPatch,
  type Snapshot,
} from './doc';
import type { Layer, LayerType, SerializedDoc } from './types';
import { isPositioned, layerMatrix, measureText, renderLayer } from './render';
import { SPLAT_RES, getSplat } from './splat';
import { ctx2d, loadImage, makeCanvas, uid } from './util';

export interface Pt {
  x: number;
  y: number;
}

export interface PointerInfo {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  source: '3d' | 'uv';
  handle?: Handle | null;
}

export type Handle = 'nw' | 'ne' | 'se' | 'sw' | 'rot';

export interface ToolHandler {
  down?(p: Pt, e: PointerInfo): void;
  move?(p: Pt, e: PointerInfo): void;
  up?(p: Pt, e: PointerInfo): void;
  cancel?(): void;
}

/** Tek kopya editor: belge + gecmis + arac yonlendirme + Zustand koprusu. */
class Editor {
  doc: LiveryDoc | null = null;
  history = new History();
  tools: Partial<Record<string, ToolHandler>> = {};
  private dirty = false;
  private lastRevPush = 0;

  constructor() {
    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.dirty || !this.doc) return;
      this.dirty = false;
      this.doc.compose();
      const now = performance.now();
      if (now - this.lastRevPush > 110) {
        this.lastRevPush = now;
        set((s) => ({ docRev: s.docRev + 1 }));
      } else {
        // son degisikligi de panellere yansit
        window.clearTimeout(this.revTimer);
        this.revTimer = window.setTimeout(() => set((s) => ({ docRev: s.docRev + 1 })), 130);
      }
    };
    requestAnimationFrame(loop);
  }
  private revTimer = 0;

  invalidate() {
    this.dirty = true;
  }

  // ---------------- Belge yasam dongusu ----------------

  newDocument(v: VehicleDef, name?: string) {
    const doc = new LiveryDoc(v.size, v.model, name || `${v.label} Kaplaması`);
    this.setDoc(doc);
    set({ project: { id: null, name: doc.name, dirty: false }, selectedId: null, step: 1 });
  }

  setDoc(doc: LiveryDoc) {
    this.doc = doc;
    doc.compose();
    this.history.reset('Başlangıç', snapshotOf(doc, null));
    set((s) => ({ historyRev: s.historyRev + 1, docRev: s.docRev + 1, docId: s.docId + 1 }));
  }

  closeDocument() {
    this.doc = null;
    this.history = new History();
    set((s) => ({ selectedId: null, historyRev: s.historyRev + 1, docRev: s.docRev + 1, docId: s.docId + 1, step: 0 }));
  }

  /** Tamamlanan bir islemi gecmise yaz. */
  commit(label: string, patches: RasterPatch[] = []) {
    if (!this.doc) return;
    this.history.push(label, snapshotOf(this.doc, S().selectedId), patches);
    set((s) => ({
      historyRev: s.historyRev + 1,
      project: { ...s.project, dirty: true },
      step: Math.max(s.step, 1),
    }));
    this.invalidate();
  }

  private restore(snap: Snapshot) {
    const doc = this.doc!;
    doc.layers = snap.layers.map(cloneLayer);
    doc.paint = { ...snap.paint };
    doc.name = snap.name;
    const sel = snap.selected && doc.layer(snap.selected) ? snap.selected : null;
    set({ selectedId: sel });
    this.invalidate();
  }

  undo() {
    const h = this.history;
    if (!this.doc || !h.canUndo) return;
    const cur = h.entries[h.index];
    for (let i = cur.patches.length - 1; i >= 0; i--) applyPatch(this.doc, cur.patches[i], 'before');
    h.index--;
    this.restore(h.entries[h.index].snap);
    set((s) => ({ historyRev: s.historyRev + 1, project: { ...s.project, dirty: true } }));
  }

  redo() {
    const h = this.history;
    if (!this.doc || !h.canRedo) return;
    h.index++;
    const next = h.entries[h.index];
    for (const p of next.patches) applyPatch(this.doc, p, 'after');
    this.restore(next.snap);
    set((s) => ({ historyRev: s.historyRev + 1, project: { ...s.project, dirty: true } }));
  }

  jumpTo(index: number) {
    while (this.history.index > index && this.history.canUndo) this.undo();
    while (this.history.index < index && this.history.canRedo) this.redo();
  }

  // ---------------- Katman fabrikasi ----------------

  base(type: LayerType, name: string): Omit<Layer, 'type'> & { type: LayerType } {
    const size = this.doc?.size ?? 2048;
    return {
      id: uid(),
      name,
      type,
      visible: true,
      locked: false,
      opacity: 1,
      blend: 'source-over',
      fx: defaultFx(),
      x: size / 2,
      y: size / 2,
      w: size,
      h: size,
      rotation: 0,
      flipX: false,
      flipY: false,
      rev: 0,
    };
  }

  canAdd(): boolean {
    const max = S().config?.limits.maxLayers ?? 64;
    if (this.doc && this.doc.layers.length >= max) {
      toast(T.toast.maxLayers, 'err');
      return false;
    }
    return true;
  }

  /** Katmani secili katmanin ustune (yoksa en uste) ekle. */
  addLayer(l: Layer, opts: { index?: number; select?: boolean; commit?: string | false } = {}) {
    const doc = this.doc;
    if (!doc) return;
    let idx = opts.index;
    if (idx === undefined) {
      const selIdx = S().selectedId ? doc.index(S().selectedId!) : -1;
      idx = selIdx >= 0 ? selIdx + 1 : doc.layers.length;
    }
    doc.layers.splice(idx, 0, l);
    if (opts.select !== false) set({ selectedId: l.id });
    if (opts.commit !== false) this.commit(opts.commit || `${T.layers.names[l.type] ?? 'Katman'} eklendi`);
    else this.invalidate();
  }

  select(id: string | null) {
    set({ selectedId: id });
    this.invalidate();
  }

  selected(): Layer | undefined {
    return this.doc?.layer(S().selectedId);
  }

  /** Canli guncelleme (commit etmeden). Kaydirici suruklerken kullan. */
  patch(id: string, patch: Partial<Layer>) {
    const l = this.doc?.layer(id);
    if (!l) return;
    Object.assign(l, patch);
    l.rev++;
    if (l.type === 'text' && ('text' in patch || 'font' in patch || 'size' in patch || 'bold' in patch || 'italic' in patch || 'strokeWidth' in patch || 'spacing' in patch)) {
      this.refitText(l);
    }
    this.invalidate();
  }

  private commitTimer = 0;
  /** Guncelle + kisa sure sonra tek bir gecmis kaydi olustur (kaydiricilar icin). */
  update(id: string, patch: Partial<Layer>, label = 'Katman düzenlendi') {
    this.patch(id, patch);
    window.clearTimeout(this.commitTimer);
    this.commitTimer = window.setTimeout(() => this.commit(label), 350);
  }

  flushPending() {
    if (this.commitTimer) {
      window.clearTimeout(this.commitTimer);
      this.commitTimer = 0;
      this.commit('Katman düzenlendi');
    }
  }

  /** Yazi katmaninin kutusunu icerige gore yenile (olcek oranini koru). */
  refitText(l: Layer) {
    if (l.type !== 'text') return;
    const prev = (l as Layer & { _bw?: number; _bh?: number });
    const base = measureText(l);
    const sx = prev._bw ? l.w / prev._bw : 1;
    const sy = prev._bh ? l.h / prev._bh : 1;
    l.w = base.w * sx;
    l.h = base.h * sy;
    Object.defineProperty(l, '_bw', { value: base.w, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(l, '_bh', { value: base.h, writable: true, enumerable: false, configurable: true });
  }

  remove(id: string) {
    const doc = this.doc;
    if (!doc) return;
    const i = doc.index(id);
    if (i < 0) return;
    doc.layers.splice(i, 1);
    const next = doc.layers[Math.min(i, doc.layers.length - 1)];
    set({ selectedId: next ? next.id : null });
    this.commit('Katman silindi');
  }

  duplicate(id: string) {
    const doc = this.doc;
    const l = doc?.layer(id);
    if (!doc || !l || !this.canAdd()) return;
    const c = cloneLayer(l);
    c.id = uid();
    c.name = `${l.name} kopya`;
    if (isPositioned(c)) {
      c.x += doc.size * 0.02;
      c.y += doc.size * 0.02;
    }
    if (l.type === 'raster') {
      const src = doc.raster(l.id);
      ctx2d(doc.raster(c.id)).drawImage(src, 0, 0);
    }
    this.addLayer(c, { index: doc.index(id) + 1, commit: 'Katman çoğaltıldı' });
  }

  move(id: string, dir: 1 | -1) {
    const doc = this.doc;
    if (!doc) return;
    const i = doc.index(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= doc.layers.length) return;
    [doc.layers[i], doc.layers[j]] = [doc.layers[j], doc.layers[i]];
    this.commit(dir > 0 ? 'Katman yukarı' : 'Katman aşağı');
  }

  reorder(id: string, toIndex: number) {
    const doc = this.doc;
    if (!doc) return;
    const i = doc.index(id);
    if (i < 0) return;
    const [l] = doc.layers.splice(i, 1);
    doc.layers.splice(Math.max(0, Math.min(doc.layers.length, toIndex)), 0, l);
    this.commit('Katman taşındı');
  }

  toggle(id: string, key: 'visible' | 'locked') {
    const l = this.doc?.layer(id);
    if (!l) return;
    l[key] = !l[key];
    this.commit(key === 'visible' ? (l.visible ? 'Katman gösterildi' : 'Katman gizlendi') : l.locked ? 'Katman kilitlendi' : 'Kilit açıldı');
  }

  /** Herhangi bir katmani ayni gorunumde piksel katmanina cevir (silgi/karistir icin). */
  rasterize(id: string): Layer | undefined {
    const doc = this.doc;
    const l = doc?.layer(id);
    if (!doc || !l) return;
    if (l.type === 'raster') return l;
    const nl = { ...this.base('raster', `${l.name} (piksel)`), type: 'raster' } as Layer;
    nl.opacity = l.opacity;
    nl.blend = l.blend;
    nl.visible = l.visible;
    const c = doc.raster(nl.id);
    renderLayer(ctx2d(c), { ...l, opacity: 1, blend: 'source-over', visible: true } as Layer, doc.src);
    const i = doc.index(id);
    doc.layers.splice(i, 1, nl);
    set({ selectedId: nl.id });
    this.commit('Piksele çevrildi');
    return nl;
  }

  // ---------------- Yardimcilar ----------------

  /** Belge noktasini katmanin raster piksel uzayina cevir. */
  toRaster(l: Layer, p: Pt): Pt {
    const size = this.doc!.size;
    const inv = layerMatrix(l).inverse();
    const q = inv.transformPoint(new DOMPoint(p.x, p.y));
    return { x: ((q.x + l.w / 2) * size) / l.w, y: ((q.y + l.h / 2) * size) / l.h };
  }

  rasterScale(l: Layer): number {
    const size = this.doc!.size;
    return (size / l.w + size / l.h) / 2;
  }

  /** En ustteki, gorunur ve kilitsiz katmani bul. */
  hitTest(p: Pt): Layer | undefined {
    const doc = this.doc;
    if (!doc) return;
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i];
      if (!l.visible || l.locked || !isPositioned(l)) continue;
      const q = layerMatrix(l).inverse().transformPoint(new DOMPoint(p.x, p.y));
      if (Math.abs(q.x) > l.w / 2 || Math.abs(q.y) > l.h / 2) continue;
      if (l.type === 'raster' || l.type === 'splat') {
        const src = l.type === 'raster' ? doc.raster(l.id) : getSplat(l.seed, l.color, l.energy, l.droplets, l.drips);
        const res = l.type === 'raster' ? doc.size : SPLAT_RES;
        const sx = Math.floor(((q.x + l.w / 2) / l.w) * res);
        const sy = Math.floor(((q.y + l.h / 2) / l.h) * res);
        try {
          const a = ctx2d(src).getImageData(sx, sy, 1, 1).data[3];
          if (a < 12) continue;
        } catch {
          /* */
        }
      }
      return l;
    }
  }

  samplePreview(p: Pt): string | null {
    const doc = this.doc;
    if (!doc) return null;
    const d = ctx2d(doc.preview).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  // ---------------- Gorsel ekleme ----------------

  async addImage(src: string, name: string, at?: Pt, size?: number, commitLabel?: string) {
    const doc = this.doc;
    if (!doc || !this.canAdd()) return;
    const img = await loadImage(src);
    doc.images.set(src, img);
    const target = size ?? S().opts.image.size;
    const k = target / Math.max(img.naturalWidth, img.naturalHeight);
    const l = {
      ...this.base('image', name),
      type: 'image',
      src,
      x: at?.x ?? doc.size / 2,
      y: at?.y ?? doc.size / 2,
      w: img.naturalWidth * k,
      h: img.naturalHeight * k,
    } as Layer;
    this.addLayer(l, { commit: commitLabel || `${name} eklendi` });
  }

  /** Belgeyi tamamen kaplayan gorsel katmani (YZ / tam kaplama). */
  async addFullImage(src: string, name: string) {
    const doc = this.doc;
    if (!doc || !this.canAdd()) return;
    const img = await loadImage(src);
    doc.images.set(src, img);
    const l = { ...this.base('image', name), type: 'image', src } as Layer;
    this.addLayer(l, { commit: `${name} eklendi` });
  }

  /** Buyuk gorselleri makul boyuta indir ve webp dataURL'e cevir. */
  async normalizeImage(src: string, maxSide?: number): Promise<string> {
    const img = await loadImage(src);
    const lim = maxSide ?? this.doc?.size ?? 2048;
    const k = Math.min(1, lim / Math.max(img.naturalWidth, img.naturalHeight));
    const c = makeCanvas(img.naturalWidth * k, img.naturalHeight * k);
    ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.92);
  }

  // ---------------- Disa aktar / kaydet ----------------

  exportLivery(): { image: string; thumb: string } | null {
    const doc = this.doc;
    if (!doc) return null;
    doc.compose();
    const image = doc.out.toDataURL('image/webp', 0.9);
    return { image, thumb: this.thumbnail() };
  }

  thumbnail(size = 256): string {
    const doc = this.doc!;
    const c = makeCanvas(size);
    ctx2d(c).drawImage(doc.preview, 0, 0, size, size);
    return c.toDataURL('image/webp', 0.8);
  }

  serialize(): string {
    return JSON.stringify(this.doc!.serialize());
  }

  async load(json: string, v: VehicleDef, meta: { id: number | null; name: string }) {
    const data = JSON.parse(json) as SerializedDoc;
    const doc = await LiveryDoc.deserialize(data, v.size);
    doc.name = meta.name || doc.name;
    this.setDoc(doc);
    set({ project: { id: meta.id, name: doc.name, dirty: false }, selectedId: null, step: 1 });
  }
}

export const editor = new Editor();
(window as unknown as { __editor: Editor }).__editor = editor;
