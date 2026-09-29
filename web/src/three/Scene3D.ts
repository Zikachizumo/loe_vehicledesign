import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { VehicleDef } from '../types';
import type { Finish } from '../engine/types';
import type { LiveryDoc } from '../engine/doc';
import { buildDemoCar } from './demoCar';
import { buildUvArtifacts } from './uvTemplate';
import { assetUrl } from '../nui';

export type ViewName = 'three' | 'front' | 'side' | 'rear' | 'top' | 'other';

const DEFAULT_EXCLUDE = /glass|window|windscreen|tyre|tire|wheel|rim|light|lamp|interior|seat|chrome|badge|plate|mirror_glass|brake|disc|caliper|engine|exhaust|shadow|dash|steer/i;
const DEFAULT_INCLUDE = /paint|body|sign|livery|carpaint|vehicle_paint/i;

const FINISH: Record<Finish, Partial<THREE.MeshPhysicalMaterialParameters>> = {
  gloss: { roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 },
  metallic: { roughness: 0.32, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.08 },
  pearl: { roughness: 0.25, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.7, iridescenceIOR: 1.6 },
  matte: { roughness: 0.82, metalness: 0.02, clearcoat: 0, clearcoatRoughness: 1 },
  brushed: { roughness: 0.42, metalness: 0.92, clearcoat: 0.2, clearcoatRoughness: 0.4 },
  chrome: { roughness: 0.06, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.02 },
};

export interface LoadResult {
  ok: boolean;
  template: HTMLCanvasElement | HTMLImageElement | null;
  mask: HTMLCanvasElement | null;
}

export class Scene3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private liveryMeshes: THREE.Mesh[] = [];
  private model: THREE.Object3D | null = null;
  private texture: THREE.CanvasTexture | null = null;
  private material: THREE.MeshPhysicalMaterial;
  private doc: LiveryDoc | null = null;
  private lastVersion = -1;
  private channel = 0;
  private raf = 0;
  private ring: THREE.Mesh;
  private camAnim: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private radius = 8.4;
  private disposed = false;
  accent = new THREE.Color('#d4a24c');

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#060608');
    this.scene.fog = new THREE.Fog('#060608', 14, 30);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200);
    this.camera.position.set(5.6, 2.6, 5.6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.7, 0);
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 16;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

    // Isik: ust spot + dolgu
    const spot = new THREE.SpotLight(0xffffff, 140, 30, Math.PI / 5.5, 0.55, 1.6);
    spot.position.set(0.5, 9, 1.5);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    this.scene.add(spot, spot.target);
    const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x120a08, 0.55);
    this.scene.add(hemi);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(-6, 3, -4);
    this.scene.add(rim);

    // Zemin + halka
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(12, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85, metalness: 0.1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(3.55, 3.6, 128),
      new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.85 }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.003;
    this.scene.add(this.ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(3.62, 3.9, 128),
      new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.08 }),
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.002;
    this.scene.add(ring2);
    this.ringGlow = ring2;

    this.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, ...FINISH.gloss });
    this.material.name = 'loe_livery';

    this.resize();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }
  private ringGlow: THREE.Mesh;

  setAccent(hex: string) {
    this.accent.set(hex);
    (this.ring.material as THREE.MeshBasicMaterial).color.set(hex);
    (this.ringGlow.material as THREE.MeshBasicMaterial).color.set(hex);
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private tick() {
    if (this.camAnim) {
      const a = this.camAnim;
      a.t = Math.min(1, a.t + 0.06);
      const k = 1 - Math.pow(1 - a.t, 3);
      this.camera.position.lerpVectors(a.from, a.to, k);
      if (a.t >= 1) this.camAnim = null;
    }
    this.controls.update();
    if (this.doc && this.texture && this.doc.version !== this.lastVersion) {
      this.lastVersion = this.doc.version;
      this.texture.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  setDoc(doc: LiveryDoc | null) {
    this.doc = doc;
    this.lastVersion = -1;
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    if (!doc) {
      this.material.map = null;
      this.material.needsUpdate = true;
      return;
    }
    const tex = new THREE.CanvasTexture(doc.preview);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    tex.channel = this.channel;
    this.texture = tex;
    this.material.map = tex;
    this.material.needsUpdate = true;
  }

  setFinish(f: Finish) {
    const p = FINISH[f] || FINISH.gloss;
    this.material.setValues({ roughness: 0.3, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.1, iridescence: 0, ...p });
    this.material.needsUpdate = true;
  }

  private clearModel() {
    if (!this.model) return;
    this.scene.remove(this.model);
    this.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mt of mats) if (mt && mt !== this.material) mt.dispose();
      }
    });
    this.model = null;
    this.liveryMeshes = [];
  }

  async load(v: VehicleDef): Promise<LoadResult> {
    this.clearModel();
    this.channel = v.uvChannel ?? (v.demo ? 0 : 1);
    if (this.texture) this.texture.channel = this.channel;
    let root: THREE.Object3D;
    let livery: THREE.Mesh[] = [];
    if (v.demo) {
      const d = buildDemoCar();
      root = d.group;
      livery = d.livery;
    } else if (v.glb) {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      // three r186: kod cozucu dosyalari derlemeye otomatik dahil edilir (assets/)
      loader.setDRACOLoader(draco);
      const gltf = await loader.loadAsync(assetUrl(v.glb));
      draco.dispose();
      root = gltf.scene;
      livery = this.pickLivery(root, v);
    } else {
      return { ok: false, template: null, mask: null };
    }

    // Yon + olcek normalizasyonu: on taraf +X, uzunluk ~4.4
    const holder = new THREE.Group();
    holder.add(root);
    if (typeof v.rotationY === 'number') root.rotation.y = THREE.MathUtils.degToRad(v.rotationY);
    else if (!v.demo) {
      const b0 = new THREE.Box3().setFromObject(root);
      const s0 = b0.getSize(new THREE.Vector3());
      if (s0.z > s0.x) root.rotation.y = -Math.PI / 2; // glTF (Sollumz): arac -Z'ye bakar
    }
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const k = 4.4 / Math.max(size.x, size.z, 0.001);
    root.scale.multiplyScalar(k);
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    const c = box2.getCenter(new THREE.Vector3());
    root.position.x -= c.x;
    root.position.z -= c.z;
    root.position.y -= box2.min.y;
    const height = box2.max.y - box2.min.y;
    this.controls.target.set(0, Math.max(0.5, height * 0.45), 0);
    this.radius = 8.4;

    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = false;
      }
    });
    for (const m of livery) m.material = this.material;
    this.liveryMeshes = livery;
    this.model = holder;
    this.scene.add(holder);
    this.setView('three', true);

    // UV sablonu: tanimliysa PNG, yoksa geometriden uret. Ada maskesi her zaman geometriden.
    const art = buildUvArtifacts(livery, v.size, this.channel);
    let template: HTMLCanvasElement | HTMLImageElement = art.template;
    if (v.uv) {
      try {
        template = await loadImg(assetUrl(v.uv));
      } catch {
        /* uretilen sablonla devam */
      }
    }
    return { ok: true, template, mask: art.mask };
  }

  private pickLivery(root: THREE.Object3D, v: VehicleDef): THREE.Mesh[] {
    const all: THREE.Mesh[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) all.push(m);
    });
    const matName = (m: THREE.Mesh) => {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      return mats.map((x) => x?.name || '').join(' ') + ' ' + m.name;
    };
    if (v.liveryMaterials?.length) {
      const inc = v.liveryMaterials.map((s) => s.toLowerCase());
      return all.filter((m) => inc.some((s) => matName(m).toLowerCase().includes(s)));
    }
    const exc = v.excludeMaterials?.length ? new RegExp(v.excludeMaterials.join('|'), 'i') : DEFAULT_EXCLUDE;
    const inc = all.filter((m) => DEFAULT_INCLUDE.test(matName(m)) && !exc.test(matName(m)));
    if (inc.length) return inc;
    return all.filter((m) => !exc.test(matName(m)) && (m.geometry.getAttribute(this.channel === 1 ? 'uv1' : 'uv') || m.geometry.getAttribute('uv')));
  }

  setView(name: ViewName, instant = false) {
    const r = this.radius;
    const t = this.controls.target;
    const pos: Record<ViewName, THREE.Vector3> = {
      three: new THREE.Vector3(r * 0.72, t.y + r * 0.34, r * 0.72),
      front: new THREE.Vector3(r, t.y + r * 0.18, 0.001),
      side: new THREE.Vector3(0.001, t.y + r * 0.16, r),
      rear: new THREE.Vector3(-r, t.y + r * 0.2, 0.001),
      top: new THREE.Vector3(0.001, r * 1.35, 0.002),
      other: new THREE.Vector3(0.001, t.y + r * 0.16, -r),
    };
    const to = pos[name];
    if (instant) {
      this.camera.position.copy(to);
      this.camAnim = null;
    } else {
      this.camAnim = { from: this.camera.position.clone(), to, t: 0 };
    }
  }

  /** Ekran noktasindan boyanabilir yuzeye isin at; dokudaki piksel noktasini dondur. */
  pick(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.liveryMeshes.length || !this.doc) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.liveryMeshes, false);
    const hit = hits[0];
    if (!hit) return null;
    const uv = (this.channel === 1 ? (hit as THREE.Intersection & { uv1?: THREE.Vector2 }).uv1 : undefined) || hit.uv;
    if (!uv) return null;
    const u = uv.x - Math.floor(uv.x);
    const v = uv.y - Math.floor(uv.y);
    return { x: u * this.doc.size, y: v * this.doc.size };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.clearModel();
    this.controls.dispose();
    this.texture?.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}
