import * as THREE from 'three';
import { makeCanvas, ctx2d } from '../engine/util';

// Boyanabilir meshlerin UV'lerinden otomatik sablon (renkli kenar cizgileri) ve
// ada maskesi (panel dolgusu icin) uret. Koordinatlar doku pikselleri (flipY=false).

function uvAttr(geo: THREE.BufferGeometry, channel: number) {
  const name = channel === 1 ? 'uv1' : 'uv';
  return (geo.getAttribute(name) || geo.getAttribute('uv')) as THREE.BufferAttribute | undefined;
}

export function buildUvArtifacts(meshes: THREE.Mesh[], size: number, channel: number) {
  const template = makeCanvas(size);
  const mask = makeCanvas(size);
  const tg = ctx2d(template);
  const mg = ctx2d(mask);
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, size, size);
  mg.fillStyle = '#fff';
  const lw = Math.max(1, size / 1024);
  tg.lineWidth = lw;
  tg.lineJoin = 'round';

  meshes.forEach((mesh, mi) => {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const uv = uvAttr(geo, channel);
    if (!uv) return;
    const index = geo.getIndex();
    const count = index ? index.count : uv.count;
    const hue = (mi * 67 + 170) % 360;
    tg.strokeStyle = `hsla(${hue}, 85%, 58%, 0.95)`;
    tg.beginPath();
    mg.beginPath();
    const raw = (i: number): [number, number] => {
      const k = index ? index.getX(i) : i;
      return [uv.getX(k), uv.getY(k)];
    };
    for (let i = 0; i + 2 < count; i += 3) {
      const t = [raw(i), raw(i + 1), raw(i + 2)];
      // 0..1 disina tasan (tekrarlanan) UV'lerde ucgeni butun olarak kaydir; parcalama.
      const ou = Math.floor(Math.min(t[0][0], t[1][0], t[2][0]));
      const ov = Math.floor(Math.min(t[0][1], t[1][1], t[2][1]));
      const [a, b, c] = t.map(([u, v]) => [(u - ou) * size, (v - ov) * size] as [number, number]);
      mg.moveTo(a[0], a[1]);
      mg.lineTo(b[0], b[1]);
      mg.lineTo(c[0], c[1]);
      mg.closePath();
      tg.moveTo(a[0], a[1]);
      tg.lineTo(b[0], b[1]);
      tg.lineTo(c[0], c[1]);
      tg.closePath();
    }
    mg.fill();
    // Ic kenarlari hafif, dis hatlari belirgin gostermek icin: once ince ic cizgiler
    tg.globalAlpha = 0.18;
    tg.stroke();
    tg.globalAlpha = 1;
  });

  // Ada dis hatlari: alfa maskesini asindir (erode), farki al -> sadece kenar kalir.
  const alpha = makeCanvas(size);
  const ag = ctx2d(alpha);
  ag.drawImage(mask, 0, 0); // siyah/beyaz -> asagida parlaklik alfaya cevrilir
  const ad = ag.getImageData(0, 0, size, size);
  for (let i = 0; i < ad.data.length; i += 4) {
    ad.data[i + 3] = ad.data[i]; // beyaz = opak, siyah = saydam
    ad.data[i] = ad.data[i + 1] = ad.data[i + 2] = 255;
  }
  ag.putImageData(ad, 0, 0);
  const eroded = makeCanvas(size);
  const eg = ctx2d(eroded);
  eg.drawImage(alpha, 0, 0);
  const w = Math.max(1, Math.round(lw * 2));
  eg.globalCompositeOperation = 'destination-in';
  for (const [dx, dy] of [[w, 0], [-w, 0], [0, w], [0, -w]]) eg.drawImage(alpha, dx, dy);
  const edge = makeCanvas(size);
  const edg = ctx2d(edge);
  edg.drawImage(alpha, 0, 0);
  edg.globalCompositeOperation = 'destination-out';
  edg.drawImage(eroded, 0, 0);
  edg.globalCompositeOperation = 'source-in';
  const grad = edg.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#39d2ff');
  grad.addColorStop(0.5, '#b56cff');
  grad.addColorStop(1, '#ffb347');
  edg.fillStyle = grad;
  edg.fillRect(0, 0, size, size);
  tg.drawImage(edge, 0, 0);
  return { template, mask };
}
