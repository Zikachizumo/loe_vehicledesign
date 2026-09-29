// Tarama-cizgisi tasma dolgusu. Kaynak goruntude (x,y) noktasina benzer ve
// bitisik piksellerin maskesini dondurur (1 = doldur).

export function floodMask(src: ImageData, x0: number, y0: number, tolerance: number): Uint8Array {
  const { width: W, height: H, data } = src;
  const mask = new Uint8Array(W * H);
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return mask;
  const i0 = (y0 * W + x0) * 4;
  const r0 = data[i0],
    g0 = data[i0 + 1],
    b0 = data[i0 + 2],
    a0 = data[i0 + 3];
  const tol = (tolerance / 100) * 255;
  const match = (p: number) => {
    const i = p * 4;
    const a = data[i + 3];
    // Tamamen saydam pikseller renklerinden bagimsiz "ayni" sayilir.
    if (a0 < 8 && a < 8) return true;
    return (
      Math.abs(data[i] - r0) <= tol &&
      Math.abs(data[i + 1] - g0) <= tol &&
      Math.abs(data[i + 2] - b0) <= tol &&
      Math.abs(a - a0) <= tol
    );
  };
  const stack: number[] = [x0, y0];
  while (stack.length) {
    const y = stack.pop() as number;
    let x = stack.pop() as number;
    let p = y * W + x;
    while (x >= 0 && !mask[p] && match(p)) {
      x--;
      p--;
    }
    x++;
    p++;
    let up = false;
    let down = false;
    while (x < W && !mask[p] && match(p)) {
      mask[p] = 1;
      if (y > 0) {
        const q = p - W;
        if (!mask[q] && match(q)) {
          if (!up) {
            stack.push(x, y - 1);
            up = true;
          }
        } else up = false;
      }
      if (y < H - 1) {
        const q = p + W;
        if (!mask[q] && match(q)) {
          if (!down) {
            stack.push(x, y + 1);
            down = true;
          }
        } else down = false;
      }
      x++;
      p++;
    }
  }
  return mask;
}

/** Maskeyi renkli ImageData'ya donustur; kenarlari 1px yumusat (anti-alias). */
export function maskToImage(mask: Uint8Array, W: number, H: number, rgb: [number, number, number]): { img: ImageData; count: number } {
  const img = new ImageData(W, H);
  const d = img.data;
  let count = 0;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    count++;
    const i = p * 4;
    d[i] = rgb[0];
    d[i + 1] = rgb[1];
    d[i + 2] = rgb[2];
    d[i + 3] = 255;
  }
  return { img, count };
}
