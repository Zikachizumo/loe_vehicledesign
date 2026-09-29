import { useEffect, useRef, useState } from 'react';
import { S, set, useStore } from '../store';
import { T } from '../i18n';
import { editor, type Handle, type PointerInfo } from '../engine/editor';
import { TOOL_HANDLERS, cursorFor, wheelSelect } from '../engine/tools';
import { isPositioned, layerMatrix } from '../engine/render';
import { runtime } from '../runtime';
import { Icon } from './Icons';
import { Slider } from './ui';
import { assetUrl } from '../nui';

// 2D UV tuvali: yakinlas/kaydir, sablon katmani, secim tutamaclari.
export function UVView({ active }: { active: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const view = useRef({ zoom: 0.25, x: 0, y: 0, fitted: false });
  const [zoomPct, setZoomPct] = useState(25);
  const template = useStore((s) => s.template);
  const tool = useStore((s) => s.tool);
  const vehicle = useStore((s) => s.vehicle);
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const redraw = useRef(true);

  const fit = () => {
    const el = wrap.current;
    const doc = editor.doc;
    if (!el || !doc) return;
    const pad = 28;
    const z = Math.min((el.clientWidth - pad * 2) / doc.size, (el.clientHeight - pad * 2) / doc.size);
    view.current.zoom = Math.max(0.02, z);
    view.current.x = (el.clientWidth - doc.size * z) / 2;
    view.current.y = (el.clientHeight - doc.size * z) / 2;
    view.current.fitted = true;
    setZoomPct(Math.round(z * 100));
    redraw.current = true;
  };

  // UV-only araclar icin sablonu PNG'den yukle (3D sahne yoksa)
  useEffect(() => {
    if (!vehicle || vehicle.glb || vehicle.demo) return;
    runtime.template = null;
    runtime.islandMask = null;
    if (!vehicle.uv) return;
    const img = new Image();
    img.onload = () => {
      runtime.template = img;
      redraw.current = true;
    };
    img.crossOrigin = 'anonymous';
    img.src = assetUrl(vehicle.uv);
  }, [vehicle?.model]);

  useEffect(() => {
    view.current.fitted = false;
  }, [vehicle?.model]);

  // Cizim dongusu
  useEffect(() => {
    let raf = 0;
    let lastVer = -1;
    let lastSel: string | null = null;
    let lastTpl: unknown = null;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = cv.current;
      const el = wrap.current;
      const doc = editor.doc;
      if (!c || !el || !active) return;
      const dpr = window.devicePixelRatio || 1;
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
        redraw.current = true;
        if (!view.current.fitted) fit();
      }
      if (doc && !view.current.fitted) fit();
      const sel = S().selectedId;
      if (doc && (doc.version !== lastVer || sel !== lastSel || runtime.template !== lastTpl)) redraw.current = true;
      if (!redraw.current) return;
      redraw.current = false;
      lastVer = doc?.version ?? -1;
      lastSel = sel;
      lastTpl = runtime.template;
      draw(c, dpr, doc);
    };
    const draw = (c: HTMLCanvasElement, dpr: number, doc: typeof editor.doc) => {
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      if (!doc) return;
      const v = view.current;
      const S2 = doc.size * v.zoom;
      // tuval golgesi
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(v.x + 6, v.y + 8, S2, S2);
      g.imageSmoothingEnabled = v.zoom < 1;
      g.drawImage(doc.preview, v.x, v.y, S2, S2);
      const tpl = S().template;
      if (tpl.show && runtime.template) {
        g.globalAlpha = tpl.opacity;
        g.drawImage(runtime.template, v.x, v.y, S2, S2);
        g.globalAlpha = 1;
      }
      g.strokeStyle = 'rgba(255,255,255,.12)';
      g.strokeRect(v.x - 0.5, v.y - 0.5, S2 + 1, S2 + 1);
      // secim
      const l = editor.selected();
      if (l && isPositioned(l) && l.visible) {
        const m = layerMatrix(l);
        const pts = [
          [-l.w / 2, -l.h / 2],
          [l.w / 2, -l.h / 2],
          [l.w / 2, l.h / 2],
          [-l.w / 2, l.h / 2],
        ].map(([x, y]) => {
          const p = m.transformPoint(new DOMPoint(x, y));
          return [v.x + p.x * v.zoom, v.y + p.y * v.zoom];
        });
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d4a24c';
        g.strokeStyle = accent;
        g.lineWidth = 1.5;
        g.setLineDash([6, 4]);
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.stroke();
        g.setLineDash([]);
        if (!l.locked) {
          const top = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
          const rot = rotHandle(pts);
          g.beginPath();
          g.moveTo(top[0], top[1]);
          g.lineTo(rot[0], rot[1]);
          g.stroke();
          g.fillStyle = '#0c0c10';
          for (const [x, y] of pts) {
            g.fillRect(x - 5, y - 5, 10, 10);
            g.strokeRect(x - 5, y - 5, 10, 10);
          }
          g.beginPath();
          g.arc(rot[0], rot[1], 6, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
      }
      // firca imleci
      const ms = mouse.current;
      const size = brushSize();
      if (ms && size) {
        g.strokeStyle = 'rgba(255,255,255,.8)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(ms.x, ms.y, (size / 2) * v.zoom, 0, Math.PI * 2);
        g.stroke();
      }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  useEffect(() => {
    redraw.current = true;
  }, [template, tool]);

  // Isaretci olaylari
  useEffect(() => {
    const el = wrap.current!;
    let mode: 'none' | 'tool' | 'pan' = 'none';
    let panStart = { x: 0, y: 0, vx: 0, vy: 0 };
    let space = false;
    const toDoc = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      const v = view.current;
      return { x: (e.clientX - r.left - v.x) / v.zoom, y: (e.clientY - r.top - v.y) / v.zoom };
    };
    const info = (e: PointerEvent, handle?: Handle | null): PointerInfo => ({
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
      source: 'uv',
      handle,
    });
    const handleAt = (e: PointerEvent): Handle | null => {
      const l = editor.selected();
      if (!l || !isPositioned(l) || l.locked || S().tool !== 'select') return null;
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const v = view.current;
      const m = layerMatrix(l);
      const pts = [
        [-l.w / 2, -l.h / 2],
        [l.w / 2, -l.h / 2],
        [l.w / 2, l.h / 2],
        [-l.w / 2, l.h / 2],
      ].map(([x, y]) => {
        const p = m.transformPoint(new DOMPoint(x, y));
        return [v.x + p.x * v.zoom, v.y + p.y * v.zoom];
      });
      const rot = rotHandle(pts);
      if (Math.hypot(mx - rot[0], my - rot[1]) < 10) return 'rot';
      const names: Handle[] = ['nw', 'ne', 'se', 'sw'];
      for (let i = 0; i < 4; i++) if (Math.hypot(mx - pts[i][0], my - pts[i][1]) < 10) return names[i];
      return null;
    };
    const down = (e: PointerEvent) => {
      if (!active || !editor.doc) return;
      if (e.button === 1 || e.button === 2 || (e.button === 0 && space)) {
        mode = 'pan';
        panStart = { x: e.clientX, y: e.clientY, vx: view.current.x, vy: view.current.y };
        el.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;
      const h = TOOL_HANDLERS[S().tool];
      if (!h?.down) return;
      mode = 'tool';
      el.setPointerCapture(e.pointerId);
      h.down(toDoc(e), info(e, handleAt(e)));
      redraw.current = true;
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      redraw.current = true;
      if (mode === 'pan') {
        view.current.x = panStart.vx + (e.clientX - panStart.x);
        view.current.y = panStart.vy + (e.clientY - panStart.y);
      } else if (mode === 'tool') {
        TOOL_HANDLERS[S().tool]?.move?.(toDoc(e), info(e));
      } else {
        const hnd = handleAt(e);
        el.style.cursor = hnd ? (hnd === 'rot' ? 'grab' : 'nwse-resize') : space ? 'grab' : cursorFor(S().tool);
      }
    };
    const up = (e: PointerEvent) => {
      if (mode === 'tool') TOOL_HANDLERS[S().tool]?.up?.(toDoc(e), info(e));
      mode = 'none';
      redraw.current = true;
    };
    const leave = () => {
      mouse.current = null;
      redraw.current = true;
    };
    const wheel = (e: WheelEvent) => {
      if (!active) return;
      e.preventDefault();
      if (S().tool === 'select' && (e.shiftKey || e.ctrlKey)) {
        wheelSelect(Math.sign(e.deltaY), { shift: e.shiftKey, ctrl: e.ctrlKey });
        return;
      }
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const v = view.current;
      const k = Math.exp(-e.deltaY * 0.0015);
      const nz = Math.min(8, Math.max(0.03, v.zoom * k));
      v.x = mx - ((mx - v.x) * nz) / v.zoom;
      v.y = my - ((my - v.y) * nz) / v.zoom;
      v.zoom = nz;
      setZoomPct(Math.round(nz * 100));
      redraw.current = true;
    };
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) space = true;
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') space = false;
    };
    const ctx = (e: MouseEvent) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', ctx);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', ctx);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [active]);

  const zoomBy = (k: number) => {
    const el = wrap.current;
    if (!el) return;
    const v = view.current;
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    const nz = Math.min(8, Math.max(0.03, v.zoom * k));
    v.x = cx - ((cx - v.x) * nz) / v.zoom;
    v.y = cy - ((cy - v.y) * nz) / v.zoom;
    v.zoom = nz;
    setZoomPct(Math.round(nz * 100));
    redraw.current = true;
  };

  return (
    <div className="uvview" style={{ display: active ? undefined : 'none' }}>
      <div className="uv-canvas" ref={wrap} style={{ cursor: cursorFor(tool) }}>
        <canvas ref={cv} />
        {!runtime.template && vehicle && !vehicle.glb && !vehicle.demo && !vehicle.uv && (
          <div className="uv-note">UV şablonu tanımlı değil — tasarım yine de doku piksellerine uygulanır.</div>
        )}
      </div>
      <div className="uv-bar">
        <span className="dim">
          {editor.doc ? `TUVAL · ${editor.doc.size}×${editor.doc.size} PX` : ''}
        </span>
        <div className="grow" />
        <button className={`chip ${template.show ? 'on' : ''}`} onClick={() => set({ template: { ...template, show: !template.show } })}>
          <Icon name="grid" size={13} /> {T.ws.template}
        </button>
        <Slider value={template.opacity} min={0.1} max={1} step={0.05} width={80} onChange={(v) => set({ template: { ...template, opacity: v } })} format={(v) => `${Math.round(v * 100)}%`} />
        <button className="icon-btn" onClick={() => zoomBy(1 / 1.25)}>−</button>
        <span className="zoom">{zoomPct}%</span>
        <button className="icon-btn" onClick={() => zoomBy(1.25)}>+</button>
        <button className="chip" onClick={fit}>{T.ws.fit}</button>
      </div>
    </div>
  );
}

function rotHandle(pts: number[][]): [number, number] {
  const top = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
  const bottom = [(pts[3][0] + pts[2][0]) / 2, (pts[3][1] + pts[2][1]) / 2];
  const dx = top[0] - bottom[0];
  const dy = top[1] - bottom[1];
  const len = Math.hypot(dx, dy) || 1;
  return [top[0] + (dx / len) * 26, top[1] + (dy / len) * 26];
}

function brushSize(): number {
  const s = S();
  switch (s.tool) {
    case 'brush':
      return s.opts.brush.size;
    case 'eraser':
      return s.opts.eraser.size;
    case 'clone':
      return s.opts.clone.size;
    case 'smudge':
      return s.opts.smudge.size;
    case 'pen':
      return s.opts.pen.size;
    default:
      return 0;
  }
}
