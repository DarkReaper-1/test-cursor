const SUFFIX = ['th', 'st', 'nd', 'rd'];
export function ordinal(n) {
  const v = n % 100;
  return n + (SUFFIX[(v - 20) % 10] || SUFFIX[v] || SUFFIX[0]);
}

export class UI {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      title: document.getElementById('title-screen'),
      countdown: document.getElementById('countdown'),
      countdownNum: document.getElementById('countdown-num'),
      results: document.getElementById('results-screen'),
      resultPlace: document.getElementById('result-place'),
      resultList: document.getElementById('result-list'),
      posNum: document.getElementById('position-num'),
      posSuffix: document.getElementById('position-suffix'),
      chargeWrap: document.getElementById('charge-wrap'),
      chargeBar: document.getElementById('charge-bar'),
      popup: document.getElementById('popup-text'),
      speedLines: document.getElementById('speed-lines'),
      dots: document.getElementById('progress-dots'),
      btnStart: document.getElementById('btn-start'),
      btnRetry: document.getElementById('btn-retry'),
    };
    this._dotEls = [];
    this._popupTimer = null;
  }

  showTitle() {
    this.el.title.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.results.classList.add('hidden');
  }

  startRace() {
    this.el.title.classList.add('hidden');
    this.el.results.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
  }

  showCountdown(text) {
    const c = this.el.countdown;
    c.classList.remove('hidden');
    const n = this.el.countdownNum;
    n.textContent = text;
    n.style.animation = 'none';
    void n.offsetWidth; // restart the pop animation
    n.style.animation = '';
  }

  hideCountdown() {
    this.el.countdown.classList.add('hidden');
  }

  setPosition(place) {
    const s = ordinal(place);
    this.el.posNum.textContent = place;
    this.el.posSuffix.textContent = s.replace(String(place), '');
  }

  setCharge(charge01, visible) {
    this.el.chargeWrap.classList.toggle('hidden', !visible);
    if (visible) this.el.chargeBar.style.width = `${Math.round(charge01 * 100)}%`;
  }

  setSpeedEffect(norm) {
    this.el.speedLines.style.opacity = norm > 0.75 ? String((norm - 0.75) * 4) : '0';
  }

  popup(text, color = '#ffd54a') {
    const p = this.el.popup;
    p.textContent = text;
    p.style.color = color;
    p.classList.remove('show');
    void p.offsetWidth;
    p.classList.add('show');
  }

  initDots(racers) {
    this.el.dots.innerHTML = '';
    this._dotEls = racers.map((r) => {
      const d = document.createElement('div');
      d.className = 'progress-dot' + (r.isPlayer ? ' player' : '');
      d.style.background = r.isPlayer ? '#ffd54a' : '#ffffff88';
      this.el.dots.appendChild(d);
      return d;
    });
  }

  updateDots(racers, finishZ) {
    racers.forEach((r, i) => {
      const t = Math.max(0, Math.min(1, r.pos.z / finishZ));
      this._dotEls[i].style.left = `${t * 100}%`;
    });
  }

  showResults(playerPlace, standings) {
    this.el.hud.classList.add('hidden');
    this.el.results.classList.remove('hidden');
    this.el.resultPlace.textContent = ordinal(playerPlace);
    this.el.resultPlace.style.color = playerPlace === 1 ? '#ffd54a' : playerPlace <= 3 ? '#c0e6ff' : '#ff8a80';
    this.el.resultList.innerHTML = '';
    standings.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'result-row' + (r.isPlayer ? ' me' : '');
      const time = r.finished ? `${r.finishTime.toFixed(2)}s` : 'DNF';
      row.innerHTML = `<span>${ordinal(i + 1)} &nbsp; ${r.isPlayer ? 'YOU' : r.name}</span><span>${time}</span>`;
      this.el.resultList.appendChild(row);
    });
  }
}
