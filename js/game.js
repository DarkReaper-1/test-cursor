const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const GRAVITY = 0.45;
const MOVE_SPEED = 4.5;
const JUMP_FORCE = -11;
const WEB_SPEED = 18;
const MAX_WEB_LENGTH = 420;
const MIN_WEB_LENGTH = 60;

let width, height;
let cameraX = 0;
let buildings = [];
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let web = null;
let swingCount = 0;

const player = {
  x: 200,
  y: 300,
  vx: 0,
  vy: 0,
  w: 22,
  h: 36,
  onGround: false,
  onWall: false,
  facing: 1,
};

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  generateCity();
  player.y = getGroundY(player.x) - player.h;
}

function generateCity() {
  buildings = [];
  let x = -200;
  const worldWidth = 6000;

  while (x < worldWidth) {
    const bw = 80 + Math.random() * 120;
    const bh = 120 + Math.random() * (height * 0.55);
    const hue = 200 + Math.random() * 40;
    const lit = 12 + Math.random() * 18;

    const windows = [];
    const cols = Math.floor(bw / 18);
    const rows = Math.floor(bh / 22);
    for (let row = 1; row < rows; row++) {
      for (let col = 1; col < cols; col++) {
        if (Math.random() > 0.35) continue;
        windows.push({
          wx: col * 18,
          wy: row * 22,
          lit: Math.random() > 0.4,
        });
      }
    }

    buildings.push({
      x,
      y: height - bh,
      w: bw,
      h: bh,
      color: `hsl(${hue}, 18%, ${lit}%)`,
      windows,
    });

    x += bw + 20 + Math.random() * 80;
  }
}

function getGroundY(worldX) {
  let ground = height - 40;
  for (const b of buildings) {
    if (worldX >= b.x && worldX <= b.x + b.w) {
      ground = Math.min(ground, b.y);
    }
  }
  return ground;
}

function getBuildingAt(worldX, worldY) {
  for (const b of buildings) {
    if (
      worldX >= b.x &&
      worldX <= b.x + b.w &&
      worldY >= b.y &&
      worldY <= b.y + b.h
    ) {
      return b;
    }
  }
  return null;
}

function findWebAnchor(targetX, targetY) {
  let best = null;
  let bestDist = Infinity;

  for (const b of buildings) {
    const anchors = [
      { x: b.x, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w * 0.5, y: b.y },
      { x: b.x, y: b.y + b.h * 0.3 },
      { x: b.x + b.w, y: b.y + b.h * 0.3 },
      { x: b.x, y: b.y + b.h * 0.6 },
      { x: b.x + b.w, y: b.y + b.h * 0.6 },
    ];

    for (const a of anchors) {
      const dx = a.x - player.x;
      const dy = a.y - (player.y + player.h * 0.3);
      const dist = Math.hypot(dx, dy);
      const angleToMouse = Math.atan2(
        targetY - (player.y + player.h * 0.3),
        targetX - player.x
      );
      const angleToAnchor = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToMouse - angleToAnchor);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      if (
        dist < MAX_WEB_LENGTH &&
        dist > MIN_WEB_LENGTH &&
        angleDiff < 0.8 &&
        dist < bestDist
      ) {
        bestDist = dist;
        best = { x: a.x, y: a.y, length: dist };
      }
    }
  }

  return best;
}

function shootWeb() {
  const worldMouseX = mouse.x + cameraX;
  const worldMouseY = mouse.y;
  const anchor = findWebAnchor(worldMouseX, worldMouseY);

  if (anchor) {
    web = {
      ax: anchor.x,
      ay: anchor.y,
      length: anchor.length,
      shooting: true,
      shootT: 0,
    };
    statusEl.textContent = "Swinging!";
  }
}

function releaseWeb() {
  if (web) {
    web = null;
    statusEl.textContent = "Web released — aim and click to swing again";
  }
}

function handleInput() {
  if (web) return;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    player.vx -= MOVE_SPEED * 0.35;
    player.facing = -1;
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    player.vx += MOVE_SPEED * 0.35;
    player.facing = 1;
  }

  if ((keys[" "] || keys["Space"]) && (player.onGround || player.onWall)) {
    player.vy = JUMP_FORCE;
    if (player.onWall) {
      player.vx = player.facing * 8;
    }
    player.onGround = false;
    player.onWall = false;
  }
}

function applySwingPhysics() {
  if (!web) return;

  if (web.shooting) {
    web.shootT += WEB_SPEED;
    if (web.shootT >= web.length) {
      web.shooting = false;
      swingCount++;
      statusEl.textContent = `Swing #${swingCount} — release to let go`;
    }
    return;
  }

  const px = player.x + player.w * 0.5;
  const py = player.y + player.h * 0.3;
  const dx = px - web.ax;
  const dy = py - web.ay;
  const dist = Math.hypot(dx, dy);

  player.vy += GRAVITY * 0.85;

  player.x += player.vx;
  player.y += player.vy;

  const px2 = player.x + player.w * 0.5;
  const py2 = player.y + player.h * 0.3;
  const dx2 = px2 - web.ax;
  const dy2 = py2 - web.ay;
  const dist2 = Math.hypot(dx2, dy2);

  if (dist2 > web.length) {
    const nx = dx2 / dist2;
    const ny = dy2 / dist2;

    player.x = web.ax + nx * web.length - player.w * 0.5;
    player.y = web.ay + ny * web.length - player.h * 0.3;

    const vDotN = player.vx * nx + player.vy * ny;
    if (vDotN > 0) {
      player.vx -= vDotN * nx;
      player.vy -= vDotN * ny;
    }

    const tangentX = -ny;
    const tangentY = nx;
    const boost = (keys["ArrowLeft"] || keys["a"] || keys["A"] ? -1 : 0) +
      (keys["ArrowRight"] || keys["d"] || keys["D"] ? 1 : 0);
    if (boost !== 0) {
      player.vx += tangentX * boost * 0.4;
      player.vy += tangentY * boost * 0.4;
    }
  }

  player.vx *= 0.998;
  player.vy *= 0.998;
}

function applyNormalPhysics() {
  player.vy += GRAVITY;
  player.vx *= 0.88;
  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  player.onWall = false;

  const footY = player.y + player.h;
  const groundY = getGroundY(player.x + player.w * 0.5);

  if (footY >= groundY) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  for (const b of buildings) {
    const px = player.x + player.w * 0.5;
    const inX = px >= b.x && px <= b.x + b.w;

    if (!inX) continue;

    if (
      player.vy > 0 &&
      footY >= b.y &&
      footY <= b.y + 20 &&
      player.y < b.y
    ) {
      player.y = b.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    if (player.x + player.w > b.x && player.x + player.w < b.x + 14) {
      player.x = b.x - player.w;
      player.vx = 0;
      player.onWall = true;
      player.facing = -1;
    }
    if (player.x < b.x + b.w && player.x > b.x + b.w - 14) {
      player.x = b.x + b.w;
      player.vx = 0;
      player.onWall = true;
      player.facing = 1;
    }
  }

  if (player.y > height + 200) {
    respawn();
  }
}

function respawn() {
  player.x = 200;
  player.y = getGroundY(200) - player.h;
  player.vx = 0;
  player.vy = 0;
  web = null;
  statusEl.textContent = "Fell down — respawned!";
}

function updateCamera() {
  const target = player.x - width * 0.35;
  cameraX += (target - cameraX) * 0.08;
  if (cameraX < 0) cameraX = 0;
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#0b1022");
  grad.addColorStop(0.5, "#141c36");
  grad.addColorStop(1, "#1a2545");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 220, 120, 0.08)";
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.15, 50, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuildings() {
  for (const b of buildings) {
    const sx = b.x - cameraX;
    if (sx + b.w < -50 || sx > width + 50) continue;

    ctx.fillStyle = b.color;
    ctx.fillRect(sx, b.y, b.w, b.h);

    for (const win of b.windows) {
      ctx.fillStyle = win.lit
        ? "rgba(255, 230, 150, 0.7)"
        : "rgba(30, 40, 60, 0.8)";
      ctx.fillRect(sx + win.wx, b.y + win.wy, 10, 14);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, b.y, b.w, b.h);
  }

  ctx.fillStyle = "#0d1220";
  ctx.fillRect(0, height - 40, width, 40);
}

function drawWeb() {
  if (!web) return;

  const sx = player.x - cameraX + player.w * 0.5;
  const sy = player.y + player.h * 0.3;
  const ax = web.ax - cameraX;
  const ay = web.ay;

  let endX = ax;
  let endY = ay;

  if (web.shooting) {
    const t = web.shootT / web.length;
    endX = sx + (ax - sx) * Math.min(t, 1);
    endY = sy + (ay - sy) * Math.min(t, 1);
  }

  ctx.strokeStyle = "rgba(220, 230, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.fillStyle = "rgba(200, 210, 255, 0.8)";
  ctx.beginPath();
  ctx.arc(endX, endY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const sx = player.x - cameraX;
  const sy = player.y;
  const cx = sx + player.w * 0.5;
  const cy = sy + player.h * 0.3;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(player.facing, 1);

  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  const legAngle = web ? 0.5 : Math.sin(Date.now() * 0.01) * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(-6, 14 + legAngle * 8);
  ctx.moveTo(0, 4);
  ctx.lineTo(6, 14 - legAngle * 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(-8, -12);
  ctx.moveTo(0, -2);
  ctx.lineTo(8, -10);
  ctx.stroke();

  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(-9, 2, 18, 10);

  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.arc(0, -10, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(-1, -8);
  ctx.lineTo(3, -12);
  ctx.stroke();

  ctx.restore();
}

function drawAimHint() {
  if (web || !mouse.down) return;

  const worldMouseX = mouse.x + cameraX;
  const worldMouseY = mouse.y;
  const anchor = findWebAnchor(worldMouseX, worldMouseY);

  const sx = player.x - cameraX + player.w * 0.5;
  const sy = player.y + player.h * 0.3;

  ctx.strokeStyle = anchor
    ? "rgba(94, 234, 212, 0.5)"
    : "rgba(255, 100, 100, 0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (anchor) {
    ctx.fillStyle = "rgba(94, 234, 212, 0.6)";
    ctx.beginPath();
    ctx.arc(anchor.x - cameraX, anchor.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function update() {
  handleInput();

  if (web && !web.shooting) {
    applySwingPhysics();
  } else if (!web || web.shooting) {
    applyNormalPhysics();
    if (web && web.shooting) applySwingPhysics();
  }

  updateCamera();
}

function draw() {
  drawSky();
  drawBuildings();
  drawAimHint();
  drawWeb();
  drawPlayer();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", (e) => {
  mouse.down = true;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (!web) shootWeb();
});

canvas.addEventListener("mouseup", () => {
  mouse.down = false;
  releaseWeb();
});

canvas.addEventListener("mouseleave", () => {
  mouse.down = false;
});

resize();
loop();
