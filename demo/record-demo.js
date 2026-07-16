const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "spiderman-remake-demo.mp4");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 920, height: 460 },
    recordVideo: { dir: ARTIFACTS, size: { width: 920, height: 460 } },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:8080/demo/", { waitUntil: "networkidle" });

  // Boot splash
  await sleep(2000);

  // Drive via gameInput API for reliable swings
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.gameInput;

    // Run right
    g.move = 0.9;
    await sleep(1100);

    // Jump
    g.jump = true;
    await sleep(500);

    // First web swing
    g.aimX = 620; g.aimY = 150;
    g.web = true;
    await sleep(2400);
    g.web = false;
    await sleep(350);

    // Second swing
    g.move = 0.85;
    g.aimX = 680; g.aimY = 130;
    g.web = true;
    await sleep(2600);
    g.web = false;
    await sleep(300);

    // Third swing
    g.aimX = 650; g.aimY = 160;
    g.web = true;
    await sleep(2400);
    g.web = false;
    await sleep(400);

    // Rooftop dash + jump
    g.move = 1;
    await sleep(1200);
    g.jump = true;
    await sleep(900);
    g.move = 0;
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
