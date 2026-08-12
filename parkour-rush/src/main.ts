import { audio } from './core/AudioManager';
import { bus } from './core/EventBus';
import { GameStateManager } from './core/GameStateManager';
import { haptics } from './core/Haptics';
import { input } from './core/InputManager';
import { SaveManager } from './core/SaveManager';
import type { SettingsData } from './core/types';
import { Game } from './game/Game';
import { getLevel, LEVELS } from './levels/levels';
import { CharacterSystem } from './progression/CharacterSystem';
import { CurrencySystem } from './progression/CurrencySystem';
import { ProgressionSystem } from './progression/ProgressionSystem';
import { UIManager } from './ui/UIManager';

/**
 * Composition root: builds every system, wires the game-flow state
 * machine (boot → menu → level select → countdown → race → results),
 * and connects gameplay results to progression + persistence.
 */

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

const save = new SaveManager();
const currency = new CurrencySystem(save);
const progression = new ProgressionSystem(save);
const characters = new CharacterSystem(save, currency);
const state = new GameStateManager();

let currentLevelId = 1;
let lastRaceEnd: import('./game/Game').RaceEndData | null = null;

function applySettings(s: SettingsData): void {
  save.data.settings = s;
  save.save();
  audio.setMusicOn(s.musicOn);
  audio.setSfxOn(s.sfxOn);
  haptics.enabled = s.hapticsOn;
  input.sensitivity = s.sensitivity;
  input.scheme = s.controlScheme;
  game.applySettings(s);
}

// ---------------------------------------------------------------- UI wiring

const ui = new UIManager(
  uiRoot,
  {
    onPlay: () => goLevelSelect(),
    onQuickRace: () => startRecommendedLevel(),
    onSelectLevel: (levelId) => startLevel(levelId),
    onPause: () => {
      if (state.is('racing')) {
        game.pause();
        state.go('paused');
        ui.showPause();
      }
    },
    onResume: () => {
      if (state.is('paused')) {
        ui.hidePause();
        game.resume();
        state.go('racing');
      }
    },
    onRestart: () => {
      if (state.is('paused')) ui.hidePause();
      restartLevel();
    },
    onQuitRace: () => {
      game.pause();
      game.unload();
      if (state.is('paused')) ui.hidePause();
      goLevelSelect(true);
    },
    onNextLevel: () => {
      const next = currentLevelId + 1;
      if (getLevel(next) && progression.isLevelUnlocked(next)) startLevel(next);
      else goLevelSelect(true);
    },
    onBackToMenu: () => goMenu(),
    onOpenLevelSelect: () => goLevelSelect(true),
    onOpenCustomize: () => {
      if (state.go('customize')) ui.showCustomize();
    },
    onOpenSettings: () => {
      if (state.go('settings')) ui.showSettings();
    },
    onCloseOverlay: () => goMenu(),
    onSettingsChanged: (s) => applySettings(s),
  },
  save.data.settings,
  input,
  currency,
  progression,
  characters,
);

const game = new Game(canvas, input);
game.bindPickupEvents();
input.attach(document.getElementById('app') as HTMLElement);
applySettings(save.data.settings);

// ---------------------------------------------------------------- game flow

function goMenu(): void {
  // legal from most states
  if (state.is('racing', 'paused')) game.unload();
  const path: Record<string, string[]> = {};
  void path;
  // walk FSM defensively: results → levelSelect → menu etc.
  if (!state.go('menu')) {
    if (state.is('results')) state.go('levelSelect');
    if (state.is('paused')) state.go('levelSelect');
    state.go('menu');
  }
  input.enabled = false;
  ui.showMenu();
}

function goLevelSelect(force = false): void {
  if (!state.go('levelSelect')) {
    if (state.is('results', 'paused', 'customize', 'settings')) {
      state.go('levelSelect');
    } else if (force) {
      state.go('menu');
      state.go('levelSelect');
    }
  }
  input.enabled = false;
  ui.showLevelSelect();
}

/** Pick the next race without forcing the player through level select. */
function startRecommendedLevel(): void {
  if (!save.data.tutorialDone) {
    startLevel(1);
    return;
  }
  const last = save.data.lastPlayedLevel;
  if (getLevel(last) && progression.isLevelUnlocked(last)) {
    startLevel(last);
    return;
  }
  // first unlocked level missing 3 stars, else highest unlocked
  for (let id = 1; id <= progression.unlockedLevel; id++) {
    if (progression.starsFor(id) < 3) {
      startLevel(id);
      return;
    }
  }
  startLevel(Math.min(progression.unlockedLevel, LEVELS.length));
}

function startLevel(levelId: number): void {
  const def = getLevel(levelId);
  if (!def || !progression.isLevelUnlocked(levelId)) return;
  currentLevelId = levelId;
  save.data.lastPlayedLevel = levelId;
  save.save();
  if (!state.go('loading')) {
    // from results/paused: hop through levelSelect
    state.go('levelSelect');
    state.go('loading');
  }
  ui.showLoading(def.name);

  // defer a frame so the loading screen paints
  requestAnimationFrame(() => {
    const trail = characters.selectedTrail;
    game.loadLevel(def, characters.selectedCharacter, characters.selectedColor, trail.color);
    state.go('countdown');
    const isTutorial = levelId === 1 && !save.data.tutorialDone;
    ui.showHUD(isTutorial);
    if (isTutorial) {
      ui.toast('SWIPE to steer · UP jump · DOWN slide', 2800);
    }
    input.enabled = true;
    game.startRace();
  });
}

function restartLevel(): void {
  startLevel(currentLevelId);
}

game.onCountdown = (n) => {
  ui.showCountdown(n);
  if (n === 0 && state.is('countdown')) state.go('racing');
};

game.onHud = (h) => {
  if (state.is('racing', 'countdown')) ui.updateHUD(h);
};

game.onRaceEnd = (data) => {
  lastRaceEnd = data;
  if (state.is('racing')) state.go('finished');
  state.go('results');
  input.enabled = false;

  const def = getLevel(currentLevelId)!;
  const result = progression.completeRace({
    levelId: currentLevelId,
    placement: data.placement,
    totalRacers: data.totalRacers,
    timeSeconds: data.time,
    coinsCollected: data.coins,
    stuntScore: data.stuntScore,
    targetTime: def.targetTime,
  });
  currency.add(result.coinsEarned);
  if (currentLevelId === 1) {
    save.data.tutorialDone = true;
    save.flush();
  }
  const hasNext = !!getLevel(currentLevelId + 1) && progression.isLevelUnlocked(currentLevelId + 1);
  ui.showResults(data, result, hasNext);
  game.unload();
};

// auto-pause when app is backgrounded (mobile)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.is('racing')) {
    game.pause();
    state.go('paused');
    ui.showPause();
  }
});

// keyboard escape = pause
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.is('racing')) {
    game.pause();
    state.go('paused');
    ui.showPause();
  }
});

// unlock audio on any first interaction
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

// expose light debug hooks for smoke testing
(window as unknown as Record<string, unknown>).__skylineRush = {
  state,
  save,
  game,
  levels: LEVELS,
  startLevel,
};

// ---------------------------------------------------------------- boot
ui.showBoot();
