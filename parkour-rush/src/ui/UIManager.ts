import { audio } from '../core/AudioManager';
import { bus } from '../core/EventBus';
import { haptics } from '../core/Haptics';
import type { InputManager } from '../core/InputManager';
import type { RaceResult, SettingsData } from '../core/types';
import type { HudSnapshot, RaceEndData } from '../game/Game';
import type { SurfaceAhead } from '../game/ParkourController';
import { RacePositionManager } from '../game/race/RacePositionManager';
import { POWERUP_LABELS } from '../game/systems/PowerUpSystem';
import { LEVELS } from '../levels/levels';
import { CHARACTERS, COLORS, TRAILS, CharacterSystem } from '../progression/CharacterSystem';
import type { CurrencySystem } from '../progression/CurrencySystem';
import { ProgressionSystem, XP_PER_LEVEL } from '../progression/ProgressionSystem';

/**
 * All DOM UI: boot, main menu, level select, customization, settings,
 * gameplay HUD (+ optional touch buttons + tutorial prompts), pause,
 * countdown, results & rewards. Original layout and styling.
 */

export interface UICallbacks {
  onPlay(): void;
  onQuickRace(): void;
  onSelectLevel(levelId: number): void;
  onPause(): void;
  onResume(): void;
  onRestart(): void;
  onQuitRace(): void;
  onNextLevel(): void;
  onBackToMenu(): void;
  onOpenLevelSelect(): void;
  onOpenCustomize(): void;
  onOpenSettings(): void;
  onCloseOverlay(): void;
  onSettingsChanged(s: SettingsData): void;
}

const fmtTime = (t: number): string => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t * 100) % 100);
  return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

export class UIManager {
  private root: HTMLElement;
  private cb: UICallbacks;
  private settings: SettingsData;
  private input: InputManager;
  private currency: CurrencySystem;
  private progression: ProgressionSystem;
  private characters: CharacterSystem;

  // HUD elements (cached for per-frame updates)
  private hudEl: HTMLElement | null = null;
  private hudPos: HTMLElement | null = null;
  private hudTimer: HTMLElement | null = null;
  private hudFill: HTMLElement | null = null;
  private hudCoins: HTMLElement | null = null;
  private hudPU: HTMLElement | null = null;
  private hudGap: HTMLElement | null = null;
  private hudPrompt: HTMLElement | null = null;
  private lastPosition = 0;
  private promptCooldowns = new Map<string, number>();
  private tutorialMode = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    root: HTMLElement,
    cb: UICallbacks,
    settings: SettingsData,
    input: InputManager,
    currency: CurrencySystem,
    progression: ProgressionSystem,
    characters: CharacterSystem,
  ) {
    this.root = root;
    this.cb = cb;
    this.settings = settings;
    this.input = input;
    this.currency = currency;
    this.progression = progression;
    this.characters = characters;
    this.wireGlobalEvents();
  }

  private clear(): void {
    this.root.innerHTML = '';
    this.hudEl = null;
  }

  private el(html: string): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild as HTMLElement;
  }

  private tap(): void {
    audio.unlock();
    bus.emit('uiTap');
    haptics.tap();
  }

  // ------------------------------------------------------------------ boot

  showBoot(): void {
    this.clear();
    const s = this.el(`
      <div class="screen ui-clickable" id="boot">
        <div class="title">Skyline Rush</div>
        <div class="subtitle">Parkour Racing</div>
        <div class="boot-bar"><i id="boot-fill"></i></div>
        <div class="tap-hint hidden" id="boot-tap">TAP TO START</div>
      </div>`);
    this.root.appendChild(s);
    const fill = s.querySelector('#boot-fill') as HTMLElement;
    const tapHint = s.querySelector('#boot-tap') as HTMLElement;
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(100, p + 18 + Math.random() * 22);
      fill.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(iv);
        tapHint.classList.remove('hidden');
        s.addEventListener('pointerdown', () => {
          this.tap();
          this.cb.onBackToMenu();
        }, { once: true });
      }
    }, 130);
  }

  // ------------------------------------------------------------------ menu

  showMenu(): void {
    this.clear();
    const stars = this.progression.totalStars();
    const s = this.el(`
      <div class="screen ui-clickable">
        <div class="top-bar">
          <span class="chip"><span class="coin-ic">●</span> ${this.currency.coins}</span>
          <span class="chip">★ ${stars}</span>
          <span class="chip">LV ${this.progression.playerLevel}</span>
        </div>
        <div class="title">Skyline Rush</div>
        <div class="subtitle">Parkour Racing</div>
        <div class="menu-stack">
          <button class="btn" data-a="race">▶ &nbsp;Race</button>
          <button class="btn secondary" data-a="levels">Levels</button>
          <button class="btn secondary" data-a="customize">Customize</button>
          <button class="btn secondary" data-a="settings">Settings</button>
        </div>
      </div>`);
    s.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
      if (!a) return;
      this.tap();
      if (a === 'race') this.cb.onQuickRace();
      else if (a === 'levels' || a === 'play') this.cb.onOpenLevelSelect();
      else if (a === 'customize') this.cb.onOpenCustomize();
      else if (a === 'settings') this.cb.onOpenSettings();
    });
    this.root.appendChild(s);
  }

  // ---------------------------------------------------------- level select

  showLevelSelect(): void {
    this.clear();
    const cards = LEVELS.map((l) => {
      const unlocked = this.progression.isLevelUnlocked(l.id);
      const stars = this.progression.starsFor(l.id);
      const best = this.progression.bestTimeFor(l.id);
      const starStr = '★'.repeat(stars) + '<span style="opacity:0.25">' + '★'.repeat(3 - stars) + '</span>';
      const diff = '●'.repeat(l.difficulty);
      return `
        <div class="level-card ${unlocked ? '' : 'locked'}" data-level="${l.id}">
          <div>
            <div class="lv-num">LEVEL ${l.id}</div>
            <div class="lv-name">${l.name}</div>
          </div>
          <div>
            <div class="lv-stars">${starStr}</div>
            <div class="lv-best">${best !== null ? 'Best ' + fmtTime(best) : 'Not finished'}</div>
          </div>
          <div class="lv-diff">${diff}</div>
          ${unlocked ? '' : '<div class="lv-lock">🔒</div>'}
        </div>`;
    }).join('');
    const s = this.el(`
      <div class="screen ui-clickable">
        <div class="top-bar">
          <button class="btn secondary small" data-a="back">‹ Back</button>
          <span class="chip"><span class="coin-ic">●</span> ${this.currency.coins}</span>
        </div>
        <div class="panel">
          <h2>Select Level</h2>
          <div class="level-grid">${cards}</div>
        </div>
      </div>`);
    s.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-a="back"]')) {
        this.tap();
        this.cb.onBackToMenu();
        return;
      }
      const card = t.closest('.level-card') as HTMLElement | null;
      if (card && !card.classList.contains('locked')) {
        this.tap();
        this.cb.onSelectLevel(Number(card.dataset.level));
      }
    });
    this.root.appendChild(s);
  }

  // ---------------------------------------------------------- customization

  showCustomize(): void {
    this.clear();
    const s = this.el(`
      <div class="screen ui-clickable">
        <div class="top-bar">
          <button class="btn secondary small" data-a="back">‹ Back</button>
          <span class="chip" id="cz-coins"><span class="coin-ic">●</span> ${this.currency.coins}</span>
        </div>
        <div class="panel">
          <h2>Customize</h2>
          <div class="tab-row">
            <button class="tab-btn active" data-tab="chars">Runners</button>
            <button class="tab-btn" data-tab="colors">Colors</button>
            <button class="tab-btn" data-tab="trails">Trails</button>
          </div>
          <div class="item-grid" id="cz-grid"></div>
        </div>
      </div>`);
    this.root.appendChild(s);
    const grid = s.querySelector('#cz-grid') as HTMLElement;
    const coinsChip = s.querySelector('#cz-coins') as HTMLElement;
    let tab = 'chars';

    const render = (): void => {
      coinsChip.innerHTML = `<span class="coin-ic">●</span> ${this.currency.coins}`;
      if (tab === 'chars') {
        grid.innerHTML = CHARACTERS.map((c) => {
          const owned = this.characters.ownsCharacter(c.id);
          const sel = this.characters.selectedCharacter.id === c.id;
          return `
            <div class="item-card ${sel ? 'selected' : ''}" data-id="${c.id}">
              <div class="swatch" style="background:${c.bodyColor}"></div>
              <div class="nm">${c.name}</div>
              <div class="desc">${c.description}</div>
              ${owned ? `<div class="owned">${sel ? 'EQUIPPED' : 'Owned'}</div>` : `<div class="price">● ${c.cost}</div>`}
            </div>`;
        }).join('');
      } else if (tab === 'colors') {
        grid.innerHTML = COLORS.map((c) => {
          const owned = this.characters.ownsColor(c.id);
          const sel = this.characters.selectedColor === c.id;
          return `
            <div class="item-card ${sel ? 'selected' : ''}" data-id="${c.id}">
              <div class="swatch" style="background:${c.id}"></div>
              <div class="nm">Accent</div>
              ${owned ? `<div class="owned">${sel ? 'EQUIPPED' : 'Owned'}</div>` : `<div class="price">● ${c.cost}</div>`}
            </div>`;
        }).join('');
      } else {
        grid.innerHTML = TRAILS.map((t) => {
          const owned = this.characters.ownsTrail(t.id);
          const sel = this.characters.selectedTrail.id === t.id;
          return `
            <div class="item-card ${sel ? 'selected' : ''}" data-id="${t.id}">
              <div class="swatch" style="background:${t.color ?? 'transparent'}; ${t.color ? '' : 'border-style:dashed'}"></div>
              <div class="nm">${t.name}</div>
              ${owned ? `<div class="owned">${sel ? 'EQUIPPED' : 'Owned'}</div>` : `<div class="price">● ${t.cost}</div>`}
            </div>`;
        }).join('');
      }
    };
    render();

    s.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-a="back"]')) {
        this.tap();
        this.cb.onBackToMenu();
        return;
      }
      const tabBtn = t.closest('.tab-btn') as HTMLElement | null;
      if (tabBtn) {
        this.tap();
        tab = tabBtn.dataset.tab!;
        s.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === tabBtn));
        render();
        return;
      }
      const card = t.closest('.item-card') as HTMLElement | null;
      if (!card) return;
      const id = card.dataset.id!;
      this.tap();
      if (tab === 'chars') {
        if (this.characters.ownsCharacter(id)) this.characters.selectCharacter(id);
        else if (this.characters.buyCharacter(id)) this.characters.selectCharacter(id);
      } else if (tab === 'colors') {
        if (this.characters.ownsColor(id)) this.characters.selectColor(id);
        else if (this.characters.buyColor(id)) this.characters.selectColor(id);
      } else {
        if (this.characters.ownsTrail(id)) this.characters.selectTrail(id);
        else if (this.characters.buyTrail(id)) this.characters.selectTrail(id);
      }
      render();
    });
  }

  // -------------------------------------------------------------- settings

  showSettings(): void {
    this.clear();
    const st = this.settings;
    const toggle = (id: string, label: string, on: boolean): string => `
      <div class="setting-row"><label>${label}</label>
        <button class="toggle ${on ? 'on' : ''} ui-clickable" data-t="${id}"></button>
      </div>`;
    const s = this.el(`
      <div class="screen ui-clickable">
        <div class="top-bar"><button class="btn secondary small" data-a="back">‹ Back</button></div>
        <div class="panel">
          <h2>Settings</h2>
          ${toggle('musicOn', 'Music', st.musicOn)}
          ${toggle('sfxOn', 'Sound Effects', st.sfxOn)}
          ${toggle('hapticsOn', 'Haptics', st.hapticsOn)}
          ${toggle('cameraShake', 'Camera Shake', st.cameraShake)}
          ${toggle('reducedMotion', 'Reduced Motion', st.reducedMotion)}
          <div class="setting-row"><label>Controls</label>
            <div class="seg-row">
              <button class="seg-btn ${st.controlScheme === 'swipe' ? 'active' : ''}" data-s="swipe">Swipe</button>
              <button class="seg-btn ${st.controlScheme === 'buttons' ? 'active' : ''}" data-s="buttons">Buttons</button>
            </div>
          </div>
          <div class="setting-row"><label>Swipe Sensitivity</label>
            <input type="range" min="0.5" max="2" step="0.1" value="${st.sensitivity}" data-r="sensitivity" />
          </div>
          <div class="setting-row"><label>Graphics Quality</label>
            <div class="seg-row">
              ${(['low', 'medium', 'high', 'auto'] as const)
                .map((q) => `<button class="seg-btn ${st.quality === q ? 'active' : ''}" data-q="${q}">${q[0].toUpperCase()}${q.slice(1)}</button>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>`);
    s.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-a="back"]')) {
        this.tap();
        this.cb.onBackToMenu();
        return;
      }
      const tg = t.closest('[data-t]') as HTMLElement | null;
      if (tg) {
        const key = tg.dataset.t as keyof SettingsData;
        (this.settings as unknown as Record<string, boolean>)[key] = !(this.settings as unknown as Record<string, boolean>)[key];
        tg.classList.toggle('on');
        this.tap();
        this.cb.onSettingsChanged(this.settings);
        return;
      }
      const seg = t.closest('[data-s]') as HTMLElement | null;
      if (seg) {
        this.settings.controlScheme = seg.dataset.s as 'swipe' | 'buttons';
        s.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('active', b === seg));
        this.tap();
        this.cb.onSettingsChanged(this.settings);
        return;
      }
      const q = t.closest('[data-q]') as HTMLElement | null;
      if (q) {
        this.settings.quality = q.dataset.q as SettingsData['quality'];
        s.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('active', b === q));
        this.tap();
        this.cb.onSettingsChanged(this.settings);
      }
    });
    s.addEventListener('input', (e) => {
      const r = e.target as HTMLInputElement;
      if (r.dataset.r === 'sensitivity') {
        this.settings.sensitivity = Number(r.value);
        this.cb.onSettingsChanged(this.settings);
      }
    });
    this.root.appendChild(s);
  }

  // ------------------------------------------------------------------- HUD

  showHUD(tutorialMode: boolean): void {
    this.clear();
    this.tutorialMode = tutorialMode;
    this.promptCooldowns.clear();
    this.lastPosition = 0;
    const touchButtons = this.settings.controlScheme === 'buttons'
      ? `<div class="touch-controls ui-clickable">
          <div class="tc-group">
            <button class="tc-btn" data-tc="left">‹</button>
            <button class="tc-btn" data-tc="right">›</button>
          </div>
          <div class="tc-group">
            <button class="tc-btn" data-tc="slide">▼</button>
            <button class="tc-btn" data-tc="jump">▲</button>
          </div>
        </div>`
      : '';
    const s = this.el(`
      <div class="hud" id="hud">
        <div class="hud-top">
          <div class="hud-pos" id="hud-pos">-<span class="of"></span></div>
          <div class="hud-center">
            <div class="hud-timer" id="hud-timer">0:00.00</div>
            <div class="hud-progress"><div class="fill" id="hud-fill"></div></div>
          </div>
          <div class="hud-right">
            <button class="pause-btn ui-clickable" id="hud-pause">II</button>
            <div class="hud-coins"><span style="color:var(--accent2)">●</span> <span id="hud-coins">0</span></div>
          </div>
        </div>
        <div class="hud-gap" id="hud-gap"></div>
        <div class="hud-powerups" id="hud-pu"></div>
        <div class="hud-prompt hidden" id="hud-prompt"></div>
        <div class="hud-toast hidden" id="hud-toast"></div>
        ${touchButtons}
      </div>`);
    this.root.appendChild(s);
    this.hudEl = s;
    this.hudPos = s.querySelector('#hud-pos');
    this.hudTimer = s.querySelector('#hud-timer');
    this.hudFill = s.querySelector('#hud-fill');
    this.hudCoins = s.querySelector('#hud-coins');
    this.hudPU = s.querySelector('#hud-pu');
    this.hudGap = s.querySelector('#hud-gap');
    this.hudPrompt = s.querySelector('#hud-prompt');

    (s.querySelector('#hud-pause') as HTMLElement).addEventListener('click', () => {
      this.tap();
      this.cb.onPause();
    });

    // touch buttons
    s.querySelectorAll('[data-tc]').forEach((btn) => {
      const action = (btn as HTMLElement).dataset.tc as 'left' | 'right' | 'jump' | 'slide';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.pressButton(action, true);
      });
      btn.addEventListener('pointerup', () => this.input.pressButton(action, false));
      btn.addEventListener('pointercancel', () => this.input.pressButton(action, false));
    });
  }

  updateHUD(h: HudSnapshot): void {
    if (!this.hudEl) return;
    if (this.hudPos) {
      const ord = RacePositionManager.ordinal(h.position);
      const n = ord.replace(/\D+$/, '');
      const suffix = ord.slice(n.length);
      this.hudPos.innerHTML = `${n}<span class="ord">${suffix}</span><span class="of">of ${h.totalRacers}</span>`;
      if (this.lastPosition !== 0 && h.position !== this.lastPosition) {
        bus.emit('positionChanged', { position: h.position, total: h.totalRacers });
        if (h.position < this.lastPosition) this.toast(`${ord}!`, 900);
      }
      this.lastPosition = h.position;
    }
    if (this.hudTimer) this.hudTimer.textContent = fmtTime(h.time);
    if (this.hudFill) this.hudFill.style.width = `${(h.progress * 100).toFixed(1)}%`;
    if (this.hudCoins) this.hudCoins.textContent = String(h.coins);
    if (this.hudGap) {
      let html = '';
      if (h.gapAhead !== null && h.gapAhead > 1) html += `<div class="ahead">▲ ${h.gapAhead.toFixed(0)}m</div>`;
      if (h.gapBehind !== null && h.gapBehind > 1) html += `<div class="behind">▼ ${h.gapBehind.toFixed(0)}m</div>`;
      this.hudGap.innerHTML = html;
    }
    if (this.hudPU) {
      this.hudPU.innerHTML = h.effects
        .map((e) => {
          const pct = e.total > 0 ? (e.remaining / e.total) * 100 : 100;
          const color = { speed: '#22d3ee', shield: '#4ade80', magnet: '#f472b6', slowmo: '#a78bfa', airboost: '#fb923c' }[e.type];
          return `<div class="pu-badge" style="color:${color}">${POWERUP_LABELS[e.type]}
            <span class="bar"><i style="width:${pct}%"></i></span></div>`;
        })
        .join('');
    }
    this.updatePrompt(h.prompt);
  }

  private updatePrompt(p: SurfaceAhead): void {
    if (!this.hudPrompt || !this.tutorialMode) return;
    let text: string | null = null;
    let key = '';
    const scheme = this.settings.controlScheme;
    const jumpHint = scheme === 'buttons' ? 'TAP ▲' : 'SWIPE UP';
    const slideHint = scheme === 'buttons' ? 'TAP ▼' : 'SWIPE DOWN';
    if (p.type === 'gap' && p.distance < 12) {
      text = `${jumpHint} TO JUMP THE GAP!`;
      key = 'gap';
    } else if (p.type === 'slideBar' && p.distance < 12) {
      text = `${slideHint} TO SLIDE!`;
      key = 'slide';
    } else if (p.type === 'vault' && p.distance < 10) {
      text = 'RUN AT IT — AUTO VAULT!';
      key = 'vault';
    } else if (p.type === 'wallRunPanel' && p.distance < 12) {
      text = 'JUMP NEAR THE WALL TO WALL-RUN!';
      key = 'wall';
    } else if (p.type === 'launchPad' && p.distance < 10) {
      text = 'HIT THE BLUE PAD!';
      key = 'launch';
    }
    if (text) {
      const shown = this.promptCooldowns.get(key) ?? 0;
      if (shown < 2) {
        this.hudPrompt.textContent = text;
        this.hudPrompt.classList.remove('hidden');
        this.promptCooldowns.set(key, shown + 0.02);
        return;
      }
    }
    this.hudPrompt.classList.add('hidden');
    // count a full display as done once obstacle passes
    if (!text) {
      for (const [k, v] of this.promptCooldowns) {
        if (v > 0 && v < 2) this.promptCooldowns.set(k, Math.ceil(v));
      }
    }
  }

  toast(text: string, ms = 1200): void {
    const t = this.hudEl?.querySelector('#hud-toast') as HTMLElement | null;
    if (!t) return;
    t.textContent = text;
    t.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  // ------------------------------------------------------------- countdown

  showCountdown(n: number): void {
    let overlay = this.root.querySelector('#countdown') as HTMLElement | null;
    if (!overlay) {
      overlay = this.el(`<div class="screen transparent" id="countdown" style="justify-content:center"></div>`);
      this.root.appendChild(overlay);
    }
    if (n > 0) {
      overlay.innerHTML = `<div class="countdown-num">${n}</div>`;
    } else {
      overlay.innerHTML = `<div class="countdown-num go">GO!</div>`;
      setTimeout(() => overlay?.remove(), 700);
    }
  }

  // ----------------------------------------------------------------- pause

  showPause(): void {
    const s = this.el(`
      <div class="screen overlay ui-clickable" id="pause">
        <div class="panel" style="text-align:center">
          <h2>Paused</h2>
          <div class="menu-stack" style="margin:10px auto 0">
            <button class="btn" data-a="resume">Resume</button>
            <button class="btn secondary" data-a="restart">Restart Race</button>
            <button class="btn warn" data-a="quit">Quit Race</button>
          </div>
        </div>
      </div>`);
    s.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
      if (!a) return;
      this.tap();
      if (a === 'resume') this.cb.onResume();
      else if (a === 'restart') this.cb.onRestart();
      else if (a === 'quit') this.cb.onQuitRace();
    });
    this.root.appendChild(s);
  }

  hidePause(): void {
    this.root.querySelector('#pause')?.remove();
  }

  // --------------------------------------------------------------- results

  showResults(data: RaceEndData, result: RaceResult, hasNext: boolean): void {
    this.clear();
    const ord = RacePositionManager.ordinal(result.placement);
    const n = ord.replace(/\D+$/, '');
    const suffix = ord.slice(n.length);
    const pClass = result.placement === 1 ? 'p1' : result.placement === 2 ? 'p2' : result.placement === 3 ? 'p3' : '';
    const starStr = '★'.repeat(result.stars) + '<span style="opacity:0.22">' + '★'.repeat(3 - result.stars) + '</span>';
    const xpInLevel = this.progression.xp % XP_PER_LEVEL;
    const standings = data.standings
      .map((s, i) => `
        <div class="srow ${s.isPlayer ? 'me' : ''}">
          <span class="sp">${RacePositionManager.ordinal(i + 1)}</span>
          <span>${s.isPlayer ? 'You' : s.name}</span>
          <span class="st">${s.finished ? fmtTime(s.time) : 'DNF'}</span>
        </div>`)
      .join('');
    const s = this.el(`
      <div class="screen ui-clickable">
        <div class="panel" style="text-align:center">
          <div class="result-place ${pClass}">${n}<span class="ord">${suffix}</span></div>
          <div class="result-stars">${starStr}</div>
          ${result.newBestTime ? '<div style="color:var(--good);font-weight:800;font-size:14px">NEW BEST TIME!</div>' : ''}
          <div class="result-rows">
            <div class="result-row"><span>Time</span><span class="val">${fmtTime(result.timeSeconds)}</span></div>
            <div class="result-row"><span>Coins collected</span><span class="val">+${result.coinsCollected}</span></div>
            <div class="result-row"><span>Parkour score</span><span class="val">${result.stuntScore}</span></div>
            <div class="result-row"><span>Placement reward</span><span class="val">+${result.coinsEarned - result.coinsCollected} ●</span></div>
            <div class="result-row"><span>XP earned</span><span class="val">+${result.xpEarned} XP</span></div>
          </div>
          <div style="margin-top:10px;font-size:13px;color:var(--text-dim)">Runner level ${this.progression.playerLevel}</div>
          <div class="xp-bar"><i style="width:${((xpInLevel / XP_PER_LEVEL) * 100).toFixed(1)}%"></i></div>
          <div class="standings">${standings}</div>
          <div class="btn-row">
            <button class="btn secondary small" data-a="menu">Menu</button>
            <button class="btn secondary small" data-a="retry">Retry</button>
            <button class="btn secondary small" data-a="levels">Levels</button>
            ${hasNext ? '<button class="btn small" data-a="next">Next ›</button>' : ''}
          </div>
        </div>
      </div>`);
    s.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
      if (!a) return;
      this.tap();
      if (a === 'retry') this.cb.onRestart();
      else if (a === 'next') this.cb.onNextLevel();
      else if (a === 'levels') this.cb.onOpenLevelSelect();
      else if (a === 'menu') this.cb.onBackToMenu();
    });
    this.root.appendChild(s);
  }

  showLoading(levelName: string): void {
    this.clear();
    const s = this.el(`
      <div class="screen">
        <div class="subtitle">Loading</div>
        <div class="title" style="font-size:clamp(26px,7vw,44px)">${levelName}</div>
        <div class="boot-bar"><i style="width:80%"></i></div>
      </div>`);
    this.root.appendChild(s);
  }

  // ---------------------------------------------------------------- events

  private wireGlobalEvents(): void {
    bus.on('checkpointReached', ({ index, total }) => this.toast(`CHECKPOINT ${index + 1}/${total}`, 1000));
    bus.on('playerDeath', ({ reason }) => this.toast(reason === 'fall' ? 'WIPEOUT!' : 'CRASHED!', 1000));
    bus.on('powerUpCollected', ({ type }) => this.toast(POWERUP_LABELS[type as keyof typeof POWERUP_LABELS] ?? type, 900));
    bus.on('levelUnlocked', ({ levelId }) => this.toast(`LEVEL ${levelId} UNLOCKED!`, 1500));
    bus.on('racerFinished', ({ isPlayer, placement }) => {
      if (isPlayer) this.toast(`FINISH — ${RacePositionManager.ordinal(placement)}!`, 1600);
    });
  }
}
