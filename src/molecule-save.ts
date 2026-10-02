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
const INTRO_KEY = 'molecule-lab:intro:v1';

/** Whether the player has already been through the first-bond introduction. */
export function loadIntroDone(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === 'done';
  } catch {
    return false;
  }
}

export function saveIntroDone(): void {
  try {
    localStorage.setItem(INTRO_KEY, 'done');
  } catch {
    // The introduction may simply be shown again on this device.
  }
}
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

/** Accessibility options, kept together in one small save. */
export interface AccessSettings {
  /** No timer, no mistake count, no Time/Precision stars. */
  calm: boolean;
  /** No pulses, sparks, rings or travelling light; static cues only. */
  reduceMotion: boolean;
  /** Grab atoms from a distance with the hand ray (Quest); gaze devices always do. */
  reach: boolean;
  /** Table distance: -1 near (default), 0 normal, 1 far. */
  tableDistance: -1 | 0 | 1;
  /** Table height: -1 lower, 0 normal, 1 higher. */
  tableHeight: -1 | 0 | 1;
}

export const DEFAULT_ACCESS: AccessSettings = {
  calm: false,
  reduceMotion: false,
  reach: false,
  // Near by default: it brings the tray and the molecule inside a seated reach of
  // about 60 cm (a real Quest test may not happen, so the safe choice is the default).
  tableDistance: -1,
  tableHeight: 0,
};

const ACCESS_KEY = 'molecule-lab:access:v1';

const level = (v: unknown): -1 | 0 | 1 => (v === -1 || v === 1 ? v : 0);

export function loadAccess(): AccessSettings {
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    const d = raw ? (JSON.parse(raw) as Partial<AccessSettings>) : {};
    return {
      calm: d.calm === true,
      reduceMotion: d.reduceMotion === true,
      reach: d.reach === true,
      tableDistance: d.tableDistance === undefined ? DEFAULT_ACCESS.tableDistance : level(d.tableDistance),
      tableHeight: level(d.tableHeight),
    };
  } catch {
    return { ...DEFAULT_ACCESS };
  }
}

export function saveAccess(a: AccessSettings): void {
  try {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(a));
  } catch {
    // Settings simply are not persisted on this device.
  }
}

const CABINET_KEY = 'molecule-lab:cabinet:v1';

/** Ids of the molecules whose trophy stands in the medicine cabinet. */
export function loadCabinet(): string[] {
  try {
    const raw = localStorage.getItem(CABINET_KEY);
    const data = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(data) ? data.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveCabinet(ids: string[]): void {
  try {
    localStorage.setItem(CABINET_KEY, JSON.stringify(ids));
  } catch {
    // Trophies simply are not persisted on this device.
  }
}
