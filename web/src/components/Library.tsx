import { useEffect, useMemo } from 'react';
import { set, useStore } from '../store';
import { T } from '../i18n';
import { Icon } from './Icons';
import { assetUrl } from '../nui';
import { refreshLists, requestSelectVehicle, loadProject, reprint } from '../actions';
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
        <em>
          {vehicles.length} {T.library.models}
        </em>
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
  const current = useStore((s) => s.vehicle?.model);
  const list = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return (cfg?.vehicles ?? []).filter(
      (v) =>
        (category === 'all' || v.category === category) &&
        (!q || `${v.brand ?? ''} ${v.label} ${v.model}`.toLocaleLowerCase('tr').includes(q)),
    );
  }, [cfg, search, category]);
  return (
    <>
      <div className="search">
        <Icon name="search" size={15} />
        <input placeholder={T.library.search} value={search} onChange={(e) => set({ search: e.target.value })} />
      </div>
      <div className="chips">
        {[{ id: 'all', label: 'TÜMÜ' }, ...(cfg?.categories ?? [])].map((c) => (
          <button key={c.id} className={category === c.id ? 'on' : ''} onClick={() => set({ category: c.id })}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="vgrid">
        {list.map((v) => (
          <VehicleCard key={v.model} v={v} active={current === v.model} />
        ))}
        {!list.length && <p className="empty">{T.library.empty}</p>}
      </div>
    </>
  );
}

function VehicleCard({ v, active }: { v: VehicleDef; active: boolean }) {
  const catLabel = useStore((s) => s.config?.categories.find((c) => c.id === v.category)?.label ?? v.category);
  const badge = v.demo ? T.library.demo : v.glb || v.uv ? T.library.uvReady : T.library.only2d;
  return (
    <button className={`vcard ${active ? 'on' : ''}`} onClick={() => requestSelectVehicle(v)}>
      <span className={`badge ${v.demo ? 'demo' : ''}`}>{badge}</span>
      <div className="thumb">
        {v.thumb ? <img src={assetUrl(v.thumb)} alt="" draggable={false} /> : <Icon name="car" size={40} />}
      </div>
      <small>{v.brand ?? '—'}</small>
      <b>{v.label}</b>
      <span>
        {[v.year, catLabel, `${v.slotsFree}/${v.slotsTotal} ${T.library.slots}`].filter(Boolean).join(' · ')}
      </span>
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
