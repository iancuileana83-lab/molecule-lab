import type { MoleculeLevel } from './types.js';

const R = 1.39; // aromatic C–C
const H = R * Math.sin(Math.PI / 3);
const dx = (deg: number, len: number) => len * Math.cos((deg * Math.PI) / 180);
const dy = (deg: number, len: number) => len * Math.sin((deg * Math.PI) / 180);

const OME_O = { x: -R / 2 + dx(120, 1.36), y: H + dy(120, 1.36) };

/**
 * Vanillin: 11 heavy atoms (8 C, 3 O), 11 bonds. A ring with the aldehyde on the
 * right, the hydroxyl opposite it on the left and the methoxy group next to the
 * hydroxyl (4-hydroxy-3-methoxybenzaldehyde).
 */
export const VANILLIN: MoleculeLevel = {
  id: 'vanillin',
  name: 'Vanillin',
  slots: [
    { element: 'C', x: R, y: 0 }, // 0 ring C–CHO (seed)
    { element: 'C', x: R / 2, y: H }, // 1
    { element: 'C', x: -R / 2, y: H }, // 2 ring C–OCH3 (meta to 0)
    { element: 'C', x: -R, y: 0 }, // 3 ring C–OH (para to 0)
    { element: 'C', x: -R / 2, y: -H }, // 4
    { element: 'C', x: R / 2, y: -H }, // 5
    { element: 'C', x: R + 1.46, y: 0 }, // 6 aldehyde C
    { element: 'O', x: R + 1.46 + dx(60, 1.22), y: dy(60, 1.22) }, // 7 aldehyde O
    { element: 'O', x: -R - 1.36, y: 0 }, // 8 hydroxyl O
    { element: 'O', ...OME_O }, // 9 methoxy O
    { element: 'C', x: OME_O.x + dx(150, 1.43), y: OME_O.y + dy(150, 1.43) }, // 10 methyl C
  ],
  bonds: [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
    [0, 6, 1],
    [6, 7, 2],
    [3, 8, 1],
    [2, 9, 1],
    [9, 10, 1],
  ],
  starTimeSec: 120,
  fact: 'Vanillin is the main flavor molecule of vanilla. It was first isolated from vanilla pods in 1858 by the French chemist Nicolas-Théodore Gobley, and today most of the vanillin used in food is made in factories.',
};
