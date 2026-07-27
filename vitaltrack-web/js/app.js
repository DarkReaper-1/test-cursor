(function () {
  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  function setTab(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    if (name === 'dashboard') renderDashboard();
    if (name === 'history') renderHistory();
    if (name === 'trends') renderTrends();
    if (name === 'insights') renderInsights();
  }
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function relTime(ts) {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return diffMin + ' min ago';
    const h = Math.round(diffMin / 60);
    if (h < 24) return h + ' hr ago';
    const d = Math.round(h / 24);
    return d + (d === 1 ? ' day ago' : ' days ago');
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  // ---------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------
  function renderDashboard() {
    const hr = Store.latestHeartRate();
    const bp = Store.latestBloodPressure();
    document.getElementById('dash-hr-value').textContent = hr ? hr.bpm + ' bpm' : 'No readings yet';
    document.getElementById('dash-hr-sub').textContent = hr ? relTime(hr.takenAt) : '';
    document.getElementById('dash-bp-value').textContent = bp ? `${bp.systolic}/${bp.diastolic} mmHg` : 'No readings yet';
    document.getElementById('dash-bp-sub').textContent = bp ? relTime(bp.takenAt) : '';
  }

  document.getElementById('btn-open-measure').addEventListener('click', () => {
    setTab('measure');
    resetMeasureUI();
  });
  document.getElementById('btn-open-logbp').addEventListener('click', () => {
    setTab('logbp');
    document.getElementById('bp-error').textContent = '';
  });

  // ---------------------------------------------------------------
  // Heart rate measurement — real camera capture
  // ---------------------------------------------------------------
  const camera = new CameraPPGCapture();
  const processor = new PPGProcessor();
  let measureRafActive = false;
  let torchAvailable = false;

  function showMeasureStage(stage) {
    ['idle', 'running', 'error', 'done'].forEach((s) => {
      document.getElementById('measure-' + s).style.display = s === stage ? 'flex' : 'none';
    });
  }

  function resetMeasureUI() {
    showMeasureStage('idle');
  }

  document.getElementById('btn-start-measure').addEventListener('click', startMeasurement);
  document.getElementById('btn-retry-measure').addEventListener('click', startMeasurement);
  document.getElementById('btn-measure-again').addEventListener('click', startMeasurement);
  document.getElementById('btn-cancel-measure').addEventListener('click', stopMeasurement);
  document.getElementById('btn-finish-measure').addEventListener('click', () => finishMeasurement(true));
  document.getElementById('btn-back-dashboard').addEventListener('click', () => setTab('dashboard'));

  const MIN_DURATION_S = 15;
  const MAX_DURATION_S = 45;
  let savedThisSession = false;
  let lastReading = null;

  async function startMeasurement() {
    showMeasureStage('running');
    processor.reset();
    savedThisSession = false;
    lastReading = null;
    document.getElementById('bpm-num').textContent = '--';
    document.getElementById('btn-finish-measure').style.display = 'none';
    document.getElementById('torch-note').style.display = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMeasureError("This browser doesn't support camera access. Try a recent version of Chrome, Safari, or Edge.");
      return;
    }

    try {
      const { torchSupported } = await camera.start((timestampMs, luminance) => {
        const reading = processor.addSample(timestampMs, luminance);
        lastReading = reading;
        updateMeasureUI(reading);
        if (reading.elapsed >= MAX_DURATION_S) finishMeasurement(false);
      });
      torchAvailable = torchSupported;
      if (!torchSupported) {
        const note = document.getElementById('torch-note');
        note.style.display = 'block';
        note.textContent = "Your browser/device doesn't support turning on the flash from here. Hold your finger gently over the lens near a bright lamp instead — direct sunlight or very dim rooms both make this harder.";
      }
    } catch (err) {
      const message = err && err.name === 'NotAllowedError'
        ? 'Camera access was denied. Allow camera access for this site in your browser settings, then try again.'
        : "Couldn't access the camera: " + (err && err.message ? err.message : 'unknown error');
      showMeasureError(message);
    }
  }

  function updateMeasureUI(reading) {
    const pill = document.getElementById('quality-pill');
    const fingerDetected = processor.looksLikeFingerPresent;
    let label, cls;
    if (!fingerDetected) {
      label = 'Place your finger on the camera lens';
      cls = 'pill-neutral';
    } else {
      switch (reading.quality) {
        case 'none': label = 'Hold still, starting…'; cls = 'pill-neutral'; break;
        case 'poor': label = 'Weak signal — press gently, stay still'; cls = 'pill-poor'; break;
        case 'fair': label = 'Reading steadying…'; cls = 'pill-fair'; break;
        case 'good': label = 'Good signal'; cls = 'pill-good'; break;
      }
    }
    pill.textContent = label;
    pill.className = 'pill ' + cls;

    document.getElementById('bpm-num').textContent = reading.bpm !== null ? reading.bpm : '--';
    drawWaveform(document.getElementById('wave'), reading.waveform, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0e7c66');

    const canFinishEarly = reading.bpm !== null && reading.elapsed >= MIN_DURATION_S;
    document.getElementById('btn-finish-measure').style.display = canFinishEarly ? 'block' : 'none';
  }

  function showMeasureError(message) {
    camera.stop();
    document.getElementById('measure-error-text').textContent = message;
    showMeasureStage('error');
  }

  function stopMeasurement() {
    camera.stop();
    resetMeasureUI();
  }

  function finishMeasurement(userInitiated) {
    const reading = lastReading || { bpm: null, hrv: null };
    camera.stop();

    if (reading.bpm !== null && !savedThisSession) {
      savedThisSession = true;
      Store.addHeartRate({ bpm: reading.bpm, hrv: reading.hrv || null, source: 'camera' });
    }

    if (reading.bpm !== null) {
      document.getElementById('result-bpm').textContent = reading.bpm;
      document.getElementById('result-label').textContent = 'beats per minute — saved';
      document.getElementById('result-hrv').textContent = reading.hrv
        ? `HRV (RMSSD): ${Math.round(reading.hrv)} ms — rough estimate, informational only`
        : '';
    } else {
      document.getElementById('result-bpm').textContent = '—';
      document.getElementById('result-label').textContent = "Couldn't get a steady reading. Try again with gentle, even pressure and stay still.";
      document.getElementById('result-hrv').textContent = '';
    }
    showMeasureStage('done');
    renderDashboard();
  }

  window.addEventListener('beforeunload', () => camera.stop());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) camera.stop();
  });

  // ---------------------------------------------------------------
  // Log blood pressure
  // ---------------------------------------------------------------
  document.getElementById('btn-cancel-bp').addEventListener('click', () => setTab('dashboard'));
  document.getElementById('btn-save-bp').addEventListener('click', () => {
    const sys = parseInt(document.getElementById('bp-systolic').value, 10);
    const dia = parseInt(document.getElementById('bp-diastolic').value, 10);
    const pulseRaw = document.getElementById('bp-pulse').value;
    const err = document.getElementById('bp-error');

    if (!sys || sys < 50 || sys > 260) { err.textContent = 'Enter a systolic value between 50 and 260.'; return; }
    if (!dia || dia < 30 || dia > 180) { err.textContent = 'Enter a diastolic value between 30 and 180.'; return; }
    err.textContent = '';

    Store.addBloodPressure({ systolic: sys, diastolic: dia, pulse: pulseRaw ? parseInt(pulseRaw, 10) : null, source: 'manual' });

    document.getElementById('bp-systolic').value = '';
    document.getElementById('bp-diastolic').value = '';
    document.getElementById('bp-pulse').value = '';
    showToast('Blood pressure saved');
    setTab('dashboard');
  });

  // ---------------------------------------------------------------
  // History
  // ---------------------------------------------------------------
  let historyTab = 'hr';
  document.querySelectorAll('[data-history-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      historyTab = btn.dataset.historyTab;
      document.querySelectorAll('[data-history-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      renderHistory();
    });
  });

  function renderHistory() {
    const list = document.getElementById('history-list');
    if (historyTab === 'hr') {
      const rows = Store.heartRate();
      list.innerHTML = rows.length
        ? rows.map((r) => `
          <div class="list-row">
            <div class="main"><div class="value">${r.bpm} bpm</div><div class="date">${fmtDate(r.takenAt)}</div></div>
            <div class="trail">${r.hrv ? 'HRV ' + Math.round(r.hrv) + ' ms' : ''}</div>
            <button class="icon-btn" data-delete-hr="${r.id}" aria-label="Delete">&times;</button>
          </div>`).join('')
        : '<div class="empty-note">No heart rate readings yet.</div>';
      list.querySelectorAll('[data-delete-hr]').forEach((btn) => {
        btn.addEventListener('click', () => { Store.deleteHeartRate(btn.dataset.deleteHr); renderHistory(); renderDashboard(); });
      });
    } else {
      const rows = Store.bloodPressure();
      list.innerHTML = rows.length
        ? rows.map((r) => `
          <div class="list-row">
            <div class="main"><div class="value">${r.systolic}/${r.diastolic} mmHg</div><div class="date">${fmtDate(r.takenAt)} · ${bpReferenceRange(r.systolic, r.diastolic)}</div></div>
            <div class="trail">${r.pulse ? r.pulse + ' bpm' : ''}</div>
            <button class="icon-btn" data-delete-bp="${r.id}" aria-label="Delete">&times;</button>
          </div>`).join('')
        : '<div class="empty-note">No blood pressure readings yet.</div>';
      list.querySelectorAll('[data-delete-bp]').forEach((btn) => {
        btn.addEventListener('click', () => { Store.deleteBloodPressure(btn.dataset.deleteBp); renderHistory(); renderDashboard(); });
      });
    }
  }

  // ---------------------------------------------------------------
  // Trends
  // ---------------------------------------------------------------
  let rangeDays = 7;
  document.querySelectorAll('[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      rangeDays = parseInt(btn.dataset.range, 10);
      document.querySelectorAll('[data-range]').forEach((b) => b.classList.toggle('active', b === btn));
      renderTrends();
    });
  });

  function renderTrends() {
    const since = Date.now() - rangeDays * 86400000;
    const hr = Store.heartRate(since).slice().reverse();
    const bp = Store.bloodPressure(since).slice().reverse();
    drawLineChart(document.getElementById('chart-hr'), [{ points: hr.map((r) => r.bpm), color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0e7c66', fill: true }]);
    drawLineChart(document.getElementById('chart-bp'), [
      { points: bp.map((r) => r.systolic), color: '#6b74d6' },
      { points: bp.map((r) => r.diastolic), color: '#b7bcf0' },
    ]);
  }

  // ---------------------------------------------------------------
  // Insights
  // ---------------------------------------------------------------
  function renderInsights() {
    const list = document.getElementById('insights-list');
    const dotColor = { good: 'var(--good)', caution: 'var(--warning)', neutral: 'var(--muted)' };
    list.innerHTML = buildInsights().map((i) => `
      <div class="card insight-card">
        <span class="dot" style="background:${dotColor[i.tone]}"></span>
        <p>${i.text}</p>
      </div>`).join('');
  }

  // ---------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------
  document.getElementById('btn-export-csv').addEventListener('click', () => { exportCsv(); showToast('CSV exported'); });
  document.getElementById('btn-show-about').addEventListener('click', showModal);
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('Delete all data stored in this browser? This cannot be undone.')) {
      Store.clearAll();
      renderDashboard();
      showToast('All data deleted');
    }
  });

  // ---------------------------------------------------------------
  // Disclaimer modal
  // ---------------------------------------------------------------
  function showModal() { document.getElementById('modal-scrim').classList.remove('hidden'); }
  function hideModal() {
    document.getElementById('modal-scrim').classList.add('hidden');
    Store.setAcknowledgedDisclaimer();
  }
  document.getElementById('btn-ack-disclaimer').addEventListener('click', hideModal);

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  renderDashboard();
  if (!Store.hasAcknowledgedDisclaimer()) showModal();
})();
