import {
  CylinderGeometry,
  MeshBasicMaterial,
  TorusGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from '@iwsdk/core';
import type { AtomLabels } from './atom-labels.js';
import type { ElementSymbol, MoleculeLevel } from './levels/types.js';
import { ATOM_RADIUS } from './scene-assets/atoms.scene-asset.js';

/** Faint element tints: light enough to read against the lab walls. */
const GHOST_COLOR: Record<ElementSymbol, number> = {
  C: 0xc3c9cf,
  N: 0x8fb4ff,
  O: 0xff8f85,
};
const GHOST_OPACITY = 0.3;
/** Bright outline per spot: stays readable on any wall colour. */
const RING_COLOR: Record<ElementSymbol, number> = {
  C: 0xf4f4f4,
  N: 0xb8d0ff,
  O: 0xffc2ba,
};
const RING_OPACITY = 0.85;
const RING_TUBE = 0.0024;
const GHOST_LINE_OPACITY = 0.22;
const GHOST_LINE_RADIUS = 0.0022;
const GHOST_DOUBLE_OFFSET = 0.009;

/**
 * Semi-transparent preview of the target molecule: an empty spot per atom
 * and thin lines per bond. Owns plain meshes under one root group; the
 * molecule system decides what is visible.
 */
export class MoleculeGuide {
  readonly root = new Group();
  private spots: Mesh[] = [];
  private lines: Array<{ a: number; b: number; meshes: Mesh[]; length: number }> = [];
  /** 0..1: how much of the sketch has "drawn itself" so far. */
  private reveal = 1;
  private pulseSlot = -1;
  private pulseK = 0;
  private filledRef: boolean[] = [];
  private guideOn = true;
  private spotGeo: Record<ElementSymbol, SphereGeometry>;
  private spotMat: Record<ElementSymbol, MeshStandardMaterial>;
  private ringGeo = {} as Record<ElementSymbol, TorusGeometry>;
  private ringMat = {} as Record<ElementSymbol, MeshBasicMaterial>;
  private lineGeo = new CylinderGeometry(
    GHOST_LINE_RADIUS,
    GHOST_LINE_RADIUS,
    1,
    6,
  );
  private lineMat = new MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: GHOST_LINE_OPACITY,
    depthWrite: false,
  });

  constructor() {
    this.root.name = 'MoleculeGuide';
    const spot = (el: ElementSymbol) => new SphereGeometry(ATOM_RADIUS[el], 20, 14);
    const mat = (el: ElementSymbol) =>
      new MeshStandardMaterial({
        color: GHOST_COLOR[el],
        emissive: GHOST_COLOR[el],
        emissiveIntensity: 0.25,
        roughness: 0.6,
        transparent: true,
        opacity: GHOST_OPACITY,
        depthWrite: false,
      });
    this.spotGeo = { C: spot('C'), N: spot('N'), O: spot('O') };
    this.spotMat = { C: mat('C'), N: mat('N'), O: mat('O') };
    for (const el of ['C', 'N', 'O'] as const) {
      this.ringGeo[el] = new TorusGeometry(ATOM_RADIUS[el] + 0.001, RING_TUBE, 6, 28);
      this.ringMat[el] = new MeshBasicMaterial({
        color: RING_COLOR[el],
        transparent: true,
        opacity: RING_OPACITY,
        depthWrite: false,
      });
    }
  }

  /** Rebuilds spots and lines for a level. `slotWorld` are world positions. */
  build(level: MoleculeLevel, slotWorld: Vector3[], labels?: AtomLabels): void {
    this.root.clear();
    this.spots = level.slots.map((s, i) => {
      const m = new Mesh(this.spotGeo[s.element], this.spotMat[s.element]);
      m.name = `GuideSpot${i}`;
      m.position.copy(slotWorld[i]);
      m.add(new Mesh(this.ringGeo[s.element], this.ringMat[s.element]));
      if (labels) m.add(labels.create(s.element, true));
      this.root.add(m);
      return m;
    });

    const up = new Vector3(0, 1, 0);
    const normal = new Vector3(0, 0, 1);
    this.lines = level.bonds.map(([a, b, order]) => {
      const dir = new Vector3().subVectors(slotWorld[b], slotWorld[a]);
      const length = dir.length();
      dir.normalize();
      const side = new Vector3()
        .crossVectors(dir, normal)
        .normalize()
        .multiplyScalar(GHOST_DOUBLE_OFFSET);
      const meshes = (order === 2 ? [1, -1] : [0]).map((o) => {
        const m = new Mesh(this.lineGeo, this.lineMat);
        m.name = 'GuideLine';
        m.position
          .addVectors(slotWorld[a], slotWorld[b])
          .multiplyScalar(0.5)
          .addScaledVector(side, o);
        m.quaternion.setFromUnitVectors(up, dir);
        m.scale.set(1, length, 1);
        this.root.add(m);
        return m;
      });
      return { a, b, meshes, length };
    });
  }

  /** Shows empty spots and not-yet-formed bonds while the guide is on. */
  update(filled: boolean[], guideOn: boolean): void {
    this.filledRef = filled;
    this.guideOn = guideOn;
    this.refresh();
  }

  /** The sketch draws itself, spot by spot: 0 = nothing yet, 1 = complete. */
  setReveal(k: number): void {
    this.reveal = k;
    this.refresh();
  }

  /** Gently pulses one spot (-1 for none); `k` is 0..1. */
  setPulse(slot: number, k: number): void {
    this.pulseSlot = slot;
    this.pulseK = k;
    this.refresh();
  }

  private revealOf(i: number): number {
    const n = this.spots.length;
    const v = Math.min(Math.max((this.reveal * (n + 3) - i) / 3, 0), 1);
    return v * v * (3 - 2 * v);
  }

  private refresh(): void {
    this.spots.forEach((m, i) => {
      const r = this.revealOf(i);
      m.visible = this.guideOn && !this.filledRef[i] && r > 0.001;
      m.scale.setScalar(r * (i === this.pulseSlot ? 1 + 0.16 * this.pulseK : 1));
    });
    for (const line of this.lines) {
      const t = Math.min(this.revealOf(line.a), this.revealOf(line.b));
      const show =
        this.guideOn &&
        !(this.filledRef[line.a] && this.filledRef[line.b]) &&
        t > 0.001;
      for (const m of line.meshes) {
        m.visible = show;
        m.scale.set(t, line.length, t);
      }
    }
  }

  dispose(): void {
    this.root.clear();
    for (const el of ['C', 'N', 'O'] as const) {
      this.spotGeo[el].dispose();
      this.spotMat[el].dispose();
      this.ringGeo[el].dispose();
      this.ringMat[el].dispose();
    }
    this.lineGeo.dispose();
    this.lineMat.dispose();
  }
}
