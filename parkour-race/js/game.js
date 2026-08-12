import * as THREE from "three";
import {
  TRACK_HALF,
  RACER_COUNT,
  BASE_SPEED,
  MAX_SPEED,
  BOOST_SPEED,
  GRAVITY,
  SKINS,
  TRAILS,
  CITIES,
  AI_NAMES,
  ordinal,
  loadSave,
  writeSave,
} from "./config.js";
import { createStickman, setStickmanColor, animateStickman, createNameTag } from "./stickman.js";
import { Course, disposeCourse } from "./course.js";
import { AudioBus } from "./audio.js";

const $ = (id) => document.getElementById(id);

export class Game {
  constructor() {
    this.save = loadSave();
    this.audio = new AudioBus();
    this.audio.setMuted(this.save.muted);
    this.screen = "menu";
    this.cityIndex = Math.max(0, CITIES.findIndex((c) => c.id === this.save.city));
    this.keys = { left: false, right: false };
    this.pointer = { active: false, startX: 0, originX: 0 };
    this.racers = [];
    this.course = null;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.countdown = 0;
    this.trickText = "";
    this.trickT = 0;
    this.speedLines = [];
    this.initThree();
    this.bindUI();
    this.bindInput();
    this.showMenu(true);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.syncHUD();
  }

  initThree() {
    const canvas = $("game-canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
    this.camera.position.set(0, 12, -10);

    this.hemi = new THREE.HemisphereLight(0xe8f6ff, 0x8aa0b0, 0.85);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3d0, 1.15);
    this.sun.position.set(20, 40, -10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.scene.add(this.sun);

    this.camTarget = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = h > w ? 68 : 58;
    this.camera.updateProjectionMatrix();
  }

  bindUI() {
    $("play-btn").addEventListener("click", () => {
      this.audio.resume();
      this.audio.click();
      this.startRace();
    });
    $("shop-btn").addEventListener("click", () => {
      this.audio.click();
      this.openShop();
    });
    $("shop-close").addEventListener("click", () => {
      this.audio.click();
      this.closeShop();
    });
    $("mute-btn").addEventListener("click", () => {
      this.save.muted = !this.save.muted;
      this.audio.setMuted(this.save.muted);
      writeSave(this.save);
      this.syncHUD();
      this.audio.click();
    });
    $("prev-city").addEventListener("click", () => this.shiftCity(-1));
    $("next-city").addEventListener("click", () => this.shiftCity(1));
    $("retry-btn").addEventListener("click", () => {
      this.audio.click();
      this.startRace();
    });
    $("menu-btn").addEventListener("click", () => {
      this.audio.click();
      this.showMenu(true);
    });
    $("pause-btn").addEventListener("click", () => this.togglePause());
    $("resume-btn").addEventListener("click", () => this.togglePause());
    $("pause-quit").addEventListener("click", () => {
      this.paused = false;
      $("pause-overlay").classList.add("hidden");
      this.showMenu(true);
    });
  }

  bindInput() {
    const down = (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = true;
      if (e.code === "Escape" && this.screen === "race") this.togglePause();
      if (e.code === "KeyR" && this.screen === "race") this.startRace();
    };
    const up = (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const el = $("game-canvas");
    const ptrDown = (e) => {
      this.audio.resume();
      this.pointer.active = true;
      this.pointer.startX = e.clientX;
      const player = this.player();
      this.pointer.originX = player ? player.x : 0;
    };
    const ptrMove = (e) => {
      if (!this.pointer.active) return;
      const dx = (e.clientX - this.pointer.startX) / window.innerWidth;
      this.steerTarget = THREE.MathUtils.clamp(
        this.pointer.originX + dx * TRACK_HALF * 3.4,
        -TRACK_HALF,
        TRACK_HALF
      );
    };
    const ptrUp = () => {
      this.pointer.active = false;
    };
    window.addEventListener("pointerdown", ptrDown);
    window.addEventListener("pointermove", ptrMove);
    window.addEventListener("pointerup", ptrUp);
    window.addEventListener("pointercancel", ptrUp);
  }

  shiftCity(dir) {
    this.audio.click();
    this.cityIndex = (this.cityIndex + dir + CITIES.length) % CITIES.length;
    this.save.city = CITIES[this.cityIndex].id;
    writeSave(this.save);
    this.showMenu(true);
  }

  player() {
    return this.racers.find((r) => r.isPlayer);
  }

  clearWorld() {
    if (this.course) {
      this.scene.remove(this.course.group);
      disposeCourse(this.course);
      this.course = null;
    }
    for (const r of this.racers) this.scene.remove(r.mesh);
    this.racers = [];
    for (const s of this.speedLines) this.scene.remove(s);
    this.speedLines = [];
  }

  applyCityLights(city) {
    this.scene.background = new THREE.Color(city.sky);
    this.scene.fog = new THREE.Fog(city.fog, 70, 210);
    this.sun.color.setHex(city.sun);
    this.hemi.color.setHex(city.sky);
  }

  showMenu(rebuild) {
    this.screen = "menu";
    this.paused = false;
    $("hud").classList.add("hidden");
    $("countdown").classList.add("hidden");
    $("results").classList.add("hidden");
    $("shop").classList.add("hidden");
    $("pause-overlay").classList.add("hidden");
    $("menu").classList.remove("hidden");
    if (rebuild) this.buildMenuScene();
    this.syncHUD();
  }

  buildMenuScene() {
    this.clearWorld();
    const city = CITIES[this.cityIndex];
    this.applyCityLights(city);
    this.course = new Course(city.id, 7);
    this.scene.add(this.course.group);
    const skin = SKINS.find((s) => s.id === this.save.skin) || SKINS[0];
    const mesh = createStickman(skin.color);
    mesh.position.set(0, 8, 8);
    this.scene.add(mesh);
    this.racers = [
      {
        mesh,
        x: 0,
        y: 8,
        z: 8,
        vy: 0,
        speed: 0,
        boost: 0,
        isPlayer: true,
        action: "idle",
        grounded: true,
        finished: false,
      },
    ];
    this.placeOnGround(this.racers[0]);
    this.camera.position.set(2.8, this.racers[0].y + 2.2, this.racers[0].z - 5.5);
    this.camLook.set(0, this.racers[0].y + 1.1, this.racers[0].z + 4);
    this.camera.lookAt(this.camLook);
  }

  startRace() {
    this.clearWorld();
    const city = CITIES[this.cityIndex];
    this.applyCityLights(city);
    this.course = new Course(city.id, 11 + this.save.races);
    this.scene.add(this.course.group);

    const skin = SKINS.find((s) => s.id === this.save.skin) || SKINS[0];
    const trail = TRAILS.find((t) => t.id === this.save.trail) || TRAILS[0];
    const startZ = 2;
    const startY = this.course.groundAt(0, startZ)?.top ?? 8;

    this.racers = [];
    for (let i = 0; i < RACER_COUNT; i++) {
      const isPlayer = i === 0;
      const color = isPlayer ? skin.color : new THREE.Color().setHSL((i * 0.17) % 1, 0.75, 0.55).getHex();
      const mesh = createStickman(color, { outlined: isPlayer });
      if (isPlayer && trail.color) mesh.userData.trailMat.color.setHex(trail.color);
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = -3.6 + col * 2.4;
      const z = startZ - row * 1.6;
      const racer = {
        mesh,
        x,
        y: startY,
        z,
        vy: 0,
        speed: BASE_SPEED,
        boost: 0,
        isPlayer,
        action: "run",
        grounded: true,
        finished: false,
        finishTime: 0,
        skill: isPlayer ? 1 : 0.62 + Math.random() * 0.32,
        aiTarget: x,
        name: isPlayer ? "YOU" : AI_NAMES[i % AI_NAMES.length],
        lastPad: -1,
        lastHurdle: -1,
        lastTramp: -1,
        wall: 0,
        slideT: 0,
        vaultT: 0,
        invuln: 0,
        place: i + 1,
      };
      if (!isPlayer) {
        const tag = createNameTag(`${i + 1}th  ${racer.name}`);
        mesh.add(tag);
        racer.tag = tag;
      }
      mesh.position.set(x, startY, z);
      this.scene.add(mesh);
      this.racers.push(racer);
    }

    this.steerTarget = this.player().x;
    this.elapsed = 0;
    this.countdown = 3.2;
    this.paused = false;
    this.screen = "race";
    this.trickText = "";
    $("menu").classList.add("hidden");
    $("results").classList.add("hidden");
    $("shop").classList.add("hidden");
    $("hud").classList.remove("hidden");
    $("countdown").classList.remove("hidden");
    $("level-num").textContent = String((this.save.races % 12) + 1);
    this.spawnSpeedLines();
    this.syncHUD();
  }

  spawnSpeedLines() {
    for (let i = 0; i < 40; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 1.8 + Math.random()),
      ]);
      const m = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.18,
        })
      );
      m.position.set((Math.random() - 0.5) * 16, 6 + Math.random() * 10, Math.random() * 40);
      this.scene.add(m);
      this.speedLines.push(m);
    }
  }

  togglePause() {
    if (this.screen !== "race" || this.countdown > 0) return;
    this.paused = !this.paused;
    $("pause-overlay").classList.toggle("hidden", !this.paused);
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.033);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    if (this.screen === "menu" || this.screen === "shop") {
      const p = this.player();
      if (p) {
        animateStickman(p.mesh, dt, {
          speed: 0,
          grounded: true,
          action: "idle",
          lateral: 0,
        });
        p.mesh.rotation.y = Math.sin(performance.now() / 1400) * 0.25;
        this.camera.position.lerp(new THREE.Vector3(3.2, p.y + 2.4, p.z - 6.2), 0.04);
        this.camLook.lerp(new THREE.Vector3(p.x, p.y + 1.2, p.z + 3), 0.04);
        this.camera.lookAt(this.camLook);
      }
      return;
    }
    if (this.screen === "results") {
      const p = this.player();
      if (p) {
        animateStickman(p.mesh, dt, { speed: 0, grounded: true, action: "win", lateral: 0 });
        this.camera.position.lerp(new THREE.Vector3(p.x + 1.4, p.y + 1.8, p.z - 4.2), 0.05);
        this.camLook.lerp(new THREE.Vector3(p.x, p.y + 1.1, p.z), 0.05);
        this.camera.lookAt(this.camLook);
      }
      return;
    }
    if (this.paused) return;

    if (this.countdown > 0) {
      const prev = Math.ceil(this.countdown);
      this.countdown -= dt;
      const next = Math.ceil(this.countdown);
      if (next !== prev && next > 0) this.audio.countdown();
      if (this.countdown <= 0) {
        this.countdown = 0;
        $("countdown").classList.add("hidden");
        this.audio.go();
      } else {
        $("countdown").textContent = this.countdown > 0.35 ? String(Math.max(1, next)) : "GO";
        $("countdown").classList.remove("hidden");
      }
      this.updateCamera(dt);
      for (const r of this.racers) {
        r.mesh.position.set(r.x, r.y, r.z);
        animateStickman(r.mesh, dt, { speed: 0, grounded: true, action: "idle", lateral: 0 });
      }
      return;
    }

    this.elapsed += dt;
    this.trickT = Math.max(0, this.trickT - dt);
    if (this.trickT <= 0) $("trick").classList.add("hidden");

    for (const r of this.racers) this.updateRacer(r, dt);
    this.updatePlaces();
    this.updateCamera(dt);
    this.updateSpeedLines(dt);
    this.updateRaceHUD();

    const p = this.player();
    if (p && p.finished && this.screen === "race") this.endRace();
  }

  updateRacer(r, dt) {
    if (r.finished) {
      r.mesh.position.set(r.x, r.y, r.z);
      animateStickman(r.mesh, dt, { speed: 0, grounded: true, action: "win", lateral: 0 });
      return;
    }
    r.invuln = Math.max(0, r.invuln - dt);
    r.vaultT = Math.max(0, r.vaultT - dt);
    r.slideT = Math.max(0, r.slideT - dt);

    if (r.isPlayer) this.steerPlayer(r, dt);
    else this.steerAI(r, dt);

    r.boost = Math.max(0, r.boost - dt * 7);
    const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + r.boost);
    r.speed += (targetSpeed - r.speed) * Math.min(1, dt * 3);
    r.z += r.speed * dt;

    this.autoParkour(r, dt);

    r.vy -= GRAVITY * dt;
    r.y += r.vy * dt;
    this.placeOnGround(r);

    if (r.y < -6) this.respawn(r);

    if (r.z >= this.course.finishZ && !r.finished) {
      r.finished = true;
      r.finishTime = this.elapsed;
      r.action = "win";
      r.speed = 0;
    }

    r.mesh.position.set(r.x, r.y, r.z);
    const lateral = r.isPlayer ? (this.steerTarget - r.x) : r.aiTarget - r.x;
    animateStickman(r.mesh, dt, {
      speed: r.speed,
      grounded: r.grounded,
      action: r.action,
      wall: r.wall,
      lateral,
    });
  }

  steerPlayer(r, dt) {
    if (this.keys.left) this.steerTarget -= 14 * dt;
    if (this.keys.right) this.steerTarget += 14 * dt;
    this.steerTarget = THREE.MathUtils.clamp(this.steerTarget, -TRACK_HALF, TRACK_HALF);
    r.x += (this.steerTarget - r.x) * Math.min(1, dt * 10);
  }

  steerAI(r, dt) {
    if (Math.random() < dt * 0.7) {
      const pads = this.course.pads.filter((p) => p.z > r.z && p.z < r.z + 18);
      if (pads.length) r.aiTarget = pads[0].x;
      else r.aiTarget = THREE.MathUtils.clamp(r.aiTarget + (Math.random() - 0.5) * 3, -TRACK_HALF + 0.6, TRACK_HALF - 0.6);
    }
    const player = this.player();
    if (player) {
      const gap = player.z - r.z;
      if (gap > 18) r.boost = Math.max(r.boost, 6);
      if (gap < -22) r.speed *= 0.985;
    }
    r.x += (r.aiTarget - r.x) * dt * (3 + r.skill * 4);
  }

  autoParkour(r, dt) {
    const look = 2.8 + r.speed * 0.12;
    const ahead = this.course.groundAt(r.x, r.z + look);
    const here = this.course.groundAt(r.x, r.z);

    if (r.grounded && ahead && here && ahead.top > here.top + 1.1) {
      this.jump(r, 11 + (ahead.top - here.top) * 0.8);
    } else if (r.grounded && !ahead) {
      this.jump(r, 12.5);
      if (r.speed > 22) this.setAction(r, "flip", 0.7);
    } else if (r.grounded && ahead && ahead.top < here.top - 1.4) {
      this.jump(r, 9);
    }

    for (let i = 0; i < this.course.hurdles.length; i++) {
      const h = this.course.hurdles[i];
      if (r.lastHurdle === i) continue;
      if (Math.abs(h.z - r.z) < 0.7 && Math.abs(h.x - r.x) < h.w / 2 + 0.3 && r.y <= h.y + h.h + 0.8) {
        r.lastHurdle = i;
        this.setAction(r, "vault", 0.35);
        r.boost = Math.min(BOOST_SPEED, r.boost + 3.5);
        r.y = Math.max(r.y, h.y + h.h + 0.05);
        r.vy = Math.max(r.vy, 4);
        if (r.isPlayer) {
          this.audio.vault();
          this.showTrick("VAULT!");
        }
      }
    }

    for (const f of this.course.fences) {
      if (Math.abs(f.z - r.z) < 0.55 && Math.abs(f.x - r.x) < 1.6 && r.grounded && r.y < f.y + 1.3) {
        this.jump(r, 10);
        this.setAction(r, "vault", 0.3);
      }
    }

    for (const o of this.course.overheads) {
      if (Math.abs(o.z - r.z) < 0.8 && Math.abs(o.x - r.x) < o.w / 2 && r.grounded) {
        this.setAction(r, "slide", 0.45);
        r.slideT = 0.45;
      }
    }

    for (let i = 0; i < this.course.pads.length; i++) {
      const p = this.course.pads[i];
      if (r.lastPad === i) continue;
      if (Math.abs(p.z - r.z) < 1.1 && Math.abs(p.x - r.x) < 1.1 && r.grounded) {
        r.lastPad = i;
        r.boost = BOOST_SPEED;
        if (r.isPlayer) {
          this.audio.boost();
          this.showTrick("BOOST!");
        }
      }
    }

    for (let i = 0; i < this.course.tramps.length; i++) {
      const t = this.course.tramps[i];
      if (r.lastTramp === i) continue;
      if (Math.abs(t.z - r.z) < 1.2 && Math.abs(t.x - r.x) < 1.3 && r.y <= t.y + 0.6) {
        r.lastTramp = i;
        r.vy = 16;
        r.grounded = false;
        this.setAction(r, "flip", 0.9);
        if (r.isPlayer) {
          this.audio.jump();
          this.showTrick("FLIP!");
        }
      }
    }

    for (const zip of this.course.zips) {
      if (r.z > zip.z0 && r.z < zip.z1 && Math.abs(r.x - zip.x) < 1.4) {
        r.y += (zip.y - 0.9 - r.y) * Math.min(1, dt * 8);
        r.vy = 0;
        r.boost = Math.max(r.boost, 8);
        r.action = "run";
        r.x += (zip.x - r.x) * dt * 6;
      }
    }

    r.wall = 0;
    for (const w of this.course.walls) {
      if (Math.abs(r.z - w.z) < w.d / 2 && Math.abs(r.x - w.x) < 1.6 && r.y < w.top) {
        r.wall = w.side;
        r.action = "wall";
        r.y = Math.max(r.y, w.y + 0.2);
        r.vy = Math.max(r.vy, 0);
        r.grounded = true;
      }
    }

    if (r.vaultT > 0 && r.action !== "flip") r.action = "vault";
    else if (r.slideT > 0) r.action = "slide";
    else if (!r.grounded && r.action !== "flip" && r.action !== "wall") r.action = r.vy > 2 ? "jump" : "fall";
    else if (r.grounded && r.action !== "wall" && r.vaultT <= 0 && r.slideT <= 0 && r.action !== "stumble")
      r.action = "run";
  }

  jump(r, force) {
    if (!r.grounded && r.action !== "wall") return;
    r.vy = force;
    r.grounded = false;
    r.action = force > 13 ? "flip" : "jump";
    if (r.isPlayer) this.audio.jump();
    if (force > 13 && r.isPlayer) this.showTrick("FLIP!");
  }

  setAction(r, action, t) {
    r.action = action;
    if (action === "vault") r.vaultT = t;
    if (action === "slide") r.slideT = t;
  }

  placeOnGround(r) {
    const plat = this.course.groundAt(r.x, r.z);
    if (plat && r.vy <= 2 && r.y >= plat.top - 0.75 && r.y <= plat.top + 0.28) {
      const wasAir = !r.grounded;
      r.y = plat.top;
      r.vy = 0;
      r.grounded = true;
      if (wasAir && r.isPlayer && r.action !== "slide") this.audio.land();
      if (wasAir && r.speed > 20) r.boost = Math.min(BOOST_SPEED, r.boost + 1.2);
    } else {
      r.grounded = false;
    }

    if (plat && r.y < plat.top - 0.85 && r.y > plat.y + 0.2 && r.invuln <= 0) {
      r.z -= Math.max(0.4, r.speed * 0.04);
      r.speed *= 0.55;
      r.boost = 0;
      r.action = "stumble";
      r.invuln = 0.45;
      if (r.isPlayer) this.audio.stumble();
    }
  }

  respawn(r) {
    const cp = this.course.nearestCheckpoint(r.z - 4);
    r.x = r.isPlayer ? 0 : cp.x + (Math.random() - 0.5);
    r.y = cp.y + 0.05;
    r.z = cp.z + 0.5;
    r.vy = 0;
    r.speed *= 0.55;
    r.boost = 0;
    r.grounded = true;
    r.action = "stumble";
    r.invuln = 0.8;
    if (r.isPlayer) {
      this.steerTarget = r.x;
      this.audio.stumble();
      this.showTrick("OOPS!");
    }
  }

  updatePlaces() {
    const sorted = [...this.racers].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishTime - b.finishTime;
      return b.z - a.z;
    });
    sorted.forEach((r, i) => {
      r.place = i + 1;
      if (r.tag) {
        /* name tags stay */
      }
    });
  }

  updateCamera(dt) {
    const p = this.player();
    if (!p) return;
    const back = this.countdown > 0 ? 7.2 : 8.4;
    const height = p.action === "flip" || p.action === "jump" ? 3.4 : 2.7;
    const desired = new THREE.Vector3(p.x * 0.35, p.y + height, p.z - back);
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    this.camLook.lerp(new THREE.Vector3(p.x * 0.2, p.y + 1.15, p.z + 10), 1 - Math.pow(0.0008, dt));
    this.camera.lookAt(this.camLook);
    this.sun.position.set(p.x + 18, p.y + 35, p.z - 12);
    this.sun.target.position.set(p.x, p.y, p.z + 8);
    this.sun.target.updateMatrixWorld();
    if (!this.sun.target.parent) this.scene.add(this.sun.target);
  }

  updateSpeedLines(dt) {
    const p = this.player();
    if (!p) return;
    for (const line of this.speedLines) {
      line.position.z -= (p.speed + 20) * dt;
      if (line.position.z < p.z - 8) {
        line.position.set((Math.random() - 0.5) * 14, p.y + Math.random() * 8, p.z + 8 + Math.random() * 20);
      }
      line.material.opacity = THREE.MathUtils.clamp((p.speed - 14) / 40, 0.04, 0.28);
    }
  }

  showTrick(text) {
    this.trickText = text;
    this.trickT = 0.7;
    const el = $("trick");
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  updateRaceHUD() {
    const p = this.player();
    if (!p) return;
    $("rank").textContent = ordinal(p.place);
    const prog = THREE.MathUtils.clamp(p.z / this.course.finishZ, 0, 1);
    $("progress-fill").style.width = `${prog * 100}%`;
    $("progress-pip").style.left = `${prog * 100}%`;
  }

  endRace() {
    this.screen = "results";
    const p = this.player();
    const place = p.place;
    const coins = Math.max(10, 140 - (place - 1) * 12) + (place === 1 ? 80 : 0);
    this.save.coins += coins;
    this.save.races += 1;
    const city = CITIES[this.cityIndex].id;
    const prev = this.save.bestPlace[city];
    if (!prev || place < prev) this.save.bestPlace[city] = place;
    writeSave(this.save);
    this.audio.finish(place);

    $("hud").classList.add("hidden");
    $("results").classList.remove("hidden");
    $("result-place").textContent = ordinal(place);
    $("result-place").className = "result-place " + (place === 1 ? "gold" : place <= 3 ? "silver" : "");
    $("result-sub").textContent =
      place === 1 ? "YOU WON THE RACE!" : place <= 3 ? "PODIUM FINISH!" : "KEEP PUSHING!";
    $("result-coins").textContent = `+${coins} COINS`;
    $("result-time").textContent = `${this.elapsed.toFixed(2)}s`;
    this.syncHUD();
  }

  openShop() {
    this.screen = "shop";
    $("menu").classList.add("hidden");
    $("shop").classList.remove("hidden");
    this.renderShop();
  }

  closeShop() {
    this.showMenu(true);
  }

  renderShop() {
    const skinsEl = $("skin-grid");
    skinsEl.innerHTML = "";
    for (const skin of SKINS) {
      const owned = this.save.unlockedSkins.includes(skin.id);
      const eq = this.save.skin === skin.id;
      const btn = document.createElement("button");
      btn.className = "skin-card" + (eq ? " equipped" : "");
      btn.innerHTML = `<span class="swatch" style="background:#${skin.color.toString(16).padStart(6, "0")}"></span>
        <strong>${skin.name}</strong>
        <small>${eq ? "EQUIPPED" : owned ? "OWNED" : skin.price + " COINS"}</small>`;
      btn.addEventListener("click", () => this.buyOrEquip("skin", skin));
      skinsEl.appendChild(btn);
    }
    const trailsEl = $("trail-grid");
    trailsEl.innerHTML = "";
    for (const trail of TRAILS) {
      const owned = this.save.unlockedTrails.includes(trail.id);
      const eq = this.save.trail === trail.id;
      const btn = document.createElement("button");
      btn.className = "skin-card" + (eq ? " equipped" : "");
      const c = trail.color ?? 0xff5a18;
      btn.innerHTML = `<span class="swatch" style="background:#${c.toString(16).padStart(6, "0")}"></span>
        <strong>${trail.name}</strong>
        <small>${eq ? "EQUIPPED" : owned ? "OWNED" : trail.price + " COINS"}</small>`;
      btn.addEventListener("click", () => this.buyOrEquip("trail", trail));
      trailsEl.appendChild(btn);
    }
  }

  buyOrEquip(kind, item) {
    const listKey = kind === "skin" ? "unlockedSkins" : "unlockedTrails";
    const eqKey = kind === "skin" ? "skin" : "trail";
    if (this.save[listKey].includes(item.id)) {
      this.save[eqKey] = item.id;
      this.audio.click();
    } else if (this.save.coins >= item.price) {
      this.save.coins -= item.price;
      this.save[listKey].push(item.id);
      this.save[eqKey] = item.id;
      this.audio.coin();
    } else {
      this.audio.stumble();
      return;
    }
    writeSave(this.save);
    const p = this.player();
    if (p && kind === "skin") setStickmanColor(p.mesh, item.color);
    this.renderShop();
    this.syncHUD();
  }

  syncHUD() {
    for (const el of document.querySelectorAll(".coin-count")) el.textContent = String(this.save.coins);
    $("mute-btn").textContent = this.save.muted ? "🔇" : "🔊";
    $("city-name").textContent = CITIES[this.cityIndex].name;
    const dots = $("city-dots");
    dots.innerHTML = CITIES.map(
      (c, i) => `<span class="dot${i === this.cityIndex ? " on" : ""}"></span>`
    ).join("");
  }
}

window.gameAPI = {
  start: () => window.__game?.startRace(),
  getRank: () => window.__game?.player()?.place,
  getZ: () => window.__game?.player()?.z,
  getScreen: () => window.__game?.screen,
  steer: (x) => {
    if (window.__game) window.__game.steerTarget = x;
  },
};
