import { useEffect, useRef } from 'react';

type W = Window & { invokeNative?: unknown; GetParentResourceName?: () => string };
const w = window as W;

export const isEnvBrowser = (): boolean => !w.invokeNative;
export const resourceName: string = w.GetParentResourceName ? w.GetParentResourceName() : 'loe_vehicledesign';

/** Kaynak klasorundeki dosya (assets/...) icin NUI adresi. */
export function assetUrl(path: string): string {
  if (/^(https?:|data:|nui:)/.test(path)) return path;
  const clean = path.replace(/^\/+/, '');
  if (isEnvBrowser()) return `./${clean}`;
  return `https://cfx-nui-${resourceName}/${clean}`;
}

type MockFn = (data: unknown) => unknown | Promise<unknown>;
const mocks = new Map<string, MockFn>();
export function registerMock(event: string, fn: MockFn) {
  mocks.set(event, fn);
}

export async function fetchNui<T = unknown>(event: string, data?: unknown): Promise<T> {
  if (isEnvBrowser()) {
    const m = mocks.get(event);
    return (m ? await m(data) : { ok: true }) as T;
  }
  const resp = await fetch(`https://${resourceName}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data ?? {}),
  });
  const text = await resp.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export interface NuiMessage<D = unknown> {
  action: string;
  data: D;
}

type Handler = (data: unknown) => void;
const handlers = new Map<string, Set<Handler>>();
window.addEventListener('message', (ev: MessageEvent<NuiMessage>) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object' || !msg.action) return;
  handlers.get(msg.action)?.forEach((h) => h(msg.data));
});

export function onNui<D>(action: string, fn: (data: D) => void): () => void {
  let set = handlers.get(action);
  if (!set) {
    set = new Set();
    handlers.set(action, set);
  }
  const h = fn as Handler;
  set.add(h);
  return () => set!.delete(h);
}

export function useNuiEvent<D>(action: string, fn: (data: D) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => onNui<D>(action, (d) => ref.current(d)), [action]);
}

/** Tarayicida Lua mesajini taklit et (gelistirme). */
export function emitNui(action: string, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data: { action, data } }));
}

// ---------------- Buyuk veri aktarimi (parca parca) ----------------
// NUI callback / SendNUIMessage tek seferde MB'larca veri tasiyabilir ama
// guvenli olmak icin 256KB parcalara bolunur.

const CHUNK = 256 * 1024;
let upCounter = 0;

/** Buyuk bir metni Lua'ya parca parca yukle, yukleme kimligini dondur. */
export async function uploadToLua(payload: string): Promise<string> {
  const id = `u${Date.now().toString(36)}${(upCounter++).toString(36)}`;
  const total = Math.max(1, Math.ceil(payload.length / CHUNK));
  for (let i = 0; i < total; i++) {
    const res = await fetchNui<{ ok: boolean }>('upload', {
      id,
      index: i + 1,
      total,
      data: payload.slice(i * CHUNK, (i + 1) * CHUNK),
    });
    if (res && res.ok === false) throw new Error('upload rejected');
  }
  return id;
}

interface DownChunk {
  id: string;
  index: number;
  total: number;
  data: string;
}
const downloads = new Map<string, { parts: string[]; got: number; total: number; resolve?: (s: string) => void; reject?: (e: Error) => void; timer?: number }>();

onNui<DownChunk>('download', (c) => {
  let d = downloads.get(c.id);
  if (!d) {
    d = { parts: [], got: 0, total: c.total };
    downloads.set(c.id, d);
  }
  if (d.parts[c.index - 1] === undefined) {
    d.parts[c.index - 1] = c.data;
    d.got++;
  }
  d.total = c.total;
  if (d.got >= d.total && d.resolve) finishDownload(c.id);
});

onNui<{ id: string; error: string }>('downloadError', (e) => {
  const d = downloads.get(e.id);
  if (d?.reject) {
    window.clearTimeout(d.timer);
    downloads.delete(e.id);
    d.reject(new Error(e.error || 'download failed'));
  } else {
    downloads.set(e.id, { parts: [], got: -1, total: 0 });
  }
});

function finishDownload(id: string) {
  const d = downloads.get(id);
  if (!d || !d.resolve) return;
  window.clearTimeout(d.timer);
  downloads.delete(id);
  d.resolve(d.parts.join(''));
}

/** Lua'nin 'download' mesajlariyla gonderdigi veriyi bekle. */
export function awaitDownload(id: string, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    let d = downloads.get(id);
    if (!d) {
      d = { parts: [], got: 0, total: Infinity };
      downloads.set(id, d);
    }
    if (d.got === -1) {
      downloads.delete(id);
      reject(new Error('download failed'));
      return;
    }
    d.resolve = resolve;
    d.reject = reject;
    d.timer = window.setTimeout(() => {
      downloads.delete(id);
      reject(new Error('timeout'));
    }, timeoutMs);
    if (d.got >= d.total) finishDownload(id);
  });
}
