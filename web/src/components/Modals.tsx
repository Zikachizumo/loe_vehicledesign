import { useEffect, useState } from 'react';
import { S, set, useStore } from '../store';
import { T } from '../i18n';
import { editor } from '../engine/editor';
import { Icon } from './Icons';
import {
  closeStudio,
  copyText,
  deleteProject,
  importFromUrl,
  newProject,
  printLivery,
  saveProject,
  selectVehicle,
  setListing,
} from '../actions';
import { Seg, Toggle } from './ui';

export function Modals() {
  const modal = useStore((s) => s.modal);
  if (!modal) return null;
  const close = () => set({ modal: null });
  return (
    <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      {modal.type === 'importUrl' && <ImportUrl close={close} />}
      {modal.type === 'confirmNew' && (
        <Confirm
          icon="new"
          title={T.modal.newTitle}
          text={T.modal.newText}
          ok={T.modal.confirm}
          onOk={() => {
            newProject();
            close();
          }}
          close={close}
        />
      )}
      {modal.type === 'confirmClose' && (
        <Confirm icon="warn" title={T.modal.closeTitle} text={T.modal.closeText} ok={T.modal.exit} onOk={() => closeStudio()} close={close} />
      )}
      {modal.type === 'deleteProject' && (
        <Confirm
          icon="trash"
          title={T.modal.deleteTitle}
          text={`"${modal.name}" — ${T.modal.deleteText}`}
          ok={T.library.del}
          danger
          onOk={() => {
            void deleteProject(modal.id);
            close();
          }}
          close={close}
        />
      )}
      {modal.type === 'switchVehicle' && (
        <Confirm
          icon="car"
          title={T.modal.switchTitle}
          text={T.modal.newText}
          ok={T.modal.confirm}
          onOk={() => {
            const v = S().config?.vehicles.find((x) => x.model === modal.model);
            close();
            if (v) selectVehicle(v);
          }}
          close={close}
        />
      )}
      {modal.type === 'save' && <SaveModal close={close} />}
      {modal.type === 'print' && <PrintModal close={close} />}
      {modal.type === 'listing' && (
        <ListingModal
          key={modal.id}
          id={modal.id}
          label={modal.label}
          price={modal.price}
          published={modal.published}
          tebex={modal.tebex}
          close={close}
        />
      )}
    </div>
  );
}

function Shell({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="modal">
      <div className="modal-h">
        <div className="mi">
          <Icon name={icon} size={18} />
        </div>
        <div>
          <b>{title}</b>
          {sub && <small>{sub}</small>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Confirm({
  icon,
  title,
  text,
  ok,
  onOk,
  close,
  danger,
}: {
  icon: string;
  title: string;
  text: string;
  ok: string;
  onOk: () => void;
  close: () => void;
  danger?: boolean;
}) {
  return (
    <Shell icon={icon} title={title}>
      <p>{text}</p>
      <div className="modal-f">
        <button className="btn ghost" onClick={close}>
          {T.modal.cancel}
        </button>
        <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onOk}>
          {ok}
        </button>
      </div>
    </Shell>
  );
}

function ImportUrl({ close }: { close: () => void }) {
  const [url, setUrl] = useState('');
  const busy = useStore((s) => s.busy.import);
  const go = async () => {
    if (await importFromUrl(url)) close();
  };
  return (
    <Shell icon="image" title={T.modal.importTitle} sub={T.modal.importSub}>
      <p>{T.modal.importText}</p>
      <input className="txt block" autoFocus placeholder="https://..." value={url} disabled={busy} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void go()} />
      <div className="modal-f">
        <button className="btn ghost" onClick={close} disabled={busy}>
          {T.modal.cancel}
        </button>
        <button className="btn primary" disabled={busy || !url.trim()} onClick={() => void go()}>
          {busy ? T.modal.importing : T.modal.import}
        </button>
      </div>
    </Shell>
  );
}

function SaveModal({ close }: { close: () => void }) {
  const project = useStore((s) => s.project);
  const [name, setName] = useState(project.name);
  const busy = useStore((s) => s.busy.save);
  const go = async () => {
    if (!name.trim()) return;
    await saveProject(name.trim().slice(0, 48));
    close();
  };
  return (
    <Shell icon="save" title={T.modal.saveTitle} sub={project.id ? `#${project.id}` : undefined}>
      <label className="field">
        <span>{T.modal.saveName}</span>
        <input className="txt block" autoFocus maxLength={48} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void go()} />
      </label>
      <div className="modal-f">
        <button className="btn ghost" onClick={close}>
          {T.modal.cancel}
        </button>
        <button className="btn primary" disabled={busy || !name.trim()} onClick={() => void go()}>
          {T.modal.save}
        </button>
      </div>
    </Shell>
  );
}

function money(n: number) {
  const cur = S().config?.currency ?? '$';
  return `${cur}${Math.max(0, Math.floor(n) || 0).toLocaleString('tr-TR')}`;
}

function PriceInput({ value, onChange, autoFocus }: { value: number; onChange: (v: number) => void; autoFocus?: boolean }) {
  return (
    <label className="field">
      <span>{T.modal.shopPrice}</span>
      <div className="price-input">
        <em>{S().config?.currency ?? '$'}</em>
        <input
          className="txt block"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={value ? String(value) : ''}
          placeholder="0"
          onChange={(e) => onChange(Math.min(100000000, Number(e.target.value.replace(/\D/g, '')) || 0))}
        />
      </div>
    </label>
  );
}

type SaleKind = 'game' | 'tebex';

/** Satis turu (oyun parasi / gercek para) + fiyat veya Tebex komutu. */
function SaleFields(p: {
  kind: SaleKind;
  setKind: (k: SaleKind) => void;
  price: number;
  setPrice: (v: number) => void;
  designId?: string;
  autoFocus?: boolean;
}) {
  const tebex = useStore((s) => s.config?.tebex);
  const kind = tebex?.enabled ? p.kind : 'game';
  const cmd = tebex && p.designId ? `${tebex.command} {transaction} ${p.designId}` : '';
  return (
    <>
      {tebex?.enabled && (
        <Seg<SaleKind>
          value={kind}
          onChange={p.setKind}
          options={[
            { id: 'game', label: T.modal.saleGame },
            { id: 'tebex', label: T.modal.saleTebex },
          ]}
        />
      )}
      {kind === 'game' && <PriceInput value={p.price} onChange={p.setPrice} autoFocus={p.autoFocus} />}
      {kind === 'tebex' && (
        <div className="tebex-box">
          <p>{T.modal.tebexText}</p>
          <p className="warn">{T.modal.tebexRules}</p>
          {cmd ? (
            <label className="field">
              <span>{T.modal.tebexCmd}</span>
              <div className="cmd-row">
                <code>{cmd}</code>
                <button className="mini primary" onClick={() => copyText(cmd)}>
                  {T.modal.copy}
                </button>
              </div>
            </label>
          ) : (
            <p className="hint">{T.modal.tebexCmdAfter}</p>
          )}
        </div>
      )}
    </>
  );
}

function PrintModal({ close }: { close: () => void }) {
  const project = useStore((s) => s.project);
  const vehicle = useStore((s) => s.vehicle);
  const cfg = useStore((s) => s.config);
  const [label, setLabel] = useState(project.name);
  const [preview, setPreview] = useState('');
  const [publish, setPublish] = useState(true);
  const [shopPrice, setShopPrice] = useState(cfg?.shopPrice ?? 0);
  const [giveItem, setGiveItem] = useState(false);
  const [kind, setKind] = useState<SaleKind>('game');
  const tebex = publish && kind === 'tebex' && !!cfg?.tebex?.enabled;
  useEffect(() => {
    if (editor.doc) setPreview(editor.thumbnail(320));
  }, []);
  const price = cfg?.price ?? 0;
  return (
    <Shell icon="print" title={T.modal.printTitle} sub={vehicle ? `${vehicle.brand ?? ''} ${vehicle.label}`.trim() : ''}>
      <div className="print-body">
        {preview && <img className="print-prev" src={preview} alt="" />}
        <div>
          <p>{T.modal.printText}</p>
          <label className="field">
            <span>{T.modal.printName}</span>
            <input className="txt block" autoFocus maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <div className="shop-opts">
            <Toggle label={T.modal.publish} value={publish} onChange={setPublish} />
            {publish && <SaleFields kind={kind} setKind={setKind} price={shopPrice} setPrice={setShopPrice} />}
            {publish && <Toggle label={T.modal.giveItem} value={giveItem} onChange={setGiveItem} />}
          </div>
          {price > 0 && (
            <div className="price-row">
              <span>{T.modal.price}</span>
              <b>{money(price)}</b>
            </div>
          )}
        </div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={close}>
          {T.modal.cancel}
        </button>
        <button
          className="btn primary"
          disabled={!label.trim()}
          onClick={() => {
            close();
            void printLivery(label.trim().slice(0, 40), { publish, shopPrice, giveItem: publish ? giveItem : true, tebex });
          }}
        >
          {publish ? `${T.modal.publish} · ${tebex ? T.library.tebex : money(shopPrice)}` : T.footer.print}
        </button>
      </div>
    </Shell>
  );
}

function ListingModal(p: { id: string; label: string; price: number; published: boolean; tebex: boolean; close: () => void }) {
  const [price, setPrice] = useState(p.price);
  const [published, setPublished] = useState(p.published);
  const [kind, setKind] = useState<SaleKind>(p.tebex ? 'tebex' : 'game');
  const tebexOn = useStore((s) => !!s.config?.tebex?.enabled);
  return (
    <Shell icon="print" title={T.modal.listingTitle} sub={`${p.label} · #${p.id}`}>
      <p>{T.modal.listingText}</p>
      <div className="shop-opts">
        <Toggle label={T.modal.publish} value={published} onChange={setPublished} />
        <SaleFields kind={kind} setKind={setKind} price={price} setPrice={setPrice} designId={p.id} autoFocus />
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={p.close}>
          {T.modal.cancel}
        </button>
        <button
          className="btn primary"
          onClick={() => {
            p.close();
            void setListing(p.id, price, published, tebexOn && kind === 'tebex');
          }}
        >
          {T.modal.update}
        </button>
      </div>
    </Shell>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <Icon name={t.kind === 'ok' ? 'check' : t.kind === 'err' ? 'warn' : 'sparkle'} size={15} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export { S };
