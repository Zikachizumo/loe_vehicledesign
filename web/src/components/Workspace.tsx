import { set, useStore } from '../store';
import { T } from '../i18n';
import { Icon } from './Icons';
import { Viewport3D } from './Viewport3D';
import { UVView } from './UVView';
import { Seg } from './ui';
import { LiveView } from './LiveView';

export function Workspace() {
  const vehicle = useStore((s) => s.vehicle);
  const mode = useStore((s) => s.mode);
  const libraryOpen = useStore((s) => s.libraryOpen);
  const has3d = !!(vehicle?.glb || vehicle?.demo);
  const cfg = useStore((s) => s.config);
  const canLive = !!(cfg?.preview !== false && vehicle && !vehicle.demo && vehicle.supported !== false);
  return (
    <section className="panel workspace">
      <div className="panel-h">
        <button className="icon-btn" title="Kütüphane" onClick={() => set({ libraryOpen: !libraryOpen })}>
          <Icon name={libraryOpen ? 'chevronL' : 'chevronR'} size={15} />
        </button>
        <span className="bar" />
        <Icon name={!vehicle ? 'car' : mode === '3d' ? 'cube' : mode === 'live' ? 'camera' : 'uv'} size={16} />
        <b>{!vehicle ? T.ws.workspace : mode === '3d' ? T.ws.title3d : mode === 'live' ? T.ws.titleLive : T.ws.titleUv}</b>
        {vehicle && (
          <div className="mode-toggle">
            <Seg
              value={mode}
              options={[
                ...(has3d || !canLive ? [{ id: '3d' as const, label: T.ws.mode3d, title: has3d ? '' : T.ws.no3d }] : []),
                { id: 'uv' as const, label: T.ws.modeUv },
                ...(canLive ? [{ id: 'live' as const, label: T.ws.modeLive }] : []),
              ]}
              onChange={(m) => set({ mode: m, libraryOpen: m === 'uv' ? libraryOpen : false })}
            />
          </div>
        )}
        <em>{vehicle ? `${vehicle.model.toUpperCase()} · ${vehicle.size}PX` : 'MODEL YÜKLENMEDİ'}</em>
      </div>
      <div className="ws-body">
        {!vehicle ? (
          <div className="ws-empty">
            <div className="ws-empty-icon">
              <Icon name="car" size={30} />
            </div>
            <small>LOE ARAÇ TASARIM · HAZIR</small>
            <h2>{T.ws.selectToBegin}</h2>
            <p>{T.ws.selectToBeginSub}</p>
          </div>
        ) : (
          <>
            {(has3d || mode === '3d') && <Viewport3D active={mode === '3d'} />}
            <UVView active={mode === 'uv'} />
            <LiveView active={mode === 'live'} />
          </>
        )}
      </div>
    </section>
  );
}
