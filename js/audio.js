/** Lightweight procedural audio — no assets required. */
export function createAudio() {
  let ctx = null;
  let master = null;
  let started = false;

  function ensure() {
    if (started) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    started = true;
    startAmbience();
  }

  function startAmbience() {
    // Low drone
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 55;
    g.gain.value = 0.15;
    osc.connect(g);
    g.connect(master);
    osc.start();

    // Soft pulse
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.value = 110;
    g2.gain.value = 0.04;
    osc2.connect(g2);
    g2.connect(master);
    osc2.start();

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoG.gain.value = 0.03;
    lfo.connect(lfoG);
    lfoG.connect(g2.gain);
    lfo.start();
  }

  function blip(freq, dur = 0.08, type = "square", vol = 0.2) {
    if (!started) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  return {
    start: ensure,
    webShoot() { blip(520, 0.09, "sawtooth", 0.13); blip(780, 0.06, "square", 0.06); },
    webRelease() { blip(200, 0.14, "triangle", 0.12); blip(140, 0.1, "sine", 0.08); },
    jump() { blip(240, 0.07, "square", 0.1); blip(360, 0.05, "triangle", 0.06); },
    collect() { blip(700, 0.09, "sine", 0.16); blip(1040, 0.12, "sine", 0.11); },
    combo() { blip(560, 0.05, "square", 0.09); blip(840, 0.07, "sine", 0.06); },
    fall() { blip(100, 0.4, "sawtooth", 0.15); },
  };
}
