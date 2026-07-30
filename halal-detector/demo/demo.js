(() => {
  const views = ["home", "scan", "result", "ingredients", "search", "restaurants"];
  const caption = document.getElementById("demo-caption");

  function show(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add("active");
    document.querySelectorAll(".tab").forEach((t) => {
      const onScanFlow = name === "result" && t.dataset.go === "scan";
      t.classList.toggle("active", t.dataset.go === name || onScanFlow);
    });
    const labels = {
      home: "Premium clarity — one glance",
      scan: "Scan with confidence",
      result: "A clear verdict, explained simply",
      ingredients: "Ingredient intelligence",
      search: "Offline ingredient library",
      restaurants: "Trusted places nearby",
    };
    caption.style.opacity = "0";
    setTimeout(() => {
      caption.textContent = labels[name] || "Halal Detector";
      caption.style.opacity = "1";
    }, 160);
  }

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.go));
  });

  document.getElementById("btn-analyze")?.addEventListener("click", () => {
    show("result");
  });

  document.getElementById("btn-analyze-text")?.addEventListener("click", () => {
    const panel = document.getElementById("ing-result");
    panel?.classList.remove("hidden");
    panel?.classList.add("reveal");
  });

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function runTour() {
    show("home");
    await sleep(2600);
    show("scan");
    await sleep(1600);
    const cam = document.querySelector(".camera");
    cam?.classList.add("locked");
    await sleep(1400);
    cam?.classList.remove("locked");
    document.getElementById("btn-analyze")?.click();
    await sleep(3400);
    show("ingredients");
    await sleep(1500);
    document.getElementById("btn-analyze-text")?.click();
    await sleep(2800);
    show("search");
    await sleep(2200);
    show("restaurants");
    await sleep(2200);
    show("home");
    caption.textContent = "Halal Detector — demo complete";
    caption.style.opacity = "1";
  }

  const params = new URLSearchParams(location.search);
  if (params.get("demo") === "1") {
    runTour();
  } else {
    show("home");
  }

  window.HalalDemo = { show, runTour, views };
})();
