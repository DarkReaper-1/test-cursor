// DOM-driven UI: menu, countdown, HUD (position / progress / toasts), results.
const $ = (id) => document.getElementById(id);

const ORDINALS = ['st', 'nd', 'rd'];
export function ordinal(n) { return n + (ORDINALS[n - 1] || 'th'); }

export class UI {
  constructor() {
    this.menu = $('menu');
    this.hud = $('hud');
    this.results = $('results');
    this.countdownEl = $('countdown');
    this.countdownNum = $('countdown-num');
    this.toastEl = $('toast');
    this.fade = $('fade');
    this.speedlines = $('speedlines');
    this.progressTrack = $('progress-track');
    this._dots = new Map();
    this._toastTimer = null;

    this.onNext = null; this.onRetry = null;
    $('btn-next').addEventListener('click', () => this.onNext && this.onNext());
    $('btn-retry').addEventListener('click', () => this.onRetry && this.onRetry());
  }

  show(el) { el.classList.remove('hidden'); }
  hide(el) { el.classList.add('hidden'); }

  showMenu(level) {
    $('menu-level').textContent = `LEVEL ${level + 1}`;
    this.show(this.menu);
    this.hide(this.hud); this.hide(this.results); this.hide(this.countdownEl);
  }

  showHud(level) {
    $('level-badge').textContent = `LEVEL ${level + 1}`;
    this.hide(this.menu); this.hide(this.results);
    this.show(this.hud);
  }

  countdown(n) {
    this.show(this.countdownEl);
    const el = this.countdownNum;
    el.textContent = n === 0 ? 'GO!' : String(n);
    el.style.color = n === 0 ? '#7dff6b' : '#ffd93b';
    el.classList.remove('pop');
    void el.offsetWidth;   // restart animation
    el.classList.add('pop');
    if (n === 0) setTimeout(() => this.hide(this.countdownEl), 900);
  }

  setPosition(place, total) {
    const badge = $('position-badge');
    badge.querySelector('.num').textContent = place;
    badge.querySelector('.suffix').textContent = (ORDINALS[place - 1] || 'th');
    badge.querySelector('.total').textContent = `of ${total}`;
  }

  initProgress(runners) {
    for (const d of this._dots.values()) d.remove();
    this._dots.clear();
    for (const r of runners) {
      const dot = document.createElement('span');
      dot.className = 'prog-dot' + (r.isPlayer ? ' player' : '');
      dot.style.background = '#' + r.color.toString(16).padStart(6, '0');
      this.progressTrack.appendChild(dot);
      this._dots.set(r, dot);
    }
  }

  updateProgress(runners, finishZ) {
    for (const r of runners) {
      const dot = this._dots.get(r);
      if (!dot) continue;
      const p = Math.max(0, Math.min(1, r.z / finishZ));
      dot.style.left = `${p * 100}%`;
    }
  }

  toast(text, color = '#ffd93b') {
    clearTimeout(this._toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.style.color = color;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 1100);
  }

  setSpeedlines(on) { this.speedlines.style.opacity = on ? '1' : '0'; }

  flashFade(cb) {
    this.fade.style.opacity = '1';
    setTimeout(() => { cb && cb(); this.fade.style.opacity = '0'; }, 320);
  }

  showResults(place, level, standings, playerRunner) {
    const title = $('result-title');
    title.textContent = `${ordinal(place)}!`;
    title.style.color = place === 1 ? '#ffd93b' : place <= 3 ? '#c9e6ff' : '#ff9d9d';
    $('result-sub').textContent = place === 1 ? `Level ${level + 1} smashed!` :
      place <= 3 ? `Level ${level + 1} — on the podium!` : `Level ${level + 1} — try again?`;
    $('btn-next').textContent = place <= 3 ? 'NEXT' : 'REMATCH';

    const box = $('standings');
    box.innerHTML = '';
    standings.slice(0, 8).forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'standing-row' + (r === playerRunner ? ' me' : '');
      const sw = `#${r.color.toString(16).padStart(6, '0')}`;
      row.innerHTML = `<span class="place">${ordinal(i + 1)}</span>` +
        `<span class="swatch" style="background:${sw}"></span>` +
        `<span>${r === playerRunner ? 'YOU' : r.name}</span>`;
      box.appendChild(row);
    });

    this.hide(this.hud);
    this.show(this.results);
  }
}
