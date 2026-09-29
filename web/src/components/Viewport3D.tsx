import { useEffect, useRef } from 'react';
import { S, set, useStore } from '../store';
import { T } from '../i18n';
import { editor, type PointerInfo } from '../engine/editor';
import { TOOL_HANDLERS, cursorFor, wheelSelect } from '../engine/tools';
import { Scene3D, type ViewName } from '../three/Scene3D';
import { runtime } from '../runtime';
import { Icon } from './Icons';

const VIEWS: ViewName[] = ['three', 'front', 'side', 'rear', 'other', 'top'];

export function Viewport3D({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const vehicle = useStore((s) => s.vehicle);
  const docId = useStore((s) => s.docId);
  const state = useStore((s) => s.model3dState);
  const tool = useStore((s) => s.tool);
  useStore((s) => s.docRev);
  const finish = editor.doc?.paint.finish ?? 'gloss';

  // Sahne kurulumu
  useEffect(() => {
    const scene = new Scene3D(host.current!);
    sceneRef.current = scene;
    (window as unknown as { __scene: Scene3D }).__scene = scene;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (accent) scene.setAccent(accent);
    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(host.current!);
    return () => {
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Arac degisince modeli yukle
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !vehicle) return;
    if (!vehicle.glb && !vehicle.demo) {
      set({ model3dState: 'missing' });
      return;
    }
    let cancelled = false;
    set({ model3dState: 'loading', loadingModel: true });
    scene
      .load(vehicle)
      .then((res) => {
        if (cancelled) return;
        runtime.template = res.template;
        runtime.islandMask = res.mask;
        scene.setDoc(editor.doc);
        set({ model3dState: res.ok ? 'ready' : 'missing', loadingModel: false });
      })
      .catch(() => {
        if (!cancelled) set({ model3dState: 'error', loadingModel: false });
      });
    return () => {
      cancelled = true;
    };
  }, [vehicle?.model]);

  // Belge degisince dokuyu bagla
  useEffect(() => {
    sceneRef.current?.setDoc(editor.doc);
  }, [docId]);

  useEffect(() => {
    sceneRef.current?.setFinish(finish);
  }, [finish]);

  // Boyama: yakalama fazinda (OrbitControls'tan once) govdeye isabet varsa araci calistir
  useEffect(() => {
    const el = wrap.current!;
    let painting = false;
    const info = (e: PointerEvent | WheelEvent): PointerInfo => ({ shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey, source: '3d' });
    const handler = () => TOOL_HANDLERS[S().tool];
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !active) return;
      const h = handler();
      if (!h?.down) return;
      const p = sceneRef.current?.pick(e.clientX, e.clientY);
      if (!p) return; // bosluga tik -> kamera doner
      e.stopPropagation();
      painting = true;
      sceneRef.current!.controls.enabled = false;
      el.setPointerCapture(e.pointerId);
      h.down(p, info(e));
    };
    const move = (e: PointerEvent) => {
      if (!painting) return;
      const p = sceneRef.current?.pick(e.clientX, e.clientY);
      if (p) handler()?.move?.(p, info(e));
    };
    const up = (e: PointerEvent) => {
      if (!painting) return;
      painting = false;
      const p = sceneRef.current?.pick(e.clientX, e.clientY) ?? { x: 0, y: 0 };
      handler()?.up?.(p, info(e));
      sceneRef.current!.controls.enabled = true;
    };
    const wheel = (e: WheelEvent) => {
      if (S().tool === 'select' && (e.shiftKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        wheelSelect(Math.sign(e.deltaY), { shift: e.shiftKey, ctrl: e.ctrlKey });
      }
    };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move, true);
    el.addEventListener('pointerup', up, true);
    el.addEventListener('pointercancel', up, true);
    el.addEventListener('wheel', wheel, { capture: true, passive: false });
    return () => {
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move, true);
      el.removeEventListener('pointerup', up, true);
      el.removeEventListener('pointercancel', up, true);
      el.removeEventListener('wheel', wheel, true);
    };
  }, [active]);

  return (
    <div className="viewport3d" ref={wrap} style={{ display: active ? undefined : 'none', cursor: cursorFor(tool) }}>
      <div className="three-host" ref={host} />
      {vehicle && (
        <div className="model-tag">
          <small>{vehicle.brand ?? ''}</small>
          <b>{vehicle.label}</b>
          <span>{vehicle.year ?? ''}</span>
        </div>
      )}
      {state === 'loading' && <Preparing label={vehicle?.label ?? ''} />}
      {(state === 'missing' || state === 'error') && (
        <div className="overlay-msg">
          <Icon name="cube" size={34} />
          <b>{state === 'error' ? T.ws.loadFail : T.ws.no3d}</b>
          <span>{T.ws.no3dSub}</span>
          <button className="btn" onClick={() => set({ mode: 'uv', libraryOpen: true })}>
            {T.ws.modeUv}
          </button>
        </div>
      )}
      {state === 'ready' && (
        <div className="view-bar">
          <span className="hint">
            <Icon name="warn" size={13} /> Sol tık: araç · Boşlukta sürükle: döndür · Sağ tık: kaydır · Tekerlek: yakınlaş
          </span>
          <div className="views">
            {VIEWS.map((v) => (
              <button key={v} onClick={() => sceneRef.current?.setView(v)}>
                {T.ws.views[v === 'three' ? 'three' : v === 'other' ? 'other' : v]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Preparing({ label }: { label: string }) {
  return (
    <div className="preparing">
      <div className="prep-icon" />
      <b>
        {T.ws.preparing}
        {label ? ` · ${label.toLocaleUpperCase('tr')}` : ''}
      </b>
      <div className="prep-bar">
        <i />
      </div>
    </div>
  );
}
