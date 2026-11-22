// Shared constants for Lantern Thief: a top-down stealth game on a tile grid.
// One file, one job: every number the world, renderer and shots agree on lives here.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 19;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 608
export const STEP = 1 / 60;

export const PLAYER_SPEED = 132; // px per second, walking
export const PLAYER_SNEAK_SPEED = 62; // sneaking is slow and quiet
export const GUARD_PATROL_SPEED = 58;
export const GUARD_CHASE_SPEED = 118;
export const GUARD_INVESTIGATE_SPEED = 84;

export const VISION_RANGE = 205; // how far a guard can see, px
export const VISION_HALF_ANGLE = 0.62; // radians either side of facing (~35 deg)
export const BUSH_SPOT_RANGE = 78; // a guard must be this close to spot you in a bush
export const SUSPICION_WALK_RATE = 62; // suspicion per second while seen walking
export const SUSPICION_SNEAK_RATE = 30; // ...while seen sneaking
export const SUSPICION_DECAY_RATE = 26; // suspicion per second while unseen
export const NOISE_WALK_RADIUS = 92; // running feet are heard this far
export const NOISE_PEBBLE_RADIUS = 150;
export const PEBBLES_PER_LEVEL = 5;
export const START_LIVES = 3;
export const CATCH_RADIUS = 18; // guard touches you: caught
export const RELIC_SCORE = 100;
export const LEVEL_CLEAR_SCORE = 500;

export const BEST_KEY = 'lantern-thief-best';

// Palette: a night manor courtyard lit by lanterns — dark blues, warm amber light.
export const COLORS = {
  floorA: '#1c2438',
  floorB: '#202a40',
  floorLine: '#2a3550',
  wall: '#3a2f4a',
  wallTop: '#54466b',
  crate: '#6b4a2f',
  crateTop: '#8a6238',
  bush: '#1e4d2e',
  bushLeaf: '#2f7a44',
  relic: '#ffd75e',
  exitLocked: '#5a6b7a',
  exitOpen: '#39d98a',
  player: '#f2c14e',
  playerCloak: '#7a4a8a',
  guard: '#e5484d',
  guardDark: '#8a2f33',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlarm: 'rgba(255, 60, 60, 0.34)',
  hudBg: 'rgba(8, 10, 18, 0.78)',
  hudText: '#f4ead2',
  hudDim: '#9aa7bd',
};
