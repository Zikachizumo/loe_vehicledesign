import { set, useStore } from '../store';
import { T } from '../i18n';
import { editor } from '../engine/editor';
import { Emblem, Icon } from './Icons';
import { useEffect, useRef } from 'react';

export function Footer() {
  const cfg = useStore((s) => s.config);
  const step = useStore((s) => s.step);
  const vehicle = useStore((s) => s.vehicle);
  const project = useStore((s) => s.project);
  const printing = useStore((s) => s.busy.print);
  const docRev = useStore((s) => s.docRev);
  const thumb = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const c = thumb.current;
      if (!c) return;
      const g = c.getContext('2d')!;
      g.clearRect(0, 0, c.width, c.height);
      if (editor.doc) g.drawImage(editor.doc.preview, 0, 0, c.width, c.height);
    }, 200);
    return () => window.clearTimeout(t);
  }, [docRev]);
  const layers = editor.doc?.layers.length ?? 0;
  const price = cfg?.price ?? 0;
  return (
    <footer className="footer">
      <div className="f-brand">
        <Emblem size={30} />
        <div>
          <b>{cfg?.brand.name ?? 'Legends of Empire'}</b>
          <span>{cfg?.brand.tagline ?? 'ARAÇ TASARIM STÜDYOSU'}</span>
        </div>
      </div>
      <ol className="steps">
        {T.footer.steps.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'on' : ''}>
            <em>{String(i + 1).padStart(2, '0')}</em>
            <b>{s}</b>
          </li>
        ))}
      </ol>
      <div className="f-project">
        <canvas ref={thumb} width={52} height={52} className={vehicle ? '' : 'off'} />
        <div>
          <small>{vehicle ? T.footer.activeLivery : T.footer.noProject}</small>
          <b>{vehicle ? project.name : T.library.selectVehicle}</b>
          <span>
            {vehicle ? `${vehicle.label} · ${layers} ${T.footer.layersCount}${project.dirty ? ' · kaydedilmedi' : ''}` : '—'}
          </span>
        </div>
      </div>
      <button
        className={`print-btn ${printing ? 'busy' : ''}`}
        disabled={!vehicle || !layers || printing}
        onClick={() => set({ modal: { type: 'print' } })}
      >
        <div>
          <b>{printing ? T.footer.printing : T.footer.print}</b>
          <span>
            {T.footer.printSub}
            {price > 0 ? ` · ${cfg?.currency ?? '$'}${price.toLocaleString('tr-TR')}` : ''}
          </span>
        </div>
        <Icon name="print" size={22} />
      </button>
    </footer>
  );
}
