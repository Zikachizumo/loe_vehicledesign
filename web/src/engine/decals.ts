// Hazir cikartmalar — LoE icin cizilmis basit, ozgun vektor sekiller.
// {C} yer tutucusu secili renkle degistirilir. Tumu 512x512 viewBox.

export interface Decal {
  id: string;
  name: string;
  svg: string;
}

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`;

export const DECALS: Decal[] = [
  {
    id: 'crest',
    name: 'LoE Arması',
    svg: wrap(
      `<path d="M256 28 L452 96 V250 C452 360 370 440 256 486 C142 440 60 360 60 250 V96 Z" fill="none" stroke="{C}" stroke-width="26"/>
       <path d="M150 150 L196 190 L256 132 L316 190 L362 150 L346 250 H166 Z" fill="{C}"/>
       <path d="M200 286 H232 V380 H300 V410 H200 Z" fill="{C}"/>
       <rect x="166" y="262" width="180" height="12" fill="{C}"/>`,
    ),
  },
  {
    id: 'number',
    name: 'Yarış Numarası',
    svg: wrap(
      `<circle cx="256" cy="256" r="228" fill="{C}"/><circle cx="256" cy="256" r="190" fill="#ffffff"/>
       <text x="256" y="330" font-family="Impact, Arial Black, sans-serif" font-size="230" text-anchor="middle" fill="#111">77</text>`,
    ),
  },
  {
    id: 'checker',
    name: 'Damalı Bayrak',
    svg: wrap(
      Array.from({ length: 8 * 8 }, (_, i) => {
        const x = i % 8;
        const y = Math.floor(i / 8);
        return (x + y) % 2 ? '' : `<rect x="${x * 64}" y="${y * 64}" width="64" height="64" fill="{C}"/>`;
      }).join(''),
    ),
  },
  {
    id: 'speedlines',
    name: 'Hız Çizgileri',
    svg: wrap(
      `<path d="M20 140 H420 L380 180 H20 Z" fill="{C}"/>
       <path d="M20 230 H492 L452 270 H20 Z" fill="{C}"/>
       <path d="M20 320 H360 L320 360 H20 Z" fill="{C}"/>`,
    ),
  },
  {
    id: 'flame',
    name: 'Alev',
    svg: wrap(
      `<path d="M20 330 C120 330 150 250 210 250 C190 290 230 300 260 270 C250 330 320 330 350 290 C340 340 400 350 440 300 C450 360 400 420 300 420 H20 Z" fill="{C}"/>
       <path d="M20 250 C90 250 130 190 190 170 C170 210 200 225 230 200 C230 240 280 240 300 210 C300 250 250 290 160 290 H20 Z" fill="{C}" opacity=".75"/>`,
    ),
  },
  {
    id: 'wings',
    name: 'Kanatlar',
    svg: wrap(
      `<path d="M256 250 C210 180 120 150 20 160 C80 185 110 205 130 230 C90 225 60 232 30 250 C90 258 130 270 150 290 C120 292 95 300 70 320 C150 320 220 300 256 280 Z" fill="{C}"/>
       <path d="M256 250 C302 180 392 150 492 160 C432 185 402 205 382 230 C422 225 452 232 482 250 C422 258 382 270 362 290 C392 292 417 300 442 320 C362 320 292 300 256 280 Z" fill="{C}"/>
       <circle cx="256" cy="262" r="26" fill="{C}"/>`,
    ),
  },
  {
    id: 'tribal',
    name: 'Kıvrım',
    svg: wrap(
      `<path d="M30 300 C120 180 260 160 360 210 C420 240 470 230 490 190 C490 280 420 320 350 290 C270 255 170 260 90 330 C150 250 250 230 320 262 C230 220 120 240 30 300 Z" fill="{C}"/>`,
    ),
  },
  {
    id: 'stars',
    name: 'Yıldızlar',
    svg: wrap(
      [
        [128, 150, 70],
        [300, 110, 44],
        [410, 230, 58],
        [220, 300, 90],
        [390, 390, 40],
        [110, 390, 36],
      ]
        .map(([x, y, r]) => {
          const pts = Array.from({ length: 10 }, (_, i) => {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const k = i % 2 ? r * 0.42 : r;
            return `${(x + Math.cos(a) * k).toFixed(1)},${(y + Math.sin(a) * k).toFixed(1)}`;
          }).join(' ');
          return `<polygon points="${pts}" fill="{C}"/>`;
        })
        .join(''),
    ),
  },
  {
    id: 'bolt',
    name: 'Şimşek',
    svg: wrap(`<path d="M300 20 L110 290 H240 L190 492 L402 196 H268 Z" fill="{C}"/>`),
  },
  {
    id: 'halftone',
    name: 'Nokta Geçişi',
    svg: wrap(
      Array.from({ length: 12 * 12 }, (_, i) => {
        const x = i % 12;
        const y = Math.floor(i / 12);
        const r = 3 + (x / 11) * 17;
        return `<circle cx="${22 + x * 42}" cy="${22 + y * 42}" r="${r.toFixed(1)}" fill="{C}"/>`;
      }).join(''),
    ),
  },
  {
    id: 'hazard',
    name: 'İkaz Şeridi',
    svg: wrap(
      `<defs><clipPath id="c"><rect x="0" y="176" width="512" height="160"/></clipPath></defs>
       <g clip-path="url(#c)">${Array.from({ length: 10 }, (_, i) => `<path d="M${i * 96 - 160} 336 L${i * 96 - 112} 336 L${i * 96 + 48} 176 L${i * 96} 176 Z" fill="{C}"/>`).join('')}</g>
       <rect x="0" y="176" width="512" height="160" fill="none" stroke="{C}" stroke-width="8"/>`,
    ),
  },
  {
    id: 'laurel',
    name: 'Defne',
    svg: wrap(
      Array.from({ length: 7 }, (_, i) => {
        const a = (Math.PI * (0.62 + i * 0.075));
        const x = 256 + Math.cos(a) * 190;
        const y = 280 + Math.sin(a) * 190 - 150;
        const x2 = 512 - x;
        const rot = (a * 180) / Math.PI + 90;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="22" ry="48" transform="rotate(${(rot - 40).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="{C}"/>
                <ellipse cx="${x2.toFixed(1)}" cy="${y.toFixed(1)}" rx="22" ry="48" transform="rotate(${(-rot + 40).toFixed(1)} ${x2.toFixed(1)} ${y.toFixed(1)})" fill="{C}"/>`;
      }).join('') + `<path d="M140 420 Q256 470 372 420" fill="none" stroke="{C}" stroke-width="14"/>`,
    ),
  },
];

const urlCache = new Map<string, string>();
const rendered = new Map<string, string>();

/** SVG'yi renklendirip PNG dataURL'e cevir (senkron: onceden hazirlanmis onbellek). */
export function decalDataUrl(id: string, color: string): string | null {
  const key = `${id}|${color}`;
  const hit = rendered.get(key);
  if (hit) return hit;
  const d = DECALS.find((x) => x.id === id);
  if (!d) return null;
  // SVG dataURL'i dogrudan <img> kaynagi olarak kullanilabilir; tuvale cizimde
  // taint olmaz (ayni kaynak). PNG'ye cevirmeye gerek yok.
  const svg = d.svg.split('{C}').join(color);
  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  rendered.set(key, url);
  return url;
}

export function decalPreview(id: string): string {
  const hit = urlCache.get(id);
  if (hit) return hit;
  const url = decalDataUrl(id, '#ffffff') || '';
  urlCache.set(id, url);
  return url;
}

/** Cikartmayi 1024px PNG'ye cevir (tuval "taint" riskini ortadan kaldirir, kayitta sabit kalir). */
export async function decalPng(id: string, color: string, res = 1024): Promise<string | null> {
  const svgUrl = decalDataUrl(id, color);
  if (!svgUrl) return null;
  const img = new Image();
  img.src = svgUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = res;
  c.height = res;
  c.getContext('2d')!.drawImage(img, 0, 0, res, res);
  try {
    return c.toDataURL('image/png');
  } catch {
    return svgUrl;
  }
}
