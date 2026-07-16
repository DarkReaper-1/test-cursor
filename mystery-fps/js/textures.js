import * as THREE from "three";

function canvasTex(draw, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function woodTexture() {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const y = (i / 40) * s;
      ctx.strokeStyle = `rgba(${40 + (i % 5) * 8},${28 + (i % 3) * 6},${16},0.35)`;
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.3, y + 4, s * 0.7, y - 4, s, y + 2);
      ctx.stroke();
    }
  });
}

export function wallpaperTexture() {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = "#2a3344";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(201,161,74,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < s; x += 32) {
      for (let y = 0; y < s; y += 32) {
        ctx.strokeRect(x + 4, y + 4, 24, 24);
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
}

export function carpetTexture() {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = "#1a1418";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40},${20 + Math.random() * 20},${30},0.4)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    ctx.strokeStyle = "rgba(201,161,74,0.15)";
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, s - 40, s - 40);
  });
}

export function stoneTexture() {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = "#1e242c";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 32) {
      for (let x = 0; x < s; x += 48) {
        const ox = (Math.floor(y / 32) % 2) * 24;
        ctx.fillStyle = `rgb(${28 + (x % 7)},${34 + (y % 5)},${42})`;
        ctx.fillRect(x + ox, y, 46, 30);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.strokeRect(x + ox, y, 46, 30);
      }
    }
  });
}

export function metalTexture() {
  return canvasTex((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#3a424c");
    g.addColorStop(0.5, "#1a2028");
    g.addColorStop(1, "#2a323c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, Math.random() * s, s, 1);
    }
  }, 128);
}

export function applyMap(mat, tex, repeat = 2) {
  tex.repeat.set(repeat, repeat);
  mat.map = tex;
  mat.needsUpdate = true;
  return mat;
}
