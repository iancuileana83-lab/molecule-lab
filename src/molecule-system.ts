import {
  createSystem,
  CylinderGeometry,
  Entity,
  Grabbed,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OneHandGrabbable,
  UIKit,
  UIKitMLAsset,
  Vector3,
} from '@iwsdk/core';
import { Atom, Bond } from './atom-component.js';
import { MoleculeLevel, PARACETAMOL } from './levels/paracetamol.js';

/** Metres per angstrom when laying the template out in front of the player. */
const SCALE = 0.068;
/** World position of template (x = X_CENTER, y = 0). The build plane faces +Z. */
const ORIGIN = new Vector3(0, 1.08, -0.5);
const X_CENTER = 1.0;
/** Release this close to a placed atom counts as "trying to bond" with it. */
const NEAR_ATOM = 0.12;
/** Release this close to an open slot snaps there even if far from its partner. */
const SLOT_CAPTURE = 0.06;
const SNAP_TIME = 0.15;
const RETURN_TIME = 0.45;
const FLASH_TIME = 0.5;
const BOND_RADIUS = 0.007;
const DOUBLE_BOND_OFFSET = 0.012;

type UIElement = NonNullable<ReturnType<UIKitMLAsset['getElementById']>>;

const GOOD_GLOW = 0x3cff9a;
const BAD_GLOW = 0xff3030;

export class MoleculeSystem extends createSystem({
  atoms: { required: [Atom] },
  held: { required: [Atom, Grabbed] },
  bonds: { required: [Bond] },
}) {
  private level: MoleculeLevel = PARACETAMOL;
  private slotWorld: Vector3[] = [];
  private filled: boolean[] = [];
  private bondsDone = 0;
  private bondGeo!: CylinderGeometry;
  private bondMat!: MeshStandardMaterial;
  private tmp = new Vector3();
  private tmp2 = new Vector3();
  private up = new Vector3(0, 1, 0);
  private planeNormal = new Vector3(0, 0, 1);
  private ui?: {
    header: UIElement;
    progress: UIKit.Text;
    instructions: UIElement;
    factBox: UIElement;
    factText: UIKit.Text;
  };

  init(): void {
    this.slotWorld = this.level.slots.map(
      (s) =>
        new Vector3(
          ORIGIN.x + (s.x - X_CENTER) * SCALE,
          ORIGIN.y + s.y * SCALE,
          ORIGIN.z,
        ),
    );
    this.filled = this.level.slots.map(() => false);
    this.bondGeo = new CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 10);
    this.bondMat = new MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.4 });

    const setup = (e: Entity) => this.setupAtom(e);
    const release = (e: Entity) => this.onRelease(e);
    this.cleanupFuncs.push(
      this.queries.atoms.subscribe('qualify', setup),
      this.queries.held.subscribe('disqualify', release),
      () => this.bondGeo.dispose(),
      () => this.bondMat.dispose(),
    );
    for (const e of this.queries.atoms.entities) this.setupAtom(e);
    this.setupPanel();
  }

  private setupPanel(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('molecule-panel');
    if (!panel) {
      console.warn('[Molecule Lab] molecule-panel not found');
      return;
    }
    const header = panel.getElementById('header');
    const progress = panel.getElementById<UIKit.Text>('progress');
    const instructions = panel.getElementById('instructions');
    const factBox = panel.getElementById('fact-box');
    const factText = panel.getElementById<UIKit.Text>('fact-text');
    const restart = panel.getElementById('restart-button');
    if (!header || !progress || !instructions || !factBox || !factText) return;
    this.ui = { header, progress, instructions, factBox, factText };
    factText.setProperties({ text: this.level.fact });
    if (restart) {
      restart.name = 'restart-button';
      const onRestart = () => this.resetLevel();
      restart.addEventListener('click', onRestart);
      this.cleanupFuncs.push(() =>
        restart.removeEventListener('click', onRestart),
      );
    }
    this.updatePanel();
  }

  private updatePanel(): void {
    if (!this.ui) return;
    const total = this.level.bonds.length;
    const done = this.bondsDone === total;
    this.ui.progress.setProperties({
      text: done ? `${this.level.name} complete!` : `Bonds: ${this.bondsDone} / ${total}`,
    });
    this.ui.header.setProperties({
      backgroundColor: done ? '#9fe0b8' : '#dcebe8',
    });
    this.ui.instructions.setProperties({ display: done ? 'none' : 'flex' });
    this.ui.factBox.setProperties({ display: done ? 'flex' : 'none' });
  }

  /** Returns every non-seed atom home and clears the bonds. */
  private resetLevel(): void {
    for (const bond of Array.from(this.queries.bonds.entities)) bond.dispose();
    for (const e of this.queries.atoms.entities) {
      if ((e.getValue(Atom, 'slot') ?? -1) === 0) continue;
      e.setValue(Atom, 'slot', -1);
      if (!e.hasComponent(OneHandGrabbable)) e.addComponent(OneHandGrabbable);
      const home = e.getVectorView(Atom, 'home');
      this.tmp2.set(home[0], home[1], home[2]);
      this.startTween(e, this.tmp2, RETURN_TIME);
    }
    this.filled = this.level.slots.map((_, s) => s === 0);
    this.bondsDone = 0;
    this.updatePanel();
  }

  update(delta: number): void {
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

  private place(e: Entity, slot: number): void {
    e.setValue(Atom, 'slot', slot);
    this.filled[slot] = true;
    if (e.hasComponent(OneHandGrabbable)) e.removeComponent(OneHandGrabbable);
    this.startTween(e, this.slotWorld[slot], SNAP_TIME);
    this.flash(e, true);

    for (const [a, b, order] of this.level.bonds) {
      const other = a === slot ? b : b === slot ? a : -1;
      if (other >= 0 && this.filled[other]) {
        this.spawnBond(this.slotWorld[slot], this.slotWorld[other], order);
        this.bondsDone++;
      }
    }

    if (this.bondsDone === this.level.bonds.length) {
      for (const atom of this.queries.atoms.entities) this.flash(atom, true);
      console.info(`[Molecule Lab] ${this.level.name} complete!`);
    }
    this.updatePanel();
  }

  private reject(e: Entity): void {
    const home = e.getVectorView(Atom, 'home');
    this.tmp2.set(home[0], home[1], home[2]);
    this.startTween(e, this.tmp2, RETURN_TIME);
    this.flash(e, false);
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
