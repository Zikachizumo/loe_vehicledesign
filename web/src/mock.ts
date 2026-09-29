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
  price: 2500,
  currency: '$',
  aiEnabled: true,
  fonts: ['Impact', 'Arial Black', 'Bahnschrift', 'Segoe UI', 'Georgia', 'Courier New', 'Trebuchet MS', 'Verdana'],
  limits: { maxLayers: 80, maxProjectBytes: 12 * 1024 * 1024, maxImportBytes: 8 * 1024 * 1024, maxTextLength: 48 },
  categories: [
    { id: 'sports', label: 'SPOR' },
    { id: 'sedan', label: 'SEDAN' },
    { id: 'suv', label: 'SUV' },
    { id: 'truck', label: 'KAMYONET' },
    { id: 'muscle', label: 'MUSCLE' },
    { id: 'emergency', label: 'KAMU' },
  ],
  vehicles: [
    { model: 'loe_demo', label: 'Demo Coupe', brand: 'LoE', year: 2026, category: 'sports', size: 2048, demo: true, slotsTotal: 16, slotsFree: 16 },
    { model: 'm8', label: 'M8 Competition', brand: 'BMW', year: 2020, category: 'sports', size: 2048, uv: 'assets/uv/m8.png', slotsTotal: 16, slotsFree: 14 },
    { model: 'rs7', label: 'RS7', brand: 'Audi', year: 2021, category: 'sedan', size: 2048, slotsTotal: 16, slotsFree: 16 },
    { model: 'gtr17', label: 'GT-R', brand: 'Nissan', year: 2017, category: 'sports', size: 2048, slotsTotal: 16, slotsFree: 11 },
    { model: 'raptor', label: 'F-150 Raptor', brand: 'Ford', year: 2019, category: 'truck', size: 2048, slotsTotal: 12, slotsFree: 12 },
    { model: 'police5', label: 'Devriye Aracı', brand: 'LSPD', year: 2024, category: 'emergency', size: 1024, slotsTotal: 8, slotsFree: 8 },
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
    const { uploadId, label, model } = d as { uploadId: string; label: string; model: string };
    const thumb = (uploads.get(uploadId) ?? []).join('').split('\n')[0];
    uploads.delete(uploadId);
    await new Promise((r) => setTimeout(r, 900));
    printed.unshift({ id: Math.random().toString(36).slice(2, 8).toUpperCase(), label, model, thumb, created: Date.now() / 1000 });
    return { ok: true, message: `"${label}" basıldı — envanterine eklendi` };
  });
  registerMock('reprint', () => ({ ok: true, message: 'Kaplama tekrar basıldı' }));
  registerMock('importUrl', () => ({ ok: false, error: 'Tarayıcı modunda sunucu vekili yok' }));
  registerMock('aiGenerate', async () => {
    const transfer = `ai${Date.now()}`;
    setTimeout(() => sendDownload(transfer, fakeAiImage()), 1400);
    return { ok: true, transfer };
  });
  registerMock('close', () => ({ ok: true }));
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
