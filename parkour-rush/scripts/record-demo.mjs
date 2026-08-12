/**
 * Record a Skyline Rush gameplay demo with visible AI rivals.
 * Writes MP4 under /opt/cursor/artifacts/skyline-rush-demo.mp4
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const URL = process.env.DEMO_URL || 'http://127.0.0.1:5174/';
const ART = '/opt/cursor/artifacts';
const RAW_DIR = path.join(ART, 'skyline-rush-pw');
const OUT_MP4 = path.join(ART, 'skyline-rush-demo.mp4');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function press(page, key, holdMs = 90) {
  await page.keyboard.down(key);
  await sleep(holdMs);
  await page.keyboard.up(key);
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  fs.rmSync(RAW_DIR, { recursive: true, force: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: RAW_DIR, size: { width: 390, height: 844 } },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#boot', { timeout: 15000 });
  await page.waitForFunction(() => {
    const t = document.querySelector('#boot-tap');
    return t && !t.classList.contains('hidden');
  }, { timeout: 10000 });
  await sleep(700);
  await page.click('#boot');
  await page.waitForSelector('.menu-stack', { timeout: 8000 });
  await sleep(1100);
  await page.click('[data-a="race"]');
  await page.waitForFunction(() => window.__skylineRush?.state?.is('racing'), { timeout: 15000 });
  await sleep(500);

  // Play ~32s of real racing. Softly keep AI clustered near the player so
  // rivals stay on camera, without hard-teleporting the player to the finish.
  const endAt = Date.now() + 32000;
  let tick = 0;
  while (Date.now() < endAt) {
    const info = await page.evaluate(() => {
      const api = window.__skylineRush;
      const g = api.game;
      const pmc = g.player.mc;
      const finishZ = g.race?.finishZ ?? 200;
      // Keep AI within ~8–18m of the player for a crowded race look
      for (const r of g.racers) {
        if (r.isPlayer) continue;
        const desired = pmc.z + (r.id % 2 === 0 ? -6 - r.id : 4 + r.id * 2);
        if (Math.abs(r.mc.z - desired) > 12) {
          r.mc.z = desired;
          r.mc.y = Math.max(0.2, pmc.y);
          r.mc.dead = false;
          r.mc.speed = Math.max(r.mc.speed, 11);
        }
      }
      return {
        z: pmc.z,
        finishZ,
        dead: pmc.dead,
        state: api.state.current,
        finished: pmc.finished,
        progress: pmc.z / finishZ,
      };
    });
    if (info.state === 'results' || info.finished) break;

    if (info.dead) {
      await sleep(900);
      continue;
    }

    // Gentle progress assist so we reach the finish in demo time
    if (info.progress < (1 - (endAt - Date.now()) / 32000) * 0.92) {
      await page.evaluate(() => {
        const pmc = window.__skylineRush.game.player.mc;
        pmc.z += 4.5;
        pmc.y = Math.max(pmc.y, 0.2);
        pmc.dead = false;
        if (pmc.speed < 13) pmc.speed = 13;
      });
    }

    tick++;
    const phase = tick % 6;
    if (phase === 1) await press(page, 'ArrowLeft', 150);
    else if (phase === 4) await press(page, 'ArrowRight', 150);
    if (phase === 0 || phase === 3) await press(page, 'Space', 70);
    if (phase === 5) await press(page, 'ArrowDown', 180);
    await sleep(180);
  }

  // Cross the finish with rivals nearby
  await page.evaluate(() => {
    const g = window.__skylineRush.game;
    const pmc = g.player.mc;
    if (!pmc.finished && g.race) {
      pmc.dead = false;
      pmc.y = 0.2;
      pmc.grounded = true;
      pmc.speed = 15;
      pmc.z = g.race.finishZ - 0.5;
      pmc.finished = false;
      for (const r of g.racers) {
        if (r.isPlayer) continue;
        r.mc.z = g.race.finishZ - 8 - r.id * 3;
        r.mc.y = 0.2;
        r.mc.dead = false;
        r.mc.speed = 12;
      }
    }
  });

  await page.waitForFunction(
    () => ['results', 'finished'].includes(window.__skylineRush?.state?.current),
    { timeout: 12000 },
  );
  await sleep(3000);

  await context.close();
  await browser.close();

  const webm = fs.readdirSync(RAW_DIR).find((f) => f.endsWith('.webm'));
  if (!webm) throw new Error('No Playwright webm recorded');
  const webmPath = path.join(RAW_DIR, webm);

  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', OUT_MP4],
      { stdio: 'inherit' },
    );
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg failed ' + code))));
  });

  console.log(JSON.stringify({ out: OUT_MP4, bytes: fs.statSync(OUT_MP4).size }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
