// Basit, ozgun cizgi ikonlari (24x24, currentColor).
import type { JSX } from 'react';

const P = (d: string) => <path d={d} />;

const paths: Record<string, JSX.Element> = {
  new: <>{P('M6 3h8l4 4v14H6z')}{P('M14 3v4h4')}{P('M12 11v6M9 14h6')}</>,
  save: <>{P('M5 4h11l3 3v13H5z')}{P('M8 4v5h7V4')}{P('M8 20v-6h8v6')}</>,
  undo: <>{P('M9 7L5 11l4 4')}{P('M5 11h9a5 5 0 010 10h-2')}</>,
  redo: <>{P('M15 7l4 4-4 4')}{P('M19 11h-9a5 5 0 000 10h2')}</>,
  select: <>{P('M6 3l12 9-5 1.2 3 5.8-2.4 1.2-3-5.8L6 18z')}</>,
  brush: <>{P('M19 4l-8.5 8.5')}{P('M20 3c1 1-7 10-8.5 11.5l-2-2C11 11 19 2 20 3z')}{P('M9.5 12.5c-2 0-3.5 1.5-3.5 3.5 0 1.5-1 2.5-2.5 3 3 1 7.5.5 8-4.5z')}</>,
  splat: <>{P('M12 7c2-4 3 1 5-1-1 3 3 3 1 5 3 1-1 3 0 5-3-1-3 3-5 1-1 3-3-1-5 1 1-3-3-3-1-5-3-1 1-3 0-5 3 1 3-3 5-1z')}<circle cx="12" cy="12" r="1.2" /></>,
  eraser: <>{P('M4 16l9-9 6 6-6 6H8z')}{P('M9 11l6 6')}{P('M13 19h7')}</>,
  fill: <>{P('M5 11l7-7 7 7-7 7z')}{P('M5 11h14')}{P('M19 14c0 0 2 2.5 2 3.8a2 2 0 01-4 0c0-1.3 2-3.8 2-3.8z')}</>,
  text: <>{P('M5 5h14M12 5v15M9 20h6')}</>,
  shapes: <><rect x="3.5" y="3.5" width="9" height="9" rx="1" /><circle cx="15.5" cy="15.5" r="5" /></>,
  pen: <>{P('M4 20l1.5-5L16 4.5 19.5 8 9 18.5z')}{P('M14 6.5l3.5 3.5')}</>,
  gradient: <><rect x="4" y="4" width="16" height="16" rx="2" />{P('M12 4v16')}{P('M8 8h.01M8 12h.01M8 16h.01M16 10h.01M16 14h.01')}</>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.8" />{P('M20.5 16l-5-5-8 8.5')}</>,
  decal: <>{P('M4 4h11l5 5v11H4z')}{P('M15 4v5h5')}{P('M8 15l2.5-4 2 3 1.5-2 2 3z')}</>,
  clone: <><rect x="8" y="8" width="12" height="12" rx="2" />{P('M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3')}</>,
  smudge: <>{P('M8 13V6.5a1.5 1.5 0 013 0V12')}{P('M11 11.5V5a1.5 1.5 0 013 0v6.5')}{P('M14 11.5V7a1.5 1.5 0 013 0v7c0 4-2.5 7-6.5 7-2.5 0-4-1.3-5.5-3.5L3 14.5a1.5 1.5 0 012.5-1.5L8 15.5')}</>,
  pick: <>{P('M20.5 3.5a2.1 2.1 0 00-3 0L14 7l-1.5-1.5-1.5 1.5 6 6 1.5-1.5L17 10l3.5-3.5a2.1 2.1 0 000-3z')}{P('M12.5 8.5L5 16v3h3l7.5-7.5')}</>,
  fx: <>{P('M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z')}{P('M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z')}{P('M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z')}</>,
  finish: <>{P('M12 3l8 6-8 12L4 9z')}{P('M4 9h16M9 9l3 12 3-12M8 3.5L9 9M16 3.5L15 9')}</>,
  history: <>{P('M4 12a8 8 0 108-8 8 8 0 00-6.3 3')}{P('M4 4v4h4')}{P('M12 8v4l3 2')}</>,
  ai: <><rect x="6" y="6" width="12" height="12" rx="2" />{P('M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4')}{P('M10 14l1.3-4h1.4l1.3 4M10.5 12.7h3')}</>,
  eye: <>{P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z')}<circle cx="12" cy="12" r="3" /></>,
  eyeOff: <>{P('M3 3l18 18')}{P('M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6')}{P('M9.9 9.9a3 3 0 004.2 4.2')}</>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" />{P('M8 11V7a4 4 0 018 0v4')}</>,
  unlock: <><rect x="5" y="11" width="14" height="10" rx="2" />{P('M8 11V7a4 4 0 017.5-2')}</>,
  trash: <>{P('M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3')}</>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" />{P('M5 15V5a1 1 0 011-1h10')}</>,
  up: <>{P('M12 19V5M6 11l6-6 6 6')}</>,
  down: <>{P('M12 5v14M6 13l6 6 6-6')}</>,
  car: <>{P('M3 16v-3.5L5 8h14l2 4.5V16')}{P('M3 16h18v2H3z')}<circle cx="7" cy="16.5" r="1.8" /><circle cx="17" cy="16.5" r="1.8" />{P('M6.5 12h11')}</>,
  close: <>{P('M6 6l12 12M18 6L6 18')}</>,
  search: <><circle cx="11" cy="11" r="6.5" />{P('M16 16l4.5 4.5')}</>,
  plus: <>{P('M12 5v14M5 12h14')}</>,
  cube: <>{P('M12 3l8 4.5v9L12 21l-8-4.5v-9z')}{P('M12 12l8-4.5M12 12v9M12 12L4 7.5')}</>,
  uv: <><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />{P('M3.5 12h17M12 3.5v17')}{P('M6.5 6.5l3 3M14.5 14.5l3 3')}</>,
  camera: <>{P('M4 8h3l2-3h6l2 3h3v11H4z')}<circle cx="12" cy="13" r="3.5" /></>,
  check: <>{P('M5 12.5l4.5 4.5L19 7.5')}</>,
  warn: <>{P('M12 3l10 18H2z')}{P('M12 10v5M12 18h.01')}</>,
  print: <>{P('M7 9V3h10v6')}<rect x="3" y="9" width="18" height="8" rx="1.5" />{P('M7 14h10v7H7z')}</>,
  upload: <>{P('M12 16V4M7 9l5-5 5 5')}{P('M4 16v4h16v-4')}</>,
  link: <>{P('M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1')}{P('M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1')}</>,
  chevronL: <>{P('M15 5l-7 7 7 7')}</>,
  chevronR: <>{P('M9 5l7 7-7 7')}</>,
  flipH: <>{P('M12 3v18')}{P('M9 7L4 12l5 5z')}{P('M15 7l5 5-5 5z')}</>,
  flipV: <>{P('M3 12h18')}{P('M7 9l5-5 5 5z')}{P('M7 15l5 5 5-5z')}</>,
  center: <><circle cx="12" cy="12" r="3" />{P('M12 2v5M12 17v5M2 12h5M17 12h5')}</>,
  layers: <>{P('M12 3l9 5-9 5-9-5z')}{P('M3 13l9 5 9-5')}</>,
  sparkle: <>{P('M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z')}</>,
  refresh: <>{P('M20 11a8 8 0 10-2.3 5.7')}{P('M20 4v7h-7')}</>,
  grid: <>{P('M4 4h16v16H4zM4 12h16M12 4v16')}</>,
  drag: <>{P('M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01')}</>,
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name] ?? paths.sparkle}
    </svg>
  );
}

/** LoE amblemi: kalkan + taç + L harfi (ozgun). */
export function Emblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="emblem">
      <defs>
        <linearGradient id="emb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path d="M32 3 L58 12 V31 C58 46 47 56 32 61 C17 56 6 46 6 31 V12 Z" fill="rgba(0,0,0,.35)" stroke="url(#emb-g)" strokeWidth="3" />
      <path d="M19 19 L25 24 L32 16 L39 24 L45 19 L43 30 H21 Z" fill="url(#emb-g)" />
      <path d="M25 34 H30 V46 H40 V50 H25 Z" fill="url(#emb-g)" />
    </svg>
  );
}
