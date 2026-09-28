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

export function saveProgress(save: MoleculeSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Progress simply is not persisted on this device.
  }
}
