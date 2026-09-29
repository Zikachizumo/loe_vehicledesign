import * as THREE from 'three';

// Tarayici gelistirmesi / oyun ici test icin prosedurel "demo coupe".
// Tek bir boyanabilir govde (UV atlasi) + boyanamaz cam/teker parcalari.
// UV'ler glTF kuralinda (v asagi dogru) -> doku flipY=false ile kullanilir.
//
// Atlas yerlesimi (0..1):
//   Sol yan   : u 0.02-0.98, v 0.02-0.30
//   Sag yan   : u 0.02-0.98, v 0.33-0.61
//   Ust serit : u 0.02-0.98, v 0.64-0.98 (on tampon -> kaput -> tavan -> bagaj -> arka)

const L = 4.4; // uzunluk (x)
const W = 1.86; // genislik (z)

// Yan profil (x ileri, y yukari). Saat yonunun tersi, alt kenar duz.
const profile: [number, number][] = [
  [-2.2, 0.28],
  [2.2, 0.28],
  [2.24, 0.52],
  [2.12, 0.74],
  [1.3, 0.86],
  [0.62, 0.95],
  [0.1, 1.33],
  [-0.9, 1.36],
  [-1.6, 1.08],
  [-2.12, 1.0],
  [-2.24, 0.62],
];

function sideUv(x: number, y: number, v0: number, v1: number, mirror: boolean): [number, number] {
  let u = (x + L / 2) / L;
  if (mirror) u = 1 - u;
  const t = (y - 0.2) / 1.25; // 0 alt -> 1 ust
  return [0.02 + u * 0.96, v1 - t * (v1 - v0)];
}

export function buildDemoCar(): { group: THREE.Group; livery: THREE.Mesh[] } {
  const group = new THREE.Group();

  // ---- Yan paneller ----
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const tris = THREE.ShapeUtils.triangulateShape(shape.getPoints(), []);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const addSide = (z: number, v0: number, v1: number, mirror: boolean, flip: boolean) => {
    const base = pos.length / 3;
    for (const [x, y] of profile) {
      pos.push(x, y, z);
      uv.push(...sideUv(x, y, v0, v1, mirror));
    }
    for (const t of tris) {
      if (flip) idx.push(base + t[0], base + t[2], base + t[1]);
      else idx.push(base + t[0], base + t[1], base + t[2]);
    }
  };
  addSide(W / 2, 0.02, 0.3, false, false); // sol (+z)
  addSide(-W / 2, 0.33, 0.61, true, true); // sag (-z)

  // ---- Ust serit (profilin alt kenari haric kenarlari boyunca lofting) ----
  const topPts = profile.slice(1).concat([profile[0]]); // on tampondan arkaya
  let total = 0;
  const seg: number[] = [0];
  for (let i = 1; i < topPts.length; i++) {
    total += Math.hypot(topPts[i][0] - topPts[i - 1][0], topPts[i][1] - topPts[i - 1][1]);
    seg.push(total);
  }
  const base = pos.length / 3;
  const rows = 6; // genislik boyunca bolum (hafif kubbe)
  for (let i = 0; i < topPts.length; i++) {
    const [x, y] = topPts[i];
    for (let j = 0; j <= rows; j++) {
      const s = j / rows;
      const z = W / 2 - s * W;
      const bulge = Math.sin(s * Math.PI) * 0.05 * (y > 0.8 ? 1 : 0.4);
      pos.push(x, y + bulge, z * (y > 1.2 ? 0.9 : 1));
      uv.push(0.02 + (seg[i] / total) * 0.96, 0.64 + s * 0.34);
    }
  }
  for (let i = 0; i < topPts.length - 1; i++) {
    for (let j = 0; j < rows; j++) {
      const a = base + i * (rows + 1) + j;
      const b = a + rows + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  body.name = 'body';
  body.material.name = 'demo_paint';
  body.castShadow = true;
  group.add(body);

  // ---- Camlar (boyanamaz) ----
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  glassMat.name = 'glass';
  const glassShape = new THREE.Shape([
    new THREE.Vector2(0.52, 0.98),
    new THREE.Vector2(0.08, 1.28),
    new THREE.Vector2(-0.86, 1.3),
    new THREE.Vector2(-1.45, 1.06),
  ]);
  for (const side of [1, -1]) {
    const g = new THREE.ShapeGeometry(glassShape);
    const m = new THREE.Mesh(g, glassMat);
    m.position.z = (W / 2 + 0.004) * side;
    if (side < 0) m.rotation.y = Math.PI;
    if (side < 0) m.scale.x = -1;
    group.add(m);
  }
  // on cam
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(0.62, W * 0.86), glassMat);
  ws.position.set(0.36, 1.15, 0);
  ws.rotation.set(-Math.PI / 2, 0, 0);
  ws.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -0.64);
  ws.position.y += 0.03;
  group.add(ws);

  // ---- Tekerlekler ----
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.9 });
  tireMat.name = 'tyre';
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.3, metalness: 0.9 });
  rimMat.name = 'rim';
  for (const x of [1.42, -1.42]) {
    for (const z of [W / 2 - 0.12, -W / 2 + 0.12]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 32), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, 0.36, z);
      group.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.27, 20), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 0.36, z);
      group.add(rim);
    }
  }
  // Farlar
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 1.2 });
  lampMat.name = 'light';
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1133, emissiveIntensity: 1.4 });
  tailMat.name = 'light_tail';
  for (const z of [0.62, -0.62]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.36), lampMat);
    f.position.set(2.19, 0.66, z);
    group.add(f);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.4), tailMat);
    r.position.set(-2.2, 0.9, z);
    group.add(r);
  }
  return { group, livery: [body] };
}
