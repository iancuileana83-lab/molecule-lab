import {
  createSystem,
  CylinderGeometry,
  Entity,
  Grabbed,
  GrabSystem,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OneHandGrabbable,
  TorusGeometry,
  UIKit,
  UIKitMLAsset,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { Atom, Bond } from './atom-component.js';
import { LEVELS } from './levels/all-levels.js';
import type { ElementSymbol, MoleculeLevel } from './levels/types.js';
import { loadProgress, MoleculeSave, saveProgress } from './molecule-save.js';
import {
  carbonAtom,
  nitrogenAtom,
  oxygenAtom,
} from './scene-assets/atoms.scene-asset.js';

/** Metres per angstrom when laying a template out in front of the player. */
const SCALE = 0.068;
/** The build plane faces the player (+Z) at this depth, centred on x = 0. */
const MOLECULE_Z = -0.5;
/** Lowest atom centre of the molecule; keeps it clear of the atom tray. */
const MOLECULE_BOTTOM_Y = 0.97;
/** Two rows of free atoms above the bench, front row first. */
const TRAY_ROWS = [
  { y: 0.8, z: -0.36 },
  { y: 0.85, z: -0.46 },
];
const TRAY_SPACING = 0.12;
/** Release this close to a placed atom counts as "trying to bond" with it. */
const NEAR_ATOM = 0.12;
/** Release this close to an open slot snaps there even if far from its partner. */
const SLOT_CAPTURE = 0.06;
const SNAP_TIME = 0.15;
const RETURN_TIME = 0.45;
const FLASH_TIME = 0.5;
const BOND_RADIUS = 0.007;
const DOUBLE_BOND_OFFSET = 0.012;
const HINT_TIME = 4;
const RELEASE_GRACE = 0.5;

const TEXT_START =
  'Pinch an atom and bring it next to the floating carbon. Correct bonds snap into place.';
const TEXT_BUILDING =
  'Keep building: bring an atom next to any atom of the molecule. Correct bonds snap into place.';

const PROTOTYPES: Record<ElementSymbol, Object3D> = {
  C: carbonAtom,
  N: nitrogenAtom,
  O: oxygenAtom,
};

type UIElement = NonNullable<ReturnType<UIKitMLAsset['getElementById']>>;

/** Start-here cue on the seed: a ring plus a slow glow, until the first bond. */
const SEED_CUE_COLOR = 0x39d6c0;
/** White keeps the seed reading as grey carbon while it glows. */
const SEED_GLOW_COLOR = 0xffffff;
const SEED_CUE_FADE = 0.6;
/** Radians per second for the breathing pulse (one cycle every ~2 s). */
const SEED_CUE_PULSE = Math.PI;

const GOOD_GLOW = 0x3cff9a;
const BAD_GLOW = 0xff3030;

export class MoleculeSystem extends createSystem({
  atoms: { required: [Atom] },
  held: { required: [Atom, Grabbed] },
  bonds: { required: [Bond] },
}) {
  private levelIndex = 0;
  private slotWorld: Vector3[] = [];
  private filled: boolean[] = [];
  private bondsDone = 0;
  private bondGeo!: CylinderGeometry;
  private bondMat!: MeshStandardMaterial;
  private tmp = new Vector3();
  private tmp2 = new Vector3();
  private up = new Vector3(0, 1, 0);
  private planeNormal = new Vector3(0, 0, 1);
  /** True while the headset shows a system overlay or the app is hidden. */
  private paused = false;
  /** Releases are judged one frame later so an exit/pause can be told apart. */
  private pendingReleases: Entity[] = [];
  /** Seconds after a pause/exit/resume during which releases are set aside. */
  private releaseGrace = 0;
  private hintTime = 0;
  private seed?: Entity;
  private seedRing!: Mesh;
  private seedRingMat!: MeshBasicMaterial;
  /** 1 = start-here cue fully shown, 0 = hidden. Fades between the two. */
  private seedCue = 0;
  private seedCueClock = 0;
  private ui?: {
    header: UIElement;
    levelName: UIKit.Text;
    progress: UIKit.Text;
    hint: UIKit.Text;
    instructions: UIKit.Text;
    factBox: UIElement;
    factText: UIKit.Text;
    allDone: UIElement;
    next: UIElement | null;
    playAgain: UIElement | null;
  };

  private get level(): MoleculeLevel {
    return LEVELS[this.levelIndex];
  }

  init(): void {
    this.bondGeo = new CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 10);
    this.bondMat = new MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.4 });
    // Torus lies in the XY plane, so it already faces the player (+Z).
    this.seedRingMat = new MeshBasicMaterial({
      color: SEED_CUE_COLOR,
      transparent: true,
      depthWrite: false,
    });
    this.seedRing = new Mesh(
      new TorusGeometry(0.056, 0.0035, 8, 48),
      this.seedRingMat,
    );
    this.seedRing.name = 'SeedRing';
    this.world.createTransformEntity(this.seedRing);
    this.cleanupFuncs.push(
      () => this.seedRing.geometry.dispose(),
      () => this.seedRingMat.dispose(),
    );

    const setup = (e: Entity) => this.setupAtom(e);
    const release = (e: Entity) => this.pendingReleases.push(e);
    this.cleanupFuncs.push(
      this.queries.atoms.subscribe('qualify', setup),
      this.queries.held.subscribe('disqualify', release),
      this.world.visibilityState.subscribe((state) =>
        this.onVisibilityChange(state),
      ),
      () => this.bondGeo.dispose(),
      () => this.bondMat.dispose(),
    );
    this.setupPanel();

    const save = loadProgress();
    const saved = save ? LEVELS.findIndex((l) => l.id === save.levelId) : -1;
    this.startLevel(Math.max(saved, 0), saved >= 0 ? save?.placements : undefined);
  }

  /** Clears the current molecule and lays out a level's atoms. */
  private startLevel(index: number, placements?: Record<string, number>): void {
    for (const bond of Array.from(this.queries.bonds.entities)) bond.dispose();
    for (const atom of Array.from(this.queries.atoms.entities)) {
      const mat = atom.object3D ? this.atomMaterial(atom.object3D) : undefined;
      mat?.dispose(); // per-atom clone made in setupAtom
      atom.dispose();
    }
    this.pendingReleases.length = 0;
    this.hideHint();

    this.levelIndex = index;
    this.layoutSlots();
    this.filled = this.level.slots.map(() => false);
    this.bondsDone = 0;

    // Seed first, then the free atoms in a fixed, element-mixed tray order.
    this.seed = this.spawnAtom('C', 0, 0, this.slotWorld[0]);
    this.setWorldPosition(this.seedRing, this.slotWorld[0]);
    const n = this.level.slots.length;
    const free = this.level.slots
      .map((_, i) => i)
      .filter((i) => i > 0)
      .sort((a, b) => ((a * 5) % n) - ((b * 5) % n));
    const perRow = Math.ceil(free.length / TRAY_ROWS.length);
    free.forEach((slot, k) => {
      const row = TRAY_ROWS[Math.floor(k / perRow)];
      const col = k % perRow;
      const count = Math.min(perRow, free.length - Math.floor(k / perRow) * perRow);
      this.tmp.set((col - (count - 1) / 2) * TRAY_SPACING, row.y, row.z);
      this.spawnAtom(this.level.slots[slot].element, k + 1, -1, this.tmp);
    });

    if (placements) this.restorePlacements(placements);
    // Fresh level: cue fully on. Restored mid-level: no cue at all.
    this.seedCue = this.bondsDone === 0 ? 1 : 0;
    this.seedCueClock = 0;
    this.applySeedCue();
    this.persistProgress();
    this.updatePanel();
  }

  /** Centres the template horizontally and rests it at MOLECULE_BOTTOM_Y. */
  private layoutSlots(): void {
    const xs = this.level.slots.map((s) => s.x);
    const ys = this.level.slots.map((s) => s.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const minY = Math.min(...ys);
    this.slotWorld = this.level.slots.map(
      (s) =>
        new Vector3(
          (s.x - cx) * SCALE,
          MOLECULE_BOTTOM_Y + (s.y - minY) * SCALE,
          MOLECULE_Z,
        ),
    );
  }

  private spawnAtom(
    element: ElementSymbol,
    index: number,
    slot: number,
    position: Vector3,
  ): Entity {
    const obj = PROTOTYPES[element].clone();
    // Stable per level and spawn order, so saved placements can find it.
    obj.name = `Atom ${element}${index}`;
    obj.position.copy(position);
    const e = this.world.createTransformEntity(obj);
    e.addComponent(Atom, { element, slot });
    if (slot < 0) e.addComponent(OneHandGrabbable);
    this.setupAtom(e);
    return e;
  }

  /** Fades the start-here cue toward on (no bonds yet) or off, and pulses it. */
  private updateSeedCue(delta: number): void {
    const target = this.bondsDone === 0 ? 1 : 0;
    if (this.seedCue === 0 && target === 0) return;
    const step = delta / SEED_CUE_FADE;
    this.seedCue =
      target > this.seedCue
        ? Math.min(target, this.seedCue + step)
        : Math.max(target, this.seedCue - step);
    this.seedCueClock += delta;
    this.applySeedCue();
  }

  private applySeedCue(): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.seedCueClock * SEED_CUE_PULSE);
    this.seedRing.visible = this.seedCue > 0;
    this.seedRingMat.opacity = this.seedCue * (0.55 + 0.35 * pulse);
    const seed = this.seed;
    // A running success/error flash owns the seed's emissive meanwhile.
    if (!seed?.object3D || (seed.getValue(Atom, 'flashTime') ?? 0) > 0) return;
    const mat = this.atomMaterial(seed.object3D);
    if (!mat) return;
    mat.emissive.setHex(SEED_GLOW_COLOR);
    mat.emissiveIntensity = this.seedCue * (0.03 + 0.09 * pulse);
  }

  private onVisibilityChange(state: VisibilityState): void {
    this.paused =
      state === VisibilityState.VisibleBlurred ||
      state === VisibilityState.Hidden;
    // Hands vanish and reappear around a pause; never judge those releases.
    this.releaseGrace = RELEASE_GRACE;
    if (state === VisibilityState.Visible) return;
    // Leaving active play: let go of anything in hand. The release is then
    // handled as "set aside", never judged as a bond attempt.
    const grab = this.world.getSystem(GrabSystem);
    for (const e of Array.from(this.queries.held.entities)) {
      grab?.forceRelease(e);
    }
  }

  private restorePlacements(placements: Record<string, number>): void {
    const bySlot: Array<[Entity, number]> = [];
    for (const e of this.queries.atoms.entities) {
      const slot = placements[e.object3D?.name ?? ''];
      if (slot === undefined || (e.getValue(Atom, 'slot') ?? -1) >= 0) continue;
      const target = this.level.slots[slot];
      if (!target || this.filled[slot]) continue;
      if (target.element !== e.getValue(Atom, 'element')) continue;
      bySlot.push([e, slot]);
      this.filled[slot] = true; // reserve so duplicates in a bad save are skipped
    }
    // Release the reservations first so each bond is spawned exactly once.
    for (const [, slot] of bySlot) this.filled[slot] = false;
    for (const [e, slot] of bySlot) this.place(e, slot, true);
  }

  private persistProgress(): void {
    const save: MoleculeSave = { levelId: this.level.id, placements: {} };
    for (const e of this.queries.atoms.entities) {
      const slot = e.getValue(Atom, 'slot') ?? -1;
      const name = e.object3D?.name;
      // Slot 0 is the seed; it is always placed and never needs saving.
      if (slot > 0 && name) save.placements[name] = slot;
    }
    saveProgress(save);
  }

  private setupPanel(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('molecule-panel');
    if (!panel) {
      console.warn('[Molecule Lab] molecule-panel not found');
      return;
    }
    const header = panel.getElementById('header');
    const levelName = panel.getElementById<UIKit.Text>('level-name');
    const progress = panel.getElementById<UIKit.Text>('progress');
    const hint = panel.getElementById<UIKit.Text>('hint');
    const instructions = panel.getElementById<UIKit.Text>('instructions');
    const factBox = panel.getElementById('fact-box');
    const factText = panel.getElementById<UIKit.Text>('fact-text');
    const allDone = panel.getElementById('all-done');
    if (
      !header ||
      !levelName ||
      !progress ||
      !hint ||
      !instructions ||
      !factBox ||
      !factText ||
      !allDone
    )
      return;
    const next = panel.getElementById('next-button');
    const playAgain = panel.getElementById('play-again-button');
    this.ui = {
      playAgain,
      header,
      levelName,
      progress,
      hint,
      instructions,
      factBox,
      factText,
      allDone,
      next,
    };
    this.bindButton(panel.getElementById('restart-button'), 'restart-button', () =>
      this.startLevel(this.levelIndex),
    );
    this.bindButton(next, 'next-button', () => {
      if (this.levelIndex < LEVELS.length - 1) this.startLevel(this.levelIndex + 1);
    });
    this.bindButton(playAgain, 'play-again-button', () => this.startLevel(0));
  }

  private bindButton(
    button: UIElement | null,
    name: string,
    onClick: () => void,
  ): void {
    if (!button) return;
    button.name = name;
    button.addEventListener('click', onClick);
    this.cleanupFuncs.push(() => button.removeEventListener('click', onClick));
  }

  private updatePanel(): void {
    if (!this.ui) return;
    const total = this.level.bonds.length;
    const done = this.bondsDone === total;
    const hasNext = this.levelIndex < LEVELS.length - 1;
    this.ui.levelName.setProperties({
      text: `Level ${this.levelIndex + 1}: ${this.level.name}`,
    });
    this.ui.factText.setProperties({ text: this.level.fact });
    this.ui.progress.setProperties({
      text: done
        ? `${this.level.name} complete!`
        : `Bonds: ${this.bondsDone} / ${total}`,
    });
    this.ui.header.setProperties({
      backgroundColor: done ? '#9fe0b8' : '#dcebe8',
    });
    this.ui.instructions.setProperties({
      display: done ? 'none' : 'flex',
      text: this.bondsDone === 0 ? TEXT_START : TEXT_BUILDING,
    });
    this.ui.factBox.setProperties({ display: done ? 'flex' : 'none' });
    this.ui.allDone.setProperties({ display: done && !hasNext ? 'flex' : 'none' });
    this.ui.next?.setProperties({ display: done && hasNext ? 'flex' : 'none' });
    this.ui.playAgain?.setProperties({
      display: done && !hasNext ? 'flex' : 'none',
    });
  }

  private showHint(text: string): void {
    if (!this.ui) return;
    this.ui.hint.setProperties({ text, display: 'flex' });
    this.hintTime = HINT_TIME;
  }

  private hideHint(): void {
    this.hintTime = 0;
    this.ui?.hint.setProperties({ display: 'none' });
  }

  update(delta: number): void {
    if (this.pendingReleases.length > 0) {
      const active =
        !this.paused &&
        this.releaseGrace <= 0 &&
        this.world.visibilityState.peek() === VisibilityState.Visible;
      for (const e of this.pendingReleases) {
        if (!e.active || e.hasComponent(Grabbed)) continue;
        if (active) this.onRelease(e);
        else this.setAside(e);
      }
      this.pendingReleases.length = 0;
    }

    // Frozen while paused: tweens, flashes and the hint resume on return.
    if (this.paused) return;
    if (this.releaseGrace > 0) this.releaseGrace -= delta;

    this.updateSeedCue(delta);

    if (this.hintTime > 0) {
      this.hintTime -= delta;
      if (this.hintTime <= 0) this.hideHint();
    }

    for (const e of this.queries.atoms.entities) {
      const obj = e.object3D;
      if (!obj) continue;

      const tweenTime = e.getValue(Atom, 'tweenTime') ?? -1;
      if (tweenTime >= 0) {
        if (e.hasComponent(Grabbed)) {
          e.setValue(Atom, 'tweenTime', -1);
        } else {
          const t = tweenTime + delta;
          const dur = e.getValue(Atom, 'tweenDuration') ?? SNAP_TIME;
          const k = Math.min(t / dur, 1);
          const ease = 1 - (1 - k) * (1 - k) * (1 - k);
          const from = e.getVectorView(Atom, 'tweenFrom');
          const to = e.getVectorView(Atom, 'tweenTo');
          this.tmp.set(
            from[0] + (to[0] - from[0]) * ease,
            from[1] + (to[1] - from[1]) * ease,
            from[2] + (to[2] - from[2]) * ease,
          );
          this.setWorldPosition(obj, this.tmp);
          e.setValue(Atom, 'tweenTime', k >= 1 ? -1 : t);
        }
      }

      const flash = e.getValue(Atom, 'flashTime') ?? 0;
      if (flash > 0) {
        const left = Math.max(flash - delta, 0);
        e.setValue(Atom, 'flashTime', left);
        const mat = this.atomMaterial(obj);
        if (mat) mat.emissiveIntensity = (left / FLASH_TIME) * 0.9;
      }
    }
  }

  private setupAtom(e: Entity): void {
    const obj = e.object3D;
    if (!obj || obj.userData.atomReady) return;
    obj.userData.atomReady = true;

    // Per-atom material so a flash does not light up every atom of that element.
    const mesh = this.findMesh(obj);
    if (mesh) mesh.material = (mesh.material as MeshStandardMaterial).clone();

    obj.getWorldPosition(this.tmp);
    const home = e.getVectorView(Atom, 'home');
    home[0] = this.tmp.x;
    home[1] = this.tmp.y;
    home[2] = this.tmp.z;

    const slot = e.getValue(Atom, 'slot') ?? -1;
    if (slot >= 0) {
      this.filled[slot] = true;
      this.setWorldPosition(obj, this.slotWorld[slot]);
      if (e.hasComponent(OneHandGrabbable)) e.removeComponent(OneHandGrabbable);
    }
  }

  private onRelease(e: Entity): void {
    const obj = e.object3D;
    if (!obj || (e.getValue(Atom, 'slot') ?? -1) >= 0) return;
    const element = e.getValue(Atom, 'element');
    const pos = obj.getWorldPosition(this.tmp);

    // Closest placed atom the player dropped this one next to.
    let nearSlot = -1;
    let nearDist = NEAR_ATOM;
    this.filled.forEach((isFilled, s) => {
      const d = isFilled ? pos.distanceTo(this.slotWorld[s]) : Infinity;
      if (d < nearDist) {
        nearDist = d;
        nearSlot = s;
      }
    });

    // Open slots of this element that bond to an already placed atom.
    let best = -1;
    let bestDist = Infinity;
    for (const [a, b] of this.level.bonds) {
      for (const [placed, open] of [
        [a, b],
        [b, a],
      ]) {
        if (!this.filled[placed] || this.filled[open]) continue;
        if (this.level.slots[open].element !== element) continue;
        const d = pos.distanceTo(this.slotWorld[open]);
        if ((placed === nearSlot || d < SLOT_CAPTURE) && d < bestDist) {
          bestDist = d;
          best = open;
        }
      }
    }

    if (best >= 0) this.place(e, best);
    else if (nearSlot >= 0) this.reject(e);
  }

  /** `restoring` places instantly and quietly, without saving again. */
  private place(e: Entity, slot: number, restoring = false): void {
    e.setValue(Atom, 'slot', slot);
    this.filled[slot] = true;
    if (e.hasComponent(OneHandGrabbable)) e.removeComponent(OneHandGrabbable);
    if (restoring && e.object3D) {
      this.setWorldPosition(e.object3D, this.slotWorld[slot]);
    } else {
      this.startTween(e, this.slotWorld[slot], SNAP_TIME);
      this.flash(e, true);
      this.hideHint();
    }

    for (const [a, b, order] of this.level.bonds) {
      const other = a === slot ? b : b === slot ? a : -1;
      if (other >= 0 && this.filled[other]) {
        this.spawnBond(this.slotWorld[slot], this.slotWorld[other], order);
        this.bondsDone++;
      }
    }

    if (!restoring && this.bondsDone === this.level.bonds.length) {
      for (const atom of this.queries.atoms.entities) this.flash(atom, true);
      console.info(`[Molecule Lab] ${this.level.name} complete!`);
    }
    if (!restoring) this.persistProgress();
    this.updatePanel();
  }

  private reject(e: Entity): void {
    this.returnHome(e);
    this.flash(e, false);
    this.showHint(
      `That bond is not in ${this.level.name.toLowerCase()}. Try another spot.`,
    );
  }

  /** Quietly sends a free atom home, e.g. when play is paused mid-grab. */
  private setAside(e: Entity): void {
    if ((e.getValue(Atom, 'slot') ?? -1) >= 0) return;
    this.returnHome(e);
  }

  private returnHome(e: Entity): void {
    const home = e.getVectorView(Atom, 'home');
    this.tmp2.set(home[0], home[1], home[2]);
    this.startTween(e, this.tmp2, RETURN_TIME);
  }

  private spawnBond(a: Vector3, b: Vector3, order: 1 | 2): void {
    const dir = new Vector3().subVectors(b, a);
    const length = dir.length();
    dir.normalize();
    const side = new Vector3()
      .crossVectors(dir, this.planeNormal)
      .normalize()
      .multiplyScalar(DOUBLE_BOND_OFFSET);
    const offsets = order === 2 ? [1, -1] : [0];
    for (const o of offsets) {
      const stick = new Mesh(this.bondGeo, this.bondMat);
      stick.name = 'BondStick';
      stick.position
        .addVectors(a, b)
        .multiplyScalar(0.5)
        .addScaledVector(side, o);
      stick.quaternion.setFromUnitVectors(this.up, dir);
      stick.scale.set(1, length, 1);
      this.world.createTransformEntity(stick).addComponent(Bond);
    }
  }

  private startTween(e: Entity, to: Vector3, duration: number): void {
    const obj = e.object3D;
    if (!obj) return;
    obj.getWorldPosition(this.tmp);
    const from = e.getVectorView(Atom, 'tweenFrom');
    from[0] = this.tmp.x;
    from[1] = this.tmp.y;
    from[2] = this.tmp.z;
    const target = e.getVectorView(Atom, 'tweenTo');
    target[0] = to.x;
    target[1] = to.y;
    target[2] = to.z;
    e.setValue(Atom, 'tweenDuration', duration);
    e.setValue(Atom, 'tweenTime', 0);
  }

  private flash(e: Entity, good: boolean): void {
    const mat = e.object3D ? this.atomMaterial(e.object3D) : undefined;
    if (!mat) return;
    mat.emissive.setHex(good ? GOOD_GLOW : BAD_GLOW);
    mat.emissiveIntensity = 0.9;
    e.setValue(Atom, 'flashGood', good);
    e.setValue(Atom, 'flashTime', FLASH_TIME);
  }

  private setWorldPosition(obj: Object3D, world: Vector3): void {
    this.tmp2.copy(world);
    if (obj.parent) obj.parent.worldToLocal(this.tmp2);
    obj.position.copy(this.tmp2);
  }

  private findMesh(obj: Object3D): Mesh | undefined {
    if ((obj as Mesh).isMesh) return obj as Mesh;
    let found: Mesh | undefined;
    obj.traverse((child) => {
      if (!found && (child as Mesh).isMesh) found = child as Mesh;
    });
    return found;
  }

  private atomMaterial(obj: Object3D): MeshStandardMaterial | undefined {
    return this.findMesh(obj)?.material as MeshStandardMaterial | undefined;
  }
}
