/** Small dependency-free canvas line chart — no charting library needed. */
function drawLineChart(canvas, series) {
  const ctx = canvas.getContext('2d');
  const styles = getComputedStyle(document.documentElement);
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const allValues = series.flatMap((s) => s.points);
  if (!allValues.length) return;
  const min = Math.min(...allValues) - 4;
  const max = Math.max(...allValues) + 4;
  const pad = 14;

  ctx.strokeStyle = styles.getPropertyValue('--border').trim() || '#ddd';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = pad + ((h - pad * 2) * i) / 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  series.forEach((s) => {
    const pts = s.points;
    if (pts.length < 2) return;
    const stepX = (w - pad * 2) / (pts.length - 1);
    const xy = pts.map((v, i) => [pad + i * stepX, h - pad - ((v - min) / (max - min)) * (h - pad * 2)]);

    if (s.fill) {
      ctx.beginPath();
      ctx.moveTo(xy[0][0], h - pad);
      xy.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(xy[xy.length - 1][0], h - pad);
      ctx.closePath();
      ctx.fillStyle = s.color + '22';
      ctx.fill();
    }

    ctx.beginPath();
    xy.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    const [ex, ey] = xy[xy.length - 1];
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
  });
}

/** Live waveform during a heart-rate measurement — real filtered samples, not simulated. */
function drawWaveform(canvas, samples, color) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (samples.length < 2) return;

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = Math.abs(max - min) < 0.001 ? 1 : max - min;
  const dx = w / (samples.length - 1);

  ctx.beginPath();
  samples.forEach((v, i) => {
    const x = i * dx;
    const normalized = (v - min) / range;
    const y = h - normalized * h * 0.8 - h * 0.1;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
