import { useStore, set, S } from '../store';
import type { ToolId } from '../store';
import { T } from '../i18n';
import { editor } from '../engine/editor';
import { Emblem, Icon } from './Icons';
import { requestClose } from '../actions';

const TOOLS: { id: ToolId; icon: string; key?: string }[] = [
  { id: 'select', icon: 'select', key: 'V' },
  { id: 'brush', icon: 'brush', key: 'B' },
  { id: 'splat', icon: 'splat', key: 'S' },
  { id: 'eraser', icon: 'eraser', key: 'E' },
  { id: 'fill', icon: 'fill', key: 'G' },
  { id: 'text', icon: 'text', key: 'T' },
  { id: 'shapes', icon: 'shapes', key: 'U' },
  { id: 'pen', icon: 'pen', key: 'P' },
  { id: 'gradient', icon: 'gradient', key: 'R' },
  { id: 'image', icon: 'image', key: 'M' },
  { id: 'decal', icon: 'decal', key: 'K' },
  { id: 'clone', icon: 'clone', key: 'C' },
  { id: 'smudge', icon: 'smudge', key: 'J' },
  { id: 'pick', icon: 'pick', key: 'I' },
  { id: 'fx', icon: 'fx', key: 'X' },
  { id: 'finish', icon: 'finish', key: 'F' },
  { id: 'history', icon: 'history', key: 'H' },
  { id: 'ai', icon: 'ai' },
];

export const TOOL_KEYS: Record<string, ToolId> = Object.fromEntries(TOOLS.filter((t) => t.key).map((t) => [t.key!.toLowerCase(), t.id]));

export function TopBar() {
  const tool = useStore((s) => s.tool);
  const hasDoc = useStore((s) => !!s.vehicle);
  useStore((s) => s.historyRev);
  const cfg = useStore((s) => s.config);
  const busySave = useStore((s) => s.busy.save);
  const aiEnabled = cfg?.aiEnabled;
  return (
    <header className="topbar">
      <div className="brand">
        <Emblem size={34} />
        <div className="brand-txt">
          <b>{cfg?.brand.short ?? 'LoE'}</b>
          <span>{T.studio}</span>
        </div>
      </div>
      <nav className="tools">
        <div className="group">
          <ToolBtn icon="new" label={T.file.new} disabled={!hasDoc} onClick={() => set({ modal: { type: 'confirmNew' } })} />
          <ToolBtn icon="save" label={T.file.save} disabled={!hasDoc || busySave} onClick={() => set({ modal: { type: 'save' } })} />
          <ToolBtn icon="undo" label={T.file.undo} disabled={!editor.history.canUndo} onClick={() => editor.undo()} />
          <ToolBtn icon="redo" label={T.file.redo} disabled={!editor.history.canRedo} onClick={() => editor.redo()} />
        </div>
        <div className="group tools-main">
          {TOOLS.filter((t) => t.id !== 'ai' || aiEnabled !== false).map((t) => (
            <ToolBtn
              key={t.id}
              icon={t.icon}
              label={T.tools[t.id as keyof typeof T.tools]}
              active={tool === t.id}
              disabled={!hasDoc}
              title={`${T.tools[t.id as keyof typeof T.tools]}${t.key ? ` (${t.key})` : ''}`}
              onClick={() => {
                editor.flushPending();
                set({ tool: t.id });
              }}
            />
          ))}
        </div>
      </nav>
      <div className="user">
        <div className="avatar">{cfg?.player.initials ?? 'LE'}</div>
        <div className="user-txt">
          <b>{cfg?.player.name ?? 'Tasarımcı'}</b>
          <span>{cfg?.player.role ?? cfg?.brand.name ?? 'Legends of Empire'}</span>
        </div>
        <button className="close-btn" title={T.close} onClick={() => requestClose()}>
          <Icon name="close" size={18} />
        </button>
      </div>
    </header>
  );
}

function ToolBtn({
  icon,
  label,
  active,
  disabled,
  onClick,
  title,
}: {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button className={`tb ${active ? 'on' : ''}`} disabled={disabled} onClick={onClick} title={title || label}>
      <Icon name={icon} size={17} />
      <span>{label}</span>
    </button>
  );
}

export function setToolByKey(k: string) {
  const id = TOOL_KEYS[k.toLowerCase()];
  if (id && S().vehicle) {
    editor.flushPending();
    set({ tool: id });
  }
}
