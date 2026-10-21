import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from '@iwsdk/core';
import { LEVELS } from './levels/all-levels.js';
import { buildMiniMolecule, createBondParts } from './mini-molecule.js';

/**
 * A short, purely decorative scene played when a molecule is finished: a small
 * copy of the molecule hovers over an everyday object and is "taken in" by it
 * (caffeine into a coffee cup, aspirin onto a willow leaf, paracetamol into a
 * tablet, ibuprofen into a glass of water, vitamin C onto an orange slice,
 * vanillin onto a vanilla flower). No text in the scene itself (a caption for
 * the newer ones is shown on the panel) and nothing to touch. It sits on the bench in front of the
 * finished molecule, where the atom tray was, and stays below the molecule's
 * lowest atom so it never hides the molecule, the guide spots, the panel or the
 * info card (checked by calculation).
 */
const ANCHOR_X = 0;
const ANCHOR_Y = 0.72;
const ANCHOR_Z = -0.42;
/** Lowest point of the hovering copy, relative to the bench top. */
const HOVER_BOTTOM = 0.085;
const PER_ANGSTROM = 0.0175;
const ATOM_SCALE = 0.3;
const BOND_RADIUS = 0.0015;
/** The everyday object is drawn a little larger than life so it reads from the seat. */
const OBJECT_SCALE = 1.3;

const T_STAGE_IN = 0.5;
const T_MOLECULE_IN = 0.3;
const T_MOLECULE_FULL = 0.9;
const T_ABSORB_START = 2.9;
const T_ABSORB_END = 3.7;
const T_STAGE_OUT = 3.8;
export const STORY_TOTAL = 4.4;

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => k * k * (3 - 2 * k);
const easeOutBack = (k: number) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
const clamp01 = (k: number) => Math.min(Math.max(k, 0), 1);

interface Scene {
  stage: Group;
  mini: Group;
  /** Where the copy ends up, relative to the stage. */
  targetY: number;
  /** Per-frame behaviour of the object itself. */
  animate: (t: number) => void;
}

export class StoryMoment {
  readonly root = new Group();
  private readonly anchor = new Group();
  private readonly scenes = new Map<string, Scene>();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private current?: Scene;
  private t = 0;

  constructor() {
    this.root.name = 'StoryMoment';
    // The entity owns the root's own transform (it stays at the origin), so the
    // anchor on the bench is an inner group.
    this.anchor.position.set(ANCHOR_X, ANCHOR_Y, ANCHOR_Z);
    this.root.add(this.anchor);
    this.root.visible = false;
    const bonds = createBondParts();
    this.disposables.push(bonds.geo, bonds.mat);
    const make = <T extends BufferGeometry>(g: T) => {
      this.disposables.push(g);
      return g;
    };
    const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => {
      const m = new MeshStandardMaterial(p);
      this.disposables.push(m);
      return m;
    };

    const objects: Record<string, () => { obj: Group; targetY: number; animate: (t: number) => void }> = {
      caffeine: () => this.coffeeCup(make, std),
      aspirin: () => this.willowLeaf(make, std),
      paracetamol: () => this.tablet(make, std),
      ibuprofen: () => this.waterGlass(make, std),
      'vitamin-c': () => this.orangeSlice(make, std),
      vanillin: () => this.vanillaFlower(make, std),
    };
    for (const level of LEVELS) {
      const build = objects[level.id];
      if (!build) continue;
      const { obj, targetY, animate } = build();
      const mini = buildMiniMolecule(level, PER_ANGSTROM, ATOM_SCALE, BOND_RADIUS, bonds, 0);
      mini.name = 'StoryMolecule';
      const stage = new Group();
      stage.name = `Story-${level.id}`;
      obj.scale.setScalar(OBJECT_SCALE);
      stage.add(obj, mini);
      stage.visible = false;
      this.anchor.add(stage);
      this.scenes.set(level.id, { stage, mini, targetY, animate });
    }
  }

  get active(): boolean {
    return this.current !== undefined;
  }

  /** Starts the scene for a level after `delay` seconds; replaces any running one. */
  play(levelId: string, delay = 0): void {
    this.stop();
    const scene = this.scenes.get(levelId);
    if (!scene) return;
    this.current = scene;
    this.t = -delay;
    this.root.visible = true;
  }

  stop(): void {
    if (this.current) this.current.stage.visible = false;
    this.current = undefined;
    this.root.visible = false;
  }

  update(delta: number): void {
    const s = this.current;
    if (!s) return;
    this.t += delta;
    const t = this.t;
    if (t < 0) return;
    if (t >= STORY_TOTAL) {
      this.stop();
      return;
    }
    s.stage.visible = true;

    // The whole scene grows in, and shrinks away at the end.
    const grow = t < T_STAGE_IN ? Math.max(easeOutCubic(t / T_STAGE_IN), 0.001) : 1;
    const fade = 1 - easeInOut(clamp01((t - T_STAGE_OUT) / (STORY_TOTAL - T_STAGE_OUT)));
    s.stage.scale.setScalar(Math.max(grow * fade, 0.001));

    // The molecule copy: appears, sways gently (never edge-on), then is taken in.
    const mini = s.mini;
    const appear = clamp01((t - T_MOLECULE_IN) / (T_MOLECULE_FULL - T_MOLECULE_IN));
    const absorb = easeInOut(clamp01((t - T_ABSORB_START) / (T_ABSORB_END - T_ABSORB_START)));
    const size = Math.max(easeOutCubic(appear) * (1 - absorb), 0.001);
    mini.visible = appear > 0 && absorb < 1;
    mini.scale.setScalar(size);
    mini.rotation.y = 0.7 * Math.sin(t * 1.6);
    mini.position.y = HOVER_BOTTOM + (s.targetY - HOVER_BOTTOM) * absorb;
    s.animate(t);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.scenes.clear();
  }

  // --- the three objects ----------------------------------------------------

  private coffeeCup(
    make: <T extends BufferGeometry>(g: T) => T,
    std: (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => MeshStandardMaterial,
  ) {
    const ceramic = std({ color: 0x2f8a92, roughness: 0.25, side: DoubleSide });
    const coffee = std({ color: 0x3b2314, roughness: 0.3 });
    const obj = new Group();
    const cupGeo = make(
      new LatheGeometry(
        [[0, 0], [0.026, 0], [0.032, 0.005], [0.04, 0.045], [0.042, 0.056], [0.038, 0.056], [0.031, 0.01], [0, 0.008]].map(
          ([x, y]) => new Vector2(x, y),
        ),
        16,
      ),
    );
    const cup = new Mesh(cupGeo, ceramic);
    cup.position.y = 0.006;
    const saucer = new Mesh(make(new CylinderGeometry(0.062, 0.05, 0.006, 20)), ceramic);
    saucer.position.y = 0.003;
    const handle = new Mesh(make(new TorusGeometry(0.016, 0.004, 6, 14)), ceramic);
    handle.position.set(0.047, 0.036, 0);
    const surface = new Mesh(make(new CylinderGeometry(0.036, 0.036, 0.002, 16)), coffee);
    surface.position.y = 0.05;
    obj.add(saucer, cup, handle, surface);

    const puffMat: MeshBasicMaterial[] = [];
    const puffs: Mesh[] = [];
    const puffGeo = make(new SphereGeometry(0.009, 8, 6));
    for (let i = 0; i < 3; i++) {
      const m = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      this.disposables.push(m);
      puffMat.push(m);
      const p = new Mesh(puffGeo, m);
      obj.add(p);
      puffs.push(p);
    }
    const animate = (t: number) => {
      const lift = Math.min(1, Math.max(t, 0) * 1.5);
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.7 + i / 3) % 1;
        puffs[i].position.set(0.006 * Math.sin(p * 9 + i * 2), 0.062 + 0.06 * p, 0.005 * Math.cos(p * 7 + i));
        puffs[i].scale.setScalar(0.6 + 1.4 * p);
        puffMat[i].opacity = 0.4 * (1 - p) * lift;
      }
    };
    return { obj, targetY: 0.05 * OBJECT_SCALE, animate };
  }

  private willowLeaf(
    make: <T extends BufferGeometry>(g: T) => T,
    std: (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => MeshStandardMaterial,
  ) {
    const green = std({ color: 0x6f9a3a, roughness: 0.7, side: DoubleSide });
    const vein = std({ color: 0xa6c46a, roughness: 0.7 });
    const outline = new Shape();
    outline.moveTo(-0.11, 0);
    outline.quadraticCurveTo(-0.02, 0.05, 0.11, 0);
    outline.quadraticCurveTo(-0.02, -0.05, -0.11, 0);
    const obj = new Group();
    const leaf = new Mesh(make(new ShapeGeometry(outline, 8)), green);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.y = 0.002;
    const rib = new Mesh(make(new BoxGeometry(0.2, 0.0015, 0.003)), vein);
    rib.position.set(-0.004, 0.0035, 0);
    const holder = new Group();
    holder.rotation.y = 0.35;
    holder.add(leaf, rib);
    obj.add(holder);
    const animate = (t: number) => {
      // A slow sway while it hovers, a small dip when the molecule lands.
      const land = clamp01((t - T_ABSORB_END + 0.4) / 0.4);
      holder.rotation.z = 0.05 * Math.sin(t * 2.2);
      holder.position.y = -0.004 * Math.sin(Math.PI * land);
    };
    return { obj, targetY: 0.012 * OBJECT_SCALE, animate };
  }

  private tablet(
    make: <T extends BufferGeometry>(g: T) => T,
    std: (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => MeshStandardMaterial,
  ) {
    const white = std({ color: 0xf0a090, roughness: 0.55 });
    const groove = std({ color: 0xb8685a, roughness: 0.8 });
    const obj = new Group();
    const body = new Mesh(make(new CylinderGeometry(0.034, 0.034, 0.012, 24)), white);
    body.position.y = 0.006;
    const line = new Mesh(make(new BoxGeometry(0.066, 0.0012, 0.0035)), groove);
    line.position.y = 0.0125;
    obj.add(body, line);
    const animate = (t: number) => {
      // A soft pulse as the molecule is taken in.
      const k = clamp01((t - 3.2) / 0.5);
      obj.scale.setScalar(OBJECT_SCALE * (1 + 0.12 * Math.sin(Math.PI * easeOutCubic(k))));
    };
    return { obj, targetY: 0.012 * OBJECT_SCALE, animate };
  }

  private waterGlass(
    make: <T extends BufferGeometry>(g: T) => T,
    std: (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => MeshStandardMaterial,
  ) {
    const glassMat = std({ color: 0xcfe8f0, roughness: 0.1, transparent: true, opacity: 0.4, side: DoubleSide });
    const waterMat = std({ color: 0x5aaed0, roughness: 0.2, transparent: true, opacity: 0.75 });
    const obj = new Group();
    const glass = new Mesh(
      make(
        new LatheGeometry(
          [[0, 0], [0.024, 0], [0.026, 0.003], [0.033, 0.088], [0.034, 0.09]].map(([x, y]) => new Vector2(x, y)),
          18,
        ),
      ),
      glassMat,
    );
    const water = new Mesh(make(new CylinderGeometry(0.029, 0.024, 0.055, 18)), waterMat);
    water.position.y = 0.0355;
    obj.add(water, glass);
    const surfaceY = 0.063;

    const ringMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    this.disposables.push(ringMat);
    const ring = new Mesh(make(new TorusGeometry(1, 0.06, 6, 24)), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = surfaceY + 0.0015;
    ring.scale.setScalar(0.001);
    obj.add(ring);
    const animate = (t: number) => {
      // A soft ripple ring spreads when the molecule is taken in.
      const k = clamp01((t - (T_ABSORB_END - 0.3)) / 0.7);
      ring.scale.setScalar(Math.max(0.026 * easeOutCubic(k), 0.001));
      ringMat.opacity = k > 0 && k < 1 ? 0.7 * (1 - k) : 0;
    };
    return { obj, targetY: surfaceY * OBJECT_SCALE, animate };
  }

  private orangeSlice(
    make: <T extends BufferGeometry>(g: T) => T,
    std: (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => MeshStandardMaterial,
  ) {
    const peel = std({ color: 0xe8821a, roughness: 0.6 });
    const flesh = std({ color: 0xf6a53a, roughness: 0.45, side: DoubleSide });
    const pith = std({ color: 0xfbe3b0, roughness: 0.7 });
    const radius = 0.05;
    const obj = new Group();
    // The slice stands on its edge and faces the player; the copy hovers in front of it.
    const holder = new Group();
    holder.position.set(0, radius + 0.002, -0.03);
    const spinner = new Group();
    holder.add(spinner);
    const rim = new Mesh(make(new TorusGeometry(radius, 0.004, 8, 28)), peel);
    const disc = new Mesh(make(new CylinderGeometry(radius - 0.002, radius - 0.002, 0.006, 28)), flesh);
    disc.rotation.x = Math.PI / 2;
    const hub = new Mesh(make(new CylinderGeometry(0.005, 0.005, 0.008, 10)), pith);
    hub.rotation.x = Math.PI / 2;
    spinner.add(disc, rim, hub);
    const wallGeo = make(new BoxGeometry(radius - 0.004, 0.0015, 0.0075));
    for (let i = 0; i < 8; i++) {
      const wall = new Mesh(wallGeo, pith);
      const a = (i / 8) * Math.PI;
      // Each wall passes through the centre, so eight of them make sixteen spokes.
      wall.scale.x = 2;
      wall.rotation.z = a;
      spinner.add(wall);
    }
    obj.add(holder);
    const animate = (t: number) => {
      // One slow turn while the copy hovers, a small pulse when it lands.
      const turn = easeInOut(clamp01((t - T_MOLECULE_FULL) / (T_ABSORB_START - T_MOLECULE_FULL)));
      spinner.rotation.y = turn * Math.PI * 2;
      const k = clamp01((t - T_ABSORB_END + 0.3) / 0.5);
      holder.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * k));
    };
    return { obj, targetY: (2 * radius + 0.002) * OBJECT_SCALE, animate };
  }

  private vanillaFlower(
    make: <T extends BufferGeometry>(g: T) => T,
    std: (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => MeshStandardMaterial,
  ) {
    const petalMat = std({ color: 0xf4ecc8, roughness: 0.55, side: DoubleSide });
    const heart = std({ color: 0xd9c25a, roughness: 0.5 });
    const podMat = std({ color: 0x3a2314, roughness: 0.5 });
    const obj = new Group();

    const petalGeo = make(new SphereGeometry(0.026, 10, 8));
    const pivots: Group[] = [];
    for (let i = 0; i < 5; i++) {
      const pivot = new Group();
      pivot.rotation.y = (i / 5) * Math.PI * 2;
      const petal = new Mesh(petalGeo, petalMat);
      petal.position.x = 0.026;
      petal.scale.set(1, 0.16, 0.55);
      pivot.add(petal);
      pivot.position.y = 0.008;
      obj.add(pivot);
      pivots.push(pivot);
    }
    const core = new Mesh(make(new SphereGeometry(0.009, 10, 8)), heart);
    core.position.y = 0.011;
    obj.add(core);

    // A curled pod lying beside the flower.
    const pod = new Mesh(make(new TorusGeometry(0.028, 0.0045, 6, 24, Math.PI * 1.25)), podMat);
    pod.rotation.x = -Math.PI / 2;
    pod.rotation.z = 0.5;
    pod.position.set(0.088, 0.005, 0.01);
    obj.add(pod);

    const animate = (t: number) => {
      // The petals lie almost flat, lift a little while the copy sways, and open
      // a touch more when it lands.
      const lift = clamp01((t - T_MOLECULE_IN) / 1.2);
      const land = clamp01((t - T_ABSORB_END + 0.4) / 0.6);
      const tilt = 0.12 + 0.18 * easeInOut(lift) + 0.2 * Math.sin(Math.PI * land);
      for (const p of pivots) p.rotation.z = tilt;
    };
    return { obj, targetY: 0.02 * OBJECT_SCALE, animate };
  }
}
