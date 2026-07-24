/**
 * Bundles the Solo Health app (HTML + CSS + all JS modules) into a single
 * self-contained standalone.html — no external files, no ES module imports
 * between local files. External CDN calls (Google Fonts, MediaPipe) are left
 * as runtime URLs; the app already falls back to the synthetic pose feed if
 * they're unreachable (offline, CSP-restricted, etc).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist", "solo-health.standalone.html");

const JS_ORDER = [
  "js/pose-math.js",
  "js/rep-counter.js",
  "js/game-data.js",
  "js/critique-ai.js",
  "js/scanner.js",
  "js/app.js",
];

function stripModuleSyntax(src) {
  return src
    // multi-line or single-line named imports from local files
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*["'][./][^"']+["'];?/g, "")
    .replace(/^export\s+default\s+/gm, "")
    .replace(/^export\s+(async\s+function|function|const|class|let)\b/gm, "$1")
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, "");
}

function main() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "css/style.css"), "utf8");

  const bundledJs = JS_ORDER.map((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const cleaned = stripModuleSyntax(src);
    return `/* ---- ${rel} ---- */\n${cleaned}`;
  }).join("\n\n");

  // Use function replacers: a string replacement would treat "$$" etc. in
  // the injected CSS/JS as regex backreference escapes and corrupt them.
  let out = html
    .replace(
      /\s*<link rel="stylesheet" href="css\/style\.css" \/>/,
      () => `\n  <style>\n${css}\n  </style>`
    )
    .replace(
      /\s*<script type="module" src="js\/app\.js"><\/script>/,
      () => `\n  <script>\n${bundledJs}\n  </script>`
    );

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);
  console.log("BUNDLED:", OUT, `(${(out.length / 1024).toFixed(1)} KB)`);
}

main();
