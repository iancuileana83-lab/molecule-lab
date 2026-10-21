import type { MoleculeLevel } from './types.js';

const R = 1.52; // saturated ring: C-C single bonds all round
const H = R * Math.sin(Math.PI / 3);
const dx = (deg: number, len: number) => len * Math.cos((deg * Math.PI) / 180);
const dy = (deg: number, len: number) => len * Math.sin((deg * Math.PI) / 180);
const CO = 1.43; // C-O single bond

// The isopropyl CH sits on the ring carbon at (-R, 0), pointing left.
const IPR = { x: -R - R, y: 0 };

/**
 * Menthol: 11 heavy atoms (10 C, 1 O), 11 bonds, all single. A cyclohexane ring
 * with an OH on one carbon, an isopropyl group on the next carbon and a methyl
 * group on the carbon across from the isopropyl (2-isopropyl-5-methylcyclohexanol).
 * Drawn flat, so the 3D arrangement is not shown.
 */
export const MENTHOL: MoleculeLevel = {
  id: 'menthol',
  name: 'Menthol',
  slots: [
    { element: 'C', x: R, y: 0 }, // 0 ring C bearing the methyl (seed)
    { element: 'C', x: R / 2, y: H }, // 1
    { element: 'C', x: -R / 2, y: H }, // 2 ring C bearing OH
    { element: 'C', x: -R, y: 0 }, // 3 ring C bearing isopropyl
    { element: 'C', x: -R / 2, y: -H }, // 4
    { element: 'C', x: R / 2, y: -H }, // 5
    { element: 'O', x: -R / 2 + dx(120, CO), y: H + dy(120, CO) }, // 6 OH
    { element: 'C', ...IPR }, // 7 isopropyl CH
    { element: 'C', x: IPR.x + dx(120, R), y: IPR.y + dy(120, R) }, // 8 methyl of isopropyl
    { element: 'C', x: IPR.x + dx(240, R), y: IPR.y + dy(240, R) }, // 9 methyl of isopropyl
    { element: 'C', x: R + R, y: 0 }, // 10 ring methyl
  ],
  bonds: [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 1],
    [4, 5, 1],
    [5, 0, 1],
    [2, 6, 1],
    [3, 7, 1],
    [7, 8, 1],
    [7, 9, 1],
    [0, 10, 1],
  ],
  starTimeSec: 120,
  fact: 'Menthol is the cool-smelling molecule found in peppermint and other mint plants. It switches on the nerve endings that sense cold, so mint feels cool even though nothing is colder.',
};
