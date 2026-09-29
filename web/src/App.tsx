import { useEffect } from 'react';
import { S, set, useStore } from './store';
import { emitNui, isEnvBrowser, useNuiEvent } from './nui';
import type { OpenPayload, VehicleDef } from './types';
import { TopBar, setToolByKey } from './components/TopBar';
import { Library } from './components/Library';
import { Workspace } from './components/Workspace';
import { LayersPanel } from './components/LayersPanel';
import { OptionsBar } from './components/OptionsBar';
import { Footer } from './components/Footer';
import { Modals, Toasts } from './components/Modals';
import { editor } from './engine/editor';
import { refreshLists, requestClose } from './actions';
import { MOCK_OPEN, installMocks } from './mock';

export default function App() {
  const visible = useStore((s) => s.visible);
  const libraryOpen = useStore((s) => s.libraryOpen);
  const theme = useStore((s) => s.config?.theme);

  useNuiEvent<OpenPayload>('open', (cfg) => {
    set({ config: cfg, visible: true });
    const v = S().vehicle;
    if (v) {
      const fresh = cfg.vehicles.find((x) => x.model === v.model);
      if (fresh) set({ vehicle: fresh });
    }
    void refreshLists();
  });
  useNuiEvent('close', () => set({ visible: false, modal: null }));
  useNuiEvent<{ model: string; free: number }[]>('slots', (list) => {
    const cfg = S().config;
    if (!cfg) return;
    const map = new Map(list.map((x) => [x.model, x.free]));
    const vehicles: VehicleDef[] = cfg.vehicles.map((v) => (map.has(v.model) ? { ...v, slotsFree: map.get(v.model)! } : v));
    set({ config: { ...cfg, vehicles } });
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme || 'empire';
  }, [theme]);

  // Tarayicida acilista sahte veriyle ac
  useEffect(() => {
    if (isEnvBrowser()) {
      installMocks();
      setTimeout(() => emitNui('open', MOCK_OPEN), 30);
    }
  }, []);

  // Klavye kisayollari
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!S().visible) return;
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if (e.key === 'Escape') {
        if (S().modal) set({ modal: null });
        else if (!typing) requestClose();
        return;
      }
      if (typing) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        editor.redo();
      } else if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (S().vehicle) set({ modal: { type: 'save' } });
      } else if (ctrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const sel = S().selectedId;
        if (sel) editor.duplicate(sel);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = S().selectedId;
        if (sel) editor.remove(sel);
      } else if (e.key.startsWith('Arrow')) {
        const l = editor.selected();
        if (!l || l.locked) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        editor.update(l.id, { x: l.x + dx, y: l.y + dy }, 'Katman taşındı');
      } else if (!ctrl && !e.altKey && e.key.length === 1) {
        setToolByKey(e.key);
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, []);

  if (!visible) return null;
  return (
    <div className={`app ${libraryOpen ? '' : 'lib-closed'}`}>
      <TopBar />
      <div className="main">
        {libraryOpen && <Library />}
        <Workspace />
        <LayersPanel />
      </div>
      <OptionsBar />
      <Footer />
      <Modals />
      <Toasts />
    </div>
  );
}
