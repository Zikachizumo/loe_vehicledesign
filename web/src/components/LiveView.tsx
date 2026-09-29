import { useEffect, useRef } from 'react';
import { set, useStore } from '../store';
import { T } from '../i18n';
import { fetchNui, isEnvBrowser } from '../nui';
import { Icon } from './Icons';

const VIEWS = ['three', 'front', 'side', 'rear', 'other', 'top'] as const;

/** Seffaf calisma alani: arkada oyunun kendisi (gercek arac) gorunur. */
export function LiveView({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const grid = useStore((s) => s.grid);
  const vehicle = useStore((s) => s.vehicle);
  const inGame = !isEnvBrowser();

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    let drag: { x: number; y: number } | null = null;
    let acc = { dx: 0, dy: 0, zoom: 0 };
    let timer = 0;
    const flush = () => {
      timer = 0;
      if (!acc.dx && !acc.dy && !acc.zoom) return;
      const send = acc;
      acc = { dx: 0, dy: 0, zoom: 0 };
      void fetchNui('previewCam', send);
    };
    const queue = () => {
      if (!timer) timer = window.setTimeout(flush, 33);
    };
    const down = (e: PointerEvent) => {
      if (e.target !== el) return;
      drag = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      acc.dx += e.clientX - drag.x;
      acc.dy += e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      queue();
    };
    const up = () => (drag = null);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      acc.zoom += Math.sign(e.deltaY);
      queue();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
      window.clearTimeout(timer);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="liveview" ref={ref}>
      {vehicle && (
        <div className="model-tag">
          <small>{vehicle.brand ?? ''}</small>
          <b>{vehicle.label}</b>
          <span>{T.ws.titleLive}</span>
        </div>
      )}
      {!inGame && (
        <div className="overlay-msg soft">
          <Icon name="camera" size={34} />
          <b>{T.ws.liveBrowser}</b>
          <span>{T.ws.liveBrowserSub}</span>
        </div>
      )}
      <div className="view-bar">
        <span className="hint">
          <Icon name="camera" size={13} /> {T.ws.liveHint}
        </span>
        <div className="views">
          {VIEWS.map((v) => (
            <button key={v} onClick={() => void fetchNui('previewCam', { view: v })}>
              {T.ws.views[v]}
            </button>
          ))}
          <button className={grid ? 'on' : ''} onClick={() => set({ grid: !grid })}>
            <Icon name="grid" size={12} /> {T.ws.grid}
          </button>
        </div>
      </div>
    </div>
  );
}
