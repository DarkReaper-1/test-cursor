const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "presswell-demo.mp4");
const BASE = process.env.DEMO_URL || "http://127.0.0.1:8787/presswell/?demo=1";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: ARTIFACTS, size: { width: 390, height: 844 } },
    colorScheme: "light",
  });

  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  // Demo mode auto-boots past onboarding and runs the tour.
  // Wait through: home → finger scan (~6.5s) → save → cuff → history → settings → home
  await page.waitForSelector("#app:not([hidden])", { timeout: 15000 });
  await sleep(2000);

  await page.waitForSelector("#scan-result:not([hidden])", { timeout: 20000 });
  await sleep(1500);

  // After auto-save, cuff form appears
  await page.waitForSelector("#view-log:not([hidden])", { timeout: 15000 });
  await sleep(1200);

  await page.waitForSelector("#view-history:not([hidden])", { timeout: 15000 });
  await sleep(2200);

  await page.waitForSelector("#view-settings:not([hidden])", { timeout: 15000 });
  await sleep(1600);

  await page.waitForSelector("#view-home:not([hidden])", { timeout: 15000 });
  await sleep(1500);

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
  } catch {}

  console.log("VIDEO_SAVED:", OUTPUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
