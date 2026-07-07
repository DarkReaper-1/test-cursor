const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "spiderman-ios-3d-demo.mp4");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 920, height: 440 },
    recordVideo: { dir: ARTIFACTS, size: { width: 920, height: 440 } },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:8080/demo/", { waitUntil: "networkidle" });

  // Show launch screen
  await sleep(2000);

  const frame = page.locator("#device-frame");
  const box = await frame.boundingBox();

  const joyCenterX = box.x + 85;
  const joyCenterY = box.y + box.height - 80;
  const jumpX = box.x + 180;
  const jumpY = box.y + box.height - 70;

  // Feature 1: Joystick movement
  await page.mouse.move(joyCenterX, joyCenterY);
  await page.mouse.down();
  await page.mouse.move(joyCenterX + 40, joyCenterY);
  await sleep(1200);

  // Feature 2: Jump
  await page.mouse.up();
  await page.mouse.click(jumpX, jumpY);
  await sleep(600);

  // Feature 3: Web swing — hold right side
  const webX = box.x + box.width * 0.78;
  const webY = box.y + box.height * 0.45;
  await page.mouse.move(webX, webY);
  await page.mouse.down();
  await sleep(2500);

  // Move joystick while swinging
  await page.mouse.move(joyCenterX + 35, joyCenterY, { steps: 5 });
  await sleep(2000);
  await page.mouse.up();
  await sleep(400);

  // Feature 4: Chain second swing
  await page.mouse.move(joyCenterX + 30, joyCenterY);
  await page.mouse.down();
  await sleep(300);
  const webX2 = box.x + box.width * 0.82;
  const webY2 = box.y + box.height * 0.35;
  await page.mouse.move(webX2, webY2);
  await page.mouse.down();
  await sleep(2800);
  await page.mouse.up();
  await sleep(300);

  // Feature 5: Third swing + run
  await page.mouse.move(joyCenterX + 45, joyCenterY);
  await page.mouse.down();
  await sleep(200);
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await page.mouse.down();
  await sleep(2500);
  await page.mouse.up();
  await page.mouse.up();
  await sleep(400);

  // Run and jump across rooftops
  await page.mouse.move(joyCenterX + 50, joyCenterY);
  await page.mouse.down();
  await sleep(1500);
  await page.mouse.up();
  await page.mouse.click(jumpX, jumpY);
  await sleep(1000);

  await sleep(500);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" }
  );
  console.log("VIDEO_SAVED:", OUTPUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
