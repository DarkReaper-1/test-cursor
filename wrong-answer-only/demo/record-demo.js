const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const http = require("http");

const ARTIFACTS = "/opt/cursor/artifacts";
const OUTPUT = path.join(ARTIFACTS, "wrong-answer-only-demo.mp4");
const DEMO_DIR = __dirname;
const PORT = 8765;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startStaticServer() {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(DEMO_DIR, urlPath);
    if (!filePath.startsWith(DEMO_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const server = await startStaticServer();

  const browser = await chromium.launch({
    headless: true,
    args: ["--font-render-hinting=none"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: ARTIFACTS, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });

  // Wait until the self-running gameplay demo finishes (all 5 rounds + winner)
  await page.waitForFunction(() => document.body.dataset.demoDone === "1", null, {
    timeout: 120000,
  });
  await sleep(800);

  const video = page.video();
  await context.close();
  await browser.close();
  server.close();

  const webmPath = await video.path();
  const tmpOut = path.join(ARTIFACTS, "wrong-answer-only-demo.tmp.mp4");
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${tmpOut}"`,
    { stdio: "inherit" }
  );
  fs.renameSync(tmpOut, OUTPUT);
  try {
    fs.unlinkSync(webmPath);
  } catch (_) {}
  console.log("VIDEO_SAVED:", OUTPUT);
  console.log("SIZE_BYTES:", fs.statSync(OUTPUT).size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
