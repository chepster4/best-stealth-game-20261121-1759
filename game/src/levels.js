// The three levels of Lantern Thief. Each level is an ASCII grid (30 x 19 tiles):
//   # wall (blocks sight and movement)   . floor
//   C crate (cover: blocks sight and movement)   B bush (hides you, blocks no movement)
//   P player start   R relic   E exit
// Guards patrol the waypoint lists (tile coordinates, must be floor tiles).
// parseLevel turns a grid into the tiles the world and renderer walk on.

export const LEVELS = [
  {
    name: '1 — Ember Courtyard',
    hint: 'Collect all 3 relics, then slip out the east gate. Crates block sight; bushes hide you.',
    grid: [
      '##############################',
      '#P....C.......B......C.....R.#',
      '#............................#',
      '#..B......C........C.....B...#',
      '#............................#',
      '#....C.........B.......C.....#',
      '#............................#',
      '#..C.......B........C........#',
      '#............................#',
      '#......B........C.......B..E.#',
      '#............................#',
      '#..C........B.......C........#',
      '#............................#',
      '#....B...........C......B....#',
      '#............................#',
      '#..C.......B........C.....R..#',
      '#............................#',
      '#R.......C........B.......C..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[7, 2], [22, 2], [22, 8], [7, 8]], pause: 1.2 },
      { waypoints: [[15, 16], [15, 10], [24, 10], [24, 16]], pause: 1.0 },
    ],
  },
  {
    name: '2 — The Lantern Hall',
    hint: 'Three guards now, and the hall is narrow. Sneak (Shift) past the patrols.',
    grid: [
      '##############################',
      '#P...C....B........C......R..#',
      '#............................#',
      '#.B......C.....B......C......#',
      '#............................#',
      '#....C......B........C....B..#',
      '#............................#',
      '#.C.....B........C.......C...#',
      '#............................#',
      '#.....B.....C........B......E#',
      '#............................#',
      '#.C.......B.....C........C...#',
      '#............................#',
      '#....B......C........B.......#',
      '#............................#',
      '#.C......B.......C......B.R..#',
      '#............................#',
      '#R....C......B........C......#',
      '##############################',
    ],
    guards: [
      { waypoints: [[5, 2], [14, 2], [14, 6], [5, 6]], pause: 0.9 },
      { waypoints: [[24, 4], [24, 12], [17, 12], [17, 4]], pause: 1.1 },
      { waypoints: [[9, 16], [20, 16], [20, 13], [9, 13]], pause: 1.0 },
    ],
  },
  {
    name: '3 — The Ember Vault',
    hint: 'The vault is thick with guards. Throw a pebble (click) to pull one away.',
    grid: [
      '##############################',
      '#P..C....B.....C......B...R..#',
      '#............................#',
      '#.B....C......B.....C....B...#',
      '#............................#',
      '#...C.....B.......C......C...#',
      '#............................#',
      '#.B.....C....B.......C....B..#',
      '#............................#',
      '#....C......B....C......B..E.#',
      '#............................#',
      '#.B......C.......B....C......#',
      '#............................#',
      '#...C......B....C.......B....#',
      '#............................#',
      '#.B....C.......B.....C....R..#',
      '#............................#',
      '#R...C.....B.......C......B..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[6, 2], [13, 2], [14, 7], [6, 7]], pause: 0.8 },
      { waypoints: [[23, 3], [23, 9], [18, 9], [16, 3]], pause: 0.9 },
      { waypoints: [[8, 15], [14, 15], [15, 11], [8, 11]], pause: 0.8 },
      { waypoints: [[26, 14], [26, 6], [20, 6], [20, 14]], pause: 1.0 },
    ],
  },
];

export const TILE_WALL = '#';
export const TILE_CRATE = 'C';
export const TILE_BUSH = 'B';

/** Parse one level grid into tiles plus the player start, relics and exit. */
export function parseLevel(level) {
  const tiles = [];
  let playerStart = null;
  const relics = [];
  let exit = null;
  for (let y = 0; y < level.grid.length; y += 1) {
    const row = level.grid[y];
    if (row.length !== 30) throw new Error(`level row ${y} is ${row.length} tiles, want 30`);
    const out = [];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === 'P') {
        playerStart = { x: x * 32 + 16, y: y * 32 + 16 };
        out.push('.');
      } else if (ch === 'R') {
        relics.push({ x: x * 32 + 16, y: y * 32 + 16, taken: false });
        out.push('.');
      } else if (ch === 'E') {
        exit = { x: x * 32 + 16, y: y * 32 + 16 };
        out.push('.');
      } else if (ch !== '#' && ch !== '.' && ch !== 'C' && ch !== 'B') {
        throw new Error(`level tile '${ch}' at ${x},${y} is not a known tile`);
      } else {
        out.push(ch);
      }
    }
    tiles.push(out);
  }
  if (tiles.length !== 19) throw new Error(`level is ${tiles.length} rows, want 19`);
  if (!playerStart) throw new Error('level has no player start');
  if (!exit) throw new Error('level has no exit');
  if (relics.length === 0) throw new Error('level has no relics');
  for (const guard of level.guards) {
    for (const [gx, gy] of guard.waypoints) {
      if (tiles[gy][gx] !== '.') throw new Error(`guard waypoint ${gx},${gy} is not floor`);
    }
  }
  return { tiles, playerStart, relics, exit };
}

/** True when the tile blocks a guard's sight (walls and crates; bushes do not). */
export function blocksSight(tile) {
  return tile === '#' || tile === 'C';
}

/** True when the tile blocks movement (walls and crates). */
export function blocksMove(tile) {
  return tile === '#' || tile === 'C';
}
