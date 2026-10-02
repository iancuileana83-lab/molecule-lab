import { ASPIRIN } from './aspirin.js';
import { CAFFEINE } from './caffeine.js';
import { IBUPROFEN } from './ibuprofen.js';
import { PARACETAMOL } from './paracetamol.js';
import { VANILLIN } from './vanillin.js';
import { VITAMIN_C } from './vitamin-c.js';
import type { MoleculeLevel } from './types.js';

/** Play order. */
export const LEVELS: MoleculeLevel[] = [PARACETAMOL, ASPIRIN, CAFFEINE, IBUPROFEN, VITAMIN_C, VANILLIN];
