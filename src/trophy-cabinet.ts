import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TorusGeometry,
} from '@iwsdk/core';
import { LEVELS } from './levels/all-levels.js';
import { buildMiniMolecule, createBondParts } from './mini-molecule.js';
import { GeoBatch } from './scene-assets/lib/geo-batch.js';
import { makeWoodTexture } from './scene-assets/lib/proc-textures.js';

/**
 * Medicine cabinet: a tall walnut chest just left of the bench with a glass
 * display case on top. Each finished molecule leaves a miniature copy of
 * itself on its own spot of the shelf. Pure decoration: nothing here can be
 * grabbed or touched.
 *
 * Placement (checked by calculation so it never hides the guide spots, the
 * molecule, the tray, the panel or the info card): x -1.24 .. -0.66, z -0.98 ..
 * -0.80, floor to 1.66 m. Everything the player works with is at z >= -0.57.
 */
const CABINET_X = -0.95;
const FRONT_Z = -0.8;
const DEPTH = 0.18;
const WIDTH = 0.58;
const CHEST_TOP = 1.31;
const CASE_TOP = 1.65;
const SLOT_DX = 0.19;
/**
 * Metres per angstrom for a trophy (the build plane uses 0.068). With 0.023 the
 * widest molecule (paracetamol, 7.5 angstrom) is 17 cm, so all three fit side by
 * side in the 54 cm case with the 19 cm slot spacing.
 */
const TROPHY_SCALE = 0.023;
const ATOM_K = 0.35;
const BOND_RADIUS = 0.0022;
const POP_TIME = 0.6;

export class TrophyCabinet {
  readonly root = new Group();
  private readonly trophies: Group[] = [];
  private readonly ghosts: Mesh[] = [];
  private readonly owned = new Set<string>();
  private readonly pop: number[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly bonds = createBondParts();

  constructor() {
    this.root.name = 'TrophyCabinet';
    this.buildFurniture();
    LEVELS.forEach((level, i) => {
      const x = CABINET_X + (i - (LEVELS.length - 1) / 2) * SLOT_DX;
      const ghost = new Mesh(this.ghostGeo, this.ghostMat);
      ghost.name = `TrophyGhost${i}`;
      ghost.rotation.x = -Math.PI / 2;
      ghost.position.set(x, CHEST_TOP + 0.014, FRONT_Z - DEPTH / 2);
      this.root.add(ghost);
      this.ghosts.push(ghost);
      const trophy = buildMiniMolecule(level, TROPHY_SCALE, ATOM_K, BOND_RADIUS, this.bonds, 0.012);
      trophy.name = `Trophy-${level.id}`;
      trophy.position.set(x, CHEST_TOP + 0.03, FRONT_Z - DEPTH / 2);
      trophy.visible = false;
      this.root.add(trophy);
      this.trophies.push(trophy);
      this.pop.push(POP_TIME);
    });
    this.disposables.push(this.bonds.geo, this.bonds.mat);
  }

  private readonly ghostGeo = new TorusGeometry(0.06, 0.0018, 6, 36);
  private readonly ghostMat = new MeshBasicMaterial({
    color: 0xd8b068,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  /** Shows trophies for these level ids at once, with no animation. */
  setOwned(ids: string[]): void {
    for (const id of ids) this.show(id, false);
  }

  /** A new trophy appears, with a little pop unless `animate` is false. */
  add(id: string, animate: boolean): void {
    this.show(id, animate);
  }

  has(id: string): boolean {
    return this.owned.has(id);
  }

  ownedIds(): string[] {
    return Array.from(this.owned);
  }

  private show(id: string, animate: boolean): void {
    const i = LEVELS.findIndex((l) => l.id === id);
    if (i < 0 || this.owned.has(id)) return;
    this.owned.add(id);
    this.ghosts[i].visible = false;
    const t = this.trophies[i];
    t.visible = true;
    t.scale.setScalar(animate ? 0.001 : 1);
    this.pop[i] = animate ? 0 : POP_TIME;
  }

  update(delta: number): void {
    for (let i = 0; i < this.pop.length; i++) {
      if (this.pop[i] >= POP_TIME) continue;
      this.pop[i] = Math.min(this.pop[i] + delta, POP_TIME);
      const k = this.pop[i] / POP_TIME;
      // Ease out with a small overshoot.
      const s = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
      this.trophies[i].scale.setScalar(Math.max(s, 0.001));
    }
  }

  dispose(): void {
    this.root.traverse((o) => {
      const m = o as Mesh;
      // Atom geometry and materials belong to the shared prototypes.
      if (m.isMesh && m.userData.cabinetOwned) m.geometry.dispose();
    });
    for (const d of this.disposables) d.dispose();
    this.ghostGeo.dispose();
    this.ghostMat.dispose();
  }

  private buildFurniture(): void {
    const wood = makeWoodTexture();
    this.disposables.push(wood);
    const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => {
      const m = new MeshStandardMaterial(p);
      this.disposables.push(m);
      return m;
    };
    const M: Record<string, Material> = {
      walnut: std({ map: wood, color: 0x7f5130, roughness: 0.65 }),
      oak: std({ map: wood, color: 0xa06b3f, roughness: 0.6 }),
      brass: std({ color: 0xb5893a, metalness: 0.7, roughness: 0.38, emissive: 0x2b1f0a }),
      // Pale linen behind the trophies: dark, red and blue atoms all read on it.
      linen: std({ color: 0xe6d8b4, roughness: 1 }),
      glass: std({
        color: 0xcfe8e0,
        transparent: true,
        opacity: 0.16,
        roughness: 0.08,
        depthWrite: false,
        side: 2,
      }),
    };
    const b = new GeoBatch();
    const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
    const cyl = (r: number, h: number) => new CylinderGeometry(r, r, h, 8);
    const zc = FRONT_Z - DEPTH / 2;

    // Chest with a grid of drawers.
    b.add('walnut', box(WIDTH, CHEST_TOP - 0.03, DEPTH), [CABINET_X, (CHEST_TOP - 0.03) / 2, zc], [0, 0, 0], [1, 1, 1], [1, 3]);
    const cols = 3;
    const rows = 5;
    const cw = (WIDTH - 0.04) / cols;
    const ch = (CHEST_TOP - 0.2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = CABINET_X - (WIDTH - 0.04) / 2 + cw * (c + 0.5);
        const y = 0.1 + ch * (r + 0.5);
        b.add('oak', box(cw - 0.012, ch - 0.014, 0.012), [x, y, FRONT_Z + 0.004], [0, 0, 0], [1, 1, 1], [0.35, 0.35]);
        b.add('brass', cyl(0.009, 0.016), [x, y, FRONT_Z + 0.016], [Math.PI / 2, 0, 0]);
      }
    }
    // Top board and display case.
    b.add('oak', box(WIDTH + 0.04, 0.03, DEPTH + 0.04), [CABINET_X, CHEST_TOP - 0.015, zc]);
    b.add('oak', box(WIDTH + 0.04, 0.03, DEPTH + 0.04), [CABINET_X, CASE_TOP + 0.015, zc]);
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        b.add('walnut', box(0.02, CASE_TOP - CHEST_TOP, 0.02), [CABINET_X + dx * (WIDTH / 2 - 0.01), (CHEST_TOP + CASE_TOP) / 2, zc + dz * (DEPTH / 2 - 0.01)]);
      }
    }
    b.add('linen', box(WIDTH - 0.04, CASE_TOP - CHEST_TOP, 0.008), [CABINET_X, (CHEST_TOP + CASE_TOP) / 2, FRONT_Z - DEPTH + 0.014]);
    // Thin brass rail along the front of the shelf, plus a small knob on top.
    b.add('brass', box(WIDTH, 0.008, 0.008), [CABINET_X, CHEST_TOP + 0.004, FRONT_Z + 0.02]);
    b.add('brass', new CylinderGeometry(0.012, 0.016, 0.03, 8), [CABINET_X, CASE_TOP + 0.045, zc]);
    // Glass: front and both sides.
    b.add('glass', box(WIDTH - 0.02, CASE_TOP - CHEST_TOP, 0.004), [CABINET_X, (CHEST_TOP + CASE_TOP) / 2, FRONT_Z - 0.004]);
    for (const dx of [-1, 1]) {
      b.add('glass', box(0.004, CASE_TOP - CHEST_TOP, DEPTH - 0.02), [CABINET_X + dx * (WIDTH / 2 - 0.004), (CHEST_TOP + CASE_TOP) / 2, zc]);
    }
    const furniture = b.build(M, 'CabinetFurniture');
    furniture.children.forEach((m) => {
      (m as Mesh).userData.cabinetOwned = true;
    });
    this.root.add(furniture);
  }
}
