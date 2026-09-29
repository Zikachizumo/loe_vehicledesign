// Lua <-> NUI veri sozlesmesi

export interface VehicleDef {
  model: string;
  label: string;
  brand?: string;
  year?: number;
  category: string;
  size: number; // livery doku boyutu (px, kare)
  glb?: string; // assets/ altindaki 3D model (goreli yol)
  uv?: string; // UV sablon PNG (goreli yol)
  thumb?: string; // kart gorseli (goreli yol)
  uvChannel?: 0 | 1; // livery hangi UV kanalini kullaniyor (Sollumz: genelde 1)
  liveryMaterials?: string[]; // boyanacak materyal adlari (icerir eslesmesi)
  excludeMaterials?: string[];
  rotationY?: number; // derece — model yonunu duzeltmek icin
  slotsTotal: number;
  slotsFree: number;
  demo?: boolean; // prosedurel demo arac (basilamaz)
  supported?: boolean; // modelde kaplama slotu var mi (tarama/config)
  liveries?: number;
  modLiveries?: number;
}

export interface Category {
  id: string;
  label: string;
  class?: number;
}

export interface ProjectSummary {
  id: number;
  name: string;
  model: string;
  thumb?: string;
  updated: number; // unix sn
}

export interface PrintedSummary {
  id: string;
  label: string;
  model: string;
  thumb?: string;
  created: number;
}

export interface OpenPayload {
  brand: { name: string; short: string; tagline: string };
  theme: string;
  player: { name: string; initials: string; role?: string };
  vehicles: VehicleDef[];
  vehiclesJson?: string; // Lua buyuk listeyi metin olarak yollar
  categories: Category[];
  catalog?: { total?: number; supported?: number; scannedAt?: number; gameBuild?: number };
  isAdmin?: boolean;
  thumbnailUrl?: string;
  preview?: boolean; // oyun ici canli onizleme acik mi
  inGame?: boolean;
  price: number;
  currency: string;
  aiEnabled: boolean;
  limits: { maxLayers: number; maxProjectBytes: number; maxImportBytes: number; maxTextLength: number };
  fonts: string[];
}
