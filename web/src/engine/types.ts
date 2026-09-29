// Kaplama belgesi veri tipleri. Tum koordinatlar "belge pikseli"dir (0..size),
// yani oyundaki livery dokusunun piksel uzayi. UV (u,v) -> (u*size, v*size).

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface LayerFX {
  shadow: { on: boolean; color: string; blur: number; dx: number; dy: number };
  glow: { on: boolean; color: string; blur: number };
  outline: { on: boolean; color: string; width: number };
}

export type LayerType = 'fill' | 'gradient' | 'raster' | 'image' | 'text' | 'shape' | 'splat';

interface LayerBase {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blend: BlendMode;
  fx: LayerFX;
  // Konumlu katmanlar icin merkez + boyut + donus (fill/gradient yok sayar)
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // derece
  flipX: boolean;
  flipY: boolean;
  rev: number; // icerik degisim sayaci (thumbnail/cache icin)
}

export interface FillLayer extends LayerBase {
  type: 'fill';
  color: string;
}

export interface GradientLayer extends LayerBase {
  type: 'gradient';
  kind: 'linear' | 'radial';
  c1: string;
  c2: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RasterLayer extends LayerBase {
  type: 'raster';
  // Piksel verisi doc.rasters[id] tuvalinde tutulur (history uyumu icin).
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string; // dataURL
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  stroke: string;
  strokeWidth: number;
  spacing: number;
}

export type ShapeKind =
  | 'rect'
  | 'roundrect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon'
  | 'chevron'
  | 'arrow'
  | 'stripes'
  | 'ring'
  | 'bolt';

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  filled: boolean;
  stroke: string;
  strokeWidth: number;
}

export interface SplatLayer extends LayerBase {
  type: 'splat';
  seed: number;
  color: string;
  energy: number; // 0..100
  droplets: number; // 0..100
  drips: boolean;
}

export type Layer =
  | FillLayer
  | GradientLayer
  | RasterLayer
  | ImageLayer
  | TextLayer
  | ShapeLayer
  | SplatLayer;

export type Finish = 'gloss' | 'metallic' | 'pearl' | 'matte' | 'brushed' | 'chrome';

export interface PaintSettings {
  color: string; // aracin alt boyasi (onizleme + istege bagli uygulama)
  finish: Finish;
  apply: boolean; // takarken aracin ana boyasini da degistir
}

export interface SerializedDoc {
  v: 1;
  model: string;
  size: number;
  name: string;
  paint: PaintSettings;
  fonts: { name: string; src: string }[];
  layers: (Omit<Layer, 'rev'> & { raster?: string })[];
}
