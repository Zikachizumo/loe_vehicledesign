// Tarayici gelistirme modu: Lua olmadan editoru calistirmak icin sahte veriler.
import { emitNui, registerMock } from './nui';
import type { OpenPayload, PrintedSummary, ProjectSummary } from './types';

const uploads = new Map<string, string[]>();
const projects: (ProjectSummary & { data: string })[] = [];
const printed: PrintedSummary[] = [];
let pid = 1;

export const MOCK_OPEN: OpenPayload = {
  brand: { name: 'Legends of Empire', short: 'LoE RP', tagline: 'ARAÇ TASARIM STÜDYOSU' },
  theme: 'empire',
  player: { name: 'Zika Chizumo', initials: 'ZC', role: 'Tasarımcı' },
  price: 0,
  currency: '$',
  shopPrice: 25000,
  aiEnabled: true,
  fonts: ['Impact', 'Arial Black', 'Bahnschrift', 'Segoe UI', 'Georgia', 'Courier New', 'Trebuchet MS', 'Verdana'],
  limits: { maxLayers: 80, maxProjectBytes: 12 * 1024 * 1024, maxImportBytes: 8 * 1024 * 1024, maxTextLength: 48 },
  categories: [
    { id: 'compacts', label: 'KOMPAKT' },
    { id: 'suvs', label: 'SUV' },
    { id: 'muscle', label: 'MUSCLE' },
    { id: 'sports', label: 'SPOR' },
    { id: 'super', label: 'SÜPER' },
    { id: 'motorcycles', label: 'MOTOSİKLET' },
    { id: 'vans', label: 'VAN' },
    { id: 'helicopters', label: 'HELİKOPTER' },
    { id: 'emergency', label: 'KAMU' },
  ],
  isAdmin: true,
  inGame: false,
  preview: true,
  thumbnailUrl: 'https://docs.fivem.net/vehicles/%s.webp',
  catalog: { total: 14, supported: 9 },
  // Tarayici testi icin ornek katalog (oyunda /kaplamatarama ile gercek liste gelir)
  vehicles: [
    { model: 'loe_demo', label: 'Demo Coupe', brand: 'LoE', year: 2026, category: 'sports', size: 2048, demo: true, supported: true, slotsTotal: 16, slotsFree: 16 },
    { model: 'sultanrs', label: 'Sultan RS', brand: 'Karin', category: 'super', size: 1024, supported: true, slotsTotal: 15, slotsFree: 15 },
    { model: 'elegy', label: 'Elegy Retro Custom', brand: 'Annis', category: 'sports', size: 1024, supported: true, slotsTotal: 12, slotsFree: 12 },
    { model: 'jester4', label: 'Jester RR', brand: 'Dinka', category: 'sports', size: 1024, supported: true, slotsTotal: 10, slotsFree: 9 },
    { model: 'comet6', label: 'Comet S2', brand: 'Pfister', category: 'sports', size: 1024, supported: true, slotsTotal: 10, slotsFree: 10 },
    { model: 'police3', label: 'Police Cruiser', brand: 'Vapid', category: 'emergency', size: 1024, supported: true, slotsTotal: 3, slotsFree: 3 },
    { model: 'sanchez', label: 'Sanchez', brand: 'Maibatsu', category: 'motorcycles', size: 1024, supported: true, slotsTotal: 4, slotsFree: 4 },
    { model: 'frogger', label: 'Frogger', brand: 'Maibatsu', category: 'helicopters', size: 1024, supported: true, slotsTotal: 3, slotsFree: 3 },
    { model: 'drift_demo', label: 'M8 Competition (eklenti)', brand: 'BMW', year: 2020, category: 'sports', size: 2048, supported: true, uv: 'assets/uv/m8.png', slotsTotal: 16, slotsFree: 14 },
    { model: 'adder', label: 'Adder', brand: 'Truffade', category: 'super', size: 1024, supported: false, slotsTotal: 0, slotsFree: 0 },
    { model: 'blista', label: 'Blista', brand: 'Dinka', category: 'compacts', size: 1024, supported: false, slotsTotal: 0, slotsFree: 0 },
    { model: 'baller', label: 'Baller', brand: 'Gallivanter', category: 'suvs', size: 1024, supported: false, slotsTotal: 0, slotsFree: 0 },
    { model: 'bison', label: 'Bison', brand: 'Bravado', category: 'vans', size: 1024, supported: false, slotsTotal: 0, slotsFree: 0 },
    { model: 'dominator', label: 'Dominator', brand: 'Vapid', category: 'muscle', size: 1024, supported: false, slotsTotal: 0, slotsFree: 0 },
  ],
};

export function installMocks() {
  registerMock('upload', (d) => {
    const { id, index, total, data } = d as { id: string; index: number; total: number; data: string };
    const arr = uploads.get(id) ?? new Array(total);
    arr[index - 1] = data;
    uploads.set(id, arr);
    return { ok: true };
  });
  registerMock('listDesigns', () => {
    const transfer = `l${Date.now()}`;
    setTimeout(() => sendDownload(transfer, JSON.stringify({ projects: projects.map(({ data: _d, ...p }) => p), printed })), 20);
    return { ok: true, transfer };
  });
  registerMock('saveProject', (d) => {
    const { uploadId, id, name, model } = d as { uploadId: string; id: number | null; name: string; model: string };
    const raw = (uploads.get(uploadId) ?? []).join('');
    uploads.delete(uploadId);
    const nl = raw.indexOf('\n');
    const thumb = raw.slice(0, nl);
    const data = raw.slice(nl + 1);
    let p = id ? projects.find((x) => x.id === id) : undefined;
    if (!p) {
      p = { id: pid++, name, model, thumb, updated: Date.now() / 1000, data };
      projects.unshift(p);
    } else Object.assign(p, { name, thumb, data, updated: Date.now() / 1000 });
    return { ok: true, id: p.id };
  });
  registerMock('loadProject', (d) => {
    const p = projects.find((x) => x.id === (d as { id: number }).id);
    if (!p) return { ok: false };
    const transfer = `t${Date.now()}`;
    setTimeout(() => sendDownload(transfer, p.data), 50);
    return { ok: true, transfer };
  });
  registerMock('deleteProject', (d) => {
    const i = projects.findIndex((x) => x.id === (d as { id: number }).id);
    if (i >= 0) projects.splice(i, 1);
    return { ok: true };
  });
  registerMock('print', async (d) => {
    const { uploadId, label, model, publish, shopPrice } = d as {
      uploadId: string;
      label: string;
      model: string;
      publish?: boolean;
      shopPrice?: number;
    };
    const thumb = (uploads.get(uploadId) ?? []).join('').split('\n')[0];
    uploads.delete(uploadId);
    await new Promise((r) => setTimeout(r, 900));
    const price = Math.max(0, Math.floor(shopPrice ?? 0));
    printed.unshift({
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      label,
      model,
      thumb,
      created: Date.now() / 1000,
      designer: 'Test Tasarımcı',
      price,
      published: !!publish,
      sales: 0,
    });
    return { ok: true, message: publish ? `"${label}" mağazaya eklendi ($${price})` : `"${label}" basıldı — envanterine eklendi` };
  });
  registerMock('reprint', () => ({ ok: true, message: 'Kaplama tekrar basıldı' }));
  registerMock('setListing', (d) => {
    const { id, price, published } = d as { id: string; price: number; published: boolean };
    const p = printed.find((x) => x.id === id);
    if (!p) return { ok: false, error: 'Tasarım bulunamadı' };
    p.price = price;
    p.published = published;
    return { ok: true, message: published ? `Mağazada: $${price}` : 'Mağazadan kaldırıldı' };
  });
  registerMock('importUrl', () => ({ ok: false, error: 'Tarayıcı modunda sunucu vekili yok' }));
  registerMock('aiGenerate', async () => {
    const transfer = `ai${Date.now()}`;
    setTimeout(() => sendDownload(transfer, fakeAiImage()), 1400);
    return { ok: true, transfer };
  });
  registerMock('close', () => ({ ok: true }));
  registerMock('scan', () => ({ ok: true }));
}

function sendDownload(id: string, data: string) {
  const CH = 200000;
  const total = Math.max(1, Math.ceil(data.length / CH));
  for (let i = 0; i < total; i++) emitNui('download', { id, index: i + 1, total, data: data.slice(i * CH, (i + 1) * CH) });
}

function fakeAiImage(): string {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, '#0e0e14');
  grad.addColorStop(1, '#23140a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = i % 3 ? 'rgba(212,162,76,.85)' : 'rgba(179,18,58,.8)';
    g.beginPath();
    const x = Math.random() * 1024;
    const w = 20 + Math.random() * 90;
    g.moveTo(x, 0);
    g.lineTo(x + w, 0);
    g.lineTo(x + w - 400, 1024);
    g.lineTo(x - 400, 1024);
    g.fill();
  }
  return c.toDataURL('image/png');
}
