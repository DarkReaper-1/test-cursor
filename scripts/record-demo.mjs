#!/usr/bin/env node
/**
 * Records a phone-sized walkthrough of Helix on Expo web.
 *
 * Prerequisites: API on :3000, Expo web on :8081, Playwright installed.
 * Output: /opt/cursor/artifacts/helix-demo.mp4 (or ./helix-demo.mp4)
 */
import { spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = process.env.HELIX_ARTIFACT_DIR || "/opt/cursor/artifacts";
const webUrl = process.env.HELIX_WEB_URL || "http://127.0.0.1:8081";
const tmpDir = join(root, ".demo-record");

async function waitFor(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || res.status === 404 || (res.status >= 200 && res.status < 500)) {
        return;
      }
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function convertToMp4(input, output) {
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      ["-y", "-i", input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output],
      { stdio: "inherit" },
    );
    ffmpeg.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

const { chromium } = await import("playwright");

await waitFor("http://127.0.0.1:3000/api/v1/health");
await waitFor(webUrl);

await rm(tmpDir, { recursive: true, force: true });
await mkdir(tmpDir, { recursive: true });
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--disable-dev-shm-usage"],
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  recordVideo: { dir: tmpDir, size: { width: 390, height: 844 } },
  colorScheme: "dark",
});

const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  await page.goto(webUrl, { waitUntil: "networkidle" });
  await page.getByTestId("email-input").waitFor({ state: "visible" });
  await sleep(800);

  const email = `ada.demo.${Date.now()}@helix.test`;
  await page.getByTestId("email-input").click();
  await page.getByTestId("email-input").pressSequentially(email, { delay: 18 });
  await page.getByTestId("password-input").click();
  await page.getByTestId("password-input").pressSequentially("operator-1", { delay: 22 });
  await sleep(400);
  await page.getByTestId("auth-submit").click();

  await page.getByTestId("display-name").waitFor({ state: "visible" });
  await sleep(700);
  await page.getByTestId("display-name").click();
  await page.getByTestId("display-name").pressSequentially("Ada", { delay: 40 });
  await page.getByTestId("chip-consistency").click();
  await sleep(250);
  await page.getByTestId("chip-none").click();
  await sleep(250);
  await page.getByTestId("chip-20").click();
  await sleep(500);
  await page.getByTestId("onboard-submit").click();

  await page.getByTestId("begin-directive").waitFor({ state: "visible" });
  await sleep(2200);
  await page.getByTestId("begin-directive").click();

  await page.getByLabel("Log Push-up set 1 and start rest").waitFor({ state: "visible" });
  await sleep(900);
  await page.getByLabel("Log Push-up set 1 and start rest").click();
  await page.getByLabel(/Rest /).waitFor({ state: "visible" });
  await sleep(3600);

  await page.getByTestId("confirm-completion").scrollIntoViewIfNeeded();
  await sleep(400);
  await page.getByTestId("confirm-completion").click();
  const result = page.getByTestId("session-result");
  await result.waitFor({ state: "visible" });
  await result.scrollIntoViewIfNeeded();
  await sleep(1800);

  await page.getByTestId("back-today").click();
  await page.getByTestId("directive-done").waitFor({ state: "visible" });
  await sleep(1400);

  await page.getByTestId("character-link").click();
  await page.getByTestId("character-screen").waitFor({ state: "visible" });
  await sleep(1800);
  await page.getByTestId("character-screen").getByTestId("back-today").click();
  await sleep(1200);
} finally {
  await context.close();
  await browser.close();
}

const videos = (await readdir(tmpDir)).filter((name) => name.endsWith(".webm"));
if (!videos.length) {
  throw new Error("Playwright did not write a video file.");
}
const webm = join(tmpDir, videos[0]);
const mp4 = join(artifactDir, "helix-demo.mp4");
await convertToMp4(webm, mp4);
console.log(`Wrote ${mp4}`);
