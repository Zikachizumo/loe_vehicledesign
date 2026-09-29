import { useRef, useState } from 'react';
import { S, set, setOpt, useStore } from '../store';
import { T } from '../i18n';
import { editor } from '../engine/editor';
import type { Finish, Layer, ShapeKind } from '../engine/types';
import { DECALS, decalPreview } from '../engine/decals';
import { Icon } from './Icons';
import { Seg, Slider, Toggle } from './ui';
import { ColorSwatch } from './ColorPicker';
import { aiGenerate, uploadFont, uploadImageFile } from '../actions';

const TOOL_ICON: Record<string, string> = {
  shapes: 'shapes',
  decal: 'decal',
  ai: 'ai',
};

export function OptionsBar() {
  const tool = useStore((s) => s.tool);
  const hasDoc = useStore((s) => !!s.vehicle);
  const label = T.tools[tool as keyof typeof T.tools];
  return (
    <div className="optbar">
      <div className="opt-title">
        <Icon name={TOOL_ICON[tool] ?? tool} size={16} />
        <b>{label}</b>
      </div>
      <div className="opt-body">{hasDoc ? <ToolOptions /> : <span className="hint">Araç seçildiğinde tasarım araçları etkinleşir.</span>}</div>
    </div>
  );
}

function MainColor() {
  const color = useStore((s) => s.color);
  return <ColorSwatch label={T.options.color} value={color} onChange={(c) => set({ color: c })} />;
}

function Hint({ text }: { text: string }) {
  return <span className="hint">{text}</span>;
}

function ToolOptions() {
  const tool = useStore((s) => s.tool);
  const o = useStore((s) => s.opts);
  useStore((s) => s.selectedId);
  useStore((s) => s.historyRev);
  const sel = editor.selected();
  switch (tool) {
    case 'select':
      return <Hint text={T.hints.select} />;
    case 'brush':
      return (
        <>
          <Seg
            value={o.brush.tip}
            options={(['round', 'marker', 'square', 'spray'] as const).map((id) => ({ id, label: T.options.tips[id] }))}
            onChange={(tip) => setOpt('brush', { tip })}
          />
          <Slider label={T.options.size} value={o.brush.size} min={2} max={400} unit="px" onChange={(size) => setOpt('brush', { size })} />
          <Slider label={T.options.opacity} value={Math.round(o.brush.opacity * 100)} min={5} max={100} unit="%" width={90} onChange={(v) => setOpt('brush', { opacity: v / 100 })} />
          <Slider label={T.options.hardness} value={Math.round(o.brush.hardness * 100)} min={0} max={100} unit="%" width={80} onChange={(v) => setOpt('brush', { hardness: v / 100 })} />
          <MainColor />
          <Toggle label={T.options.newLayer} value={o.brush.newLayer} onChange={(v) => setOpt('brush', { newLayer: v })} />
        </>
      );
    case 'splat':
      return (
        <>
          <Slider label={T.options.size} value={o.splat.size} min={20} max={900} unit="px" onChange={(size) => setOpt('splat', { size })} />
          <MainColor />
          <Slider label={T.options.energy} value={o.splat.energy} min={0} max={100} width={100} onChange={(energy) => setOpt('splat', { energy })} />
          <Slider label={T.options.droplets} value={o.splat.droplets} min={0} max={100} width={100} onChange={(droplets) => setOpt('splat', { droplets })} />
          <Seg
            value={o.splat.drips ? 'drips' : 'clean'}
            options={[
              { id: 'clean', label: T.options.clean },
              { id: 'drips', label: T.options.drips },
            ]}
            onChange={(v) => setOpt('splat', { drips: v === 'drips' })}
          />
          <Hint text={T.hints.splat} />
        </>
      );
    case 'eraser':
      return (
        <>
          <Slider label={T.options.size} value={o.eraser.size} min={2} max={400} unit="px" onChange={(size) => setOpt('eraser', { size })} />
          <Slider label={T.options.hardness} value={Math.round(o.eraser.hardness * 100)} min={0} max={100} unit="%" width={80} onChange={(v) => setOpt('eraser', { hardness: v / 100 })} />
          <Slider label={T.options.opacity} value={Math.round(o.eraser.opacity * 100)} min={5} max={100} unit="%" width={80} onChange={(v) => setOpt('eraser', { opacity: v / 100 })} />
          <Hint text={sel ? T.hints.eraser : T.options.selectLayerFirst} />
        </>
      );
    case 'fill':
      return (
        <>
          <Seg
            value={o.fill.mode}
            options={[
              { id: 'region', label: T.options.region },
              { id: 'panel', label: T.options.panel },
              { id: 'whole', label: T.options.whole },
            ]}
            onChange={(mode) => setOpt('fill', { mode })}
          />
          {o.fill.mode === 'region' && (
            <Slider label={T.options.tolerance} value={o.fill.tolerance} min={0} max={100} width={100} onChange={(tolerance) => setOpt('fill', { tolerance })} />
          )}
          <MainColor />
          <Hint text={T.hints.fill} />
        </>
      );
    case 'text':
      return <TextOptions sel={sel} />;
    case 'shapes':
      return (
        <>
          <div className="shape-pick">
            {(['stripes', 'rect', 'roundrect', 'ellipse', 'ring', 'triangle', 'diamond', 'star', 'hexagon', 'chevron', 'arrow', 'bolt'] as ShapeKind[]).map((k) => (
              <button key={k} className={o.shapes.kind === k ? 'on' : ''} title={k} onClick={() => setOpt('shapes', { kind: k })}>
                <ShapeIcon kind={k} />
              </button>
            ))}
          </div>
          <Slider label={T.options.size} value={o.shapes.size} min={30} max={1600} unit="px" width={100} onChange={(size) => setOpt('shapes', { size })} />
          <MainColor />
          <Toggle label={T.options.filled} value={o.shapes.filled} onChange={(filled) => setOpt('shapes', { filled })} />
          <ColorSwatch label={T.options.stroke} value={o.shapes.stroke} onChange={(stroke) => setOpt('shapes', { stroke })} />
          <Slider label={T.options.width} value={o.shapes.strokeWidth} min={0} max={60} width={70} onChange={(strokeWidth) => setOpt('shapes', { strokeWidth })} />
        </>
      );
    case 'pen':
      return (
        <>
          <Slider label={T.options.size} value={o.pen.size} min={1} max={120} unit="px" onChange={(size) => setOpt('pen', { size })} />
          <Slider label={T.options.opacity} value={Math.round(o.pen.opacity * 100)} min={5} max={100} unit="%" width={90} onChange={(v) => setOpt('pen', { opacity: v / 100 })} />
          <MainColor />
          <Hint text={T.hints.pen} />
        </>
      );
    case 'gradient':
      return <GradientOptions />;
    case 'image':
      return <ImageOptions />;
    case 'decal':
      return (
        <>
          <div className="decal-pick">
            {DECALS.map((d) => (
              <button key={d.id} className={o.decal.id === d.id ? 'on' : ''} title={d.name} onClick={() => setOpt('decal', { id: d.id })}>
                <img src={decalPreview(d.id)} alt={d.name} />
              </button>
            ))}
          </div>
          <Slider label={T.options.size} value={o.decal.size} min={40} max={1600} unit="px" width={100} onChange={(size) => setOpt('decal', { size })} />
          <MainColor />
        </>
      );
    case 'clone':
      return (
        <>
          <Slider label={T.options.size} value={o.clone.size} min={4} max={400} unit="px" onChange={(size) => setOpt('clone', { size })} />
          <Slider label={T.options.hardness} value={Math.round(o.clone.hardness * 100)} min={0} max={100} unit="%" width={80} onChange={(v) => setOpt('clone', { hardness: v / 100 })} />
          <Hint text={S().cloneSource ? `Kaynak: ${Math.round(S().cloneSource!.x)}, ${Math.round(S().cloneSource!.y)} · Alt+tık ile değiştir` : T.hints.clone} />
        </>
      );
    case 'smudge':
      return (
        <>
          <Slider label={T.options.size} value={o.smudge.size} min={4} max={400} unit="px" onChange={(size) => setOpt('smudge', { size })} />
          <Slider label={T.options.strength} value={Math.round(o.smudge.strength * 100)} min={5} max={100} unit="%" width={90} onChange={(v) => setOpt('smudge', { strength: v / 100 })} />
          <Hint text={sel ? T.hints.smudge : T.options.selectLayerFirst} />
        </>
      );
    case 'pick':
      return (
        <>
          <MainColor />
          <Hint text={T.hints.pick} />
        </>
      );
    case 'fx':
      return <FxOptions sel={sel} />;
    case 'finish':
      return <FinishOptions />;
    case 'history':
      return <HistoryOptions />;
    case 'ai':
      return <AiOptions />;
  }
  return null;
}

function TextOptions({ sel }: { sel: Layer | undefined }) {
  const o = useStore((s) => s.opts.text);
  const fonts = useStore((s) => s.config?.fonts ?? []);
  const fontInput = useRef<HTMLInputElement>(null);
  const txt = sel?.type === 'text' ? sel : null;
  const change = (patch: Partial<typeof o>) => {
    setOpt('text', patch);
    if (txt) editor.update(txt.id, patch as never, 'Yazı');
  };
  const docFonts = editor.doc?.fonts.map((f) => f.name) ?? [];
  const allFonts = Array.from(new Set([...fonts, ...docFonts, o.font]));
  return (
    <>
      <input
        className="txt wide"
        value={txt ? txt.text : o.text}
        maxLength={64}
        placeholder={T.options.text}
        onChange={(e) => change({ text: e.target.value })}
      />
      <select value={txt ? txt.font : o.font} onChange={(e) => change({ font: e.target.value })}>
        {allFonts.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>
      <button className="chip" onClick={() => fontInput.current?.click()}>
        <Icon name="upload" size={13} /> {T.options.uploadFont}
      </button>
      <input ref={fontInput} type="file" accept=".ttf,.otf,.woff,.woff2" hidden onChange={(e) => e.target.files?.[0] && void uploadFont(e.target.files[0])} />
      <Toggle label={T.options.bold} value={txt ? txt.bold : o.bold} onChange={(bold) => change({ bold })} />
      <Toggle label={T.options.italic} value={txt ? txt.italic : o.italic} onChange={(italic) => change({ italic })} />
      <Slider label={T.options.size} value={txt ? txt.size : o.size} min={12} max={600} unit="px" width={90} onChange={(size) => change({ size })} />
      <Slider label={T.options.spacing} value={txt ? txt.spacing : o.spacing} min={-10} max={60} width={60} onChange={(spacing) => change({ spacing })} />
      {txt ? (
        <ColorSwatch label={T.options.color} value={txt.color} onChange={(c) => editor.update(txt.id, { color: c } as never, 'Renk')} />
      ) : (
        <MainColor />
      )}
      <ColorSwatch label={T.options.stroke} value={txt ? txt.stroke : o.stroke} onChange={(stroke) => change({ stroke })} />
      <Slider label="" value={txt ? txt.strokeWidth : o.strokeWidth} min={0} max={40} width={60} onChange={(strokeWidth) => change({ strokeWidth })} />
    </>
  );
}

function GradientOptions() {
  const o = useStore((s) => s.opts.gradient);
  const color2 = useStore((s) => s.color2);
  return (
    <>
      <Seg
        value={o.kind}
        options={[
          { id: 'linear', label: T.options.linear },
          { id: 'radial', label: T.options.radial },
        ]}
        onChange={(kind) => setOpt('gradient', { kind })}
      />
      <MainColor />
      <ColorSwatch label={T.options.color2} value={color2} onChange={(c) => set({ color2: c })} />
      <Hint text={T.hints.gradient} />
    </>
  );
}

function ImageOptions() {
  const recent = useStore((s) => s.recentImages);
  const pending = useStore((s) => s.pendingImage);
  const size = useStore((s) => s.opts.image.size);
  const file = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="chip" onClick={() => file.current?.click()}>
        <Icon name="upload" size={13} /> {T.options.upload}
      </button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && void uploadImageFile(e.target.files[0])} />
      <button className="chip" onClick={() => set({ modal: { type: 'importUrl' } })}>
        <Icon name="link" size={13} /> {T.options.importUrl}
      </button>
      <Slider label={T.options.size} value={size} min={40} max={2048} unit="px" width={90} onChange={(v) => setOpt('image', { size: v })} />
      <div className="recent-imgs">
        {recent.map((r) => (
          <button key={r.src.slice(-40)} className={pending === r.src ? 'on' : ''} title={r.name} onClick={() => set({ pendingImage: r.src })}>
            <img src={r.src} alt="" />
          </button>
        ))}
      </div>
      {!recent.length && <Hint text={T.hints.image} />}
    </>
  );
}

function FxOptions({ sel }: { sel: Layer | undefined }) {
  if (!sel || sel.type === 'fill') return <Hint text={T.options.selectLayerFirst} />;
  const fx = sel.fx;
  const up = (patch: Partial<Layer['fx']>) => editor.update(sel.id, { fx: { ...fx, ...patch } } as never, 'Efekt');
  return (
    <>
      <Toggle label={T.options.shadow} value={fx.shadow.on} onChange={(on) => up({ shadow: { ...fx.shadow, on } })} />
      {fx.shadow.on && (
        <>
          <ColorSwatch value={fx.shadow.color} onChange={(color) => up({ shadow: { ...fx.shadow, color } })} />
          <Slider label={T.options.blur} value={fx.shadow.blur} min={0} max={120} width={60} onChange={(blur) => up({ shadow: { ...fx.shadow, blur } })} />
          <Slider label="X" value={fx.shadow.dx} min={-80} max={80} width={50} onChange={(dx) => up({ shadow: { ...fx.shadow, dx } })} />
          <Slider label="Y" value={fx.shadow.dy} min={-80} max={80} width={50} onChange={(dy) => up({ shadow: { ...fx.shadow, dy } })} />
        </>
      )}
      <span className="sep" />
      <Toggle label={T.options.glow} value={fx.glow.on} onChange={(on) => up({ glow: { ...fx.glow, on } })} />
      {fx.glow.on && (
        <>
          <ColorSwatch value={fx.glow.color} onChange={(color) => up({ glow: { ...fx.glow, color } })} />
          <Slider label={T.options.blur} value={fx.glow.blur} min={2} max={160} width={60} onChange={(blur) => up({ glow: { ...fx.glow, blur } })} />
        </>
      )}
      <span className="sep" />
      <Toggle label={T.options.outline} value={fx.outline.on} onChange={(on) => up({ outline: { ...fx.outline, on } })} />
      {fx.outline.on && (
        <>
          <ColorSwatch value={fx.outline.color} onChange={(color) => up({ outline: { ...fx.outline, color } })} />
          <Slider label={T.options.width} value={fx.outline.width} min={1} max={40} width={60} onChange={(width) => up({ outline: { ...fx.outline, width } })} />
        </>
      )}
    </>
  );
}

function FinishOptions() {
  useStore((s) => s.historyRev);
  useStore((s) => s.docRev);
  const doc = editor.doc;
  if (!doc) return null;
  const p = doc.paint;
  const setPaint = (patch: Partial<typeof p>, label = 'Boya') => {
    doc.paint = { ...doc.paint, ...patch };
    editor.invalidate();
    editor.commit(label);
  };
  return (
    <>
      <ColorSwatch label={T.options.paintColor} value={p.color} onChange={(color) => {
        doc.paint = { ...doc.paint, color };
        editor.invalidate();
      }} />
      <Seg
        value={p.finish}
        options={(Object.keys(T.options.finishes) as Finish[]).map((id) => ({ id, label: T.options.finishes[id] }))}
        onChange={(finish) => setPaint({ finish }, 'Yüzey tipi')}
      />
      <Toggle label={T.options.applyPaint} value={p.apply} onChange={(apply) => setPaint({ apply })} />
    </>
  );
}

function HistoryOptions() {
  useStore((s) => s.historyRev);
  const h = editor.history;
  return (
    <div className="history-list">
      {h.entries.map((e, i) => (
        <button key={i} className={`${i === h.index ? 'on' : ''} ${i > h.index ? 'future' : ''}`} onClick={() => editor.jumpTo(i)}>
          <em>{String(i).padStart(2, '0')}</em> {e.label}
        </button>
      ))}
    </div>
  );
}

function AiOptions() {
  const [prompt, setPrompt] = useState('');
  const busy = useStore((s) => s.busy.ai);
  const enabled = useStore((s) => s.config?.aiEnabled);
  if (!enabled) return <Hint text={T.options.aiDisabled} />;
  return (
    <>
      <input
        className="txt ai-input"
        value={prompt}
        maxLength={600}
        placeholder={T.options.aiPlaceholder}
        disabled={busy}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void aiGenerate(prompt)}
      />
      <button className="btn primary" disabled={busy || !prompt.trim()} onClick={() => void aiGenerate(prompt)}>
        {busy ? T.options.aiWorking : T.options.aiGenerate}
      </button>
    </>
  );
}

function ShapeIcon({ kind }: { kind: ShapeKind }) {
  const d: Record<ShapeKind, string> = {
    rect: 'M3 6h18v12H3z',
    roundrect: 'M7 6h10a4 4 0 014 4v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4a4 4 0 014-4z',
    ellipse: 'M12 5a9 7 0 110 14 9 7 0 010-14z',
    ring: 'M12 4a8 8 0 110 16 8 8 0 010-16zm0 4a4 4 0 100 8 4 4 0 000-8z',
    triangle: 'M12 4l9 16H3z',
    diamond: 'M12 3l7 9-7 9-7-9z',
    star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z',
    hexagon: 'M7 4h10l5 8-5 8H7l-5-8z',
    chevron: 'M3 5l9 8 9-8v6l-9 8-9-8z',
    arrow: 'M3 9h11V5l7 7-7 7v-4H3z',
    stripes: 'M5 3h5v18H5zM14 3h5v18h-5z',
    bolt: 'M14 2L5 13h6l-2 9 9-12h-6z',
  };
  return (
    <svg width={20} height={20} viewBox="0 0 24 24">
      <path d={d[kind]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
