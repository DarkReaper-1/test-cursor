import { bus } from './EventBus';

/**
 * Fully procedural audio: every sound is synthesized with WebAudio at
 * runtime (oscillators + filtered noise), so the game ships zero audio
 * assets and nothing is copied from any other game.
 *
 * - SFX: footsteps, jump, land, slide, wall-run loop, coins, power-ups,
 *   UI taps, countdown, finish, victory/defeat stingers.
 * - Music: lightweight generative loop (bass + arp + hats) that only
 *   schedules a few nodes per bar.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  musicOn = true;
  sfxOn = true;

  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private musicNextTime = 0;
  private wallRunNoise: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private footTimer = 0;

  /** Must be called from a user gesture on mobile. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);

    // shared noise buffer
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    this.wireEvents();
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  setMusicOn(on: boolean): void {
    this.musicOn = on;
    if (!on) this.stopMusic();
  }

  setSfxOn(on: boolean): void {
    this.sfxOn = on;
  }

  // ------------------------------------------------------------ synth utils

  private tone(opts: {
    freq: number;
    endFreq?: number;
    type?: OscillatorType;
    dur?: number;
    vol?: number;
    attack?: number;
    when?: number;
    dest?: AudioNode;
  }): void {
    if (!this.ctx || !this.sfxGain) return;
    const { freq, endFreq, type = 'sine', dur = 0.15, vol = 0.3, attack = 0.005, when = 0, dest } = opts;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(dest ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(opts: { dur?: number; vol?: number; freq?: number; q?: number; type?: BiquadFilterType; when?: number }): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const { dur = 0.15, vol = 0.25, freq = 1800, q = 0.8, type = 'bandpass', when = 0 } = opts;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ------------------------------------------------------------------- SFX

  private sfx(fn: () => void): void {
    if (this.sfxOn && this.ctx) fn();
  }

  uiTap(): void {
    this.sfx(() => this.tone({ freq: 660, endFreq: 880, type: 'triangle', dur: 0.06, vol: 0.18 }));
  }

  footstep(speedRatio: number): void {
    this.sfx(() => this.noise({ dur: 0.045, vol: 0.05 + speedRatio * 0.05, freq: 900 + speedRatio * 500, type: 'lowpass' }));
  }

  jump(double: boolean): void {
    this.sfx(() => {
      this.tone({ freq: double ? 420 : 320, endFreq: double ? 780 : 620, type: 'square', dur: 0.14, vol: 0.12 });
      this.noise({ dur: 0.1, vol: 0.06, freq: 2400 });
    });
  }

  land(impact: number): void {
    this.sfx(() => {
      this.noise({ dur: 0.1 + impact * 0.06, vol: 0.12 + impact * 0.14, freq: 500, type: 'lowpass' });
      this.tone({ freq: 120, endFreq: 60, type: 'sine', dur: 0.12, vol: 0.15 + impact * 0.1 });
    });
  }

  slide(): void {
    this.sfx(() => this.noise({ dur: 0.35, vol: 0.14, freq: 1300, q: 0.5 }));
  }

  vault(): void {
    this.sfx(() => {
      this.noise({ dur: 0.14, vol: 0.1, freq: 2000 });
      this.tone({ freq: 500, endFreq: 800, type: 'triangle', dur: 0.12, vol: 0.1 });
    });
  }

  wallRunStart(): void {
    if (!this.sfxOn || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    this.wallRunStop();
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1000;
    const g = ctx.createGain();
    g.gain.value = 0.09;
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start();
    this.wallRunNoise = { src, gain: g };
  }

  wallRunStop(): void {
    if (this.wallRunNoise && this.ctx) {
      const { src, gain } = this.wallRunNoise;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      src.stop(this.ctx.currentTime + 0.15);
      this.wallRunNoise = null;
    }
  }

  wallJump(): void {
    this.sfx(() => this.tone({ freq: 380, endFreq: 760, type: 'square', dur: 0.16, vol: 0.13 }));
  }

  coin(pitch = 0): void {
    this.sfx(() => {
      this.tone({ freq: 1180 * Math.pow(1.06, pitch % 8), type: 'sine', dur: 0.09, vol: 0.14 });
      this.tone({ freq: 1580 * Math.pow(1.06, pitch % 8), type: 'sine', dur: 0.14, vol: 0.1, when: 0.05 });
    });
  }

  powerUp(): void {
    this.sfx(() => {
      this.tone({ freq: 440, endFreq: 880, type: 'sawtooth', dur: 0.2, vol: 0.12 });
      this.tone({ freq: 660, endFreq: 1320, type: 'triangle', dur: 0.25, vol: 0.1, when: 0.08 });
    });
  }

  powerDown(): void {
    this.sfx(() => this.tone({ freq: 700, endFreq: 350, type: 'triangle', dur: 0.25, vol: 0.1 }));
  }

  boost(): void {
    this.sfx(() => {
      this.noise({ dur: 0.4, vol: 0.14, freq: 2600, q: 0.4 });
      this.tone({ freq: 220, endFreq: 660, type: 'sawtooth', dur: 0.35, vol: 0.1 });
    });
  }

  stumble(): void {
    this.sfx(() => {
      this.noise({ dur: 0.18, vol: 0.2, freq: 400, type: 'lowpass' });
      this.tone({ freq: 180, endFreq: 90, type: 'square', dur: 0.2, vol: 0.12 });
    });
  }

  death(): void {
    this.sfx(() => {
      this.tone({ freq: 320, endFreq: 80, type: 'sawtooth', dur: 0.5, vol: 0.16 });
      this.noise({ dur: 0.4, vol: 0.14, freq: 300, type: 'lowpass' });
    });
  }

  breakBarrier(): void {
    this.sfx(() => {
      this.noise({ dur: 0.3, vol: 0.25, freq: 900, q: 0.3 });
      this.tone({ freq: 150, endFreq: 60, dur: 0.25, vol: 0.18, type: 'square' });
    });
  }

  launch(): void {
    this.sfx(() => this.tone({ freq: 200, endFreq: 900, type: 'sawtooth', dur: 0.4, vol: 0.15 }));
  }

  checkpoint(): void {
    this.sfx(() => {
      this.tone({ freq: 780, type: 'triangle', dur: 0.1, vol: 0.14 });
      this.tone({ freq: 1040, type: 'triangle', dur: 0.16, vol: 0.14, when: 0.09 });
    });
  }

  countdownBeep(final: boolean): void {
    this.sfx(() => this.tone({ freq: final ? 1040 : 620, type: 'square', dur: final ? 0.35 : 0.14, vol: 0.16 }));
  }

  finish(): void {
    this.sfx(() => {
      const notes = [523, 659, 784, 1046];
      notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.14, when: i * 0.1 }));
    });
  }

  victory(): void {
    this.sfx(() => {
      const notes = [523, 659, 784, 880, 1046, 1318];
      notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.13, when: i * 0.12 }));
    });
  }

  defeat(): void {
    this.sfx(() => {
      const notes = [392, 349, 311, 261];
      notes.forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.35, vol: 0.1, when: i * 0.18 }));
    });
  }

  /** Called from gameplay loop while running on ground. */
  tickFootsteps(dt: number, grounded: boolean, speedRatio: number): void {
    if (!grounded || speedRatio < 0.2) return;
    this.footTimer -= dt;
    if (this.footTimer <= 0) {
      this.footstep(speedRatio);
      this.footTimer = Math.max(0.16, 0.34 - speedRatio * 0.14);
    }
  }

  // ------------------------------------------------------------------ music

  startMusic(intensity = 0): void {
    if (!this.musicOn || !this.ctx || this.musicTimer) return;
    this.musicStep = 0;
    this.musicNextTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(intensity), 80);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(intensity: number): void {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const stepDur = 60 / 128 / 2; // 128 BPM, 8th notes
    // progression: i - VI - III - VII in A minor
    const roots = [220, 174.6, 130.8, 196];
    while (this.musicNextTime < ctx.currentTime + 0.25) {
      const t = this.musicNextTime;
      const step = this.musicStep;
      const bar = Math.floor(step / 8) % 4;
      const root = roots[bar];

      // bass on beats
      if (step % 4 === 0) {
        this.tone({ freq: root / 2, type: 'triangle', dur: stepDur * 2.2, vol: 0.2, when: t - ctx.currentTime, dest: this.musicGain });
      }
      // arp
      const arpNotes = [1, 1.5, 2, 3];
      const n = arpNotes[step % 4] * root;
      this.tone({ freq: n, type: 'square', dur: stepDur * 0.85, vol: 0.045 + intensity * 0.02, when: t - ctx.currentTime, dest: this.musicGain });
      // hats on off-beats
      if (step % 2 === 1 && this.noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 6000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.5);
        src.connect(f).connect(g).connect(this.musicGain);
        src.start(t);
        src.stop(t + stepDur * 0.6);
      }
      this.musicNextTime += stepDur;
      this.musicStep++;
    }
  }

  // ------------------------------------------------------- event wiring

  private wireEvents(): void {
    bus.on('playerJump', ({ double }) => this.jump(double));
    bus.on('playerLand', ({ impact }) => this.land(impact));
    bus.on('playerSlideStart', () => this.slide());
    bus.on('playerVault', () => this.vault());
    bus.on('playerWallRunStart', () => this.wallRunStart());
    bus.on('playerWallRunEnd', () => this.wallRunStop());
    bus.on('playerWallJump', () => this.wallJump());
    bus.on('playerStumble', () => this.stumble());
    bus.on('playerDeath', () => {
      this.wallRunStop();
      this.death();
    });
    bus.on('playerLaunched', () => this.launch());
    bus.on('playerBoost', () => this.boost());
    bus.on('barrierBroken', () => this.breakBarrier());
    bus.on('coinCollected', ({ total }) => this.coin(total));
    bus.on('powerUpCollected', () => this.powerUp());
    bus.on('powerUpExpired', () => this.powerDown());
    bus.on('checkpointReached', () => this.checkpoint());
    bus.on('raceCountdown', ({ count }) => this.countdownBeep(count === 0));
    bus.on('raceFinished', () => this.finish());
    bus.on('uiTap', () => this.uiTap());
  }
}

export const audio = new AudioManager();
