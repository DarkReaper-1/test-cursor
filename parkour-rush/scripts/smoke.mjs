/**
 * Headless smoke test: boot → menu → race → finish → results.
 * Uses the __skylineRush debug hook exposed by main.ts.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.SMOKE_URL || 'http://127.0.0.1:5173/';
const OUT = process.env.SMOKE_SHOT || '/tmp/skyline-rush-smoke.png';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#boot', { timeout: 10000 });

  await page.waitForFunction(() => {
    const t = document.querySelector('#boot-tap');
    return t && !t.classList.contains('hidden');
  }, { timeout: 8000 });
  await page.click('#boot');
  await page.waitForSelector('.menu-stack', { timeout: 5000 });

  await page.click('[data-a="race"]');
  await page.waitForFunction(() => window.__skylineRush?.state?.is('racing'), { timeout: 12000 });

  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
  }

  const status = await page.evaluate(() => {
    const api = window.__skylineRush;
    const g = api.game;
    const pmc = g.player.mc;
    const finishZ = g.race?.finishZ ?? 120;
    // Put rivals just behind the player, then drive through the finish trigger.
    // They must keep simulating after the player wins and record real times.
    for (const [index, racer] of g.racers.slice(1).entries()) {
      racer.mc.z = finishZ - 3.5 - index * 0.35;
      racer.mc.y = 0.2;
      racer.mc.grounded = true;
      racer.mc.dead = false;
      racer.mc.finished = false;
      racer.mc.speed = Math.max(racer.mc.cfg.baseSpeed, 12);
      racer.mc.vy = 0;
    }
    pmc.z = finishZ - 0.5;
    pmc.y = 0.2;
    pmc.grounded = true;
    pmc.dead = false;
    pmc.finished = false;
    pmc.speed = Math.max(pmc.cfg.baseSpeed, 14);
    pmc.vy = 0;
    return {
      state: api.state.current,
      z: pmc.z,
      finishZ,
      levels: api.levels.length,
    };
  });

  await page.waitForFunction(
    () => ['results', 'finished'].includes(window.__skylineRush?.state?.current),
    { timeout: 10000 },
  );

  await page.waitForTimeout(600);

  const final = await page.evaluate(() => {
    const api = window.__skylineRush;
    return {
      state: api.state.current,
      unlocked: api.save.data.unlockedLevel,
      coins: api.save.data.coins,
      stars1: api.save.data.stars[1] ?? 0,
      resultsText: document.body.innerText.slice(0, 500),
    };
  });

  await page.screenshot({ path: OUT, fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#boot', { timeout: 10000 });
  const persisted = await page.waitForFunction(() => {
    if (!window.__skylineRush) return null;
    return {
      unlocked: window.__skylineRush.save.data.unlockedLevel,
      coins: window.__skylineRush.save.data.coins,
      stars1: window.__skylineRush.save.data.stars[1] ?? 0,
    };
  }).then((h) => h.jsonValue());

  await browser.close();

  const report = { status, final, persisted, errors, shot: OUT, shotExists: fs.existsSync(OUT) };
  console.log(JSON.stringify(report, null, 2));

  const ok =
    status.levels >= 10 &&
    (final.state === 'results' || /PLACE|REWARD|FINISH|1ST|2ND|3RD|Results/i.test(final.resultsText)) &&
    !/DNF/.test(final.resultsText) &&
    persisted.unlocked >= 1 &&
    !errors.some((e) => !/corrupt save/i.test(e));

  if (!ok) {
    console.error('SMOKE FAILED');
    process.exit(1);
  }
  console.log('SMOKE OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
