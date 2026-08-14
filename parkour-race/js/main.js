import * as THREE from 'three';
import { Course } from './course.js';
import { Runner, TUNE, STATES } from './runner.js';
import { Stickman } from './stickman.js';
import { createBots } from './bots.js';
import { ChaseCamera } from './camera.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Sfx } from './audio.js';

const PHASE = { TITLE: 0, COUNTDOWN: 1, RACING: 2, FINISHED: 3 };

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8a5fd6);
    this.scene.fog = new THREE.Fog(0x8a5fd6, 55, 150);
    this._buildSky();
    this._buildLights();

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
    this.chase = new ChaseCamera(this.camera);

    this.input = new Input(document.getElementById('app'));
    this.ui = new UI();
    this.sfx = new Sfx();

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.ui.el.btnStart.addEventListener('click', () => { this.sfx.resume(); this.startRace(); });
    this.ui.el.btnRetry.addEventListener('click', () => { this.sfx.resume(); this.startRace(); });

    this.phase = PHASE.TITLE;
    this.raceTime = 0;
    this.particles = [];

    this._setupWorld();
    this.ui.showTitle();

    this._last = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _buildSky() {
    // vertical gradient dome
    const geo = new THREE.SphereGeometry(300, 16, 12);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x5a34c4) },
        bottom: { value: new THREE.Color(0xff9e7a) },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vPos; uniform vec3 top; uniform vec3 bottom;
        void main(){ float h = normalize(vPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottom, top, smoothstep(0.05, 0.6, h)), 1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(9, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0 })
    );
    sun.position.set(-60, 40, 180);
    this.scene.add(sun);
    this.sun = sun;
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xcdb4ff, 0x3a2a66, 0.95));
    const dir = new THREE.DirectionalLight(0xfff1d6, 1.35);
    dir.position.set(-12, 24, -10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -18;
    dir.shadow.camera.right = 18;
    dir.shadow.camera.top = 22;
    dir.shadow.camera.bottom = -22;
    dir.shadow.camera.far = 80;
    this.scene.add(dir);
    this.dirLight = dir;
  }

  _setupWorld() {
    if (this.world) this.scene.remove(this.world);
    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.course = new Course(this.world);

    const playerStick = new Stickman(0x23233a, 0xffd54a);
    this.world.add(playerStick.root);
    this.player = new Runner(this.course, playerStick, { name: 'YOU', isPlayer: true, startX: 0 });

    this.bots = createBots(this.course, this.world, 7);
    this.racers = [this.player, ...this.bots.map((b) => b.runner)];

    this.finishedCount = 0;
    this.raceTime = 0;
    this.particles.forEach((p) => this.world.remove(p.mesh));
    this.particles = [];

    this.ui.initDots(this.racers);
    this.chase.snapTo(this.player);
  }

  startRace() {
    this._setupWorld();
    this.ui.startRace();
    this.phase = PHASE.COUNTDOWN;
    this.countdownT = 0;
    this.countStage = -1;
    this._resultsShown = false;
  }

  // ------------------------------------------------------------ particles
  _burst(pos, color, count = 12, speed = 5, life = 0.55) {
    const geo = new THREE.SphereGeometry(0.09, 6, 5);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.copy(pos);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.9,
        (Math.random() - 0.5) * speed
      );
      this.world.add(mesh);
      this.particles.push({ mesh, v, life, maxLife: life });
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.world.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.v.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.material.opacity = p.life / p.maxLife;
      const s = 0.5 + (p.life / p.maxLife) * 0.5;
      p.mesh.scale.setScalar(s);
    }
  }

  // ------------------------------------------------------------ race flow
  _updateCountdown(dt) {
    this.countdownT += dt;
    const stage = Math.floor(this.countdownT);
    if (stage !== this.countStage) {
      this.countStage = stage;
      if (stage < 3) {
        this.ui.showCountdown(String(3 - stage));
        this.sfx.countBeep(false);
      } else {
        this.ui.showCountdown('GO!');
        this.sfx.countBeep(true);
        for (const r of this.racers) r.running = true;
        this.phase = PHASE.RACING;
        setTimeout(() => this.ui.hideCountdown(), 700);
      }
    }
  }

  _updateRacing(dt) {
    this.raceTime += dt;

    // ---- player input
    const p = this.player;
    if (this.input.holding) p.holdJump();
    if (this.input.releasedThisFrame) p.releaseJump();
    p.steer(this.input.keySteer);
    p.steerDrag(this.input.dragDeltaX);

    // ---- simulate
    p.update(dt);
    this._consumeEvents(p, true);
    for (const b of this.bots) {
      b.update(dt, p.pos.z);
      this._consumeEvents(b.runner, false);
    }

    // ---- finish detection
    for (const r of this.racers) {
      if (!r.finished && r.pos.z >= this.course.finishZ) {
        this.finishedCount++;
        r.finish(this.raceTime);
        r.place = this.finishedCount;
        if (r.isPlayer) {
          this.sfx.finish(r.place <= 3);
          this.phase = PHASE.FINISHED;
          this.finishDelay = 1.6;
        }
      }
    }

    // ---- HUD
    const standings = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.place - b.place;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.pos.z - a.pos.z;
    });
    const playerRank = standings.indexOf(p) + 1;
    this.ui.setPosition(playerRank);
    this.ui.updateDots(this.racers, this.course.finishZ);
    this.ui.setCharge(Math.min(1, p.charge / TUNE.chargeTime), p.charging);
    this.ui.setSpeedEffect(p.speed / TUNE.boostedMax);
    this._standings = standings;
  }

  _updateFinished(dt) {
    // let everyone keep running briefly, then show results
    this.player.update(dt);
    for (const b of this.bots) {
      b.update(dt, this.player.pos.z);
      const r = b.runner;
      if (!r.finished && r.pos.z >= this.course.finishZ) {
        this.finishedCount++;
        r.finish(this.raceTime + 0.0001 * this.finishedCount);
        r.place = this.finishedCount;
      }
    }
    this.raceTime += dt;
    this.finishDelay -= dt;
    if (this.finishDelay <= 0 && !this._resultsShown) {
      this._resultsShown = true;
      const standings = [...this.racers].sort((a, b) => {
        if (a.finished && b.finished) return a.place - b.place;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.pos.z - a.pos.z;
      });
      this.ui.showResults(this.player.place, standings);
    }
  }

  _consumeEvents(runner, isPlayer) {
    for (const ev of runner.events) {
      const pos = runner.pos.clone();
      switch (ev.type) {
        case 'jump':
          if (isPlayer) this.sfx.jump(ev.data.charge);
          this._burst(pos, 0xffffff, 6, 3, 0.35);
          break;
        case 'land':
          if (isPlayer) {
            this.sfx.land();
            this.chase.addShake(Math.min(0.5, ev.data.impact * 0.02));
          }
          this._burst(pos, 0xcccccc, 5, 2.5, 0.3);
          break;
        case 'perfect':
          if (isPlayer) {
            this.sfx.perfect();
            this.ui.popup('PERFECT!', '#7CFC8E');
          }
          this._burst(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x7cfc8e, 16, 6, 0.6);
          break;
        case 'boost':
          if (isPlayer) {
            this.sfx.boost();
            this.chase.addShake(0.15);
          }
          this._burst(new THREE.Vector3(ev.data.x, pos.y + 0.4, ev.data.z), 0xffa040, 14, 7, 0.5);
          break;
        case 'tramp':
          if (isPlayer) this.sfx.tramp();
          this._burst(pos, 0x37d5ff, 12, 5, 0.5);
          break;
        case 'vault':
          if (isPlayer) this.sfx.vault();
          break;
        case 'rail':
          if (isPlayer) this.sfx.rail();
          break;
        case 'stumble':
          if (isPlayer) {
            this.sfx.stumble();
            this.ui.popup('OOF!', '#ff8a80');
            this.chase.addShake(0.6);
          }
          this._burst(pos.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xff6b6b, 10, 4, 0.5);
          break;
        case 'stumbleWall':
          if (isPlayer) {
            this.sfx.stumble();
            this.chase.addShake(0.5);
          }
          this._burst(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff6b6b, 10, 4, 0.5);
          break;
        case 'fall':
          if (isPlayer) this.sfx.fall();
          break;
        case 'respawn':
          if (isPlayer) this.ui.popup('BACK ON!', '#c0e6ff');
          break;
      }
    }
  }

  // ------------------------------------------------------------ loop
  _loop(t) {
    requestAnimationFrame((tt) => this._loop(tt));
    let dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;

    if (this.phase === PHASE.COUNTDOWN) {
      this._updateCountdown(dt);
      this.player.update(dt);
      for (const b of this.bots) b.update(dt, this.player.pos.z);
    } else if (this.phase === PHASE.RACING) {
      this._updateRacing(dt);
    } else if (this.phase === PHASE.FINISHED) {
      this._updateFinished(dt);
    } else {
      // title screen: slow idle orbit over the start
      this.player.update(dt);
      for (const b of this.bots) b.update(dt, 0);
    }

    this._updateParticles(dt);
    this.chase.update(dt, this.player);

    // keep sky, sun, and shadow rig following the action
    this.sky.position.copy(this.camera.position);
    this.dirLight.position.set(this.player.pos.x - 12, this.player.pos.y + 24, this.player.pos.z - 10);
    this.dirLight.target.position.copy(this.player.pos);
    this.dirLight.target.updateMatrixWorld();

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

new Game();
