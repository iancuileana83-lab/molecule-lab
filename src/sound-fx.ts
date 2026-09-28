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

  /** Soft bell-like "ding"; `progress` (0..1) raises the pitch as the molecule grows. */
  snap(progress: number): void {
    const step = PENTATONIC[Math.round(progress * (PENTATONIC.length - 1))];
    this.tone(BASE_HZ * Math.pow(2, step / 12), 0.35, 0.22, 'sine');
    this.tone(BASE_HZ * Math.pow(2, (step + 12) / 12), 0.2, 0.06, 'triangle');
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
