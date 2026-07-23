/** Procedural noir score & trailer SFX — concept audio, not licensed tracks */

export class TrailerAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._score = null;
    this._rain = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.38;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "sine", vol = 0.06, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  startScore() {
    if (!this.ctx || this._score) return;
    const t = this.ctx.currentTime;
    const make = (freq, type, vol) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      return { o, g };
    };
    this._score = {
      bass: make(48, "sine", 0.01),
      pad: make(96, "triangle", 0.006),
      high: make(192, "sine", 0.003),
    };
  }

  setIntensity(level) {
    if (!this._score || !this.ctx) return;
    const now = this.ctx.currentTime;
    const ramp = (node, v) => {
      node.g.gain.cancelScheduledValues(now);
      node.g.gain.linearRampToValueAtTime(v, now + 0.6);
    };
    ramp(this._score.bass, 0.008 + level * 0.04);
    ramp(this._score.pad, 0.004 + level * 0.025);
    ramp(this._score.high, 0.002 + level * 0.018);
    this._score.bass.o.frequency.linearRampToValueAtTime(42 + level * 30, now + 0.7);
  }

  startRain() {
    if (!this.ctx || this._rain) return;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1200;
    f.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.value = 0.02;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
    this._rain = { src, g, f };
  }

  setRain(level) {
    if (!this._rain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this._rain.g.gain.cancelScheduledValues(now);
    this._rain.g.gain.linearRampToValueAtTime(0.01 + level * 0.07, now + 0.5);
  }

  footsteps() {
    this.tone(70 + Math.random() * 25, 0.06, "triangle", 0.03);
  }

  shutter() {
    this.tone(1400, 0.04, "square", 0.04);
    this.tone(400, 0.08, "triangle", 0.03, 0.04);
  }

  sting() {
    this.tone(110, 0.4, "sine", 0.05);
    this.tone(165, 0.5, "triangle", 0.035, 0.08);
    this.tone(330, 0.6, "sine", 0.025, 0.2);
  }

  thunder() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(50, t);
    o.frequency.exponentialRampToValueAtTime(22, t + 1.3);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 1.5);
  }

  finale() {
    this.tone(98, 0.5, "sine", 0.06);
    this.tone(147, 0.6, "triangle", 0.04, 0.12);
    this.tone(196, 0.8, "sine", 0.035, 0.28);
    this.tone(294, 1.0, "sine", 0.03, 0.5);
  }

  click() {
    this.tone(700, 0.04, "square", 0.025);
  }

  applyBeat(audioCfg = {}) {
    this.setIntensity(audioCfg.intensity ?? 0.3);
    this.setRain(audioCfg.rain ?? 0.3);
    if (audioCfg.footsteps) this.footsteps();
    if (audioCfg.shutter) this.shutter();
    if (audioCfg.sting) this.sting();
    if (audioCfg.thunder) this.thunder();
    if (audioCfg.finale) this.finale();
    if (audioCfg.chase) {
      this.tone(55, 0.3, "sawtooth", 0.04);
      this.tone(80, 0.25, "triangle", 0.03, 0.1);
    }
    if (audioCfg.engine) {
      this.tone(45, 0.5, "sawtooth", 0.025);
    }
  }
}
