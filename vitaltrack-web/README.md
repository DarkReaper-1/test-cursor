# VitalTrack (web)

A real, working browser version of the heart-rate/blood-pressure tracker:
actual camera-based heart rate measurement (photoplethysmography) using
`getUserMedia`, manual blood pressure logging, trend charts, and
rule-based insights. No build step, no framework, no account, no server —
plain HTML/CSS/JS that runs entirely in the browser and stores everything
in `localStorage`.

This was verified end-to-end with a real headless-Chromium run (fake
camera device) before being pushed: disclaimer flow, blood pressure
logging, the measurement flow's torch-detection fallback, and all tab
navigation all work with zero console errors. See the bottom of this
file for how to re-run that check yourself.

**Camera-based heart rate needs HTTPS** (or `localhost`) — browsers block
camera access on plain HTTP for any other host. Vercel serves everything
over HTTPS by default, so this isn't something you need to configure.

## Deploy to Vercel — no command line needed

This is the path that needs nothing installed on Windows beyond a web
browser and a GitHub account.

1. **Push this repo to GitHub**, if it isn't already (it's the
   `vitaltrack-web/` folder inside this monorepo).
2. Go to **vercel.com** and sign in (you can sign in with your GitHub
   account directly).
3. Click **Add New… → Project**.
4. Pick this repository from the list (click **Import**).
5. On the configuration screen:
   - **Root Directory**: click "Edit" and set it to `vitaltrack-web`
     (important — this repo has other unrelated projects in it, and
     Vercel needs to know this subfolder is the one to deploy).
   - **Framework Preset**: leave it as "Other" — there's no build step,
     it's static files.
   - **Build Command**: leave blank.
   - **Output Directory**: leave blank (defaults to the root directory).
6. Click **Deploy**. It should finish in well under a minute — there's
   nothing to compile.
7. Vercel gives you a URL like `vitaltrack-web.vercel.app`. Open it on
   your phone (for the real camera-based heart rate flow) or desktop
   (for blood pressure logging, charts, etc. — desktop webcams can also
   attempt the heart-rate measurement, though without a flash the signal
   will usually be weaker; the app tells you that on-screen when it
   happens).

Every future push to this folder on your default branch redeploys
automatically — no extra steps.

## Deploy to Vercel — with the CLI (optional, needs Node.js)

If you'd rather use a terminal: install [Node.js for
Windows](https://nodejs.org) first (the installer includes `npm`), then
from a PowerShell or Command Prompt window:

```powershell
cd path\to\test-cursor\vitaltrack-web
npx vercel
```

`npx vercel` downloads the Vercel CLI on the fly (no separate install
step), asks you to log in (opens a browser), asks a few project
questions (accept the defaults — it'll auto-detect this as a static
site), and deploys. Running `npx vercel --prod` promotes that deployment
to your project's production URL.

## Running it locally first (optional, recommended)

Before deploying, you can open this in a browser directly from your
filesystem — double-click `index.html` — but camera access will likely be
blocked since it's not HTTPS or localhost. To test the full camera flow
locally on Windows:

```powershell
cd path\to\test-cursor\vitaltrack-web
python -m http.server 8000
```

(If `python` isn't recognized, install Python from python.org, or use
`npx serve` instead if you have Node.js.) Then open
`http://localhost:8000` in a browser — `localhost` is exempt from the
HTTPS-only camera restriction, so the real measurement flow works there
too.

## What's real vs. what has real limitations

- **Camera capture, signal processing, BPM/HRV calculation**: fully real,
  running on live camera frames — nothing simulated.
- **Torch/flash control**: attempted via the (non-standard)
  `MediaStreamTrack` `torch` constraint, which only works on some
  Android/Chrome combinations. **iOS Safari has no web API for torch
  control at all** — Apple hasn't shipped one. When torch control isn't
  available, the app tells you on-screen and suggests holding your
  finger near a bright light source instead, since fingertip PPG
  fundamentally needs light to shine *through* the fingertip.
- **Data storage**: `localStorage`, scoped to one browser on one device.
  There is no sync between devices or browsers — this is a deliberate
  trade-off for "no account, no server," not an oversight. If you want
  cross-device sync, that needs a backend, which is out of scope here.

## Verifying it yourself

A Playwright test script exercised the full flow (disclaimer → BP log →
dashboard update → heart rate measurement with a fake camera device →
tab navigation → history list) against a local static server, with zero
console errors. To repeat it: install Playwright with Chromium
(`npm install -D playwright && npx playwright install chromium`), serve
this folder locally, and drive it with
`chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })`
plus `context.grantPermissions(['camera'])` (or the `permissions: ['camera']`
context option) so the browser doesn't block on a real camera prompt.
