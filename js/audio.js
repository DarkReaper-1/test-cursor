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
    webShoot() { blip(480, 0.1, "sawtooth", 0.12); },
    webRelease() { blip(180, 0.12, "triangle", 0.1); },
    jump() { blip(220, 0.08, "square", 0.1); },
    collect() { blip(660, 0.1, "sine", 0.16); blip(990, 0.14, "sine", 0.1); },
    combo() { blip(520, 0.06, "square", 0.08); },
    fall() { blip(90, 0.35, "sawtooth", 0.14); },
  };
}
