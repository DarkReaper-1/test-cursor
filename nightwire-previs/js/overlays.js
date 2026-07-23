/** UI mockup overlays for trailer previs */

export function renderOverlay(root, type) {
  if (!type) return;
  const el = document.createElement("div");
  el.className = `overlay-panel overlay-${type}`;
  el.innerHTML = OVERLAYS[type] || "";
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  return el;
}

export function clearOverlays(root) {
  [...root.querySelectorAll(".overlay-panel")].forEach((el) => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  });
}

const OVERLAYS = {
  "crime-tape": `
    <div class="tape">POLICE LINE — DO NOT CROSS — PORT MERIDIAN PD</div>
  `,
  "evidence-markers": `
    <div class="marker" style="left:58%;top:62%"><span>A</span>Blood transfer</div>
    <div class="marker" style="left:42%;top:48%"><span>B</span>Fingerprint</div>
    <div class="marker" style="left:68%;top:38%"><span>C</span>Wire residue</div>
  `,
  "vision-hud": `
    <div class="vision-frame">
      <div class="vision-corner tl"></div><div class="vision-corner tr"></div>
      <div class="vision-corner bl"></div><div class="vision-corner br"></div>
      <p class="vision-label">DETECTIVE VISION // SPECTRAL TRACE</p>
      <ul class="vision-list">
        <li class="hot">● Heel print — size 7 — outbound 23:12</li>
        <li class="hot">● Latent print — glass — partial match pending</li>
        <li>● Concealed conduit — behind wallpaper</li>
      </ul>
    </div>
  `,
  "highlight-clues": `
    <div class="scan-line"></div>
  `,
  "camera-ui": `
    <div class="cam-ui">
      <div class="cam-reticle"></div>
      <p class="cam-meta">EVIDENCE CAM · ISO 1600 · ROOM 214</p>
      <p class="cam-hint">[ HOLD ] Capture exhibit</p>
    </div>
  `,
  "photo-flash": `<div class="flash"></div>`,
  "inventory-mock": `
    <div class="inv-panel">
      <header><span>CASE KIT</span><span class="dim">NIGHTWIRE PREVIS</span></header>
      <div class="inv-grid">
        <div class="inv-item active"><b>Motel Key 214</b><small>Physical</small></div>
        <div class="inv-item"><b>Wire Snippet</b><small>Trace</small></div>
        <div class="inv-item"><b>Blood Swab A</b><small>DNA</small></div>
        <div class="inv-item"><b>Polaroid — Sill</b><small>Photo</small></div>
        <div class="inv-item"><b>Burner Pager</b><small>Device</small></div>
        <div class="inv-item"><b>Precinct Memo</b><small>Document</small></div>
      </div>
      <footer>Drag to Evidence Board · Analyze in Lab</footer>
    </div>
  `,
  "board-mock": `
    <div class="board-panel">
      <header>EVIDENCE BOARD — CASE NW-01 “SILENT PLANNER”</header>
      <div class="board-canvas">
        <div class="pin p1">Motel 214</div>
        <div class="pin p2">Lena Voss</div>
        <div class="pin p3">Dock Wire</div>
        <div class="pin p4">Capt. Boone Memo</div>
        <div class="pin p5">Calder Alibi</div>
        <svg class="strings" viewBox="0 0 100 60" preserveAspectRatio="none">
          <line x1="18" y1="22" x2="42" y2="18" />
          <line x1="42" y1="18" x2="70" y2="28" />
          <line x1="18" y1="22" x2="55" y2="45" />
          <line x1="70" y1="28" x2="82" y2="48" />
          <line x1="42" y1="18" x2="55" y2="45" stroke-dasharray="2 2" />
        </svg>
      </div>
      <div class="board-tabs">
        <span class="on">Links</span><span>Timeline</span><span>Motives</span><span>Suspects</span>
      </div>
    </div>
  `,
  "dialogue-choices": `
    <div class="dlg-panel">
      <p class="dlg-speaker">LENA VOSS</p>
      <p class="dlg-line">“My sister filed a zoning complaint the night she vanished. Nobody at Precinct 7 wants that on record.”</p>
      <div class="dlg-choices">
        <button class="dlg-choice hot">Press her — Who paid for the silence?</button>
        <button class="dlg-choice">Offer protection — Share what you have.</button>
        <button class="dlg-choice">Bluff — We already traced the wire.</button>
      </div>
    </div>
  `,
  "binocular-ui": `
    <div class="bino">
      <div class="bino-lens"></div>
      <p>TAIL ACTIVE · VINCE CALDER · DO NOT LOSE</p>
    </div>
  `,
  "lockpick-ui": `
    <div class="puzzle-panel left">
      <header>LOCKPICK — TENSION WRENCH</header>
      <div class="pins">
        <div class="pin-bar"><i style="height:40%"></i></div>
        <div class="pin-bar set"><i style="height:70%"></i></div>
        <div class="pin-bar"><i style="height:25%"></i></div>
        <div class="pin-bar set"><i style="height:85%"></i></div>
        <div class="pin-bar"><i style="height:55%"></i></div>
      </div>
      <p>Feel the bind. Set the pin. Stay quiet.</p>
    </div>
  `,
  "hack-ui": `
    <div class="puzzle-panel right">
      <header>SIGNAL TRACE — NIGHTWIRE NODE</header>
      <pre class="hack-log">tracing freq 147.320 …
packet hop → dock-relay-03
encrypt: XOR / legacy pager
MATCH: precinct ghost channel</pre>
    </div>
  `,
  "npc-schedule": `
    <div class="sched-panel">
      <header>NPC ROUTINE — VINCE CALDER</header>
      <ul>
        <li><b>18:00</b> Neon Strip — “Blue Orchid” booth</li>
        <li><b>21:30</b> Harbor Docks — container B-17</li>
        <li class="now"><b>23:10</b> Train Yard — wire room (TAILED)</li>
        <li><b>01:00</b> Motel Row — dead drop</li>
      </ul>
    </div>
  `,
  "approval-card": `
    <div class="approval">
      <p class="eyebrow">PRODUCTION GATE</p>
      <h3>Review complete. Development locked.</h3>
      <p>Approve this vision to begin <strong>Phase 1 — Game Design Document</strong>.</p>
      <ul>
        <li>Full GDD & technical architecture</li>
        <li>Story bible & character profiles</li>
        <li>World map & systems docs</li>
        <li>Then: phased production with your sign-off each phase</li>
      </ul>
      <p class="note">No game systems, assets, or engine project will be built until you approve.</p>
    </div>
  `,
};
