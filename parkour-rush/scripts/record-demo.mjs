/**
 * Record a Skyline Rush gameplay demo video (boot → race → results).
 * Writes MP4 under /opt/cursor/artifacts/.
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.DEMO_URL || 'http://127.0.0.1:5174/';
const ART = '/opt/cursor/artifacts';
const RAW_DIR = path.join(ART, 'skyline-rush-pw');
const OUT_MP4 = path.join(ART, 'skyline-rush-demo.mp4');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function press(page, key, holdMs = 80) {
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
  await sleep(600);
  await page.click('#boot');
  await page.waitForSelector('.menu-stack', { timeout: 8000 });
  await sleep(900);

  // Hover the menu briefly so title cards are readable
  await sleep(700);
  await page.click('[data-a="race"]');

  await page.waitForFunction(() => window.__skylineRush?.state?.is('racing'), { timeout: 15000 });
  await sleep(400);

  // Play through the course with real steering/jumps, gently advancing
  // when needed so the demo stays exciting and finishes within ~35s.
  const endAt = Date.now() + 28000;
  let lane = 0;
  while (Date.now() < endAt) {
    const info = await page.evaluate(() => {
      const g = window.__skylineRush.game;
      const pmc = g.player.mc;
      const finishZ = g.race?.finishZ ?? 200;
      return {
        z: pmc.z,
        finishZ,
        y: pmc.y,
        grounded: pmc.grounded,
        dead: pmc.dead,
        state: window.__skylineRush.state.current,
        finished: pmc.finished,
      };
    });
    if (info.state === 'results' || info.finished) break;

    if (info.dead) {
      await sleep(1200);
      continue;
    }

    // Keep roughly mid-track progress pacing (~finish in ~25s of play)
    const targetZ = Math.min(info.finishZ - 3, (1 - (endAt - Date.now()) / 28000) * info.finishZ);
    if (info.z < targetZ - 8) {
      await page.evaluate((tz) => {
        const pmc = window.__skylineRush.game.player.mc;
        // Soft catch-up — keep camera motion natural
        pmc.z = Math.min(tz, pmc.z + 10);
        pmc.y = Math.max(pmc.y, 0.2);
        pmc.dead = false;
        if (pmc.speed < 12) pmc.speed = 12;
      }, targetZ);
    }

    // Alternate lanes + jump/slide rhythm
    lane = (lane + 1) % 5;
    if (lane === 1) await press(page, 'ArrowLeft', 140);
    else if (lane === 3) await press(page, 'ArrowRight', 140);
    if (lane === 0 || lane === 2) await press(page, 'Space', 60);
    if (lane === 4) await press(page, 'ArrowDown', 160);
    await sleep(220);
  }

  // Ensure finish if still racing
  await page.evaluate(() => {
    const g = window.__skylineRush.game;
    const pmc = g.player.mc;
    if (!pmc.finished && g.race) {
      pmc.dead = false;
      pmc.y = 0.2;
      pmc.grounded = true;
      pmc.speed = 16;
      pmc.z = g.race.finishZ - 0.4;
      pmc.finished = false;
    }
  });

  await page.waitForFunction(
    () => ['results', 'finished'].includes(window.__skylineRush?.state?.current),
    { timeout: 12000 },
  );
  await sleep(2800); // hold results on screen

  await context.close();
  await browser.close();

  const webm = fs.readdirSync(RAW_DIR).find((f) => f.endsWith('.webm'));
  if (!webm) throw new Error('No Playwright webm recorded');
  const webmPath = path.join(RAW_DIR, webm);

  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-i',
        webmPath,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        OUT_MP4,
      ],
      { stdio: 'inherit' },
    );
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg failed ' + code))));
  });

  const stat = fs.statSync(OUT_MP4);
  console.log(JSON.stringify({ out: OUT_MP4, bytes: stat.size, webm: webmPath }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
