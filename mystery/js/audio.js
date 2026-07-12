/* Procedural ambient audio — rain, thunder, UI chimes */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.rainNode = null;
    this.rainGain = null;
    this.masterGain = null;
    this.thunderTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopAmbient();
    else if (this.ctx) this.startAmbient();
  }

  startAmbient() {
    if (!this.enabled || !this.ctx) return;
    this.stopAmbient();

    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = buffer;
    this.rainNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.06;

    this.rainNode.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    this.rainNode.start();

    this.scheduleThunder();
  }

  stopAmbient() {
    if (this.rainNode) {
      try { this.rainNode.stop(); } catch { /* already stopped */ }
      this.rainNode = null;
    }
    clearTimeout(this.thunderTimer);
  }

  scheduleThunder() {
    if (!this.enabled || !this.ctx) return;
    const delay = 8000 + Math.random() * 15000;
    this.thunderTimer = setTimeout(() => {
      this.playThunder();
      this.scheduleThunder();
    }, delay);
  }

  playThunder() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 1.5);

    filter.type = "lowpass";
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime( 0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2);

    document.getElementById("lightning-flash")?.classList.add("flash");
    setTimeout(() => document.getElementById("lightning-flash")?.classList.remove("flash"), 150);
  }

  playChime() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.6);
    });
  }

  playDramatic() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 1.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  playClick() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

window.gameAudio = new AudioEngine();
