// Tiny WebAudio synth for all SFX — no assets needed.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.init();
    this.ctx?.resume?.();
  }

  _tone({ freq = 440, endFreq = null, dur = 0.12, type = 'sine', vol = 1, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.15, vol = 0.5, freq = 1200, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  jump(charge) {
    this._tone({ freq: 300 + charge * 200, endFreq: 700 + charge * 500, dur: 0.18, type: 'square', vol: 0.25 });
    this._noise({ dur: 0.1, vol: 0.15, freq: 3000 });
  }

  land() {
    this._tone({ freq: 150, endFreq: 60, dur: 0.1, type: 'triangle', vol: 0.5 });
    this._noise({ dur: 0.06, vol: 0.2, freq: 500 });
  }

  perfect() {
    this._tone({ freq: 880, dur: 0.09, type: 'sine', vol: 0.4 });
    this._tone({ freq: 1320, dur: 0.12, type: 'sine', vol: 0.4, delay: 0.07 });
  }

  boost() {
    this._tone({ freq: 400, endFreq: 1600, dur: 0.3, type: 'sawtooth', vol: 0.22 });
  }

  tramp() {
    this._tone({ freq: 200, endFreq: 900, dur: 0.25, type: 'sine', vol: 0.45 });
  }

  vault() {
    this._noise({ dur: 0.12, vol: 0.3, freq: 1800 });
  }

  stumble() {
    this._tone({ freq: 220, endFreq: 80, dur: 0.3, type: 'sawtooth', vol: 0.4 });
    this._noise({ dur: 0.2, vol: 0.35, freq: 400 });
  }

  rail() {
    this._noise({ dur: 0.35, vol: 0.2, freq: 2500 });
  }

  countBeep(final) {
    this._tone({ freq: final ? 880 : 440, dur: final ? 0.35 : 0.15, type: 'square', vol: 0.35 });
  }

  finish(won) {
    const notes = won ? [523, 659, 784, 1047] : [392, 330, 262];
    notes.forEach((f, i) => this._tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.4, delay: i * 0.14 }));
  }

  fall() {
    this._tone({ freq: 600, endFreq: 100, dur: 0.5, type: 'sine', vol: 0.35 });
  }
}
