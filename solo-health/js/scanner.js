import { SKELETON, toKeyMap } from "./pose-math.js";
import { createRepCounter, questKind } from "./rep-counter.js";

const VISION_MODULE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

let landmarker = null;
let loadPromise = null;

/**
 * Loaded lazily (not as a static import) so an unreachable CDN — offline dev,
 * a locked-down network — fails only the live-camera path, not the whole
 * module; the synthetic/demo pose feed keeps working either way.
 */
export async function ensureModel(onStatus) {
  if (landmarker) return landmarker;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    onStatus?.("Loading pose model…");
    const { PoseLandmarker, FilesetResolver } = await import(VISION_MODULE_URL);
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
      onStatus?.("Pose model ready");
    } catch {
      // CPU fallback
      onStatus?.("GPU failed — retrying CPU…");
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      onStatus?.("Pose model ready (CPU)");
    }
    return landmarker;
  })();
  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

/**
 * Fully functional camera scanner session.
 * Uses live webcam + MediaPipe Pose Landmarker; optional synthetic driver for demos/tests.
 */
export function createScannerSession(ui) {
  const {
    video,
    canvas,
    statusEl,
    cueEl,
    countEl,
    meterEl,
    stageEl,
  } = ui;

  let stream = null;
  let raf = 0;
  let running = false;
  let counter = null;
  let session = null;
  let lastTs = 0;
  let synthetic = false;
  let synthT = 0;
  let useCamera = true;

  const ctx = canvas.getContext("2d");

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function setCue(msg) {
    if (cueEl) cueEl.textContent = msg;
  }

  function setCount(label) {
    if (countEl) countEl.textContent = label;
  }

  function setMeter(pct) {
    if (meterEl) meterEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  async function startCamera() {
    if (stream) return;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
    });
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play();
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.srcObject = null;
  }

  function drawFrame(keymap, w, h) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // scanner frame HUD
    ctx.save();
    ctx.strokeStyle = "rgba(0,229,255,0.55)";
    ctx.lineWidth = 2;
    const m = 18;
    const L = 28;
    // corners
    [
      [m, m, 1, 1],
      [w - m, m, -1, 1],
      [m, h - m, 1, -1],
      [w - m, h - m, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * L, y);
      ctx.stroke();
    });
    ctx.restore();

    if (!keymap) return;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,229,255,0.85)";
    ctx.fillStyle = "rgba(61,255,154,0.95)";

    for (const [a, b] of SKELETON) {
      const p = keymap[a];
      const q = keymap[b];
      if (!p || !q) continue;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    for (const p of Object.values(keymap)) {
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Place a point at `len` px from `origin` along `deg` (screen y+ down). */
  function polar(origin, deg, len) {
    const r = (deg * Math.PI) / 180;
    return { x: origin.x + Math.cos(r) * len, y: origin.y + Math.sin(r) * len, score: 0.98 };
  }

  /** Build A—B—C with exact interior angle at B. */
  function jointChain(b, angleDeg, lenA, lenC, rotDeg) {
    const a = polar(b, rotDeg, lenA);
    const c = polar(b, rotDeg + angleDeg, lenC);
    return { a, b, c };
  }

  /** Synthetic landmark trajectories — same counters as live camera (demo/CI). */
  function syntheticKeymap(kind, t, w, h) {
    const cx = w * 0.5;
    const map = {};
    const put = (name, p) => {
      map[name] = { x: p.x, y: p.y, score: p.score ?? 0.98 };
    };
    const wave = (speed) => (Math.sin(t * speed) + 1) / 2; // 0..1

    if (kind === "pushup") {
      // Exact elbow angle sweep 165° → 70° → 165°
      const elbowAngle = 165 - wave(3.6) * 95;
      const elbow = { x: cx - 20, y: h * 0.42 };
      const chain = jointChain(elbow, elbowAngle, h * 0.11, h * 0.11, 200);
      const shoulder = chain.a;
      const wrist = chain.c;
      const hip = { x: shoulder.x + w * 0.18, y: shoulder.y + h * 0.08 };
      put("nose", { x: shoulder.x - 8, y: shoulder.y - 26 });
      put("left_shoulder", shoulder);
      put("right_shoulder", { x: shoulder.x + 12, y: shoulder.y + 6 });
      put("left_elbow", elbow);
      put("right_elbow", { x: elbow.x + 10, y: elbow.y + 5 });
      put("left_wrist", wrist);
      put("right_wrist", { x: wrist.x + 10, y: wrist.y + 5 });
      put("left_hip", hip);
      put("right_hip", { x: hip.x + 12, y: hip.y + 5 });
      put("left_knee", { x: hip.x + 40, y: hip.y + 50 });
      put("right_knee", { x: hip.x + 48, y: hip.y + 55 });
      put("left_ankle", { x: hip.x + 70, y: hip.y + 95 });
      put("right_ankle", { x: hip.x + 78, y: hip.y + 100 });
    } else if (kind === "squat") {
      // Exact knee angle sweep 165° → 90° → 165°
      const kneeAngle = 165 - wave(2.9) * 80;
      const kneeL = { x: cx - 35, y: h * 0.62 };
      const kneeR = { x: cx + 35, y: h * 0.62 };
      const left = jointChain(kneeL, kneeAngle, h * 0.14, h * 0.14, 250);
      const right = jointChain(kneeR, kneeAngle, h * 0.14, h * 0.14, -70);
      // left.a = hip-ish, left.c = ankle-ish depending on rot — normalize: hip above, ankle below
      const hipL = left.a.y < left.c.y ? left.a : left.c;
      const ankleL = left.a.y < left.c.y ? left.c : left.a;
      const hipR = right.a.y < right.c.y ? right.a : right.c;
      const ankleR = right.a.y < right.c.y ? right.c : right.a;
      const shoulderY = Math.min(hipL.y, hipR.y) - h * 0.2;
      put("nose", { x: cx, y: shoulderY - 34 });
      put("left_shoulder", { x: cx - 42, y: shoulderY });
      put("right_shoulder", { x: cx + 42, y: shoulderY });
      put("left_elbow", { x: cx - 58, y: shoulderY + 36 });
      put("right_elbow", { x: cx + 58, y: shoulderY + 36 });
      put("left_wrist", { x: cx - 50, y: shoulderY + 66 });
      put("right_wrist", { x: cx + 50, y: shoulderY + 66 });
      put("left_hip", hipL);
      put("right_hip", hipR);
      put("left_knee", kneeL);
      put("right_knee", kneeR);
      put("left_ankle", ankleL);
      put("right_ankle", ankleR);
    } else if (kind === "situp") {
      // Exact shoulder-hip-knee angle: 140° (open) → 55° (curl) → 140°
      const torsoAngle = 140 - wave(3.1) * 90;
      const hip = { x: cx, y: h * 0.6 };
      const chain = jointChain(hip, torsoAngle, h * 0.18, h * 0.16, 200);
      const shoulder = chain.a;
      const knee = chain.c;
      put("nose", { x: shoulder.x, y: shoulder.y - 28 });
      put("left_shoulder", { x: shoulder.x - 18, y: shoulder.y });
      put("right_shoulder", { x: shoulder.x + 18, y: shoulder.y });
      put("left_elbow", { x: shoulder.x - 30, y: shoulder.y + 22 });
      put("right_elbow", { x: shoulder.x + 30, y: shoulder.y + 22 });
      put("left_wrist", { x: shoulder.x - 8, y: shoulder.y - 8 });
      put("right_wrist", { x: shoulder.x + 8, y: shoulder.y - 8 });
      put("left_hip", { x: hip.x - 14, y: hip.y });
      put("right_hip", { x: hip.x + 14, y: hip.y });
      put("left_knee", { x: knee.x - 10, y: knee.y });
      put("right_knee", { x: knee.x + 10, y: knee.y });
      put("left_ankle", { x: knee.x + 36, y: knee.y + 40 });
      put("right_ankle", { x: knee.x + 44, y: knee.y + 42 });
    } else if (kind === "run") {
      const swing = Math.sin(t * 9);
      const base = h * 0.36;
      put("nose", { x: cx, y: base - 40 });
      put("left_shoulder", { x: cx - 36, y: base });
      put("right_shoulder", { x: cx + 36, y: base });
      put("left_elbow", { x: cx - 50, y: base + 35 - swing * 20 });
      put("right_elbow", { x: cx + 50, y: base + 35 + swing * 20 });
      put("left_wrist", { x: cx - 40, y: base + 70 - swing * 25 });
      put("right_wrist", { x: cx + 40, y: base + 70 + swing * 25 });
      put("left_hip", { x: cx - 20, y: base + 90 });
      put("right_hip", { x: cx + 20, y: base + 90 });
      put("left_knee", { x: cx - 24, y: base + 140 - Math.max(0, swing) * 70 });
      put("right_knee", { x: cx + 24, y: base + 140 - Math.max(0, -swing) * 70 });
      put("left_ankle", { x: cx - 26, y: base + 210 - Math.max(0, swing) * 50 });
      put("right_ankle", { x: cx + 26, y: base + 210 - Math.max(0, -swing) * 50 });
    } else if (kind === "hydrate") {
      const sip = wave(1.8) > 0.42;
      const nose = { x: cx, y: h * 0.28 };
      put("nose", nose);
      put("left_shoulder", { x: cx - 40, y: h * 0.38 });
      put("right_shoulder", { x: cx + 40, y: h * 0.38 });
      put("left_elbow", { x: cx - 60, y: h * 0.48 });
      put("right_elbow", { x: cx + 30, y: h * (sip ? 0.3 : 0.46) });
      put("left_wrist", { x: cx - 45, y: h * 0.56 });
      put("right_wrist", sip
        ? { x: nose.x + 8, y: nose.y + 6 }
        : { x: cx + 55, y: h * 0.55 });
      put("left_hip", { x: cx - 22, y: h * 0.58 });
      put("right_hip", { x: cx + 22, y: h * 0.58 });
      put("left_knee", { x: cx - 24, y: h * 0.72 });
      put("right_knee", { x: cx + 24, y: h * 0.72 });
      put("left_ankle", { x: cx - 24, y: h * 0.86 });
      put("right_ankle", { x: cx + 24, y: h * 0.86 });
    } else {
      const n = Math.sin(t * 0.35) * 1.2;
      put("nose", { x: cx + n, y: h * 0.28 });
      put("left_shoulder", { x: cx - 38, y: h * 0.36 });
      put("right_shoulder", { x: cx + 38, y: h * 0.36 });
      put("left_elbow", { x: cx - 52, y: h * 0.48 });
      put("right_elbow", { x: cx + 52, y: h * 0.48 });
      put("left_wrist", { x: cx - 40, y: h * 0.56 });
      put("right_wrist", { x: cx + 40, y: h * 0.56 });
      put("left_hip", { x: cx - 22, y: h * 0.56 });
      put("right_hip", { x: cx + 22, y: h * 0.56 });
      put("left_knee", { x: cx - 26, y: h * 0.72 });
      put("right_knee", { x: cx + 26, y: h * 0.72 });
      put("left_ankle", { x: cx - 26, y: h * 0.86 });
      put("right_ankle", { x: cx + 26, y: h * 0.86 });
    }
    return map;
  }

  function applyProgress(result) {
    if (!session) return;
    const { quest, onProgress, kind } = session;
    let display = "0";
    let pct = 0;

    if (kind === "run") {
      const sessionKm = result.km ?? 0;
      const live = Math.min(quest.target, (session.baseProgress || 0) + sessionKm);
      const prev = quest._scanValue ?? quest.progress;
      if (live > prev) {
        onProgress(Math.round((live - prev) * 10) / 10);
        quest._scanValue = live;
      }
      display = `${live.toFixed(1)}`;
      pct = (live / quest.target) * 100;
    } else if (kind === "mind") {
      const sessionMin = result.minutes ?? 0;
      const live = Math.min(quest.target, (session.baseProgress || 0) + sessionMin);
      const prev = quest._scanValue ?? quest.progress;
      if (live > prev) {
        onProgress(Math.round((live - prev) * 10) / 10);
        quest._scanValue = live;
      }
      display = `${live.toFixed(1)}`;
      pct = (live / quest.target) * 100;
    } else if (kind === "hydrate") {
      if (result.gained > 0) onProgress(result.gained);
      display = String(quest.progress);
      pct = ((quest.progress + (result.hold || 0) * 0.25) / quest.target) * 100;
    } else {
      if (result.gained > 0) {
        onProgress(result.gained);
        stageEl?.classList.add("rep-flash");
        setTimeout(() => stageEl?.classList.remove("rep-flash"), 180);
      }
      const live = Math.min(quest.target, (session.baseProgress || 0) + (counter?.getReps?.() || 0));
      display = String(live);
      pct = (live / quest.target) * 100;
    }

    setCount(display);
    setMeter(pct);
    setCue(result.cue || "Scanning…");
  }

  async function loop(ts) {
    if (!running) return;
    const dt = lastTs ? Math.min(64, ts - lastTs) : 16;
    lastTs = ts;

    const w = canvas.width;
    const h = canvas.height;
    let keymap = null;
    let fromCamera = false;

    if (synthetic) {
      synthT += dt / 1000;
      keymap = syntheticKeymap(session.kind, synthT, w, h);
    } else if (useCamera && landmarker && video.readyState >= 2) {
      try {
        const lm = landmarker.detectForVideo(video, performance.now());
        const pose = lm.landmarks?.[0];
        if (pose) {
          keymap = toKeyMap(pose, w, h, true);
          fromCamera = true;
        }
      } catch {
        /* frame skip */
      }
    }

    ctx.clearRect(0, 0, w, h);
    if (useCamera && video.readyState >= 2) {
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
      if (fromCamera && keymap) {
        for (const p of Object.values(keymap)) {
          p.x = w - p.x;
        }
      }
      if (synthetic) {
        ctx.fillStyle = "rgba(4,12,22,0.28)";
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#071525");
      g.addColorStop(1, "#0c2438");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Live camera with no body → optional simulation fallback
    if (!keymap && session?.allowSynthFallback) {
      synthT += dt / 1000;
      keymap = syntheticKeymap(session.kind, synthT, w, h);
      setStatus("SIMULATION FEED — no body detected");
    }

    drawFrame(keymap, w, h);

    if (keymap && counter) {
      // accelerate hold-based quests in simulation so demos can finish
      let useDt = dt;
      if (synthetic) {
        if (session.kind === "mind") useDt = dt * 50;
        if (session.kind === "hydrate") useDt = dt * 2.5;
        if (session.kind === "run") useDt = dt * 3;
      }
      const result = counter.update(keymap, useDt);
      applyProgress(result);
      session.onFrame?.(result);
      if (session.kind !== "hydrate" && session.kind !== "mind" && session.kind !== "run") {
        const live = (session.baseProgress || 0) + counter.getReps();
        if (live >= session.quest.target) {
          setStatus("OBJECTIVE VERIFIED");
        }
      }
    } else {
      setCue("Align your full body in the scanner");
    }

    raf = requestAnimationFrame(loop);
  }

  async function start(opts) {
    const {
      quest,
      onProgress,
      onClose,
      onFrame,
      forceSynthetic = false,
      allowSynthFallback = false,
    } = opts;

    session = {
      quest,
      onProgress,
      onClose,
      onFrame,
      kind: questKind(quest.id),
      baseProgress: quest.progress,
      allowSynthFallback,
    };
    quest._scanValue = quest.progress;
    counter = createRepCounter(session.kind);
    counter.reset();
    synthetic = forceSynthetic;
    synthT = 0;
    lastTs = 0;
    running = true;

    // size canvas to stage
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    setStatus(forceSynthetic ? "SIMULATION MODE" : "Initializing scanner…");
    setCount("—");
    setMeter((quest.progress / quest.target) * 100);
    setCue("Preparing pose landmarker…");

    if (!forceSynthetic) {
      try {
        await ensureModel(setStatus);
        await startCamera();
        useCamera = true;
        setStatus("CAMERA LOCKED — perform the movement");
      } catch (err) {
        console.warn(err);
        useCamera = false;
        synthetic = true;
        setStatus("Camera unavailable — simulation feed");
      }
    } else {
      useCamera = false;
      try {
        // still try camera for realism in UI if permitted
        await startCamera();
        useCamera = true;
        await ensureModel(setStatus).catch(() => null);
      } catch {
        useCamera = false;
      }
      setStatus("SIMULATION MODE — synthetic hunter");
    }

    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    stopCamera();
    const close = session?.onClose;
    session = null;
    counter = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    close?.();
  }

  function enableSynthetic(on = true) {
    synthetic = on;
    if (on) setStatus("SIMULATION MODE");
  }

  return {
    start,
    stop,
    enableSynthetic,
    isRunning: () => running,
    ensureModel: () => ensureModel(setStatus),
  };
}
