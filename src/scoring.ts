/**
 * Star rules for a finished molecule. Every finish earns the "Built" star;
 * finishing within the level's time limit earns "Time"; at most
 * MAX_MISTAKES_FOR_STAR mistakes earns "Precision". The guide never matters.
 */
export const MAX_MISTAKES_FOR_STAR = 2;

export interface Score {
  stars: number;
  timeSec: number;
  mistakes: number;
}

export interface StarBreakdown {
  built: boolean;
  time: boolean;
  precision: boolean;
}

export function starBreakdown(
  timeSec: number,
  mistakes: number,
  starTimeSec: number,
): StarBreakdown {
  return {
    built: true,
    time: timeSec <= starTimeSec,
    precision: mistakes <= MAX_MISTAKES_FOR_STAR,
  };
}

export function scoreOf(
  timeSec: number,
  mistakes: number,
  starTimeSec: number,
): Score {
  const b = starBreakdown(timeSec, mistakes, starTimeSec);
  const stars = Number(b.built) + Number(b.time) + Number(b.precision);
  return { stars, timeSec, mistakes };
}

/** More stars wins; with equal stars, the shorter time wins. */
export function isBetter(candidate: Score, best: Score | undefined): boolean {
  if (!best) return true;
  if (candidate.stars !== best.stars) return candidate.stars > best.stars;
  return candidate.timeSec < best.timeSec;
}

/** "1:05" style, whole seconds. */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
