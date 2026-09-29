import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { T } from '../i18n';
import { editor } from '../engine/editor';
import type { Layer } from '../engine/types';
import { Icon } from './Icons';
import { LayerProps } from './LayerProps';

const TYPE_ICON: Record<string, string> = {
  fill: 'fill',
  gradient: 'gradient',
  raster: 'brush',
  image: 'image',
  text: 'text',
  shape: 'shapes',
  splat: 'splat',
};

export function LayersPanel() {
  useStore((s) => s.docRev);
  useStore((s) => s.historyRev);
  const selectedId = useStore((s) => s.selectedId);
  const hasDoc = useStore((s) => !!s.vehicle);
  const layers = editor.doc?.layers ?? [];
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const list = [...layers].reverse();
  return (
    <aside className="panel layers">
      <div className="panel-h">
        <span className="bar" />
        <Icon name="layers" size={16} />
        <b>{T.layers.title}</b>
        <em className="count">{layers.length}</em>
      </div>
      <div className="layer-list">
        {!hasDoc || !layers.length ? (
          <div className="empty-layers">
            <Icon name="layers" size={26} />
            <span>{T.layers.none}</span>
          </div>
        ) : (
          list.map((l, i) => {
            const realIdx = layers.length - 1 - i;
            return (
              <LayerRow
                key={l.id}
                l={l}
                selected={l.id === selectedId}
                dragOver={overIdx === realIdx && dragId !== l.id}
                onDragStart={() => setDragId(l.id)}
                onDragOver={() => setOverIdx(realIdx)}
                onDrop={() => {
                  if (dragId && dragId !== l.id) editor.reorder(dragId, realIdx);
                  setDragId(null);
                  setOverIdx(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverIdx(null);
                }}
              />
            );
          })
        )}
      </div>
      <LayerProps />
    </aside>
  );
}

function LayerRow({
  l,
  selected,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  l: Layer;
  selected: boolean;
  dragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(l.name);
  useEffect(() => setName(l.name), [l.name]);
  const sub =
    l.type === 'text'
      ? `"${l.text.slice(0, 16)}"`
      : l.type === 'fill'
        ? l.color.toUpperCase()
        : l.type === 'splat' || l.type === 'shape'
          ? (l.type === 'splat' ? l.color : l.fill).toUpperCase()
          : `${Math.round(l.w)}×${Math.round(l.h)}`;
  return (
    <div
      className={`lrow ${selected ? 'on' : ''} ${l.visible ? '' : 'hidden'} ${dragOver ? 'over' : ''}`}
      onClick={() => editor.select(l.id)}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <span className="grip">
        <Icon name="drag" size={14} />
      </span>
      <button
        className="lvis"
        title={T.layers.visible}
        onClick={(e) => {
          e.stopPropagation();
          editor.toggle(l.id, 'visible');
        }}
      >
        <Icon name={l.visible ? 'eye' : 'eyeOff'} size={15} />
      </button>
      <LayerThumb l={l} />
      <div className="lmeta">
        {editing ? (
          <input
            autoFocus
            value={name}
            maxLength={40}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name.trim() && name !== l.name) {
                editor.patch(l.id, { name: name.trim() });
                editor.commit('Katman adı');
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <b onDoubleClick={() => setEditing(true)} title="Yeniden adlandırmak için çift tıkla">
            {l.name}
          </b>
        )}
        <span>
          <Icon name={TYPE_ICON[l.type]} size={11} /> {T.layers.names[l.type]} · {sub}
        </span>
      </div>
      <div className="lact">
        {selected && (
          <>
            <button title={T.layers.up} onClick={(e) => (e.stopPropagation(), editor.move(l.id, 1))}>
              <Icon name="up" size={13} />
            </button>
            <button title={T.layers.down} onClick={(e) => (e.stopPropagation(), editor.move(l.id, -1))}>
              <Icon name="down" size={13} />
            </button>
            <button title={T.layers.duplicate} onClick={(e) => (e.stopPropagation(), editor.duplicate(l.id))}>
              <Icon name="copy" size={13} />
            </button>
          </>
        )}
        <button
          title={T.layers.lock}
          className={l.locked ? 'on' : ''}
          onClick={(e) => {
            e.stopPropagation();
            editor.toggle(l.id, 'locked');
          }}
        >
          <Icon name={l.locked ? 'lock' : 'unlock'} size={13} />
        </button>
        {selected && (
          <button className="danger" title={T.layers.remove} onClick={(e) => (e.stopPropagation(), editor.remove(l.id))}>
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function LayerThumb({ l }: { l: Layer }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<string>('');
  const docRev = useStore((s) => s.docRev);
  useEffect(() => {
    const key = `${l.id}:${l.rev}:${l.x}:${l.y}:${l.w}:${l.h}:${l.rotation}:${l.type === 'fill' ? l.color : ''}`;
    if (key === last.current) return;
    const t = window.setTimeout(() => {
      if (ref.current && editor.doc) {
        editor.doc.thumb(l, ref.current);
        last.current = key;
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [docRev, l]);
  return <canvas className="lthumb" ref={ref} width={44} height={44} />;
}
