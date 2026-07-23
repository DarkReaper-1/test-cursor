(function (global) {
  function drawLineChart(canvas, series, opts = {}) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const pad = 44;
    ctx.clearRect(0, 0, w, h);

    // soft panel
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(11,95,102,0.05)");
    grd.addColorStop(1, "rgba(11,95,102,0.02)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    if (!series.length || series.every((s) => !s.points.length)) {
      ctx.fillStyle = "#4a6670";
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

    const xAt = (i, len) => pad + (i * (w - pad * 2)) / Math.max(1, len - 1);
    const yAt = (v) => pad + ((maxY - v) / (maxY - minY)) * (h - pad * 2);

    (opts.guides || []).forEach((g) => {
      ctx.strokeStyle = "rgba(11,95,102,0.1)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(pad, yAt(g));
      ctx.lineTo(w - pad, yAt(g));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#4a6670";
      ctx.font = "18px Atkinson Hyperlegible, sans-serif";
      ctx.fillText(String(g), 8, yAt(g) + 6);
    });

    series.forEach((s) => {
      if (!s.points.length) return;
      const color = s.color || "#0b5f66";

      // area fill
      if (s.points.length > 1) {
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = xAt(i, s.points.length);
          const y = yAt(p.y);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        const lastX = xAt(s.points.length - 1, s.points.length);
        const firstX = xAt(0, s.points.length);
        ctx.lineTo(lastX, h - pad / 2);
        ctx.lineTo(firstX, h - pad / 2);
        ctx.closePath();
        const ag = ctx.createLinearGradient(0, pad, 0, h);
        ag.addColorStop(0, color + "33");
        ag.addColorStop(1, color + "00");
        ctx.fillStyle = ag;
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const x = xAt(i, s.points.length);
        const y = yAt(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      s.points.forEach((p, i) => {
        ctx.beginPath();
        ctx.fillStyle = "#fff";
        ctx.arc(xAt(i, s.points.length), yAt(p.y), 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });
    });
  }

  function drawWave(canvas, waveform, color = "#0b5f66") {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(11,95,102,0.05)";
    ctx.fillRect(0, 0, w, h);
    if (!waveform?.length) {
      ctx.strokeStyle = "rgba(11,95,102,0.2)";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(16, h / 2);
      ctx.lineTo(w - 16, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    const slice = waveform.slice(-160);
    let min = Math.min(...slice);
    let max = Math.max(...slice);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    ctx.beginPath();
    slice.forEach((v, i) => {
      const x = (i / Math.max(1, slice.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * (h - 18) - 9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  global.Charts = { drawLineChart, drawWave };
})(window);
