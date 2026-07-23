(function (global) {
  function drawLineChart(canvas, series, opts = {}) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,92,99,0.04)";
    ctx.fillRect(0, 0, w, h);

    if (!series.length || series.every((s) => !s.points.length)) {
      ctx.fillStyle = "#3d5c63";
      ctx.font = "26px Atkinson Hyperlegible, sans-serif";
      ctx.fillText(opts.emptyText || "Not enough data yet", 36, h / 2);
      return;
    }

    const allY = series.flatMap((s) => s.points.map((p) => p.y)).filter(Number.isFinite);
    let minY = opts.minY ?? Math.min(...allY);
    let maxY = opts.maxY ?? Math.max(...allY);
    if (minY === maxY) {
      minY -= 10;
      maxY += 10;
    }
    const maxLen = Math.max(...series.map((s) => s.points.length), 1);

    const xAt = (i, len) => pad + (i * (w - pad * 2)) / Math.max(1, len - 1);
    const yAt = (v) => pad + ((maxY - v) / (maxY - minY)) * (h - pad * 2);

    // guides
    const guides = opts.guides || [];
    guides.forEach((g) => {
      ctx.strokeStyle = "rgba(10,92,99,0.12)";
      ctx.beginPath();
      ctx.moveTo(pad, yAt(g));
      ctx.lineTo(w - pad, yAt(g));
      ctx.stroke();
      ctx.fillStyle = "#3d5c63";
      ctx.font = "18px Atkinson Hyperlegible, sans-serif";
      ctx.fillText(String(g), 8, yAt(g) + 6);
    });

    series.forEach((s) => {
      if (!s.points.length) return;
      ctx.strokeStyle = s.color || "#0a5c63";
      ctx.lineWidth = 3;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const x = xAt(i, s.points.length);
        const y = yAt(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      s.points.forEach((p, i) => {
        ctx.fillStyle = s.color || "#0a5c63";
        ctx.beginPath();
        ctx.arc(xAt(i, s.points.length), yAt(p.y), 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    if (opts.legend) {
      ctx.font = "20px Atkinson Hyperlegible, sans-serif";
      let lx = pad;
      series.forEach((s) => {
        ctx.fillStyle = s.color || "#0a5c63";
        ctx.fillRect(lx, 12, 14, 14);
        ctx.fillStyle = "#14343a";
        ctx.fillText(s.label || "", lx + 20, 24);
        lx += 110;
      });
    }
  }

  function drawWave(canvas, waveform, color = "#0a5c63") {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,92,99,0.06)";
    ctx.fillRect(0, 0, w, h);
    if (!waveform?.length) return;
    const slice = waveform.slice(-160);
    let min = Math.min(...slice);
    let max = Math.max(...slice);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    ctx.beginPath();
    slice.forEach((v, i) => {
      const x = (i / (slice.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * (h - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  global.Charts = { drawLineChart, drawWave };
})(window);
