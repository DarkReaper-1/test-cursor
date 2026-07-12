/**
 * Records a gameplay demo of The Midnight Manor.
 * Usage: node record-demo.js  (requires local server on :8080)
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "midnight-manor-demo.mp4");
const BASE = process.env.DEMO_URL || "http://localhost:8080/mystery/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickIfVisible(page, selector, timeout = 3000) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout }).catch(() => false)) {
    await el.click();
    return true;
  }
  return false;
}

async function closeEvidence(page) {
  await clickIfVisible(page, "#btn-close-evidence", 1500);
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: ARTIFACTS, size: { width: 1280, height: 720 } },
    colorScheme: "dark",
  });

  const page = await context.newPage();

  // Disable audio for cleaner headless recording
  await page.addInitScript(() => {
    localStorage.removeItem("midnight-manor-save");
    window.addEventListener("DOMContentLoaded", () => {
      const pref = document.getElementById("audio-pref");
      if (pref) pref.checked = false;
    });
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(2500);

  // ── Title → Start ──
  await page.click("#btn-start");
  await sleep(1500);

  // Let intro typewriter play briefly, then skip
  await sleep(3500);
  await page.click("#btn-skip-intro");
  await sleep(1200);

  // ── Library: examine all clues ──
  for (let i = 0; i < 4; i++) {
    const hs = page.locator(".scene-hotspot:not(.found)").first();
    if (!(await hs.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await hs.click();
    await sleep(1600);
    await closeEvidence(page);
    await sleep(400);
  }

  // ── Kitchen: all clues ──
  await page.locator(".loc-btn", { hasText: "Kitchen" }).click();
  await sleep(900);
  for (let i = 0; i < 3; i++) {
    const hs = page.locator(".scene-hotspot:not(.found)").first();
    if (!(await hs.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await hs.click();
    await sleep(1400);
    await closeEvidence(page);
    await sleep(400);
  }

  // ── Study: will + safe ──
  await page.locator(".loc-btn", { hasText: "Study" }).click();
  await sleep(900);
  for (let i = 0; i < 2; i++) {
    const hs = page.locator(".scene-hotspot:not(.found)").first();
    if (!(await hs.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await hs.click();
    await sleep(1400);
    await closeEvidence(page);
    await sleep(400);
  }

  // ── Interview Elena ──
  await page.locator(".suspect-btn", { hasText: "Elena" }).click();
  await sleep(2000);
  const firstQ = page.locator(".dialogue-opt:not(:disabled)").first();
  if (await firstQ.isVisible().catch(() => false)) {
    await firstQ.click();
    await sleep(2800);
  }
  await page.locator("#btn-close-dialogue").click();
  await sleep(800);

  // ── Interview Victoria (reveals testimony clue) ──
  await page.locator(".suspect-btn", { hasText: "Victoria" }).click();
  await sleep(1800);
  const vicQ = page.locator(".dialogue-opt:not(:disabled)").first();
  if (await vicQ.isVisible().catch(() => false)) {
    await vicQ.click();
    await sleep(2800);
  }
  await page.locator("#btn-close-dialogue").click();
  await sleep(800);

  // ── Garden footprints ──
  await page.locator(".loc-btn", { hasText: "Garden" }).click();
  await sleep(1000);
  const gardenHs = page.locator(".scene-hotspot:not(.found)").first();
  if (await gardenHs.isVisible().catch(() => false)) {
    await gardenHs.click();
    await sleep(1600);
    await closeEvidence(page);
    await sleep(500);
  }

  // ── Journal ──
  await page.click("#btn-journal");
  await sleep(2200);
  await page.click("#btn-close-journal");
  await sleep(600);

  // ── Timeline ──
  await page.click("#btn-timeline");
  await sleep(1800);
  await page.click("#btn-close-timeline");
  await sleep(600);

  // ── Deduction board ──
  await page.click("#btn-deduce");
  await sleep(1500);

  const picks = [
    { slot: 0, value: "elena" },
    { slot: 1, value: "poison" },
    { slot: 2, value: "inheritance" },
  ];

  for (const { slot, value } of picks) {
    const sel = page.locator(".deduction-slot:not(.locked) select").nth(slot);
    if (await sel.isVisible({ timeout: 2000 }).catch(() => false)) {
      const hasOption = await sel.locator(`option[value="${value}"]`).count();
      if (hasOption) {
        await sel.selectOption(value);
        await sleep(700);
      }
    }
  }
  await sleep(1500);

  await page.click("#btn-close-deduce");
  await sleep(800);

  // ── Ballroom final scene ──
  await page.locator(".loc-btn", { hasText: "Ballroom" }).click();
  await sleep(1200);

  // ── Present accusation (if unlocked) ──
  const accuseBtn = page.locator("#btn-accuse");
  if (await accuseBtn.isEnabled().catch(() => false)) {
    await accuseBtn.click();
    await sleep(1500);
    await page.selectOption("#accuse-killer", "elena");
    await sleep(500);
    await page.selectOption("#accuse-method", "poison");
    await sleep(500);
    await page.selectOption("#accuse-motive", "inheritance");
    await sleep(1200);
    await page.click("#accusation-form button[type='submit']");
    await sleep(3500);
  } else {
    await sleep(2000);
  }

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: "inherit" }
  );

  const stat = fs.statSync(OUTPUT);
  console.log("VIDEO_SAVED:", OUTPUT);
  console.log("SIZE_MB:", (stat.size / 1024 / 1024).toFixed(2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
