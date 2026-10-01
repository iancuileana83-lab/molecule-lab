import type { ElementSymbol } from './levels/types.js';

/**
 * Tiny synthesized sound effects (Web Audio, no audio files), so every sound
 * is original. The AudioContext is created lazily on first use; browsers let
 * it start because the player has already clicked "Enter VR" on the page.
 */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const BASE_HZ = 523.25; // C5

export class SoundFx {
  private ctx?: AudioContext;
  private master?: GainNode;
  muted = false;

  /**
   * Each element has its own voice, so atoms can be told apart by ear:
   * carbon is round and middle, oxygen lower and warm, nitrogen higher and bright.
   */
  private static readonly VOICE: Record<
    ElementSymbol,
    { ratio: number; type: OscillatorType; overtone: number }
  > = {
    C: { ratio: 1, type: 'sine', overtone: 0.06 },
    O: { ratio: 0.75, type: 'triangle', overtone: 0.03 },
    N: { ratio: 1.335, type: 'sine', overtone: 0.1 },
  };

  /** A short, soft note when an atom is picked up. */
  grab(element: ElementSymbol): void {
    const v = SoundFx.VOICE[element];
    this.tone(BASE_HZ * v.ratio, 0.2, 0.13, v.type);
    this.tone(BASE_HZ * v.ratio * 2, 0.14, v.overtone, 'sine');
  }

  /**
   * Soft bell-like "ding"; `progress` (0..1) raises the pitch as the molecule
   * grows, and the placed atom's element colours the voice.
   */
  snap(progress: number, element: ElementSymbol = 'C'): void {
    const v = SoundFx.VOICE[element];
    const step = PENTATONIC[Math.round(progress * (PENTATONIC.length - 1))];
    const hz = BASE_HZ * v.ratio * Math.pow(2, step / 12);
    this.tone(hz, 0.35, 0.22, v.type);
    this.tone(hz * 2, 0.2, v.overtone * 2, 'triangle');
  }

  /** Two soft, low notes when the player enters VR (kept quiet on purpose). */
  welcome(): void {
    this.tone(BASE_HZ, 1.0, 0.07, 'sine');
    this.tone(BASE_HZ * 1.5, 1.2, 0.055, 'sine', undefined, 0.18);
  }

  /** Three quick high notes for the very first bond. */
  sparkle(): void {
    [12, 16, 19].forEach((semi, i) =>
      this.tone(BASE_HZ * Math.pow(2, semi / 12), 0.35, 0.07, 'sine', undefined, i * 0.08),
    );
  }

  /** Low, gentle "bonk" for a bond that does not exist. */
  error(): void {
    this.tone(196, 0.22, 0.14, 'triangle', 147);
  }

  /** Short rising arpeggio when a molecule is complete. */
  complete(): void {
    [0, 4, 7, 12].forEach((semi, i) =>
      this.tone(BASE_HZ * Math.pow(2, semi / 12), 0.6, 0.16, 'sine', undefined, i * 0.11),
    );
  }

  private tone(
    hz: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    endHz?: number,
    delay = 0,
  ): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t0);
    if (endHz) osc.frequency.exponentialRampToValueAtTime(endHz, t0 + duration);
    // Quick attack, smooth exponential decay: no clicks.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  private context(): AudioContext | undefined {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return undefined; // No audio available; the game stays silent.
    }
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
