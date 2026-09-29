// UV izgarasi yardimcisi: 8x8 harf-numara hucreleri (A1..H8).
// Canli onizlemede aracin uzerinde, UV tuvalinde ayni yerde gorunur; boylece
// UV sablonu olmayan araclarda hangi bolgenin nereye denk geldigi anlasilir.

const COLS = 'ABCDEFGH';

export function drawGrid(g: CanvasRenderingContext2D, size: number, opts: { alpha?: number; labels?: boolean } = {}) {
  const n = 8;
  const cell = size / n;
  g.save();
  g.globalAlpha = opts.alpha ?? 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const hue = ((i * 3 + j * 5) % 8) * 45;
      g.fillStyle = `hsla(${hue}, 85%, 55%, 0.16)`;
      g.fillRect(i * cell, j * cell, cell, cell);
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = Math.max(1, size / 512);
  for (let k = 0; k <= n; k++) {
    g.beginPath();
    g.moveTo(k * cell, 0);
    g.lineTo(k * cell, size);
    g.moveTo(0, k * cell);
    g.lineTo(size, k * cell);
    g.stroke();
  }
  if (opts.labels !== false) {
    g.font = `800 ${Math.round(cell * 0.3)}px Bahnschrift, "Segoe UI", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(2, cell * 0.04);
    g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const label = `${COLS[i]}${j + 1}`;
        g.strokeText(label, i * cell + cell / 2, j * cell + cell / 2);
        g.fillText(label, i * cell + cell / 2, j * cell + cell / 2);
      }
    }
  }
  g.restore();
}
