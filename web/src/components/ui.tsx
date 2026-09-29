import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  onCommit,
  width = 120,
  format,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  width?: number;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      {label && <span className="lbl">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ width, ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
      />
      <span className="val">{format ? format(value) : `${Math.round(value * 100) / 100}${unit}`}</span>
    </label>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} className={o.id === value ? 'on' : ''} title={o.title} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      <span className="knob" />
      {label}
    </button>
  );
}

/** Sayi kutusu: yazarken degil, Enter/odak kaybinda uygular. */
export function NumField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(String(Math.round(value * 10) / 10));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(Math.round(value * 10) / 10));
  }, [value]);
  const apply = () => {
    const n = Number(text.replace(',', '.'));
    if (Number.isFinite(n)) onChange(n);
    else setText(String(Math.round(value * 10) / 10));
  };
  return (
    <label className="numfield">
      <span>{label}</span>
      <input
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          apply();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const n = (Number(text) || 0) + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1);
            setText(String(n));
            onChange(n);
          }
        }}
      />
      {suffix && <em>{suffix}</em>}
    </label>
  );
}
