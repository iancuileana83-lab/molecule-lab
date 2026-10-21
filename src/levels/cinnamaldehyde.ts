import type { MoleculeLevel } from './types.js';

const R = 1.39; // aromatic C-C
const H = R * Math.sin(Math.PI / 3);
const dx = (deg: number, len: number) => len * Math.cos((deg * Math.PI) / 180);
const dy = (deg: number, len: number) => len * Math.sin((deg * Math.PI) / 180);

// Side chain: ring C - CH = CH - CHO, drawn as a zig-zag going right.
const C7 = { x: R + dx(30, 1.46), y: dy(30, 1.46) }; // CH= next to the ring
const C8 = { x: C7.x + dx(330, 1.34), y: C7.y + dy(330, 1.34) }; // =CH
const C9 = { x: C8.x + dx(30, 1.46), y: C8.y + dy(30, 1.46) }; // aldehyde C

/**
 * Cinnamaldehyde: 10 heavy atoms (9 C, 1 O), 10 bonds. A benzene ring with a
 * CH=CH-CHO side chain (the trans arrangement is not shown, the drawing is flat).
 */
export const CINNAMALDEHYDE: MoleculeLevel = {
  id: 'cinnamaldehyde',
  name: 'Cinnamaldehyde',
  slots: [
    { element: 'C', x: R, y: 0 }, // 0 ring C bearing the side chain (seed)
    { element: 'C', x: R / 2, y: H }, // 1
    { element: 'C', x: -R / 2, y: H }, // 2
    { element: 'C', x: -R, y: 0 }, // 3
    { element: 'C', x: -R / 2, y: -H }, // 4
    { element: 'C', x: R / 2, y: -H }, // 5
    { element: 'C', ...C7 }, // 6 CH=
    { element: 'C', ...C8 }, // 7 =CH
    { element: 'C', ...C9 }, // 8 aldehyde C
    { element: 'O', x: C9.x, y: C9.y + 1.22 }, // 9 aldehyde O
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
    [7, 8, 1],
    [8, 9, 2],
  ],
  starTimeSec: 120,
  fact: 'Cinnamaldehyde is the molecule that gives cinnamon its warm smell and flavor. It is found in the bark of cinnamon trees.',
};
