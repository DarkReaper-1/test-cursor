#!/usr/bin/env node
/**
 * Build a self-contained PressWell.html (CSS + JS inlined).
 * Usage: node scripts/build-single.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outPath = path.join(root, "PressWell.html");

const jsFiles = [
  "js/bp.js",
  "js/database.js",
  "js/pulse-engine.js",
  "js/camera.js",
  "js/analytics.js",
  "js/charts.js",
  "js/export.js",
  "js/reminders.js",
  "js/app.js",
];

function escapeForInlineScript(code) {
  // Prevent HTML parser from closing the outer <script> early.
  return code.replace(/<\/(script)/gi, "<\\/$1");
}

function omitServiceWorker(code) {
  // Drop SW registration (no sw.js in single-file / file:// builds).
  return code.replace(
    /if\s*\(\s*"serviceWorker"\s+in\s+navigator\s*&&\s*!DEMO\s*\)\s*\{[\s\S]*?navigator\.serviceWorker\.register\([^)]*\)\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\);\s*\}/,
    "/* service worker omitted in single-file build */"
  );
}

let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");

html = html
  .replace(/<link rel="manifest"[^>]*>\s*/i, "")
  .replace(/<link rel="stylesheet" href="css\/style\.css"\s*\/>/, `<style>\n${css}\n</style>`);

const bundled = jsFiles
  .map((rel) => {
    let code = fs.readFileSync(path.join(root, rel), "utf8");
    if (rel.endsWith("app.js")) code = omitServiceWorker(code);
    return `/* ===== ${rel} ===== */\n${escapeForInlineScript(code)}`;
  })
  .join("\n\n");

const scriptBlock = `<script>\n${bundled}\n</script>`;

// Replace external script tags with one inlined block (function replacer avoids $$/$ collapse).
html = html.replace(
  /(?:\s*<script src="js\/[^"]+"><\/script>)+/,
  () => `\n  ${scriptBlock}`
);

fs.writeFileSync(outPath, html, "utf8");

// Sanity: parse as JS
const vm = require("vm");
const start = html.indexOf("<script>") + 8;
const end = html.lastIndexOf("</script>");
const code = html.slice(start, end);
new vm.Script(code, { filename: "PressWell.html" });

const artifact = "/opt/cursor/artifacts/PressWell.html";
try {
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.copyFileSync(outPath, artifact);
} catch (_) {
  /* artifact dir optional */
}

console.log(`Wrote ${outPath} (${html.length} bytes)`);
console.log("Syntax check: OK");
