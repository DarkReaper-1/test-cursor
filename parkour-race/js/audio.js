export class AudioBus {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.22;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  resume() {
    this.ensure();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "square", gain = 0.12, slide = 0) {
    if (this.muted) return;
    this.ensure();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, gain = 0.08) {
    if (this.muted) return;
    this.ensure();
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.master);
    src.start();
  }

  click() {
    this.tone(880, 0.06, "square", 0.08);
  }
  jump() {
    this.tone(240, 0.16, "square", 0.1, 420);
    this.noise(0.08, 0.04);
  }
  vault() {
    this.tone(180, 0.12, "triangle", 0.1, 200);
  }
  boost() {
    this.tone(520, 0.22, "sawtooth", 0.09, 700);
  }
  land() {
    this.tone(90, 0.08, "sine", 0.1);
    this.noise(0.05, 0.05);
  }
  stumble() {
    this.tone(110, 0.2, "sawtooth", 0.08, -60);
  }
  countdown() {
    this.tone(440, 0.12, "square", 0.1);
  }
  go() {
    this.tone(660, 0.22, "square", 0.12, 200);
  }
  finish(place) {
    const base = place === 1 ? 523 : place <= 3 ? 392 : 262;
    this.tone(base, 0.18, "square", 0.1);
    setTimeout(() => this.tone(base * 1.25, 0.18, "square", 0.1), 120);
    setTimeout(() => this.tone(base * 1.5, 0.28, "square", 0.12), 240);
  }
  coin() {
    this.tone(980, 0.08, "square", 0.08, 400);
  }
}
