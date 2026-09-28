/**
 * Per-device save of molecule progress so a reload or an app suspended by
 * the OS resumes exactly where the player left off. Browser storage can be
 * missing or throw (private mode, cleared data), so every access is guarded.
 */
export interface MoleculeSave {
  /** Atom scene-object name -> template slot it occupies. */
  placements: Record<string, number>;
}

const keyFor = (levelId: string) => `molecule-lab:${levelId}:v1`;

export function loadProgress(levelId: string): MoleculeSave | null {
  try {
    const raw = localStorage.getItem(keyFor(levelId));
    if (!raw) return null;
    const data = JSON.parse(raw) as MoleculeSave;
    return data && typeof data.placements === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function saveProgress(levelId: string, save: MoleculeSave): void {
  try {
    localStorage.setItem(keyFor(levelId), JSON.stringify(save));
  } catch {
    // Progress simply is not persisted on this device.
  }
}

export function clearProgress(levelId: string): void {
  try {
    localStorage.removeItem(keyFor(levelId));
  } catch {
    // Nothing to clear.
  }
}
