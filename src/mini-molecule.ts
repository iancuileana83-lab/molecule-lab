import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from '@iwsdk/core';
import type { ElementSymbol, MoleculeLevel } from './levels/types.js';
import {
  carbonAtom,
  nitrogenAtom,
  oxygenAtom,
} from './scene-assets/atoms.scene-asset.js';

const PROTOTYPES: Record<ElementSymbol, Object3D> = {
  C: carbonAtom,
  N: nitrogenAtom,
  O: oxygenAtom,
};

/** Unit-height, unit-radius stick; scaled per bond. One per owner, disposed by it. */
export function createBondParts(): { geo: CylinderGeometry; mat: MeshStandardMaterial } {
  return {
    geo: new CylinderGeometry(1, 1, 1, 8),
    mat: new MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.4 }),
  };
}

const UP = new Vector3(0, 1, 0);
const FRONT = new Vector3(0, 0, 1);

/**
 * A small copy of a finished molecule (heavy atoms and bonds), in the XY plane
 * with its bottom resting at y = `base` and centred on x = 0. Atom meshes share
 * the prototypes' geometry and materials, so only the bond parts need disposing.
 *
 * @param perAngstrom metres per angstrom
 * @param atomScale   scale of the atom spheres relative to a full-size atom
 * @param bondRadius  stick radius in metres
 */
export function buildMiniMolecule(
  level: MoleculeLevel,
  perAngstrom: number,
  atomScale: number,
  bondRadius: number,
  bonds: { geo: CylinderGeometry; mat: MeshStandardMaterial },
  base = 0,
): Group {
  const g = new Group();
  const xs = level.slots.map((s) => s.x);
  const ys = level.slots.map((s) => s.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const minY = Math.min(...ys);
  const pos = level.slots.map(
    (s) => new Vector3((s.x - cx) * perAngstrom, (s.y - minY) * perAngstrom + base, 0),
  );
  level.slots.forEach((s, i) => {
    const atom = PROTOTYPES[s.element].clone();
    atom.scale.setScalar(atomScale);
    atom.position.copy(pos[i]);
    g.add(atom);
  });
  const dir = new Vector3();
  const side = new Vector3();
  for (const [ia, ib, order] of level.bonds) {
    dir.subVectors(pos[ib], pos[ia]);
    const length = dir.length();
    dir.normalize();
    side.crossVectors(dir, FRONT).normalize().multiplyScalar(bondRadius * 1.8);
    for (const o of order === 2 ? [1, -1] : [0]) {
      const stick = new Mesh(bonds.geo, bonds.mat);
      stick.position.addVectors(pos[ia], pos[ib]).multiplyScalar(0.5).addScaledVector(side, o);
      stick.quaternion.setFromUnitVectors(UP, dir);
      stick.scale.set(bondRadius, length, bondRadius);
      g.add(stick);
    }
  }
  return g;
}
