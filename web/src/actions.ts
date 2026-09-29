import { S, set, toast } from './store';
import { T } from './i18n';
import { editor } from './engine/editor';
import { registerFont } from './engine/doc';
import { awaitDownload, fetchNui, uploadToLua } from './nui';
import type { PrintedSummary, ProjectSummary, VehicleDef } from './types';

interface OkRes {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function refreshLists() {
  try {
    const res = await fetchNui<OkRes & { transfer?: string }>('listDesigns');
    if (!res?.ok || !res.transfer) return;
    const data = JSON.parse(await awaitDownload(res.transfer)) as { projects?: unknown; printed?: unknown };
    set({
      projects: Array.isArray(data.projects) ? (data.projects as ProjectSummary[]) : [],
      printed: Array.isArray(data.printed) ? (data.printed as PrintedSummary[]) : [],
    });
  } catch {
    /* liste alinamadi */
  }
}

/** Arac icin en uygun gorunum: GLB -> 3D, oyunda + destekli -> canli, yoksa UV. */
export function bestMode(v: VehicleDef): 'live' | '3d' | 'uv' {
  if (v.glb || v.demo) return '3d';
  const cfg = S().config;
  if (cfg?.inGame && cfg.preview && v.supported !== false) return 'live';
  return 'uv';
}

export function selectVehicle(v: VehicleDef, opts: { keepDoc?: boolean } = {}) {
  const mode = bestMode(v);
  set({ vehicle: v, mode, libraryOpen: mode === 'uv' });
  if (!opts.keepDoc) editor.newDocument(v);
}

export function requestSelectVehicle(v: VehicleDef) {
  const s = S();
  if (v.supported === false) {
    toast(T.toast.unsupported, 'err');
    return;
  }
  if (s.vehicle?.model === v.model) return;
  if (s.project.dirty) {
    set({ modal: { type: 'switchVehicle', model: v.model } });
    return;
  }
  selectVehicle(v);
}

export function newProject() {
  const v = S().vehicle;
  if (!v) return;
  editor.newDocument(v);
}

export async function saveProject(name: string) {
  const s = S();
  if (!editor.doc || !s.vehicle || s.busy.save) return;
  editor.flushPending();
  set({ busy: { ...s.busy, save: true } });
  try {
    editor.doc.name = name;
    const json = editor.serialize();
    const max = s.config?.limits.maxProjectBytes ?? 12 * 1024 * 1024;
    if (json.length > max) {
      toast(`${T.toast.tooLarge} (${(json.length / 1048576).toFixed(1)} MB)`, 'err');
      return;
    }
    // zarf: kucuk resim + satir sonu + proje JSON (buyuk veri tek aktarimda gider)
    const uploadId = await uploadToLua(`${editor.thumbnail(192)}\n${json}`);
    const res = await fetchNui<OkRes & { id?: number }>('saveProject', {
      uploadId,
      id: s.project.id,
      name,
      model: s.vehicle.model,
    });
    if (res?.ok) {
      set((st) => ({ project: { id: res.id ?? st.project.id, name, dirty: false } }));
      toast(T.toast.saved, 'ok');
      void refreshLists();
    } else toast(res?.error || T.toast.saveFail, 'err');
  } catch {
    toast(T.toast.saveFail, 'err');
  } finally {
    set((st) => ({ busy: { ...st.busy, save: false } }));
  }
}

export async function loadProject(p: ProjectSummary) {
  const v = S().config?.vehicles.find((x) => x.model === p.model);
  if (!v) {
    toast(T.toast.wrongModel, 'err');
    return;
  }
  try {
    const res = await fetchNui<OkRes & { transfer?: string }>('loadProject', { id: p.id });
    if (!res?.ok || !res.transfer) throw new Error(res?.error);
    const json = await awaitDownload(res.transfer);
    selectVehicle(v, { keepDoc: true });
    await editor.load(json, v, { id: p.id, name: p.name });
    toast(T.toast.loaded, 'ok');
  } catch {
    toast(T.toast.loadFail, 'err');
  }
}

export async function deleteProject(id: number) {
  const res = await fetchNui<OkRes>('deleteProject', { id });
  if (res?.ok) {
    toast(T.toast.deleted, 'ok');
    if (S().project.id === id) set((s) => ({ project: { ...s.project, id: null } }));
    void refreshLists();
  }
}

export interface PrintOptions {
  publish: boolean;
  shopPrice: number;
  giveItem: boolean;
}

export async function printLivery(label: string, opts: PrintOptions = { publish: false, shopPrice: 0, giveItem: true }) {
  const s = S();
  if (!editor.doc || !s.vehicle || s.busy.print) return;
  if (s.vehicle.demo) {
    toast(T.toast.demoNoPrint, 'err');
    return;
  }
  editor.flushPending();
  set({ busy: { ...s.busy, print: true } });
  try {
    const out = editor.exportLivery(s.config?.limits.maxImageBytes ?? 6 * 1024 * 1024);
    if (!out) {
      toast(`${T.toast.tooLarge} — bazı görsel katmanlarını küçült veya kaldır`, 'err');
      return;
    }
    // zarf: onizleme + envanter ikonu + kaplama gorseli
    const uploadId = await uploadToLua(`${out.thumb}\n${editor.thumbnail(96)}\n${out.image}`);
    const res = await fetchNui<OkRes>('print', {
      uploadId,
      label,
      model: s.vehicle.model,
      paint: editor.doc.paint,
      publish: opts.publish,
      shopPrice: Math.max(0, Math.floor(opts.shopPrice) || 0),
      giveItem: opts.giveItem,
    });
    if (res?.ok) {
      toast(res.message || T.toast.printed, 'ok');
      set({ step: 2 });
      void refreshLists();
    } else toast(res?.error || T.toast.printFail, 'err');
  } catch {
    toast(T.toast.printFail, 'err');
  } finally {
    set((st) => ({ busy: { ...st.busy, print: false } }));
  }
}

export async function reprint(p: PrintedSummary) {
  const res = await fetchNui<OkRes>('reprint', { id: p.id });
  if (res?.ok) toast(res.message || T.toast.printed, 'ok');
  else toast(res?.error || T.toast.printFail, 'err');
}

/** Magaza fiyati / yayin durumu (sadece tasarim ekibi; sunucu da dogrular). */
export async function setListing(id: string, price: number, published: boolean) {
  const res = await fetchNui<OkRes>('setListing', { id, price: Math.max(0, Math.floor(price) || 0), published });
  if (res?.ok) {
    toast(res.message || T.toast.saved, 'ok');
    set((s) => ({ printed: s.printed.map((p) => (p.id === id ? { ...p, price, published } : p)) }));
    void refreshLists();
  } else toast(res?.error || T.toast.listingFail, 'err');
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function uploadImageFile(file: File) {
  const max = S().config?.limits.maxImportBytes ?? 8 * 1024 * 1024;
  if (file.size > max) {
    toast(T.toast.tooLarge, 'err');
    return;
  }
  try {
    const raw = await readFile(file);
    const src = await editor.normalizeImage(raw);
    addRecent(src, file.name);
    set({ pendingImage: src, tool: 'image' });
    toast('Yerleştirmek için araca tıkla', 'info');
  } catch {
    toast(T.toast.importFail, 'err');
  }
}

function addRecent(src: string, name: string) {
  set((s) => ({ recentImages: [{ src, name }, ...s.recentImages.filter((r) => r.src !== src)].slice(0, 10) }));
}

export async function importFromUrl(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url.trim())) {
    toast(T.toast.importFail, 'err');
    return false;
  }
  set((s) => ({ busy: { ...s.busy, import: true } }));
  try {
    let dataUrl: string | null = null;
    // 1) Dogrudan (CORS izin veriyorsa hizli yol)
    try {
      const r = await fetch(url.trim(), { mode: 'cors' });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        const blob = await r.blob();
        dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      }
    } catch {
      /* sunucu vekiline dus */
    }
    // 2) Sunucu vekili (dogrulama + boyut siniri sunucuda)
    if (!dataUrl) {
      const res = await fetchNui<OkRes & { transfer?: string }>('importUrl', { url: url.trim() });
      if (!res?.ok || !res.transfer) throw new Error(res?.error);
      dataUrl = await awaitDownload(res.transfer);
    }
    const src = await editor.normalizeImage(dataUrl);
    addRecent(src, 'URL');
    await editor.addImage(src, 'İçe Aktarılan Görsel', undefined, (editor.doc?.size ?? 2048) * 0.4);
    toast(T.toast.imported, 'ok');
    return true;
  } catch {
    toast(T.toast.importFail, 'err');
    return false;
  } finally {
    set((s) => ({ busy: { ...s.busy, import: false } }));
  }
}

export async function uploadFont(file: File) {
  try {
    if (file.size > 3 * 1024 * 1024) throw new Error('big');
    const src = await readFile(file);
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^\w -]/g, '').slice(0, 32) || 'Ozel Font';
    await registerFont(name, src);
    if (editor.doc && !editor.doc.fonts.some((f) => f.name === name)) editor.doc.fonts.push({ name, src });
    const s = S();
    set({ opts: { ...s.opts, text: { ...s.opts.text, font: name } } });
    const sel = editor.selected();
    if (sel?.type === 'text') editor.update(sel.id, { font: name } as never);
    toast(`Font yüklendi: ${name}`, 'ok');
  } catch {
    toast(T.toast.fontFail, 'err');
  }
}

export async function aiGenerate(prompt: string) {
  const s = S();
  if (!prompt.trim() || s.busy.ai || !editor.doc) return;
  if (!s.config?.aiEnabled) {
    toast(T.options.aiDisabled, 'err');
    return;
  }
  set({ busy: { ...s.busy, ai: true } });
  try {
    const res = await fetchNui<OkRes & { transfer?: string }>('aiGenerate', {
      prompt: prompt.trim().slice(0, 600),
      model: s.vehicle?.label,
    });
    if (!res?.ok || !res.transfer) throw new Error(res?.error || 'ai');
    const data = await awaitDownload(res.transfer, 180000);
    const src = await editor.normalizeImage(data);
    addRecent(src, 'YZ');
    await editor.addFullImage(src, T.layers.names.ai);
    toast(T.toast.aiDone, 'ok');
  } catch (e) {
    toast((e as Error)?.message && (e as Error).message !== 'ai' ? String((e as Error).message) : T.toast.aiFail, 'err');
  } finally {
    set((st) => ({ busy: { ...st.busy, ai: false } }));
  }
}

export async function requestScan() {
  await fetchNui('scan');
  set({ visible: false, modal: null });
}

export function requestClose() {
  if (S().project.dirty) set({ modal: { type: 'confirmClose' } });
  else closeStudio();
}

export function closeStudio() {
  set({ visible: false, modal: null });
  void fetchNui('close');
}
