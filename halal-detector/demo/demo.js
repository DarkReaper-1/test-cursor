(() => {
  const views = ["home", "scan", "result", "ingredients", "search", "restaurants"];
  const caption = document.getElementById("demo-caption");

  function show(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add("active");
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.go === name || (name === "result" && t.dataset.go === "scan"));
    });
    const labels = {
      home: "Home — one-tap actions",
      scan: "Scan a product barcode",
      result: "Clear Halal / Doubtful / Haram result",
      ingredients: "AI ingredient analyzer",
      search: "Offline ingredient search",
      restaurants: "Restaurant mode",
    };
    caption.textContent = labels[name] || "Halal Detector";
  }

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.go));
  });

  document.getElementById("btn-analyze")?.addEventListener("click", () => {
    show("result");
  });

  document.getElementById("btn-analyze-text")?.addEventListener("click", () => {
    document.getElementById("ing-result")?.classList.remove("hidden");
  });

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function runTour() {
    show("home");
    await sleep(2200);
    show("scan");
    await sleep(1800);
    // simulate scan pulse
    const cam = document.querySelector(".camera");
    if (cam) cam.style.outline = "3px solid #3ddb8a";
    await sleep(1200);
    if (cam) cam.style.outline = "";
    document.getElementById("btn-analyze")?.click();
    await sleep(3200);
    show("ingredients");
    await sleep(1400);
    document.getElementById("btn-analyze-text")?.click();
    await sleep(2800);
    show("search");
    await sleep(2200);
    show("restaurants");
    await sleep(2200);
    show("home");
    caption.textContent = "Halal Detector — demo complete";
  }

  const params = new URLSearchParams(location.search);
  if (params.get("demo") === "1") {
    runTour();
  } else {
    show("home");
  }

  // expose for recorder scripting
  window.HalalDemo = { show, runTour, views };
})();
