const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "webline-v3-demo.mp4");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: ARTIFACTS, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
  await sleep(1500);
  await page.click("#btn-play");
  await sleep(600);

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.__WEBLINE__;
    g.press("KeyD");
    await sleep(700);
    g.press("Space");
    await sleep(250);
    g.release("Space");

    for (let i = 0; i < 5; i++) {
      g.aim(0.72 + i * 0.015, 0.28);
      g.webDown();
      await sleep(1400);
      g.press("ShiftLeft");
      await sleep(500);
      g.release("ShiftLeft");
      // trick mid-swing
      g.press("KeyF");
      await sleep(80);
      g.release("KeyF");
      await sleep(400);
      g.webUp();
      await sleep(220);
      // double jump between swings
      g.press("Space");
      await sleep(80);
      g.release("Space");
      await sleep(200);
      g.press("Space");
      await sleep(80);
      g.release("Space");
      await sleep(200);
    }

    await sleep(1000);
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

main().catch((e) => { console.error(e); process.exit(1); });
