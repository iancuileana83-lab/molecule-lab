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
