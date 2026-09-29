import type { Layer, ShapeKind, TextLayer } from './types';
import { ctx2d, deg2rad, scratch } from './util';
import { getSplat } from './splat';

// Katman cizimi. Kaynaklar (raster tuvalleri, yuklu gorseller) disaridan verilir.
export interface RenderSources {
  size: number;
  raster: (id: string) => HTMLCanvasElement | undefined;
  image: (src: string) => HTMLImageElement | undefined;
}

const OFF = 20000; // "sadece golge" cizimi icin ekran disi kaydirma

export function textFont(l: Pick<TextLayer, 'bold' | 'italic' | 'size' | 'font'>) {
  return `${l.italic ? 'italic ' : ''}${l.bold ? '800 ' : '500 '}${Math.max(1, l.size)}px "${l.font}", Impact, "Arial Black", sans-serif`;
}

const measureCanvas = document.createElement('canvas');
/** Yazinin dogal kutusu (olcek 1). */
export function measureText(l: Pick<TextLayer, 'text' | 'bold' | 'italic' | 'size' | 'font' | 'strokeWidth' | 'spacing'>) {
  const g = ctx2d(measureCanvas);
  g.font = textFont(l);
  try {
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.spacing}px`;
  } catch {
    /* eski CEF */
  }
  const lines = (l.text || ' ').split('\n');
  let w = 0;
  for (const line of lines) w = Math.max(w, g.measureText(line || ' ').width);
  const pad = l.strokeWidth * 2 + l.size * 0.12;
  return { w: Math.ceil(w + pad * 2), h: Math.ceil(lines.length * l.size * 1.18 + pad * 2) };
}

/** Konumlu katmanin yerel -> belge donusumu. */
export function layerMatrix(l: Layer): DOMMatrix {
  const m = new DOMMatrix();
  m.translateSelf(l.x, l.y);
  m.rotateSelf(l.rotation);
  m.scaleSelf(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
  return m;
}

export function isPositioned(l: Layer) {
  return l.type !== 'fill' && l.type !== 'gradient';
}

/** Katman icerigini (donusum uygulanmis, opaklik/karisim YOK) verilen baglama ciz. */
function drawContent(g: CanvasRenderingContext2D, l: Layer, src: RenderSources) {
  const S = src.size;
  switch (l.type) {
    case 'fill':
      g.fillStyle = l.color;
      g.fillRect(0, 0, S, S);
      return;
    case 'gradient': {
      let grad: CanvasGradient;
      if (l.kind === 'radial') {
        const r = Math.max(1, Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
        grad = g.createRadialGradient(l.x1, l.y1, 0, l.x1, l.y1, r);
      } else {
        grad = g.createLinearGradient(l.x1, l.y1, l.x2, l.y2);
      }
      grad.addColorStop(0, l.c1);
      grad.addColorStop(1, l.c2);
      g.fillStyle = grad;
      g.fillRect(0, 0, S, S);
      return;
    }
  }
  g.save();
  g.translate(l.x, l.y);
  g.rotate(deg2rad(l.rotation));
  g.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
  const hw = l.w / 2;
  const hh = l.h / 2;
  switch (l.type) {
    case 'raster': {
      const c = src.raster(l.id);
      if (c) g.drawImage(c, -hw, -hh, l.w, l.h);
      break;
    }
    case 'image': {
      const img = src.image(l.src);
      if (img) g.drawImage(img, -hw, -hh, l.w, l.h);
      break;
    }
    case 'splat': {
      const c = getSplat(l.seed, l.color, l.energy, l.droplets, l.drips);
      g.drawImage(c, -hw, -hh, l.w, l.h);
      break;
    }
    case 'text': {
      const base = measureText(l);
      g.scale(l.w / base.w, l.h / base.h);
      g.font = textFont(l);
      try {
        (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.spacing}px`;
      } catch {
        /* */
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      const lines = (l.text || ' ').split('\n');
      const lh = l.size * 1.18;
      const y0 = -((lines.length - 1) * lh) / 2;
      lines.forEach((line, i) => {
        if (l.strokeWidth > 0) {
          g.strokeStyle = l.stroke;
          g.lineWidth = l.strokeWidth * 2;
          g.strokeText(line, 0, y0 + i * lh);
        }
        g.fillStyle = l.color;
        g.fillText(line, 0, y0 + i * lh);
      });
      break;
    }
    case 'shape':
      drawShape(g, l.shape, l.w, l.h, l.filled ? l.fill : null, l.strokeWidth > 0 ? l.stroke : null, l.strokeWidth);
      break;
  }
  g.restore();
}

export function shapePath(g: CanvasRenderingContext2D, kind: ShapeKind, w: number, h: number) {
  const hw = w / 2;
  const hh = h / 2;
  g.beginPath();
  switch (kind) {
    case 'rect':
      g.rect(-hw, -hh, w, h);
      break;
    case 'roundrect': {
      const r = Math.min(hw, hh) * 0.35;
      g.roundRect(-hw, -hh, w, h, r);
      break;
    }
    case 'ellipse':
      g.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      break;
    case 'ring':
      g.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      g.ellipse(0, 0, hw * 0.62, hh * 0.62, 0, 0, Math.PI * 2, true);
      break;
    case 'triangle':
      g.moveTo(0, -hh);
      g.lineTo(hw, hh);
      g.lineTo(-hw, hh);
      g.closePath();
      break;
    case 'diamond':
      g.moveTo(0, -hh);
      g.lineTo(hw, 0);
      g.lineTo(0, hh);
      g.lineTo(-hw, 0);
      g.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const x = Math.cos(a) * hw;
        const y = Math.sin(a) * hh;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (Math.PI / 5) * i;
        const k = i % 2 ? 0.42 : 1;
        const x = Math.cos(a) * hw * k;
        const y = Math.sin(a) * hh * k;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      break;
    case 'chevron': {
      const t = h * 0.38;
      g.moveTo(-hw, -hh);
      g.lineTo(0, hh - t);
      g.lineTo(hw, -hh);
      g.lineTo(hw, -hh + t);
      g.lineTo(0, hh);
      g.lineTo(-hw, -hh + t);
      g.closePath();
      break;
    }
    case 'arrow': {
      const sh = hh * 0.42;
      const head = w * 0.38;
      g.moveTo(-hw, -sh);
      g.lineTo(hw - head, -sh);
      g.lineTo(hw - head, -hh);
      g.lineTo(hw, 0);
      g.lineTo(hw - head, hh);
      g.lineTo(hw - head, sh);
      g.lineTo(-hw, sh);
      g.closePath();
      break;
    }
    case 'stripes': {
      // Cift yaris seridi (arada bosluk)
      const bw = w * 0.4;
      g.rect(-hw, -hh, bw, h);
      g.rect(hw - bw, -hh, bw, h);
      break;
    }
    case 'bolt':
      g.moveTo(hw * 0.25, -hh);
      g.lineTo(-hw * 0.7, hh * 0.12);
      g.lineTo(-hw * 0.02, hh * 0.12);
      g.lineTo(-hw * 0.3, hh);
      g.lineTo(hw * 0.75, -hh * 0.18);
      g.lineTo(hw * 0.04, -hh * 0.18);
      g.closePath();
      break;
  }
}

export function drawShape(
  g: CanvasRenderingContext2D,
  kind: ShapeKind,
  w: number,
  h: number,
  fill: string | null,
  stroke: string | null,
  strokeWidth: number,
) {
  shapePath(g, kind, w, h);
  if (fill) {
    g.fillStyle = fill;
    g.fill('evenodd');
  }
  if (stroke && strokeWidth > 0) {
    g.strokeStyle = stroke;
    g.lineWidth = strokeWidth;
    g.lineJoin = 'round';
    g.stroke();
  }
}

function hasFx(l: Layer) {
  return l.fx.shadow.on || l.fx.glow.on || l.fx.outline.on;
}

/** Tek katmani hedef baglama opaklik, karisim modu ve efektlerle birlikte ciz. */
export function renderLayer(g: CanvasRenderingContext2D, l: Layer, src: RenderSources, extra?: (lg: CanvasRenderingContext2D) => void) {
  if (!l.visible || l.opacity <= 0) return;
  const S = src.size;
  if (!hasFx(l) && !extra) {
    g.save();
    g.globalAlpha = l.opacity;
    g.globalCompositeOperation = l.blend;
    drawContent(g, l, src);
    g.restore();
    return;
  }
  // Efektli yol: once katmani kendi tuvaline ciz, sonra golge/parilti/kontur ile birlestir.
  const L = scratch('layer', S);
  const lg = ctx2d(L);
  lg.setTransform(1, 0, 0, 1, 0, 0);
  lg.globalAlpha = 1;
  lg.globalCompositeOperation = 'source-over';
  lg.clearRect(0, 0, S, S);
  drawContent(lg, l, src);
  if (extra) extra(lg);

  g.save();
  g.globalAlpha = l.opacity;
  g.globalCompositeOperation = l.blend;
  const fx = l.fx;
  if (fx.glow.on) {
    g.shadowColor = fx.glow.color;
    g.shadowBlur = fx.glow.blur;
    g.shadowOffsetX = OFF;
    g.shadowOffsetY = 0;
    g.drawImage(L, -OFF, 0);
    g.drawImage(L, -OFF, 0);
  }
  if (fx.shadow.on) {
    g.shadowColor = fx.shadow.color;
    g.shadowBlur = fx.shadow.blur;
    g.shadowOffsetX = OFF + fx.shadow.dx;
    g.shadowOffsetY = fx.shadow.dy;
    g.drawImage(L, -OFF, 0);
  }
  g.shadowColor = 'transparent';
  g.shadowBlur = 0;
  g.shadowOffsetX = 0;
  g.shadowOffsetY = 0;
  if (fx.outline.on && fx.outline.width > 0) {
    const T = scratch('tint', S);
    const tg = ctx2d(T);
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, S, S);
    tg.drawImage(L, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = fx.outline.color;
    tg.fillRect(0, 0, S, S);
    tg.globalCompositeOperation = 'source-over';
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      g.drawImage(T, Math.cos(a) * fx.outline.width, Math.sin(a) * fx.outline.width);
    }
  }
  g.drawImage(L, 0, 0);
  g.restore();
}
