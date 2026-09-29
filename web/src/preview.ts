// Oyun ici canli onizleme senkronu: secili arac + 'live' modunda Lua'ya onizleme
// aracini baslatir, tasarim degistikce kucultulmus dokuyu gonderir.
import { S, set, toast, useStore } from './store';
import { T } from './i18n';
import { editor } from './engine/editor';
import { drawGrid } from './engine/grid';
import { fetchNui, isEnvBrowser, uploadToLua } from './nui';
import { makeCanvas, ctx2d } from './engine/util';

let activeModel: string | null = null;
let starting = false;
let lastSentVersion = -1;
let lastGrid = false;
let sending = false;
let timer = 0;

export function workspaceOffset(): { x: number; y: number } {
  const el = document.querySelector('.ws-body');
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return { x: (cx / window.innerWidth) * 2 - 1, y: -((cy / window.innerHeight) * 2 - 1) };
}

function wanted(): string | null {
  const s = S();
  const v = s.vehicle;
  if (!s.visible || !v || v.demo || v.supported === false) return null;
  if (!s.config?.inGame || !s.config.preview || s.mode !== 'live') return null;
  return v.model;
}

async function sync() {
  const want = wanted();
  if (want === activeModel || starting) return;
  if (activeModel) {
    activeModel = null;
    await fetchNui('previewStop');
  }
  if (want) {
    starting = true;
    const res = await fetchNui<{ ok: boolean; error?: string }>('previewStart', { model: want, offset: workspaceOffset() });
    starting = false;
    if (res?.ok) {
      activeModel = want;
      lastSentVersion = -1;
      schedule(0);
    } else {
      toast(res?.error || T.ws.liveFail, 'err');
      set({ mode: 'uv', libraryOpen: true });
    }
    if (wanted() !== activeModel) void sync();
  }
}

function schedule(delay = 650) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void pushImage(), delay);
}

async function pushImage() {
  const doc = editor.doc;
  if (!activeModel || !doc || sending) return;
  const grid = S().grid;
  if (doc.version === lastSentVersion && grid === lastGrid) return;
  sending = true;
  try {
    const size = 1024;
    const c = makeCanvas(size);
    const g = ctx2d(c);
    g.drawImage(doc.out, 0, 0, size, size);
    if (grid) drawGrid(g, size, { alpha: 0.9 });
    lastSentVersion = doc.version;
    lastGrid = grid;
    const uploadId = await uploadToLua(c.toDataURL('image/webp', 0.82));
    await fetchNui('previewImage', { uploadId, paint: doc.paint });
  } finally {
    sending = false;
  }
  // gonderim sirasinda degisiklik olduysa tekrar
  if (editor.doc && editor.doc.version !== lastSentVersion) schedule(300);
}

export function initPreviewSync(): () => void {
  if (isEnvBrowser()) return () => undefined;
  const unsub = useStore.subscribe((s, prev) => {
    if (s.visible !== prev.visible || s.vehicle !== prev.vehicle || s.mode !== prev.mode || s.config !== prev.config) void sync();
    if (activeModel && (s.docRev !== prev.docRev || s.grid !== prev.grid)) schedule(s.grid !== prev.grid ? 0 : 650);
    if (activeModel && s.libraryOpen !== prev.libraryOpen) {
      window.setTimeout(() => void fetchNui('previewOffset', workspaceOffset()), 50);
    }
  });
  const onResize = () => activeModel && void fetchNui('previewOffset', workspaceOffset());
  window.addEventListener('resize', onResize);
  return () => {
    unsub();
    window.removeEventListener('resize', onResize);
  };
}
