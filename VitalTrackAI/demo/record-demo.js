const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "vitaltrack-ai-demo.mp4");
const SHOTS = path.join(ARTIFACTS, "screenshots");
const BASE =
  process.env.DEMO_URL ||
  "http://127.0.0.1:8799/VitalTrackAI/demo/index.html?demo=1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 460, height: 960 },
    deviceScaleFactor: 2,
    recordVideo: { dir: ARTIFACTS, size: { width: 460, height: 960 } },
  });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });

  // Tour is driven by ?demo=1 (~22s). Capture key frames along the way.
  await sleep(2000);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-splash.png"),
  });

  await sleep(5500);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-onboarding.png"),
  });

  // Wait for home after onboarding tour
  await page.waitForFunction(
    () => document.querySelector("#view-home")?.classList.contains("active"),
    null,
    { timeout: 60000 }
  );
  await sleep(400);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-home.png"),
  });

  await page.waitForFunction(
    () => document.querySelector("#view-heart")?.classList.contains("active"),
    null,
    { timeout: 60000 }
  );
  await sleep(2000);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-heart.png"),
  });

  await page.waitForFunction(
    () => document.querySelector("#view-results")?.classList.contains("active"),
    null,
    { timeout: 60000 }
  ).catch(() => {});
  await sleep(1200);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-results.png"),
  });

  await page.waitForFunction(
    () => document.querySelector("#view-bp")?.classList.contains("active"),
    null,
    { timeout: 60000 }
  );
  await sleep(1800);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-bp.png"),
  });

  await page.waitForFunction(
    () =>
      document.querySelector("#view-insights")?.classList.contains("active"),
    null,
    { timeout: 30000 }
  );
  await sleep(800);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-insights.png"),
  });

  await page.waitForFunction(
    () => document.querySelector("#view-more")?.classList.contains("active"),
    null,
    { timeout: 30000 }
  );
  await sleep(1000);
  await page.screenshot({
    path: path.join(SHOTS, "vitaltrack-demo-more.png"),
  });

  // Let tour finish on home
  await sleep(2500);

  if (errors.length) {
    console.warn("Page errors:", errors);
  }

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
  } catch (_) {}

  console.log("Wrote", OUTPUT);
  console.log("Screenshots in", SHOTS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
