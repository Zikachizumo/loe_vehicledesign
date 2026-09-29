import { create } from 'zustand';
import type { OpenPayload, PrintedSummary, ProjectSummary, VehicleDef } from './types';
import type { ShapeKind } from './engine/types';

export type ToolId =
  | 'select'
  | 'brush'
  | 'splat'
  | 'eraser'
  | 'fill'
  | 'text'
  | 'shapes'
  | 'pen'
  | 'gradient'
  | 'image'
  | 'decal'
  | 'clone'
  | 'smudge'
  | 'pick'
  | 'fx'
  | 'finish'
  | 'history'
  | 'ai';

export type ViewMode = '3d' | 'uv' | 'live';

export interface Toast {
  id: number;
  kind: 'ok' | 'err' | 'info';
  text: string;
}

export type Modal =
  | { type: 'importUrl' }
  | { type: 'confirmNew' }
  | { type: 'print' }
  | { type: 'save' }
  | { type: 'deleteProject'; id: number; name: string }
  | { type: 'confirmClose' }
  | { type: 'switchVehicle'; model: string }
  | null;

export interface ToolOptions {
  brush: { tip: 'round' | 'marker' | 'square' | 'spray'; size: number; opacity: number; hardness: number; newLayer: boolean };
  splat: { size: number; energy: number; droplets: number; drips: boolean };
  eraser: { size: number; hardness: number; opacity: number };
  fill: { tolerance: number; mode: 'region' | 'panel' | 'whole' };
  text: { text: string; font: string; size: number; bold: boolean; italic: boolean; stroke: string; strokeWidth: number; spacing: number };
  shapes: { kind: ShapeKind; filled: boolean; stroke: string; strokeWidth: number; size: number };
  pen: { size: number; opacity: number };
  gradient: { kind: 'linear' | 'radial' };
  clone: { size: number; hardness: number };
  smudge: { size: number; strength: number };
  image: { size: number };
  decal: { id: string; size: number };
}

interface State {
  visible: boolean;
  config: OpenPayload | null;
  vehicle: VehicleDef | null;
  loadingModel: boolean;
  model3dState: 'none' | 'loading' | 'ready' | 'missing' | 'error';
  mode: ViewMode;
  libraryOpen: boolean;
  libraryTab: 'vehicles' | 'designs';
  search: string;
  category: string;
  tool: ToolId;
  color: string;
  color2: string;
  recentColors: string[];
  opts: ToolOptions;
  docRev: number;
  docId: number; // yeni belge/proje yuklenince artar
  selectedId: string | null;
  historyRev: number;
  project: { id: number | null; name: string; dirty: boolean };
  projects: ProjectSummary[];
  printed: PrintedSummary[];
  modal: Modal;
  toasts: Toast[];
  busy: { print: boolean; save: boolean; ai: boolean; import: boolean };
  step: number; // 0..3
  recentImages: { src: string; name: string }[];
  pendingImage: string | null; // yerlestirilmeyi bekleyen gorsel (gorsel araci)
  template: { show: boolean; opacity: number };
  grid: boolean; // UV izgarasi yardimcisi (UV + canli onizleme)
  liveSplit: boolean; // OYUNDA modunda solda UV tuvali (boyama), sagda gercek arac
  onlySupported: boolean; // kutuphanede sadece kaplama destekleyenler
  cloneSource: { x: number; y: number } | null;
}

export const useStore = create<State>(() => ({
  visible: false,
  config: null,
  vehicle: null,
  loadingModel: false,
  model3dState: 'none',
  mode: '3d',
  libraryOpen: true,
  libraryTab: 'vehicles',
  search: '',
  category: 'all',
  tool: 'select',
  color: '#d4a24c',
  color2: '#16161c',
  recentColors: ['#d4a24c', '#b3123a', '#16161c', '#f2f2f2', '#2f9bff', '#26d07c'],
  opts: {
    brush: { tip: 'round', size: 48, opacity: 1, hardness: 0.7, newLayer: true },
    splat: { size: 180, energy: 70, droplets: 60, drips: false },
    eraser: { size: 64, hardness: 0.8, opacity: 1 },
    fill: { tolerance: 24, mode: 'region' },
    text: { text: 'LEGENDS', font: 'Impact', size: 140, bold: true, italic: true, stroke: '#000000', strokeWidth: 0, spacing: 2 },
    shapes: { kind: 'stripes', filled: true, stroke: '#000000', strokeWidth: 0, size: 320 },
    pen: { size: 14, opacity: 1 },
    gradient: { kind: 'linear' },
    clone: { size: 60, hardness: 0.6 },
    smudge: { size: 60, strength: 0.6 },
    image: { size: 420 },
    decal: { id: 'crest', size: 360 },
  },
  docRev: 0,
  docId: 0,
  selectedId: null,
  historyRev: 0,
  project: { id: null, name: 'Yeni Kaplama', dirty: false },
  projects: [],
  printed: [],
  modal: null,
  toasts: [],
  busy: { print: false, save: false, ai: false, import: false },
  step: 0,
  recentImages: [],
  pendingImage: null,
  template: { show: true, opacity: 0.85 },
  grid: false,
  liveSplit: true,
  onlySupported: true,
  cloneSource: null,
}));

export const S = () => useStore.getState();
export const set = useStore.setState;

export function setOpt<K extends keyof ToolOptions>(tool: K, patch: Partial<ToolOptions[K]>) {
  set((s) => ({ opts: { ...s.opts, [tool]: { ...s.opts[tool], ...patch } } }));
}

let toastId = 0;
export function toast(text: string, kind: Toast['kind'] = 'info') {
  const id = ++toastId;
  set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, text }] }));
  window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
}

export function pushRecentColor(c: string) {
  set((s) => ({ recentColors: [c, ...s.recentColors.filter((x) => x !== c)].slice(0, 12) }));
}
