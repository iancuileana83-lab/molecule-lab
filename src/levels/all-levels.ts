import { ASPIRIN } from './aspirin.js';
import { CAFFEINE } from './caffeine.js';
import { PARACETAMOL } from './paracetamol.js';
import type { MoleculeLevel } from './types.js';

/** Play order. */
export const LEVELS: MoleculeLevel[] = [PARACETAMOL, ASPIRIN, CAFFEINE];
