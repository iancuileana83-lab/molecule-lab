import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
} from '@iwsdk/core';
import { GeoBatch } from './lib/geo-batch.js';
import {
  makeMarbleTexture,
  makeRugTexture,
  makeWallpaperTexture,
  makeWoodTexture,
} from './lib/proc-textures.js';

/**
 * Old apothecary for a seated player at the origin facing -Z.
 * Origin: floor level, room centre. Room: 5 m x 5 m x 2.8 m.
 * Bench: marble top surface at y = 0.72, spans x ±0.6, z -0.33 .. -0.97.
 *
 * Layout rules: the wall behind the molecule (front wall, |x| < ~1.3 m) stays
 * a calm mid-tone so dark atoms and pale guide spots both read against it;
 * all furniture and decor sits at the sides or high up, and every prop the
 * player could mistake for a toy (balance, mortar) is on a far counter, about
 * 3 m from the seat and well outside arm's reach.
 */
export const BENCH_TOP_Y = 0.72;

/** Jar-label atlas: one paper cell per text, painted at runtime (needs canvas). */
export const LABEL_CELLS = { cols: 3, rows: 2 };
export const LABEL_TEXTS = ['AQUA', 'SALVIA', 'CHAMOMILLA', 'MENTHA', 'THYMUS', 'Rx'];

const ROOM = 5;
const HALF = ROOM / 2;
const HEIGHT = 2.8;

const woodTex = makeWoodTexture();
const marbleTex = makeMarbleTexture();
const wallTex = makeWallpaperTexture();
const rugTex = makeRugTexture();

const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) =>
  new MeshStandardMaterial(p);
const liquid = (color: number) => std({ color, roughness: 0.35 });

const M: Record<string, MeshStandardMaterial | MeshBasicMaterial> = {
  floor: std({ map: woodTex, color: 0x93623a, roughness: 0.6 }),
  plaster: std({ map: wallTex, color: 0xaed0bb, roughness: 0.95 }),
  ceiling: std({ color: 0xe9dcc0, roughness: 1 }),
  walnut: std({ map: woodTex, color: 0x7f5130, roughness: 0.65 }),
  oak: std({ map: woodTex, color: 0xa06b3f, roughness: 0.6 }),
  dado: std({ map: woodTex, color: 0xc48d5a, roughness: 0.6 }),
  marble: std({ map: marbleTex, color: 0xffffff, roughness: 0.28 }),
  brass: std({
    color: 0xb5893a,
    metalness: 0.7,
    roughness: 0.38,
    emissive: 0x2b1f0a,
  }),
  glass: std({
    color: 0xcfe8e0,
    transparent: true,
    opacity: 0.32,
    roughness: 0.08,
    depthWrite: false,
    side: 2, // DoubleSide
  }),
  liqAmber: liquid(0xd9962b),
  liqGreen: liquid(0x6fa58a),
  liqRed: liquid(0xb5473a),
  liqBlue: liquid(0x4f7fa8),
  herbs: std({ color: 0x7a8a3a, roughness: 0.9 }),
  chamomile: std({ color: 0xe0c34a, roughness: 0.9 }),
  glow: new MeshBasicMaterial({ color: 0xffd9a0 }),
  rug: std({ map: rugTex, color: 0xffffff, roughness: 1 }),
  stone: std({ color: 0x9c9488, roughness: 0.9 }),
  // The painted atlas (Latin names, Rx) is assigned at runtime by decor-paint.
  labels: std({ color: 0xf3e6c8, roughness: 0.9 }),
};

// Painted at runtime too: the Hygeia bowl on a small wooden sign.
const signMaterial = std({ color: 0x4a2f1c, roughness: 0.7 });

const b = new GeoBatch();
const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 10) =>
  new CylinderGeometry(rt, rb, h, seg);
const PI = Math.PI;

function buildShell(): void {
  // Floor: planks (about 14 cm wide), grain along x.
  b.add('floor', new PlaneGeometry(ROOM, ROOM), [0, 0, 0], [-PI / 2, 0, 0], [1, 1, 1], [2.5, 9]);
  b.add('ceiling', new PlaneGeometry(ROOM, ROOM), [0, HEIGHT, 0], [PI / 2, 0, 0]);
  const wall = new PlaneGeometry(ROOM, HEIGHT);
  b.add('plaster', wall, [0, HEIGHT / 2, -HALF], [0, 0, 0], [1, 1, 1], [5, 2.8]);
  b.add('plaster', wall, [0, HEIGHT / 2, HALF], [0, PI, 0], [1, 1, 1], [5, 2.8]);
  b.add('plaster', wall, [-HALF, HEIGHT / 2, 0], [0, PI / 2, 0], [1, 1, 1], [5, 2.8]);
  b.add('plaster', wall, [HALF, HEIGHT / 2, 0], [0, -PI / 2, 0], [1, 1, 1], [5, 2.8]);

  // Front wall: only a low oak skirting behind the molecule (keeps contrast).
  b.add('dado', box(ROOM, 0.3, 0.03), [0, 0.15, -HALF + 0.015], [0, 0, 0], [1, 1, 1], [5, 0.7]);
  b.add('brass', box(ROOM, 0.02, 0.045), [0, 0.3, -HALF + 0.022]);
  // Side and back walls: full walnut wainscot with a brass rail.
  const wains = box(ROOM, 0.9, 0.03);
  b.add('walnut', wains, [0, 0.45, HALF - 0.015], [0, 0, 0], [1, 1, 1], [5, 2]);
  b.add('walnut', wains, [-HALF + 0.015, 0.45, 0], [0, PI / 2, 0], [1, 1, 1], [5, 2]);
  b.add('walnut', wains, [HALF - 0.015, 0.45, 0], [0, PI / 2, 0], [1, 1, 1], [5, 2]);
  const rail = box(ROOM, 0.02, 0.045);
  b.add('brass', rail, [0, 0.9, HALF - 0.022]);
  b.add('brass', rail, [-HALF + 0.022, 0.9, 0], [0, PI / 2, 0]);
  b.add('brass', rail, [HALF - 0.022, 0.9, 0], [0, PI / 2, 0]);

  // Ceiling beams.
  for (const z of [-2, -1, 0, 1, 2]) {
    b.add('walnut', box(ROOM, 0.13, 0.15), [0, HEIGHT - 0.065, z], [0, 0, 0], [1, 1, 1], [5, 1]);
  }
  // Rug under the seat.
  b.add('rug', new PlaneGeometry(2.4, 1.7), [0, 0.004, -0.2], [-PI / 2, 0, 0]);
}

/** Marble-topped bench: same footprint and top height as the play surface. */
function buildBench(): void {
  const zc = -0.65;
  b.add('marble', box(1.24, 0.04, 0.64), [0, 0.7, zc]);
  b.add('brass', box(1.24, 0.012, 0.012), [0, 0.717, zc + 0.32]);
  b.add('brass', box(0.012, 0.012, 0.64), [-0.62, 0.717, zc]);
  b.add('brass', box(0.012, 0.012, 0.64), [0.62, 0.717, zc]);
  b.add('walnut', box(1.16, 0.66, 0.02), [0, 0.35, zc + 0.29]); // front
  b.add('walnut', box(0.03, 0.68, 0.58), [-0.585, 0.34, zc]);
  b.add('walnut', box(0.03, 0.68, 0.58), [0.585, 0.34, zc]);
  b.add('walnut', box(1.16, 0.68, 0.02), [0, 0.34, zc - 0.29]); // back
  b.add('walnut', box(1.14, 0.03, 0.56), [0, 0.06, zc]); // base
  for (const x of [-0.29, 0.29]) {
    for (const y of [0.53, 0.3]) {
      b.add('oak', box(0.5, 0.19, 0.015), [x, y, zc + 0.3], [0, 0, 0], [1, 1, 1], [0.4, 0.4]);
      b.add('brass', cyl(0.012, 0.012, 0.02, 8), [x, y, zc + 0.318], [PI / 2, 0, 0]);
    }
  }
}

/** Left: a wall of small drawers with brass pulls and label plates. */
function buildDrawers(cx: number): void {
  const zBack = -HALF;
  const depth = 0.35;
  const zFront = zBack + depth;
  b.add('walnut', box(0.9, 2.3, depth), [cx, 1.15, zBack + depth / 2], [0, 0, 0], [1, 1, 1], [2, 4]);
  b.add('oak', box(0.96, 0.06, depth + 0.05), [cx, 2.33, zBack + depth / 2 + 0.01]);
  const cols = 6;
  const rows = 10;
  const x0 = cx - 0.43;
  const y0 = 0.12;
  const cw = 0.86 / cols;
  const ch = 2.1 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + cw * (c + 0.5);
      const y = y0 + ch * (r + 0.5);
      b.add('oak', box(cw - 0.012, ch - 0.014, 0.012), [x, y, zFront + 0.002], [0, 0, 0], [1, 1, 1], [0.35, 0.35]);
      b.add('brass', cyl(0.011, 0.011, 0.018, 8), [x, y - 0.02, zFront + 0.015], [PI / 2, 0, 0]);
      b.add('brass', box(0.05, 0.022, 0.004), [x, y + 0.045, zFront + 0.009]);
    }
  }
}

const JAR_PROFILE = [
  [0, 0],
  [0.052, 0],
  [0.062, 0.008],
  [0.066, 0.03],
  [0.066, 0.15],
  [0.058, 0.18],
  [0.036, 0.198],
  [0.034, 0.22],
].map(([x, y]) => new Vector2(x, y));
const JAR_GEO = new LatheGeometry(JAR_PROFILE, 14);

function labelQuad(index: number, w: number, h: number): BufferGeometry {
  const g = new PlaneGeometry(w, h);
  const { cols, rows } = LABEL_CELLS;
  const c = index % cols;
  const r = Math.floor(index / cols);
  const u0 = c / cols;
  const u1 = (c + 1) / cols;
  const v1 = 1 - r / rows;
  const v0 = 1 - (r + 1) / rows;
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  return g;
}

function jar(x: number, y: number, z: number, s: number, fill: string, level: number, label?: number): void {
  b.add('glass', JAR_GEO, [x, y, z], [0, 0, 0], [s, s, s]);
  b.add(fill, cyl(0.058, 0.058, level, 12), [x, y + (0.012 + level / 2) * s, z], [0, 0, 0], [s, s, s]);
  b.add('brass', cyl(0.034, 0.034, 0.026, 10), [x, y + 0.233 * s, z], [0, 0, 0], [s, s, s]);
  b.add('brass', new SphereGeometry(0.012, 8, 6), [x, y + 0.256 * s, z]);
  if (label !== undefined) {
    b.add('labels', labelQuad(label, 0.075, 0.055), [x, y + 0.095 * s, z + 0.0665 * s], [0, 0, 0], [s, s, s]);
  }
}

/** Right: counter, marble top, shelves of apothecary jars, mortar and balance. */
function buildShelves(cx: number): void {
  const zBack = -HALF;
  const zc = zBack + 0.175;
  b.add('walnut', box(0.9, 0.9, 0.35), [cx, 0.45, zc], [0, 0, 0], [1, 1, 1], [2, 2]);
  for (const dx of [-0.22, 0.22]) {
    b.add('oak', box(0.4, 0.78, 0.012), [cx + dx, 0.45, zc + 0.176], [0, 0, 0], [1, 1, 1], [0.4, 0.6]);
    b.add('brass', cyl(0.011, 0.011, 0.02, 8), [cx + dx * 0.32, 0.5, zc + 0.19], [PI / 2, 0, 0]);
  }
  b.add('marble', box(0.96, 0.04, 0.42), [cx, 0.92, zc + 0.01]);
  b.add('walnut', box(0.9, 1.4, 0.02), [cx, 1.65, zBack + 0.01]);
  b.add('walnut', box(0.04, 1.4, 0.3), [cx - 0.43, 1.65, zc - 0.03]);
  b.add('walnut', box(0.04, 1.4, 0.3), [cx + 0.43, 1.65, zc - 0.03]);
  const shelfY = [1.35, 1.75, 2.15];
  for (const y of shelfY) b.add('oak', box(0.9, 0.03, 0.3), [cx, y, zc - 0.03], [0, 0, 0], [1, 1, 1], [2, 1]);
  b.add('oak', box(0.96, 0.05, 0.34), [cx, 2.42, zc - 0.03]);

  const fills = ['liqAmber', 'liqGreen', 'herbs', 'liqRed', 'chamomile', 'liqBlue', 'liqGreen', 'liqAmber', 'herbs'];
  const levels = [0.15, 0.11, 0.16, 0.12, 0.14, 0.1, 0.13, 0.16, 0.12];
  const scales = [1, 0.9, 1.1, 0.95, 1.05, 1, 0.9, 1.1, 1];
  // Latin names on five jars, "Rx" on one, the rest plain.
  const labels: Array<number | undefined> = [0, undefined, 1, undefined, 2, 5, undefined, 3, 4];
  let k = 0;
  for (const y of shelfY) {
    for (const dx of [-0.24, 0, 0.24]) {
      jar(cx + dx, y + 0.015, zc - 0.03, scales[k], fills[k], levels[k], labels[k]);
      k++;
    }
  }

  // Mortar, pestle and a brass balance: far corner counter, out of reach.
  const top = 0.94;
  const mortar = new LatheGeometry(
    [[0, 0], [0.03, 0], [0.045, 0.02], [0.05, 0.06], [0.048, 0.075], [0.038, 0.07], [0.03, 0.02], [0, 0.015]].map(
      ([x, y]) => new Vector2(x, y),
    ),
    14,
  );
  b.add('stone', mortar, [cx - 0.3, top, zc + 0.04]);
  b.add('stone', cyl(0.008, 0.012, 0.11, 8), [cx - 0.285, top + 0.085, zc + 0.04], [0, 0, 0.55]);
  const bx = cx + 0.24;
  b.add('brass', box(0.14, 0.02, 0.08), [bx, top + 0.01, zc + 0.05]);
  b.add('brass', cyl(0.008, 0.008, 0.28, 8), [bx, top + 0.16, zc + 0.05]);
  b.add('brass', box(0.32, 0.012, 0.012), [bx, top + 0.3, zc + 0.05]);
  for (const dx of [-0.15, 0.15]) {
    b.add('brass', cyl(0.05, 0.05, 0.006, 14), [bx + dx, top + 0.15, zc + 0.05]);
    for (const a of [-0.025, 0.025]) {
      b.add('brass', cyl(0.0012, 0.0012, 0.15, 4), [bx + dx + a, top + 0.225, zc + 0.05]);
    }
  }
}

function buildLantern(x: number, z: number): void {
  b.add('brass', cyl(0.003, 0.003, 0.4, 4), [x, HEIGHT - 0.2, z]);
  b.add('brass', cyl(0.02, 0.09, 0.07, 10), [x, 2.37, z]);
  b.add('glow', cyl(0.078, 0.078, 0.2, 12), [x, 2.24, z]);
  b.add('brass', cyl(0.085, 0.07, 0.035, 12), [x, 2.11, z]);
  for (const [dx, dz] of [[0.075, 0], [-0.075, 0], [0, 0.075], [0, -0.075]]) {
    b.add('brass', box(0.008, 0.2, 0.008), [x + dx, 2.24, z + dz]);
  }
}

/** Small wooden sign on the front wall; the Hygeia bowl is painted at runtime. */
function buildSign(): Mesh {
  const y = 2.3;
  const z = -HALF;
  b.add('walnut', box(0.5, 0.42, 0.04), [0, y, z + 0.02]);
  for (const dy of [-0.2, 0.2]) b.add('brass', box(0.5, 0.02, 0.045), [0, y + dy, z + 0.022]);
  for (const dx of [-0.24, 0.24]) b.add('brass', box(0.02, 0.4, 0.045), [dx, y, z + 0.022]);
  const sign = new Mesh(new PlaneGeometry(0.44, 0.36), signMaterial);
  sign.name = 'HygeiaSign';
  sign.position.set(0, y, z + 0.0425);
  return sign;
}

function createLabRoom(): Object3D {
  buildShell();
  buildBench();
  buildDrawers(-1.75);
  buildShelves(1.75);
  buildLantern(-0.9, -1.4);
  buildLantern(0.9, -1.4);
  const sign = buildSign();
  const root = b.build(M, 'LabRoom') as Group;
  root.add(sign);
  return root;
}

export default createLabRoom();
