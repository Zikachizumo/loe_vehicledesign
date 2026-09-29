import { useEffect, useRef, useState } from 'react';
import { hexToRgb, hsvToRgb, isHex, normHex, rgbToHex, rgbToHsv } from '../engine/util';
import { pushRecentColor, set, useStore } from '../store';
import { Icon } from './Icons';

/** Renk kutusu + acilir HSV secici (hex/RGB, son renkler, damlalik). */
export function ColorSwatch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        pushRecentColor(value);
      }
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open, value]);
  return (
    <div className="color-field" ref={ref}>
      {label && <span className="lbl">{label}</span>}
      <button className="swatch" style={{ background: value }} onClick={() => setOpen((o) => !o)} aria-label="Renk seç" />
      <input
        className="hex"
        value={text}
        maxLength={7}
        onChange={(e) => {
          setText(e.target.value);
          if (isHex(e.target.value) && e.target.value.replace('#', '').length === 6) onChange(normHex(e.target.value));
        }}
        onBlur={() => setText(value)}
      />
      {open && <Picker value={value} onChange={onChange} onPick={() => setOpen(false)} />}
    </div>
  );
}

function Picker({ value, onChange, onPick }: { value: string; onChange: (hex: string) => void; onPick: () => void }) {
  const [r, g, b] = hexToRgb(value);
  const [hsv, setHsv] = useState(() => rgbToHsv(r, g, b));
  const recent = useStore((s) => s.recentColors);
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      const [rr, gg, bb] = hexToRgb(value);
      setHsv(rgbToHsv(rr, gg, bb));
    }
  }, [value]);
  const emit = (h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    const hex = rgbToHex(...hsvToRgb(h, s, v));
    last.current = hex;
    onChange(hex);
  };
  const drag = (el: HTMLElement, fn: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const run = (ev: PointerEvent | React.PointerEvent) =>
      fn(Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height)));
    run(e);
    const mv = (ev: PointerEvent) => run(ev);
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [h, s, v] = hsv;
  const [cr, cg, cb] = hexToRgb(value);
  return (
    <div className="picker" onPointerDown={(e) => e.stopPropagation()}>
      <div
        className="sv"
        ref={svRef}
        style={{ background: `hsl(${h}, 100%, 50%)` }}
        onPointerDown={(e) => drag(svRef.current!, (x, y) => emit(h, x, 1 - y))(e)}
      >
        <div className="sv-w" />
        <div className="sv-b" />
        <div className="sv-dot" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }} />
      </div>
      <div className="row">
        <button
          className="icon-btn"
          title="Damlalık"
          onClick={() => {
            set({ tool: 'pick' });
            onPick();
          }}
        >
          <Icon name="pick" size={15} />
        </button>
        <div className="cur" style={{ background: value }} />
        <div className="hue" ref={hueRef} onPointerDown={(e) => drag(hueRef.current!, (x) => emit(x * 359.9, s, v))(e)}>
          <div className="hue-dot" style={{ left: `${(h / 360) * 100}%` }} />
        </div>
      </div>
      <div className="rgb">
        {(['R', 'G', 'B'] as const).map((k, i) => (
          <label key={k}>
            <input
              value={[cr, cg, cb][i]}
              onChange={(e) => {
                const n = Math.max(0, Math.min(255, Number(e.target.value) || 0));
                const c = [cr, cg, cb];
                c[i] = n;
                onChange(rgbToHex(c[0], c[1], c[2]));
              }}
            />
            <span>{k}</span>
          </label>
        ))}
      </div>
      <div className="recent">
        {recent.map((c) => (
          <button key={c} style={{ background: c }} title={c} onClick={() => onChange(c)} />
        ))}
      </div>
    </div>
  );
}
