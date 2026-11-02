// Synthesized Web Audio engine for mechanical escapement ticks, heartbeat pulse, and 2026 harmonic bell

class HorologyAudioEngine {
  private ctx: AudioContext | null = null;
  private timerId: number | null = null;
  private isPlaying = false;
  private mode: 'heartbeat' | 'pocket18k' | 'chrono28k' = 'heartbeat';

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playMechanicalTick(accent = false) {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(accent ? 3200 : 2400, now);
      filter.Q.setValueAtTime(6.0, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(accent ? 1850 : 1420, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.018);

      gain.gain.setValueAtTime(accent ? 0.12 : 0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.024);
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }

  public playHeartbeatLubDub() {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      // Lub (deep ocular pulse)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(68, now);
      osc1.frequency.exponentialRampToValueAtTime(34, now + 0.12);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Dub + subtle watch escapement click
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(56, now + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(28, now + 0.34);
      gain2.gain.setValueAtTime(0.16, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.37);

      this.playMechanicalTick(true);
    } catch {
      // Ignore
    }
  }

  public playChime2026() {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const partials = [528, 792, 1056, 1584];

      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = 0.09 / (idx + 1);
        gain.gain.setValueAtTime(initialGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 - idx * 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.9);
      });
    } catch {
      // Ignore
    }
  }

  public startMetronome(mode: 'heartbeat' | 'pocket18k' | 'chrono28k' = 'heartbeat') {
    this.stopMetronome();
    this.mode = mode;
    this.isPlaying = true;

    const intervalMs =
      mode === 'heartbeat' ? 950 : mode === 'pocket18k' ? 200 : 125;

    let step = 0;
    const tick = () => {
      if (!this.isPlaying) return;
      if (this.mode === 'heartbeat') {
        this.playHeartbeatLubDub();
      } else {
        this.playMechanicalTick(step % 4 === 0);
      }
      step += 1;
    };

    tick();
    this.timerId = window.setInterval(tick, intervalMs);
  }

  public stopMetronome() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getStatus() {
    return { isPlaying: this.isPlaying, mode: this.mode };
  }
}

export const horologyAudio = new HorologyAudioEngine();
