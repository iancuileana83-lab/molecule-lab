import { ASPIRIN } from './aspirin.js';
import { CAFFEINE } from './caffeine.js';
import { CINNAMALDEHYDE } from './cinnamaldehyde.js';
import { GLUCOSE } from './glucose.js';
import { IBUPROFEN } from './ibuprofen.js';
import { MENTHOL } from './menthol.js';
import { PARACETAMOL } from './paracetamol.js';
import { VANILLIN } from './vanillin.js';
import { VITAMIN_C } from './vitamin-c.js';
import type { MoleculeLevel } from './types.js';

export interface Chapter {
  id: string;
  name: string;
  levels: MoleculeLevel[];
}

/** Three chapters of three molecules each; the Molecules menu shows one chapter at a time. */
export const CHAPTERS: Chapter[] = [
  { id: 'pain-relievers', name: 'Pain relievers', levels: [PARACETAMOL, ASPIRIN, IBUPROFEN] },
  { id: 'vitamins-energy', name: 'Vitamins and energy', levels: [VITAMIN_C, CAFFEINE, GLUCOSE] },
  { id: 'kitchen-flavours', name: 'Kitchen flavours', levels: [VANILLIN, MENTHOL, CINNAMALDEHYDE] },
];

/** Play order: chapter by chapter. */
export const LEVELS: MoleculeLevel[] = CHAPTERS.flatMap((c) => c.levels);

/** Index of the chapter that holds the level at `levelIndex` in `LEVELS`. */
export function chapterOf(levelIndex: number): number {
  let start = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    start += CHAPTERS[i].levels.length;
    if (levelIndex < start) return i;
  }
  return CHAPTERS.length - 1;
}

/** Index in `LEVELS` of the first level of a chapter. */
export function chapterStart(chapterIndex: number): number {
  let start = 0;
  for (let i = 0; i < chapterIndex; i++) start += CHAPTERS[i].levels.length;
  return start;
}
