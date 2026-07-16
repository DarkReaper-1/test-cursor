export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "sine", vol = 0.08, when = 0) {
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

  gunshot() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    this.tone(90, 0.12, "square", 0.1);
  }

  hit() {
    this.tone(220, 0.08, "sawtooth", 0.05);
    this.tone(110, 0.15, "square", 0.04, 0.02);
  }

  pickup() {
    this.tone(523, 0.1, "sine", 0.06);
    this.tone(659, 0.12, "sine", 0.05, 0.08);
    this.tone(784, 0.18, "sine", 0.04, 0.16);
  }

  hurt() {
    this.tone(80, 0.25, "sawtooth", 0.12);
  }

  reload() {
    this.tone(180, 0.06, "triangle", 0.05);
    this.tone(140, 0.08, "triangle", 0.04, 0.1);
  }

  footstep() {
    this.tone(70 + Math.random() * 20, 0.05, "triangle", 0.025);
  }

  click() {
    this.tone(600, 0.04, "square", 0.03);
  }

  itemGet() {
    this.tone(440, 0.08, "sine", 0.05);
    this.tone(660, 0.1, "sine", 0.04, 0.06);
  }

  radio() {
    this.tone(900, 0.04, "square", 0.03);
    this.tone(700, 0.06, "square", 0.025, 0.05);
    this.tone(1100, 0.05, "sine", 0.02, 0.1);
  }

  enemyShot() {
    this.tone(160, 0.08, "square", 0.06);
    this.tone(80, 0.12, "sawtooth", 0.05);
  }

  thunder() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 1.4);
  }

  death() {
    this.tone(100, 0.2, "sawtooth", 0.07);
    this.tone(60, 0.3, "triangle", 0.05, 0.05);
  }

  unlock() {
    this.tone(320, 0.08, "triangle", 0.05);
    this.tone(480, 0.12, "triangle", 0.04, 0.08);
  }

  startAmbience() {
    if (!this.ctx || !this.enabled || this._amb) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.value = 0.04;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
    this._amb = src;
  }
}
