// Fully procedural WebAudio SFX — no audio files. Context is created lazily on
// the first user gesture (required on mobile browsers).
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._grind = null;
    this._noiseBuf = null;
    this._stepAlt = false;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1;
    this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this._noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  _tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.004, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, { vol = 0.3, freq = 1200, q = 1, type = 'bandpass', slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  footstep(speed01) {
    this._stepAlt = !this._stepAlt;
    this._noise(0.05, { vol: 0.05 + speed01 * 0.05, freq: this._stepAlt ? 700 : 560, q: 1.4 });
  }
  jump()      { this._noise(0.22, { vol: 0.16, freq: 900, slide: 900, q: 2 }); }
  land(hard)  { this._noise(hard ? 0.16 : 0.09, { vol: hard ? 0.3 : 0.14, freq: 320, slide: -200, q: 0.8, type: 'lowpass' }); }
  vault()     { this._noise(0.16, { vol: 0.15, freq: 1400, slide: 700, q: 2.5 }); }
  bumper()    { this._tone(620, 0.14, { type: 'square', vol: 0.12, slide: 500 });
                this._tone(930, 0.2,  { type: 'square', vol: 0.1, slide: 620, delay: 0.05 }); }
  boost()     { this._noise(0.5, { vol: 0.2, freq: 700, slide: 2600, q: 1.6 });
                this._tone(420, 0.3, { type: 'sawtooth', vol: 0.08, slide: 480 }); }
  perfect()   { this._tone(740, 0.12, { type: 'triangle', vol: 0.22 });
                this._tone(988, 0.14, { type: 'triangle', vol: 0.22, delay: 0.07 });
                this._tone(1480, 0.26, { type: 'triangle', vol: 0.2, delay: 0.14 }); }
  spring()    { this._tone(240, 0.35, { type: 'square', vol: 0.16, slide: 700 });
                this._noise(0.25, { vol: 0.1, freq: 500, slide: 1500, q: 3 }); }
  thud()      { this._noise(0.2, { vol: 0.32, freq: 180, slide: -110, q: 0.7, type: 'lowpass' });
                this._tone(90, 0.18, { type: 'sine', vol: 0.24, slide: -40 }); }
  fall()      { this._tone(520, 0.55, { type: 'sawtooth', vol: 0.1, slide: -430 }); }
  beep(final) { this._tone(final ? 880 : 440, final ? 0.5 : 0.14, { type: 'square', vol: 0.18 }); }
  click()     { this._tone(700, 0.06, { type: 'square', vol: 0.1 }); }

  grindStart() {
    if (!this.ctx || this._grind) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.06);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this._grind = { src, g };
  }
  grindStop() {
    if (!this._grind) return;
    const { src, g } = this._grind;
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
    src.stop(this.ctx.currentTime + 0.12);
    this._grind = null;
  }

  fanfare(won) {
    if (!this.ctx) return;
    const seq = won ? [523, 659, 784, 1047] : [392, 330, 262];
    seq.forEach((f, i) => this._tone(f, i === seq.length - 1 ? 0.6 : 0.18,
      { type: 'triangle', vol: 0.2, delay: i * 0.16 }));
    if (won) this._noise(1.2, { vol: 0.08, freq: 4000, q: 0.4, type: 'highpass', delay: 0.3 });
  }
}
