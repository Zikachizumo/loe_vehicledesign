import { set, useStore } from '../store';
import { T } from '../i18n';
import { Icon } from './Icons';
import { Viewport3D } from './Viewport3D';
import { UVView } from './UVView';
import { Seg } from './ui';

export function Workspace() {
  const vehicle = useStore((s) => s.vehicle);
  const mode = useStore((s) => s.mode);
  const libraryOpen = useStore((s) => s.libraryOpen);
  const has3d = !!(vehicle?.glb || vehicle?.demo);
  return (
    <section className="panel workspace">
      <div className="panel-h">
        <button className="icon-btn" title="Kütüphane" onClick={() => set({ libraryOpen: !libraryOpen })}>
          <Icon name={libraryOpen ? 'chevronL' : 'chevronR'} size={15} />
        </button>
        <span className="bar" />
        <Icon name={!vehicle ? 'car' : mode === '3d' ? 'cube' : 'uv'} size={16} />
        <b>{!vehicle ? T.ws.workspace : mode === '3d' ? T.ws.title3d : T.ws.titleUv}</b>
        {vehicle && (
          <div className="mode-toggle">
            <Seg
              value={mode}
              options={[
                { id: '3d', label: T.ws.mode3d, title: has3d ? '' : T.ws.no3d },
                { id: 'uv', label: T.ws.modeUv },
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
            <Viewport3D active={mode === '3d'} />
            <UVView active={mode === 'uv'} />
          </>
        )}
      </div>
    </section>
  );
}
