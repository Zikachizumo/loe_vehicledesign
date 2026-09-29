import { useEffect, useMemo, useState } from 'react';
import { set, useStore } from '../store';
import { T } from '../i18n';
import { Icon } from './Icons';
import { assetUrl } from '../nui';
import { refreshLists, requestSelectVehicle, loadProject, reprint, requestScan } from '../actions';
import type { VehicleDef } from '../types';

export function Library() {
  const tab = useStore((s) => s.libraryTab);
  const cfg = useStore((s) => s.config);
  const vehicles = cfg?.vehicles ?? [];
  const vehicle = useStore((s) => s.vehicle);
  return (
    <aside className="panel library">
      <div className="panel-h">
        <span className="bar" />
        <Icon name="car" size={16} />
        <b>{T.library.title}</b>
        <em>{T.library.count(vehicles.filter((v) => !v.demo).length, vehicles.filter((v) => !v.demo && v.supported !== false).length)}</em>
      </div>
      <div className="tabs">
        <button className={tab === 'vehicles' ? 'on' : ''} onClick={() => set({ libraryTab: 'vehicles' })}>
          {T.library.vehicles}
        </button>
        <button className={tab === 'designs' ? 'on' : ''} onClick={() => set({ libraryTab: 'designs' })}>
          {T.library.designs}
        </button>
      </div>
      {tab === 'vehicles' ? <VehicleGrid /> : <Designs />}
      <div className={`platform ${vehicle ? 'on' : ''}`}>
        <small>{vehicle ? T.library.selected : T.library.noPlatform}</small>
        <b>{vehicle ? `${vehicle.brand ? vehicle.brand + ' ' : ''}${vehicle.label}` : T.library.selectVehicle}</b>
        <span>
          {vehicle
            ? `${vehicle.size}×${vehicle.size} px · ${vehicle.slotsFree}/${vehicle.slotsTotal} ${T.library.slots}${vehicle.glb || vehicle.demo ? ' · 3D' : ''}`
            : T.library.selectVehicleSub}
        </span>
        <div className="progress">
          <i style={{ width: vehicle ? '100%' : '0%' }} />
        </div>
      </div>
    </aside>
  );
}

function VehicleGrid() {
  const cfg = useStore((s) => s.config);
  const search = useStore((s) => s.search);
  const category = useStore((s) => s.category);
  const onlySupported = useStore((s) => s.onlySupported);
  const current = useStore((s) => s.vehicle?.model);
  const all = cfg?.vehicles ?? [];
  const real = all.filter((v) => !v.demo);
  const list = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return all.filter(
      (v) =>
        (!onlySupported || v.supported !== false) &&
        (category === 'all' || v.category === category) &&
        (!q || `${v.brand ?? ''} ${v.label} ${v.model}`.toLocaleLowerCase('tr').includes(q)),
    );
  }, [all, search, category, onlySupported]);
  // sadece arac bulunan kategorileri goster
  const cats = useMemo(() => {
    const used = new Set(all.filter((v) => !onlySupported || v.supported !== false).map((v) => v.category));
    return (cfg?.categories ?? []).filter((c) => used.has(c.id));
  }, [cfg, all, onlySupported]);
  const shown = list.slice(0, 400);
  return (
    <>
      <div className="search">
        <Icon name="search" size={15} />
        <input placeholder={T.library.search} value={search} onChange={(e) => set({ search: e.target.value })} />
        <button className={`mini-toggle ${onlySupported ? 'on' : ''}`} title={T.library.onlySupported} onClick={() => set({ onlySupported: !onlySupported, category: 'all' })}>
          {T.library.onlySupported}
        </button>
      </div>
      <div className="chips">
        {[{ id: 'all', label: 'TÜMÜ' }, ...cats].map((c) => (
          <button key={c.id} className={category === c.id ? 'on' : ''} onClick={() => set({ category: c.id })}>
            {c.label}
          </button>
        ))}
      </div>
      {!real.length && (
        <div className="scan-cta">
          <Icon name="refresh" size={20} />
          <b>{T.library.catalogEmpty}</b>
          <span>{T.library.catalogEmptySub}</span>
          {cfg?.isAdmin && (
            <button className="btn primary" onClick={() => void requestScan()}>
              {T.library.scan}
            </button>
          )}
        </div>
      )}
      <div className="vgrid">
        {shown.map((v) => (
          <VehicleCard key={v.model} v={v} active={current === v.model} />
        ))}
        {!list.length && real.length > 0 && <p className="empty">{T.library.empty}</p>}
        {list.length > shown.length && <p className="empty">+{list.length - shown.length} araç daha — aramayı daralt</p>}
      </div>
      {cfg?.isAdmin && real.length > 0 && (
        <button className="rescan" title={T.library.scanInfo} onClick={() => void requestScan()}>
          <Icon name="refresh" size={12} /> {T.library.scan}
        </button>
      )}
    </>
  );
}

function thumbFor(v: VehicleDef, pattern?: string): string | null {
  if (v.thumb) return assetUrl(v.thumb);
  if (v.demo || !pattern) return null;
  return pattern.replace('%s', v.model);
}

function VehicleCard({ v, active }: { v: VehicleDef; active: boolean }) {
  const catLabel = useStore((s) => s.config?.categories.find((c) => c.id === v.category)?.label ?? v.category);
  const thumbPattern = useStore((s) => s.config?.thumbnailUrl);
  const [imgOk, setImgOk] = useState(true);
  const unsupported = v.supported === false;
  const badge = v.demo ? T.library.demo : unsupported ? T.library.noLivery : v.glb || v.uv ? T.library.uvReady : `${v.slotsTotal} SLOT`;
  const src = thumbFor(v, thumbPattern);
  return (
    <button className={`vcard ${active ? 'on' : ''} ${unsupported ? 'off' : ''}`} onClick={() => requestSelectVehicle(v)}>
      <span className={`badge ${v.demo ? 'demo' : ''} ${unsupported ? 'none' : ''}`}>{badge}</span>
      <div className="thumb">
        {src && imgOk ? <img src={src} alt="" loading="lazy" draggable={false} onError={() => setImgOk(false)} /> : <Icon name="car" size={40} />}
      </div>
      <small>{v.brand ?? '—'}</small>
      <b>{v.label}</b>
      <span>{[v.year, catLabel, unsupported ? null : `${v.slotsFree}/${v.slotsTotal} ${T.library.slots}`].filter(Boolean).join(' · ')}</span>
    </button>
  );
}

function Designs() {
  const projects = useStore((s) => s.projects);
  const printed = useStore((s) => s.printed);
  const cfg = useStore((s) => s.config);
  useEffect(() => {
    void refreshLists();
  }, []);
  const label = (model: string) => cfg?.vehicles.find((v) => v.model === model)?.label ?? model;
  const date = (t: number) => (t ? new Date(t * 1000).toLocaleDateString('tr-TR') : '');
  return (
    <div className="designs">
      <h4>{T.library.projects}</h4>
      {!projects.length && <p className="empty">{T.library.noProjects}</p>}
      <div className="dgrid">
        {projects.map((p) => (
          <div className="dcard" key={p.id}>
            <div className="thumb">{p.thumb ? <img src={p.thumb} alt="" /> : <Icon name="layers" size={30} />}</div>
            <b title={p.name}>{p.name}</b>
            <span>
              {label(p.model)} · {date(p.updated)}
            </span>
            <div className="row">
              <button className="mini primary" onClick={() => void loadProject(p)}>
                {T.library.open}
              </button>
              <button className="mini" onClick={() => set({ modal: { type: 'deleteProject', id: p.id, name: p.name } })}>
                <Icon name="trash" size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <h4>{T.library.printed}</h4>
      {!printed.length && <p className="empty">{T.library.noPrinted}</p>}
      <div className="dgrid">
        {printed.map((p) => (
          <div className="dcard" key={p.id}>
            <div className="thumb">{p.thumb ? <img src={p.thumb} alt="" /> : <Icon name="print" size={30} />}</div>
            <b title={p.label}>{p.label}</b>
            <span>
              {label(p.model)} · #{p.id}
            </span>
            <div className="row">
              <button className="mini primary" onClick={() => void reprint(p)}>
                {T.library.reprint}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
