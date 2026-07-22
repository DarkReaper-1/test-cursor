const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const FFMPEG =
  process.env.FFMPEG_PATH ||
  (fs.existsSync("/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux")
    ? "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux"
    : "ffmpeg");
const OUTPUT = path.join(ARTIFACTS, "solo-health-scanner-demo.mp4");
const BASE = process.env.DEMO_URL || "http://127.0.0.1:8765/solo-health/?demo=1";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync("/opt/pw-browsers/chromium")
      ? "/opt/pw-browsers/chromium"
      : undefined,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 430, height: 860 },
    deviceScaleFactor: 2,
    permissions: ["camera"],
    recordVideo: { dir: ARTIFACTS, size: { width: 430, height: 860 } },
  });

  const page = await context.newPage();
  // domcontentloaded, not networkidle: external font/CDN requests can be slow
  // or policy-blocked in sandboxed networks, and networkidle would otherwise
  // stall the whole recording waiting on them.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  // Boot — "Would you like to be registered as a Player?"
  await sleep(2600);
  await page.click("#btn-awaken");
  await sleep(2600); // welcome flash → main screen transition

  // Open push-up scanner (demo=1 → synthetic pose feed + real pipeline)
  await page.click('.scan-quest[data-id="pushups"]');
  await page.waitForSelector("#scanner-view:not([hidden])");
  await sleep(9000);

  // Finish scan session — Critique AI grades tracking/depth/tempo from this run
  await page.click("#btn-finish-scan");
  await sleep(1800);

  // Squats scanner
  await page.click('.scan-quest[data-id="squats"]');
  await sleep(7000);
  await page.click("#btn-finish-scan");
  await sleep(1500);

  // Hydration sip pose
  await page.click('.scan-quest[data-id="hydrate"]');
  await sleep(5500);
  await page.click("#btn-finish-scan");
  await sleep(800);

  // Critique AI — full scan history
  await page.click('.nav-btn[data-view="critique"]');
  await sleep(2200);
  await page.click("#critique-view .close-view");
  await sleep(600);

  // Ranks
  await page.click('.nav-btn[data-view="ranks"]');
  await sleep(1600);
  await page.click("#ranks-view .close-view");
  await sleep(600);

  // Incomplete day → penalty
  await page.click("#btn-reset-day");
  await sleep(1800);

  // Scan a penalty objective (modal stays open underneath)
  await page.click('.scan-penalty[data-id="p-pushups"]');
  await sleep(6500);
  await page.click("#btn-finish-scan");
  await sleep(1200);

  // Close penalty for rest of tour
  await page.click("#btn-fail-penalty");
  await sleep(1400);

  // Show log
  await page.click('.nav-btn[data-view="log"]');
  await sleep(1800);
  await page.click("#log-view .close-view");
  await sleep(1000);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `"${FFMPEG}" -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
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
