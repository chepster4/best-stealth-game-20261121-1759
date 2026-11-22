// Boot and the one loop for Lantern Thief: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The game
// moves between title, play, paused, caught, level clear, game over and win.
//
// ?seed=N fixes the level decorations. ?shot=cover|play|alarm|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_ALARM, EVENT_CAUGHT, EVENT_LEVEL_CLEAR, EVENT_PEBBLE,
  EVENT_RELIC, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, seed);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let stepTimer = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Sneak past the guards, take the relics, reach the exit.');
  }

  function handleEvents(events) {
    if (events & EVENT_RELIC) audio.relic();
    if (events & EVENT_ALARM) {
      audio.alarm();
      announce('Spotted! Run for cover!');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      announce('Caught!');
    }
    if (events & EVENT_PEBBLE) audio.pebble();
    if (events & EVENT_LEVEL_CLEAR) {
      audio.clear();
      announce('Level clear!');
    }
    if (events & EVENT_WIN) {
      audio.win();
      announce('You cleared the Ember Vault!');
    }
  }

  function syncScreen() {
    const s = world.state.status;
    if (s === 'caught') screen = SCREEN_CAUGHT;
    else if (s === 'levelClear') screen = SCREEN_CLEAR;
    else if (s === 'gameOver') {
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
    } else if (s === 'win') {
      screen = SCREEN_WIN;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicked = input.takeClickConfirm();
    if ((actions & ACTION_CONFIRM || clicked) && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const throwAt = input.takeThrow();
    const events = world.step(STEP, dir.x, dir.y, dir.sneak, throwAt);
    handleEvents(events);
    syncScreen();
    // Footsteps: a soft tick each stride, quieter while sneaking.
    const p = world.state.player;
    if (p.moving) {
      stepTimer += STEP;
      const stride = dir.sneak ? 0.55 : 0.38;
      if (stepTimer >= stride) {
        stepTimer = 0;
        audio.footstep(dir.sneak);
      }
    } else {
      stepTimer = 0;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && screen === SCREEN_PLAY) {
      step();
      accumulator -= STEP;
      if (screen !== SCREEN_PLAY) break;
    }
    if (screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lantern Thief. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
