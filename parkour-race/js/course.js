import * as THREE from "three";
import { CITIES, seeded } from "./config.js";

const WHITE = 0xffffff;
const ORANGE = 0xff5a18;
const YELLOW = 0xffe14a;

function boxMesh(w, h, d, color, { emissive = 0x000000, y = 0, emissiveIntensity = 0.55 } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: emissive ? emissiveIntensity : 0,
    })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = y;
  return mesh;
}

function chevronTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#ff5a18";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#ffe14a";
  const drawChevron = (y) => {
    g.beginPath();
    g.moveTo(64, y);
    g.lineTo(20, y + 28);
    g.lineTo(36, y + 28);
    g.lineTo(64, y + 10);
    g.lineTo(92, y + 28);
    g.lineTo(108, y + 28);
    g.closePath();
    g.fill();
  };
  drawChevron(18);
  drawChevron(58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function fenceTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(40,50,60,0.85)";
  g.lineWidth = 3;
  for (let i = -128; i < 256; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 128, 128);
    g.stroke();
    g.beginPath();
    g.moveTo(i + 128, 0);
    g.lineTo(i, 128);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1.2);
  return t;
}

function checkerSky(city) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  const a = "#" + city.sky.toString(16).padStart(6, "0");
  const b = "#" + city.skyDark.toString(16).padStart(6, "0");
  g.fillStyle = a;
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = b;
  g.globalAlpha = 0.22;
  const s = 64;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 0) g.fillRect(x * s, y * s, s, s);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 8);
  return t;
}

export class Course {
  constructor(cityId, seed = 1) {
    this.city = CITIES.find((c) => c.id === cityId) || CITIES[0];
    this.rng = seeded(seed + cityId.length * 97);
    this.group = new THREE.Group();
    this.platforms = [];
    this.pads = [];
    this.hurdles = [];
    this.fences = [];
    this.walls = [];
    this.zips = [];
    this.tramps = [];
    this.overheads = [];
    this.checkpoints = [0];
    this.finishZ = 0;
    this.chevTex = chevronTexture();
    this.fenceTex = fenceTexture();
    this.build();
  }

  addPlatform(x, surfaceY, z, w, d) {
    const h = surfaceY + 7;
    const mesh = boxMesh(w, h, d, WHITE, { y: surfaceY - h / 2, emissive: 0xffffff, emissiveIntensity: 0.42 });
    mesh.position.x = x;
    mesh.position.z = z;
    this.group.add(mesh);
    this.platforms.push({ x, z, w, d, y: surfaceY - h, h, top: surfaceY, mesh });
    return mesh;
  }

  addPad(x, z, y) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 2.2),
      new THREE.MeshLambertMaterial({
        map: this.chevTex,
        emissive: YELLOW,
        emissiveIntensity: 0.35,
      })
    );
    mesh.position.set(x, y + 0.05, z);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    const glow = boxMesh(1.7, 0.04, 2.3, ORANGE, { emissive: ORANGE, y: y + 0.02 });
    glow.position.x = x;
    glow.position.z = z;
    this.group.add(glow);
    this.pads.push({ x, z, y, w: 1.8, d: 2.4 });
  }

  addHurdle(x, z, y, w = 2.2) {
    const h = 0.7;
    const mesh = boxMesh(w, h, 0.28, ORANGE, { y: y + h / 2 });
    mesh.position.x = x;
    mesh.position.z = z;
    this.group.add(mesh);
    this.hurdles.push({ x, z, y, w, h, d: 0.5 });
  }

  addFence(x, z, y, rot = 0.35) {
    const w = 3.2;
    const h = 1.15;
    const mat = new THREE.MeshLambertMaterial({
      map: this.fenceTex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      color: 0xc8d0d8,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.y = rot;
    this.group.add(mesh);
    const postL = boxMesh(0.08, h, 0.08, 0x8899aa, { y: y + h / 2 });
    postL.position.set(x - Math.cos(rot) * w * 0.5, 0, z - Math.sin(rot) * w * 0.5);
    const postR = boxMesh(0.08, h, 0.08, 0x8899aa, { y: y + h / 2 });
    postR.position.set(x + Math.cos(rot) * w * 0.5, 0, z + Math.sin(rot) * w * 0.5);
    this.group.add(postL, postR);
    this.fences.push({ x, z, y, w, h, rot });
  }

  addWall(x, z, y, d, h, side) {
    const mesh = boxMesh(0.6, h, d, WHITE, { y: y + h / 2 });
    mesh.position.set(x, 0, z);
    this.group.add(mesh);
    this.walls.push({ x, z, y, d, h, side, top: y + h });
  }

  addOverhead(x, z, y, w = 6) {
    const mesh = boxMesh(w, 0.35, 0.5, WHITE, { y: y + 1.15 });
    mesh.position.set(x, 0, z);
    this.group.add(mesh);
    this.overheads.push({ x, z, y, w, height: 0.95 });
  }

  addTramp(x, z, y) {
    const mesh = boxMesh(2.2, 0.18, 2.2, 0xff4d6a, { emissive: 0xff4d6a, y: y + 0.12 });
    mesh.position.set(x, 0, z);
    this.group.add(mesh);
    this.tramps.push({ x, z, y, w: 2.4, d: 2.4 });
  }

  addZip(x, z0, z1, y) {
    const len = z1 - z0;
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, len, 6),
      new THREE.MeshLambertMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 0.4 })
    );
    cable.rotation.x = Math.PI / 2;
    cable.position.set(x, y + 1.6, (z0 + z1) / 2);
    this.group.add(cable);
    this.zips.push({ x, z0, z1, y: y + 1.6 });
  }

  addWaterTower(x, z, y) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.9, 12),
      new THREE.MeshLambertMaterial({ color: ORANGE })
    );
    tank.position.set(x, y + 2.1, z);
    tank.castShadow = true;
    this.group.add(tank);
    for (const [dx, dz] of [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.45, 0.45],
      [0.45, 0.45],
    ]) {
      const leg = boxMesh(0.1, 1.7, 0.1, 0xdddddd, { y: y + 0.85 });
      leg.position.set(x + dx, 0, z + dz);
      this.group.add(leg);
    }
  }

  addScaffold(z, y, w = 2.2, d = 18) {
    const deck = this.addPlatform(0, y, z, w, d);
    deck.material.color.setHex(0xf4f7fb);
    for (let i = -1; i <= 1; i += 2) {
      const rail = boxMesh(0.08, 0.7, d, 0xe8eef4, { y: y + 0.55 });
      rail.position.set(i * (w / 2), 0, z);
      this.group.add(rail);
    }
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.08, d),
      new THREE.MeshLambertMaterial({ color: 0xe0e6ee })
    );
    strut.position.set(0, y - 0.4, z);
    this.group.add(strut);
  }

  addFinish(z, y) {
    this.finishZ = z;
    const arch = boxMesh(12, 0.4, 0.4, 0x222222, { y: y + 3.4 });
    arch.position.z = z;
    this.group.add(arch);
    for (const s of [-1, 1]) {
      const post = boxMesh(0.35, 3.4, 0.35, 0x222222, { y: y + 1.7 });
      post.position.set(s * 5.8, 0, z);
      this.group.add(post);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const g = canvas.getContext("2d");
    const cs = 24;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 21; col++) {
        g.fillStyle = (row + col) % 2 === 0 ? "#111" : "#f4f4f4";
        g.fillRect(col * cs, row * cs, cs, cs);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(11.4, 1.6),
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
    );
    banner.position.set(0, y + 2.7, z);
    this.group.add(banner);
  }

  roof(z, d, w, y, x = 0) {
    this.addPlatform(x, y, z, w, d);
  }

  buildSkyline() {
    const city = this.city;
    const skyMat = new THREE.MeshBasicMaterial({
      map: checkerSky(city),
      side: THREE.BackSide,
      fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), skyMat);
    this.group.add(sky);

    const silMat = new THREE.MeshLambertMaterial({ color: city.silhouette });
    for (let i = 0; i < 70; i++) {
      const side = this.rng() > 0.5 ? 1 : -1;
      const bw = 4 + this.rng() * 10;
      const bd = 4 + this.rng() * 10;
      const bh = 18 + this.rng() * 70;
      const x = side * (18 + this.rng() * 90);
      const z = -20 + this.rng() * (this.finishZ + 80);
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), silMat);
      b.position.set(x, bh / 2 - 8, z);
      this.group.add(b);
    }

    if (city.landmark === "crane") {
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 === 0 ? -1 : 1) * (22 + i * 8);
        const z = 40 + i * 90;
        const mast = boxMesh(0.5, 28, 0.5, 0xd8e4ee, { y: 14 });
        mast.position.set(x, 0, z);
        const arm = boxMesh(18, 0.4, 0.4, 0xd8e4ee, { y: 26 });
        arm.position.set(x + 6, 0, z);
        this.group.add(mast, arm);
      }
    } else if (city.landmark === "tower") {
      const tower = new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 42, 4),
        new THREE.MeshLambertMaterial({ color: city.silhouette })
      );
      tower.position.set(-28, 22, 180);
      this.group.add(tower);
    } else if (city.landmark === "neon") {
      for (let i = 0; i < 10; i++) {
        const neon = boxMesh(0.3, 6 + this.rng() * 10, 0.3, 0xff66cc, {
          emissive: 0xff66cc,
          y: 10,
        });
        neon.position.set((this.rng() > 0.5 ? 1 : -1) * (16 + this.rng() * 30), 0, 30 + i * 40);
        this.group.add(neon);
      }
    } else if (city.landmark === "spire") {
      const spire = boxMesh(2.2, 80, 2.2, 0xe8f6ff, { y: 40 });
      spire.position.set(30, 0, 200);
      this.group.add(spire);
    }

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 900),
      new THREE.MeshLambertMaterial({ color: city.silhouette, transparent: true, opacity: 0.35 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -12, 200);
    this.group.add(ground);
  }

  build() {
    const city = this.city.id;
    let z = 0;
    const y0 = 8;
    this.roof(12, 28, 14, y0);
    this.checkpoints.push(0);

    const lane = (i) => -3.2 + i * 3.2;

    z = 32;
    this.roof(z, 22, 12, y0);
    for (let i = 0; i < 3; i++) this.addPad(lane(i), z - 4 + i * 0.2, y0);

    z = 52;
    this.roof(z, 18, 12, y0);
    this.addHurdle(-2.2, z - 2, y0, 3.4);
    this.addHurdle(2.4, z + 4, y0, 3.2);

    z = 68;
    this.roof(z, 10, 11, y0);
    z = 82;
    this.roof(z, 14, 11, y0);
    this.addPad(0, 82, y0);
    this.checkpoints.push(82);

    z = 98;
    this.roof(z, 16, 12, y0);
    this.addFence(-1.5, z - 2, y0, 0.4);
    this.addFence(1.8, z + 3, y0, -0.35);

    z = 116;
    this.roof(z, 14, 10, y0 - 2.5);
    this.addPad(-2, z, y0 - 2.5);
    this.addPad(2, z + 2, y0 - 2.5);

    z = 132;
    this.roof(z, 16, 12, y0 - 2.5);
    this.addHurdle(0, z, y0 - 2.5, 4.5);
    this.addWaterTower(-4.2, z + 4, y0 - 2.5);

    z = 150;
    this.addScaffold(z, y0 - 1.2, 4.6, 16);
    this.checkpoints.push(150);

    z = 168;
    this.roof(z, 16, 11, y0);
    this.addOverhead(0, z + 2, y0);
    this.addPad(0, z - 4, y0);

    z = 184;
    this.roof(z, 18, 11, y0);
    this.addWall(-5.4, z, y0, 16, 4.5, -1);
    this.addPad(1.5, z, y0);

    z = 204;
    this.roof(z, 14, 12, y0 + 1.5);
    this.addTramp(0, z - 2, y0 + 1.5);

    z = 222;
    this.roof(z, 16, 12, y0 + 3.2);
    this.addHurdle(-2, z - 2, y0 + 3.2);
    this.addHurdle(2.4, z + 3, y0 + 3.2);
    this.checkpoints.push(222);

    z = 242;
    this.roof(z, 16, 6, y0 + 2.4, 0);
    this.roof(z, 14, 5, y0 + 3.2, -4.2);
    this.roof(z, 14, 5, y0 + 1.4, 4.2);
    this.addPad(-4.2, z, y0 + 3.2);
    this.addPad(4.2, z, y0 + 1.4);

    z = 258;
    this.roof(z, 16, 12, y0 + 1.4);
    this.addFence(0, z, y0 + 1.4, 0.15);
    this.addWaterTower(4.4, z + 3, y0 + 1.4);

    z = 276;
    this.addZip(-2.2, 268, 292, y0 + 1.4);
    this.roof(z, 18, 11, y0 + 1.4);
    z = 296;
    this.roof(z, 16, 12, y0);
    this.addPad(-3, z - 2, y0);
    this.addPad(0, z, y0);
    this.addPad(3, z + 2, y0);
    this.checkpoints.push(296);

    z = 316;
    this.roof(z, 14, 10, y0);
    this.addHurdle(0, z - 3, y0, 6);
    this.addOverhead(0, z + 4, y0);

    if (city === "tokyo" || city === "dubai") {
      z = 334;
      this.roof(z, 14, 11, y0 + 3.2);
      this.addPad(0, z, y0 + 3.2);
      z = 350;
      this.roof(z, 16, 12, y0 + 1.6);
    } else {
      z = 334;
      this.roof(z, 14, 12, y0);
      this.addTramp(0, z, y0);
      z = 350;
      this.roof(z, 16, 12, y0);
    }

    z = 368;
    this.roof(z, 18, 12, y0);
    this.addFence(-2, z - 4, y0, 0.45);
    this.addHurdle(2.2, z + 2, y0, 3);
    this.addPad(0, z + 6, y0);

    z = 390;
    this.roof(z, 22, 13, y0);
    for (let i = 0; i < 3; i++) this.addPad(lane(i), z - 4 + i * 3, y0);
    this.addFinish(402, y0);
    this.roof(410, 16, 14, y0);
    this.checkpoints.push(402);

    this.buildSkyline();
  }

  groundAt(x, z) {
    let best = null;
    for (const p of this.platforms) {
      if (
        x >= p.x - p.w / 2 - 0.15 &&
        x <= p.x + p.w / 2 + 0.15 &&
        z >= p.z - p.d / 2 - 0.15 &&
        z <= p.z + p.d / 2 + 0.15
      ) {
        if (!best || p.top > best.top) best = p;
      }
    }
    return best;
  }

  nearestCheckpoint(z) {
    let best = 0;
    for (const c of this.checkpoints) {
      if (c <= z + 0.5) best = c;
    }
    const plat = this.groundAt(0, best) || this.platforms[0];
    return { z: best, y: plat ? plat.top : 8, x: 0 };
  }
}

export function disposeCourse(course) {
  course.group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}
