// Model yuklenince uretilen, belgeye ait olmayan yardimci veriler.
export const runtime: {
  template: HTMLCanvasElement | HTMLImageElement | null; // UV sablonu (cizgiler)
  islandMask: HTMLCanvasElement | null; // UV adalari (panel dolgusu icin)
} = {
  template: null,
  islandMask: null,
};

(window as unknown as { __runtime: typeof runtime }).__runtime = runtime;
