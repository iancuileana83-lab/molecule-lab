import type { Score } from './scoring.js';

/**
 * Per-device save of the current level and its molecule progress, so a
 * reload or an app suspended by the OS resumes exactly where the player left
 * off. Browser storage can be missing or throw (private mode, cleared data),
 * so every access is guarded.
 */
export interface MoleculeSave {
  levelId: string;
  /** Atom object name -> template slot it occupies. */
  placements: Record<string, number>;
  /** Active play time in seconds (pauses excluded); absent in older saves. */
  elapsed?: number;
  mistakes?: number;
  timerStarted?: boolean;
}

const KEY = 'molecule-lab:progress:v2';

export function loadProgress(): MoleculeSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as MoleculeSave;
    return data &&
      typeof data.levelId === 'string' &&
      typeof data.placements === 'object'
      ? data
      : null;
  } catch {
    return null;
  }
}

const GUIDE_KEY = 'molecule-lab:guide:v1';
const BEST_KEY = 'molecule-lab:best:v1';

/** Best score per level id. */
export function loadBestScores(): Record<string, Score> {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, Score>) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function saveBestScores(best: Record<string, Score>): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Best scores simply are not persisted on this device.
  }
}
const SOUND_KEY = 'molecule-lab:sound:v1';

/** Whether sound effects play; on unless muted. */
export function loadSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundPref(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Preference simply is not persisted on this device.
  }
}

/** Whether the target-molecule guide is shown; on unless turned off. */
export function loadGuidePref(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveGuidePref(on: boolean): void {
  try {
    localStorage.setItem(GUIDE_KEY, on ? 'on' : 'off');
  } catch {
    // Preference simply is not persisted on this device.
  }
}

export function saveProgress(save: MoleculeSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Progress simply is not persisted on this device.
  }
}
