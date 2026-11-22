// The rules of Lantern Thief: movement and collision, guard patrols, vision cones
// with line of sight, suspicion that builds and decays, noise that pulls guards
// to investigate, alarms and chases, relics and the exit. Pure logic, no drawing.
import {
  TILE, COLS, ROWS, STEP, PLAYER_SPEED, PLAYER_SNEAK_SPEED,
  GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED,
  VISION_RANGE, VISION_HALF_ANGLE, BUSH_SPOT_RANGE,
  SUSPICION_WALK_RATE, SUSPICION_SNEAK_RATE, SUSPICION_DECAY_RATE,
  NOISE_WALK_RADIUS, NOISE_PEBBLE_RADIUS, PEBBLES_PER_LEVEL,
  START_LIVES, CATCH_RADIUS, RELIC_SCORE, LEVEL_CLEAR_SCORE,
} from './config.js';
import { LEVELS, parseLevel, blocksSight, blocksMove } from './levels.js';

export const EVENT_RELIC = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_LEVEL_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_ALARM = 16;
export const EVENT_GAME_OVER = 32;
export const EVENT_PEBBLE = 64;

const PLAYER_RADIUS = 11;
const GUARD_RADIUS = 12;

/** Line of sight between two points: blocked when a sight-blocking tile is crossed. */
export function lineOfSight(tiles, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    if (blocksSight(tiles[ty][tx])) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function tileAt(tiles, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return tiles[ty][tx];
}

/** Move a circle through the grid, sliding along walls and crates. */
function moveCircle(tiles, body, dx, dy, radius) {
  let nx = body.x + dx;
  if (!hitsWall(tiles, nx, body.y, radius)) body.x = nx;
  let ny = body.y + dy;
  if (!hitsWall(tiles, body.x, ny, radius)) body.y = ny;
}

function hitsWall(tiles, x, y, radius) {
  for (const ox of [-radius, 0, radius]) {
    for (const oy of [-radius, 0, radius]) {
      if (blocksMove(tileAt(tiles, x + ox, y + oy))) return true;
    }
  }
  return false;
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: null,
    tiles: [],
    player: { x: 0, y: 0, dirX: 1, dirY: 0, sneaking: false, hidden: false, moving: false },
    guards: [],
    relics: [],
    exit: null,
    exitOpen: false,
    pebbles: PEBBLES_PER_LEVEL,
    pebbleFlight: null,
    noises: [],
    lives: START_LIVES,
    score: 0,
    time: 0,
    status: 'playing', // playing | caught | levelClear | win | gameOver
    statusT: 0,
    maxSuspicion: 0,
    alarm: false,
    relicsTaken: 0,
    levelsCleared: 0,
    everAlarmed: false,
    stepT: 0,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    const parsed = parseLevel(level);
    state.levelIndex = index;
    state.level = level;
    state.tiles = parsed.tiles;
    state.player.x = parsed.playerStart.x;
    state.player.y = parsed.playerStart.y;
    state.player.dirX = 1;
    state.player.dirY = 0;
    state.relics = parsed.relics.map((r) => ({ ...r }));
    state.exit = { ...parsed.exit };
    state.exitOpen = false;
    state.pebbles = PEBBLES_PER_LEVEL;
    state.pebbleFlight = null;
    state.noises = [];
    state.maxSuspicion = 0;
    state.alarm = false;
    state.guards = level.guards.map((g) => {
      const [wx, wy] = g.waypoints[0];
      const [nx, ny] = g.waypoints[1] ?? g.waypoints[0];
      return {
        x: wx * TILE + TILE / 2,
        y: wy * TILE + TILE / 2,
        angle: Math.atan2(ny - wy, nx - wx),
        waypoints: g.waypoints,
        wpIndex: 1 % g.waypoints.length,
        pause: g.pause,
        pauseT: 0,
        mode: 'patrol', // patrol | investigate | chase
        suspicion: 0,
        targetX: 0,
        targetY: 0,
        investigateT: 0,
        lostSightT: 0,
        stepPhase: random() * Math.PI * 2,
      };
    });
  }

  function resetRun() {
    state.lives = START_LIVES;
    state.score = 0;
    state.time = 0;
    state.relicsTaken = 0;
    state.levelsCleared = 0;
    state.everAlarmed = false;
    state.status = 'playing';
    state.statusT = 0;
    loadLevel(0);
  }

  function respawnAfterCaught() {
    // Back to the level entrance; guards and suspicion reset, relics stay taken.
    const parsed = parseLevel(state.level);
    state.player.x = parsed.playerStart.x;
    state.player.y = parsed.playerStart.y;
    state.pebbles = PEBBLES_PER_LEVEL;
    state.pebbleFlight = null;
    state.noises = [];
    state.maxSuspicion = 0;
    state.alarm = false;
    loadLevelGuardsOnly();
    state.status = 'playing';
    state.statusT = 0;
  }

  function loadLevelGuardsOnly() {
    const level = state.level;
    state.guards = level.guards.map((g) => {
      const [wx, wy] = g.waypoints[0];
      const [nx, ny] = g.waypoints[1] ?? g.waypoints[0];
      return {
        x: wx * TILE + TILE / 2,
        y: wy * TILE + TILE / 2,
        angle: Math.atan2(ny - wy, nx - wx),
        waypoints: g.waypoints,
        wpIndex: 1 % g.waypoints.length,
        pause: g.pause,
        pauseT: 0,
        mode: 'patrol',
        suspicion: 0,
        targetX: 0,
        targetY: 0,
        investigateT: 0,
        lostSightT: 0,
        stepPhase: random() * Math.PI * 2,
      };
    });
  }

  function guardSeesPlayer(guard) {
    const p = state.player;
    const dx = p.x - guard.x;
    const dy = p.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > VISION_RANGE) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), guard.angle)) > VISION_HALF_ANGLE) return false;
    if (!lineOfSight(state.tiles, guard.x, guard.y, p.x, p.y)) return false;
    if (p.hidden && dist > BUSH_SPOT_RANGE) return false; // bushes hide you unless close
    return true;
  }

  function hearNoise(guard, x, y, radius) {
    if (guard.mode === 'chase') return;
    const dist = Math.hypot(x - guard.x, y - guard.y);
    if (dist > radius) return;
    guard.mode = 'investigate';
    guard.targetX = x;
    guard.targetY = y;
    guard.investigateT = 3.5;
    guard.suspicion = Math.max(guard.suspicion, 45);
  }

  function stepGuard(guard, dt) {
    const p = state.player;
    const sees = state.status === 'playing' && guardSeesPlayer(guard);
    if (sees) {
      const dist = Math.hypot(p.x - guard.x, p.y - guard.y);
      const closeness = 1 - dist / VISION_RANGE;
      const rate = (p.sneaking ? SUSPICION_SNEAK_RATE : SUSPICION_WALK_RATE) * (0.55 + closeness);
      guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
      guard.lostSightT = 0;
      guard.targetX = p.x;
      guard.targetY = p.y;
      if (guard.suspicion >= 100 && guard.mode !== 'chase') {
        guard.mode = 'chase';
        state.everAlarmed = true;
      }
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY_RATE * dt);
      if (guard.mode === 'chase') {
        guard.lostSightT += dt;
        if (guard.lostSightT > 3) {
          guard.mode = 'investigate';
          guard.investigateT = 3;
          guard.suspicion = 55;
        }
      }
    }
    if (guard.mode === 'chase') {
      const dx = p.x - guard.x;
      const dy = p.y - guard.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = GUARD_CHASE_SPEED;
      moveCircle(state.tiles, guard, (dx / dist) * speed * dt, (dy / dist) * speed * dt, GUARD_RADIUS);
      guard.angle += angleDiff(Math.atan2(dy, dx), guard.angle) * Math.min(1, dt * 10);
      guard.stepPhase += dt * 11;
    } else if (guard.mode === 'investigate') {
      const dx = guard.targetX - guard.x;
      const dy = guard.targetY - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) {
        guard.investigateT -= dt;
        guard.angle += dt * 1.4; // looks around while searching
        if (guard.investigateT <= 0) {
          guard.mode = 'patrol';
          guard.suspicion = Math.max(0, guard.suspicion - 20);
        }
      } else {
        moveCircle(state.tiles, guard, (dx / dist) * GUARD_INVESTIGATE_SPEED * dt, (dy / dist) * GUARD_INVESTIGATE_SPEED * dt, GUARD_RADIUS);
        guard.angle += angleDiff(Math.atan2(dy, dx), guard.angle) * Math.min(1, dt * 8);
      }
      guard.stepPhase += dt * 9;
    } else {
      // Patrol: walk to the next waypoint, pause and look around there.
      if (guard.pauseT > 0) {
        guard.pauseT -= dt;
        guard.angle += dt * 0.9;
      } else {
        const [wx, wy] = guard.waypoints[guard.wpIndex];
        const tx = wx * TILE + TILE / 2;
        const ty = wy * TILE + TILE / 2;
        const dx = tx - guard.x;
        const dy = ty - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          guard.pauseT = guard.pause;
        } else {
          moveCircle(state.tiles, guard, (dx / dist) * GUARD_PATROL_SPEED * dt, (dy / dist) * GUARD_PATROL_SPEED * dt, GUARD_RADIUS);
          guard.angle += angleDiff(Math.atan2(dy, dx), guard.angle) * Math.min(1, dt * 8);
        }
      }
      guard.stepPhase += dt * 7;
    }
  }

  /** Advance the world one fixed step. move is -1..1 on each axis; throwAt is a world point or null. */
  function step(dt, moveX, moveY, sneaking, throwAt) {
    let events = 0;
    state.stepT += dt;
    if (state.status === 'caught' || state.status === 'levelClear') {
      state.statusT += dt;
      if (state.status === 'caught' && state.statusT > 1.2) {
        if (state.lives <= 0) {
          state.status = 'gameOver';
          state.statusT = 0;
          return EVENT_GAME_OVER;
        }
        respawnAfterCaught();
      } else if (state.status === 'levelClear' && state.statusT > 1.6) {
        if (state.levelIndex + 1 >= LEVELS.length) {
          state.status = 'win';
          state.statusT = 0;
          return EVENT_WIN;
        }
        state.levelsCleared += 1;
        loadLevel(state.levelIndex + 1);
        state.status = 'playing';
        state.statusT = 0;
      }
      return events;
    }
    if (state.status !== 'playing') return events;
    state.time += dt;

    // Player movement.
    const p = state.player;
    const len = Math.hypot(moveX, moveY);
    const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    p.sneaking = sneaking;
    p.moving = len > 0.1;
    if (len > 0.1) {
      const nx = moveX / len;
      const ny = moveY / len;
      p.dirX = nx;
      p.dirY = ny;
      moveCircle(state.tiles, p, nx * speed * dt, ny * speed * dt, PLAYER_RADIUS);
      // Walking (not sneaking) is noisy: guards nearby come to look.
      if (!sneaking && state.stepT % 0.35 < dt) {
        state.noises.push({ x: p.x, y: p.y, r: NOISE_WALK_RADIUS, t: 0, kind: 'step' });
        for (const g of state.guards) hearNoise(g, p.x, p.y, NOISE_WALK_RADIUS);
      }
    }
    p.hidden = tileAt(state.tiles, p.x, p.y) === 'B';

    // Pebble throw: click to toss one; it lands and makes a loud noise.
    if (throwAt && state.pebbles > 0 && !state.pebbleFlight) {
      state.pebbles -= 1;
      state.pebbleFlight = { x: p.x, y: p.y, tx: throwAt.x, ty: throwAt.y, t: 0 };
      events |= EVENT_PEBBLE;
    }
    if (state.pebbleFlight) {
      const f = state.pebbleFlight;
      f.t += dt / 0.45;
      if (f.t >= 1) {
        state.noises.push({ x: f.tx, y: f.ty, r: NOISE_PEBBLE_RADIUS, t: 0, kind: 'pebble' });
        for (const g of state.guards) hearNoise(g, f.tx, f.ty, NOISE_PEBBLE_RADIUS);
        state.pebbleFlight = null;
      } else {
        f.x = p.x + (f.tx - p.x) * f.t;
        f.y = p.y + (f.ty - p.y) * f.t - Math.sin(f.t * Math.PI) * 26;
      }
    }
    for (const n of state.noises) n.t += dt;
    state.noises = state.noises.filter((n) => n.t < 0.9);

    // Relics and the exit.
    for (const relic of state.relics) {
      if (!relic.taken && Math.hypot(relic.x - p.x, relic.y - p.y) < 24) {
        relic.taken = true;
        state.relicsTaken += 1;
        state.score += RELIC_SCORE;
        events |= EVENT_RELIC;
      }
    }
    if (!state.exitOpen && state.relics.every((r) => r.taken)) state.exitOpen = true;
    if (state.exitOpen && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 24) {
      state.score += LEVEL_CLEAR_SCORE + Math.max(0, 300 - Math.floor(state.time));
      state.status = 'levelClear';
      state.statusT = 0;
      return events | EVENT_LEVEL_CLEAR;
    }

    // Guards.
    let alarmNow = false;
    let maxSuspicion = 0;
    for (const guard of state.guards) {
      const before = guard.mode;
      stepGuard(guard, dt);
      if (guard.mode === 'chase') alarmNow = true;
      if (before !== 'chase' && guard.mode === 'chase') events |= EVENT_ALARM;
      maxSuspicion = Math.max(maxSuspicion, guard.suspicion);
      if (guard.mode === 'chase' && Math.hypot(guard.x - p.x, guard.y - p.y) < CATCH_RADIUS) {
        state.lives -= 1;
        state.status = 'caught';
        state.statusT = 0;
        return events | EVENT_CAUGHT;
      }
    }
    state.alarm = alarmNow;
    state.maxSuspicion = maxSuspicion;
    return events;
  }

  resetRun();
  return { state, step, reset: resetRun, loadLevel, tileAt: (x, y) => tileAt(state.tiles, x, y) };
}
