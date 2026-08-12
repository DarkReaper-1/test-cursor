import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const { chromium } = createRequire(import.meta.url)("playwright-core");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "parkour-race-demo.mp4");
const BASE = process.env.DEMO_URL || "http://127.0.0.1:8765/";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
  });

  const context = await browser.newContext({
    viewport: { width: 430, height: 860 },
    deviceScaleFactor: 1,
    recordVideo: { dir: ARTIFACTS, size: { width: 430, height: 860 } },
  });

  const page = await context.newPage();
  const url = BASE.includes("?") ? `${BASE}&t=${Date.now()}` : `${BASE}?t=${Date.now()}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game && window.gameAPI, { timeout: 15000 });
  await sleep(1600);

  await page.click("#play-btn");
  await sleep(3400);

  const start = Date.now();
  while (Date.now() - start < 90000) {
    const state = await page.evaluate(() => ({
      screen: window.gameAPI.getScreen(),
      z: window.gameAPI.getZ() || 0,
    }));
    if (state.screen === "results") break;

    const x = Math.sin(state.z / 16) * 0.85;
    await page.evaluate((steerX) => window.gameAPI.steer(steerX), x);
    await sleep(120);
  }

  await sleep(4000);

  const finalState = await page.evaluate(() => ({
    screen: window.gameAPI.getScreen(),
    rank: window.gameAPI.getRank(),
    z: window.gameAPI.getZ(),
  }));
  console.log("FINAL", JSON.stringify(finalState));

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" }
  );
  try {
    fs.unlinkSync(webmPath);
  } catch {
    /* ignore */
  }
  console.log("VIDEO_SAVED:", OUTPUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
