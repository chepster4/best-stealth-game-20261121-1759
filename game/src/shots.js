// The screenshot scenes behind ?shot=cover|play|alarm|win. Each one stages a real,
// reachable state of the game — the same world, the same renderer, the same rules —
// then lets the world run a few steps so the guards, cones and HUD settle exactly
// as they would in play. The same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_WIN } from './render.js';

const TILE_PX = 32;
const at = (tx, ty) => ({ x: tx * TILE_PX + TILE_PX / 2, y: ty * TILE_PX + TILE_PX / 2 });

function settle(world, seconds, moveX = 0, moveY = 0, sneak = false) {
  for (let t = 0; t < seconds; t += STEP) world.step(STEP, moveX, moveY, sneak, null);
}

function placeGuard(state, index, tx, ty, angle, suspicion, mode) {
  const guard = state.guards[index];
  const pos = at(tx, ty);
  guard.x = pos.x;
  guard.y = pos.y;
  guard.angle = angle;
  guard.suspicion = suspicion;
  guard.mode = mode;
  guard.pauseT = 0;
  guard.lostSightT = 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Any other name is the cover scene.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'play') {
    // Mid-level: two relics banked, the player slipping toward the east gate
    // while a watchman closes in from the left.
    state.relics[0].taken = true;
    state.relics[1].taken = true;
    state.relicsTaken = 2;
    state.score = 200;
    state.time = 132;
    const p = at(24, 10);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.dirX = 1;
    state.player.dirY = 0;
    placeGuard(state, 1, 20, 10, Math.PI, 30, 'patrol');
    placeGuard(state, 0, 10, 4, Math.PI / 2, 12, 'patrol');
    settle(world, 0.4, 1, 0, true);
    return { screen: SCREEN_PLAY, best: 1450 };
  }

  if (name === 'alarm') {
    // Spotted: a watchman is on the chase, red cone, alarm in the HUD.
    state.relics[0].taken = true;
    state.relicsTaken = 1;
    state.score = 100;
    state.time = 95;
    const p = at(19, 8);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.dirX = 1;
    state.player.dirY = 0;
    placeGuard(state, 0, 16, 8, 0, 100, 'chase');
    placeGuard(state, 1, 22, 13, -Math.PI / 2, 55, 'investigate');
    state.guards[1].targetX = p.x;
    state.guards[1].targetY = p.y;
    settle(world, 0.25, 1, 0, false);
    return { screen: SCREEN_PLAY, best: 1450 };
  }

  if (name === 'win') {
    // The vault is yours: the win panel over the courtyard.
    state.relics[0].taken = true;
    state.relics[1].taken = true;
    state.relics[2].taken = true;
    state.relicsTaken = 3;
    state.exitOpen = true;
    state.score = 1450;
    state.time = 310;
    const p = at(26, 9);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.dirX = 1;
    state.player.dirY = 0;
    placeGuard(state, 0, 8, 3, Math.PI / 4, 0, 'patrol');
    placeGuard(state, 1, 18, 14, -Math.PI / 2, 0, 'patrol');
    settle(world, 0.4);
    return { screen: SCREEN_WIN, best: 1450 };
  }

  // Cover: the player crouched behind a crate, a watchman's cone sweeping
  // inches past them, one relic already in the pocket.
  state.relics[0].taken = true;
  state.relicsTaken = 1;
  state.score = 100;
  state.time = 47;
  const p = at(10, 4);
  state.player.x = p.x;
  state.player.y = p.y;
  state.player.dirX = 1;
  state.player.dirY = 0;
  placeGuard(state, 0, 13, 2, 2.55, 55, 'patrol');
  placeGuard(state, 1, 18, 12, -Math.PI / 2, 8, 'patrol');
  settle(world, 0.3, 0, 0, true);
  return { screen: SCREEN_PLAY, best: 1450 };
}
