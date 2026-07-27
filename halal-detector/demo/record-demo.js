const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "halal-detector-demo.mp4");
const SHOTS = path.join(ARTIFACTS, "screenshots");
const BASE =
  process.env.DEMO_URL ||
  "http://127.0.0.1:8788/halal-detector/demo/index.html?demo=1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 920 },
    deviceScaleFactor: 2,
    recordVideo: { dir: ARTIFACTS, size: { width: 430, height: 920 } },
  });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });

  await sleep(1800);
  await page.screenshot({ path: path.join(SHOTS, "halal-detector-home.png") });

  await sleep(2500);
  await page.screenshot({ path: path.join(SHOTS, "halal-detector-scan.png") });

  // Wait until result view is active
  await page.waitForFunction(
    () => document.querySelector("#view-result")?.classList.contains("active"),
    null,
    { timeout: 20000 },
  );
  await sleep(800);
  await page.screenshot({ path: path.join(SHOTS, "halal-detector-result.png") });

  await page.waitForFunction(
    () => document.querySelector("#view-ingredients")?.classList.contains("active"),
    null,
    { timeout: 20000 },
  );
  await sleep(2000);
  await page.screenshot({
    path: path.join(SHOTS, "halal-detector-ingredients.png"),
  });

  await page.waitForFunction(
    () => document.querySelector("#view-search")?.classList.contains("active"),
    null,
    { timeout: 20000 },
  );
  await sleep(1000);
  await page.screenshot({ path: path.join(SHOTS, "halal-detector-search.png") });

  await page.waitForFunction(
    () =>
      (document.querySelector("#demo-caption")?.textContent || "").includes(
        "demo complete",
      ),
    null,
    { timeout: 30000 },
  );
  await sleep(800);
  await page.screenshot({ path: path.join(SHOTS, "halal-detector-end.png") });

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" },
  );
  try {
    fs.unlinkSync(webmPath);
  } catch {}

  if (errors.length) {
    console.log("PAGE_ERRORS:", errors.slice(0, 5));
  }
  console.log("VIDEO_SAVED:", OUTPUT);
  console.log("SCREENSHOTS:", SHOTS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
