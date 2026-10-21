import type { MoleculeLevel } from './types.js';

const R = 1.39; // ring bond length, drawn like the aromatic rings
const H = R * Math.sin(Math.PI / 3);
const dx = (deg: number, len: number) => len * Math.cos((deg * Math.PI) / 180);
const dy = (deg: number, len: number) => len * Math.sin((deg * Math.PI) / 180);
const CO = 1.43; // C-O single bond
const CC = 1.52; // C-C single bond

/**
 * Glucose (glucopyranose): 12 heavy atoms (6 C, 6 O), 12 bonds, all single. A
 * six-membered ring of five carbons and one oxygen; four of the carbons carry an
 * OH group and the fifth carries CH2OH. Drawn flat like a textbook formula, so
 * the 3D handedness of the OH groups is not shown.
 */
export const GLUCOSE: MoleculeLevel = {
  id: 'glucose',
  name: 'Glucose',
  slots: [
    { element: 'C', x: R, y: 0 }, // 0 ring C bearing CH2OH (seed)
    { element: 'O', x: R / 2, y: H }, // 1 ring O
    { element: 'C', x: -R / 2, y: H }, // 2 ring C, OH
    { element: 'C', x: -R, y: 0 }, // 3 ring C, OH
    { element: 'C', x: -R / 2, y: -H }, // 4 ring C, OH
    { element: 'C', x: R / 2, y: -H }, // 5 ring C, OH
    { element: 'O', x: -R / 2 + dx(120, CO), y: H + dy(120, CO) }, // 6 OH on 2
    { element: 'O', x: -R - CO, y: 0 }, // 7 OH on 3
    { element: 'O', x: -R / 2 + dx(240, CO), y: -H + dy(240, CO) }, // 8 OH on 4
    { element: 'O', x: R / 2 + dx(300, CO), y: -H + dy(300, CO) }, // 9 OH on 5
    { element: 'C', x: R + CC, y: 0 }, // 10 CH2 of CH2OH
    { element: 'O', x: R + CC + dx(60, CO), y: dy(60, CO) }, // 11 O of CH2OH
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
    [4, 8, 1],
    [5, 9, 1],
    [0, 10, 1],
    [10, 11, 1],
  ],
  starTimeSec: 135,
  fact: 'Glucose is a simple sugar and one of the main fuels that living cells use for energy. Plants make it from water and carbon dioxide, using light from the sun.',
};
