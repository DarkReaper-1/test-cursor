const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "webline-improved-demo.mp4");
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
  await sleep(1600);
  await page.click("#btn-play");
  await sleep(700);

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.__WEBLINE__;

    g.press("KeyD");
    await sleep(800);
    g.press("Space");
    await sleep(300);
    g.release("Space");

    for (const aim of [
      [0.72, 0.30],
      [0.78, 0.26],
      [0.74, 0.32],
      [0.80, 0.28],
    ]) {
      g.aim(aim[0], aim[1]);
      g.webDown();
      await sleep(1600);
      g.press("ShiftLeft");
      await sleep(550);
      g.release("ShiftLeft");
      await sleep(500);
      g.webUp();
      await sleep(280);
    }

    await sleep(900);
    g.press("Space");
    await sleep(350);
    g.release("Space");
    g.aim(0.76, 0.3);
    g.webDown();
    await sleep(2000);
    g.webUp();
    await sleep(700);
    g.release("KeyD");
  });

  await sleep(400);
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

main().catch((e) => { console.error(e); process.exit(1); });
