const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "solo-health-demo.mp4");
const BASE = process.env.DEMO_URL || "http://127.0.0.1:8765/solo-health/";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 860 },
    deviceScaleFactor: 2,
    recordVideo: { dir: ARTIFACTS, size: { width: 430, height: 860 } },
  });

  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  // Boot screen
  await sleep(1800);
  await page.click("#btn-awaken");
  await sleep(1400);

  // Log several daily quest reps manually
  for (let i = 0; i < 8; i++) {
    await page.click("#btn-complete-demo");
    await sleep(400);
  }

  // Open ranks
  await page.click('.nav-btn[data-view="ranks"]');
  await sleep(1600);
  await page.click("#ranks-view .close-view");
  await sleep(700);

  // Finish remaining daily objectives (visible progress jumps)
  await page.evaluate(() => {
    const s = window.__SOLO__.getState();
    for (const q of s.quests) {
      while (
        window.__SOLO__.getState().quests.find((x) => x.id === q.id).progress <
        q.target
      ) {
        window.__SOLO__.logQuest(q.id, q.step ?? 10);
      }
    }
  });
  await sleep(1400);

  // Show system log
  await page.click('.nav-btn[data-view="log"]');
  await sleep(1500);
  await page.click('#log-view .close-view');
  await sleep(600);

  // Advance day cleanly, then fail next day to trigger penalty
  await page.click("#btn-reset-day");
  await sleep(1200);

  // New day — leave incomplete and advance to trigger penalty
  await page.click("#btn-reset-day");
  await sleep(1800);

  // Interact with penalty quest
  for (let i = 0; i < 4; i++) {
    const btn = page.locator(".log-penalty:not(:disabled)").first();
    if (await btn.count()) {
      await btn.click();
      await sleep(400);
    }
  }
  await sleep(900);

  // Survive penalty
  await page.click("#btn-clear-penalty");
  await sleep(1600);

  // Boost XP to show rank up
  await page.evaluate(() => window.__SOLO__.grantXp(260));
  await sleep(3200);

  // Final status linger
  await page.click('.nav-btn[data-view="ranks"]');
  await sleep(1800);
  await page.click('#ranks-view .close-view');
  await sleep(1200);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" }
  );

  // cleanup webm
  try {
    fs.unlinkSync(webmPath);
  } catch {}

  console.log("VIDEO_SAVED:", OUTPUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
