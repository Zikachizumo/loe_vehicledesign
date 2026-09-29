import { useStore } from '../store';
import { T } from '../i18n';
import { editor } from '../engine/editor';
import type { BlendMode, Layer } from '../engine/types';
import { Icon } from './Icons';
import { NumField, Slider, Toggle } from './ui';
import { ColorSwatch } from './ColorPicker';

export const BLENDS: { id: BlendMode; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Çarp' },
  { id: 'screen', label: 'Ekran' },
  { id: 'overlay', label: 'Kaplama' },
  { id: 'darken', label: 'Koyulaştır' },
  { id: 'lighten', label: 'Açıklaştır' },
  { id: 'color-dodge', label: 'Renk Soldur' },
  { id: 'color-burn', label: 'Renk Yak' },
  { id: 'hard-light', label: 'Sert Işık' },
  { id: 'soft-light', label: 'Yumuşak Işık' },
  { id: 'difference', label: 'Fark' },
  { id: 'exclusion', label: 'Dışlama' },
  { id: 'hue', label: 'Ton' },
  { id: 'saturation', label: 'Doygunluk' },
  { id: 'color', label: 'Renk' },
  { id: 'luminosity', label: 'Parlaklık' },
];

export function LayerProps() {
  useStore((s) => s.docRev);
  useStore((s) => s.historyRev);
  const selectedId = useStore((s) => s.selectedId);
  const l = editor.doc?.layer(selectedId);
  const up = (patch: Partial<Layer>, label?: string) => l && editor.update(l.id, patch, label);
  const positioned = l && l.type !== 'fill' && l.type !== 'gradient';
  return (
    <div className="props">
      <div className="panel-h sub">
        <span className="bar" />
        <Icon name="sparkle" size={15} />
        <b>{T.layers.props}</b>
      </div>
      {!l ? (
        <p className="empty">{T.layers.noSel}</p>
      ) : (
        <div className="props-body">
          {positioned && (
            <>
              <div className="grid2">
                <NumField label="X" value={l.x} onChange={(v) => up({ x: v })} />
                <NumField label="Y" value={l.y} onChange={(v) => up({ y: v })} />
                <NumField label={T.layers.width} value={l.w} onChange={(v) => up({ w: Math.max(2, v) })} />
                <NumField label={T.layers.height} value={l.h} onChange={(v) => up({ h: Math.max(2, v) })} />
              </div>
              <div className="grid2">
                <NumField label={T.layers.rotation} value={l.rotation} suffix="°" onChange={(v) => up({ rotation: ((v % 360) + 360) % 360 })} />
                <button className="btn ghost" onClick={() => up({ x: (editor.doc?.size ?? 0) / 2, y: (editor.doc?.size ?? 0) / 2 }, 'Ortalandı')}>
                  <Icon name="center" size={14} /> {T.layers.center}
                </button>
              </div>
              <div className="grid2">
                <button className={`btn ghost ${l.flipX ? 'on' : ''}`} onClick={() => up({ flipX: !l.flipX }, 'Ayna')}>
                  <Icon name="flipH" size={14} /> {T.layers.mirrorH}
                </button>
                <button className={`btn ghost ${l.flipY ? 'on' : ''}`} onClick={() => up({ flipY: !l.flipY }, 'Ayna')}>
                  <Icon name="flipV" size={14} /> {T.layers.mirrorV}
                </button>
              </div>
            </>
          )}
          <Slider label={T.layers.opacity} value={Math.round(l.opacity * 100)} min={0} max={100} unit="%" width={130} onChange={(v) => up({ opacity: v / 100 })} />
          <label className="select-row">
            <span className="lbl">{T.layers.blend}</span>
            <select value={l.blend} onChange={(e) => up({ blend: e.target.value as BlendMode }, 'Karışım modu')}>
              {BLENDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <TypeProps l={l} />
        </div>
      )}
    </div>
  );
}

function TypeProps({ l }: { l: Layer }) {
  const up = (patch: Partial<Layer>, label?: string) => editor.update(l.id, patch as never, label);
  switch (l.type) {
    case 'fill':
      return <ColorSwatch label={T.options.color} value={l.color} onChange={(c) => up({ color: c } as never, 'Renk')} />;
    case 'gradient':
      return (
        <>
          <ColorSwatch label={T.options.color} value={l.c1} onChange={(c) => up({ c1: c } as never, 'Renk')} />
          <ColorSwatch label={T.options.color2} value={l.c2} onChange={(c) => up({ c2: c } as never, 'Renk')} />
        </>
      );
    case 'text':
      return (
        <>
          <label className="select-row">
            <span className="lbl">{T.options.text}</span>
            <input className="txt" value={l.text} maxLength={64} onChange={(e) => up({ text: e.target.value } as never, 'Yazı')} />
          </label>
          <ColorSwatch label={T.options.color} value={l.color} onChange={(c) => up({ color: c } as never, 'Renk')} />
        </>
      );
    case 'shape':
      return (
        <>
          <ColorSwatch label={T.options.color} value={l.fill} onChange={(c) => up({ fill: c } as never, 'Renk')} />
          <Toggle label={T.options.filled} value={l.filled} onChange={(v) => up({ filled: v, strokeWidth: v ? l.strokeWidth : Math.max(6, l.strokeWidth) } as never, 'Şekil')} />
          <ColorSwatch label={T.options.stroke} value={l.stroke} onChange={(c) => up({ stroke: c } as never, 'Kontur')} />
          <Slider label={T.options.width} value={l.strokeWidth} min={0} max={80} width={110} onChange={(v) => up({ strokeWidth: v } as never)} />
        </>
      );
    case 'splat':
      return (
        <>
          <ColorSwatch label={T.options.color} value={l.color} onChange={(c) => up({ color: c } as never, 'Renk')} />
          <Slider label={T.options.energy} value={l.energy} min={0} max={100} width={110} onChange={(v) => up({ energy: v } as never)} />
          <Slider label={T.options.droplets} value={l.droplets} min={0} max={100} width={110} onChange={(v) => up({ droplets: v } as never)} />
          <div className="grid2">
            <Toggle label={T.options.drips} value={l.drips} onChange={(v) => up({ drips: v } as never, 'Akıntı')} />
            <button className="btn ghost" onClick={() => up({ seed: Math.floor(Math.random() * 1e9) } as never, 'Yeni şekil')}>
              <Icon name="refresh" size={14} /> {T.layers.reseed}
            </button>
          </div>
        </>
      );
    case 'image':
    case 'raster':
      return null;
  }
}
