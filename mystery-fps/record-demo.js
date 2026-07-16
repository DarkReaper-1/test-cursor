/**
 * Records a gameplay demo of BLACKWOOD: Nightfall Protocol.
 * Usage: serve repo root on :8080, then: node record-demo.js
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "blackwood-mystery-fps-demo.mp4");
const BASE = process.env.DEMO_URL || "http://localhost:8080/mystery-fps/?demo=1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: ARTIFACTS, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });

  // Demo mode auto-starts; wait through briefing + full autopilot
  await page.waitForSelector("#screen-game.active", { timeout: 20000 });
  await page.waitForSelector("#screen-result.active", { timeout: 90000 });
  await sleep(4000);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" }
  );

  const stat = fs.statSync(OUTPUT);
  console.log("VIDEO_SAVED:", OUTPUT);
  console.log("SIZE_MB:", (stat.size / 1024 / 1024).toFixed(2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
