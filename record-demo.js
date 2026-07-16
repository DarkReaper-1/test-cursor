const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "webline-spiderman-demo.mp4");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: ARTIFACTS, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
  await sleep(1500);

  // Title screen beat
  await sleep(1200);
  await page.click("#btn-play");
  await sleep(800);

  // Drive gameplay via exposed API
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.__WEBLINE__;

    // Run + jump
    g.press("KeyD");
    await sleep(900);
    g.press("Space");
    await sleep(350);
    g.release("Space");

    // Swing chain 1
    g.aim(0.72, 0.32);
    g.webDown();
    await sleep(2200);
    g.webUp();
    await sleep(250);

    // Swing 2
    g.aim(0.78, 0.28);
    g.webDown();
    await sleep(2000);
    // zip while swinging
    g.press("ShiftLeft");
    await sleep(700);
    g.release("ShiftLeft");
    g.webUp();
    await sleep(300);

    // Swing 3
    g.aim(0.7, 0.35);
    g.webDown();
    await sleep(2400);
    g.webUp();
    await sleep(400);

    // Rooftop dash
    await sleep(1200);
    g.press("Space");
    await sleep(400);
    g.release("Space");

    // Final swing
    g.aim(0.75, 0.3);
    g.webDown();
    await sleep(2200);
    g.webUp();
    await sleep(800);

    g.release("KeyD");
  });

  await sleep(500);

  const video = page.video();
  await context.close();
  await browser.close();

  const webm = await video.path();
  execSync(
    `ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" }
  );
  console.log("VIDEO_SAVED:", OUTPUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
