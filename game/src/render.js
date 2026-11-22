// Everything Lantern Thief paints: the manor floor, walls, crates and bushes,
// relics and the exit, the guards with their vision cones (raycast, so cover
// really does cut the light), the player and their lantern glow, noise rings,
// the HUD and every screen (title, pause, caught, clear, over, win).
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, VISION_RANGE, VISION_HALF_ANGLE, COLORS } from './config.js';
import { blocksSight } from './levels.js';
import { hash2 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** Where one ray of a guard's cone stops: the range, or the first sight-blocking tile. */
function coneRayEnd(tiles, x, y, angle) {
  const step = 4;
  for (let d = step; d <= VISION_RANGE; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return { x: px, y: py };
    if (blocksSight(tiles[ty][tx])) return { x: px, y: py };
  }
  return { x: x + Math.cos(angle) * VISION_RANGE, y: y + Math.sin(angle) * VISION_RANGE };
}

export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function drawCone(guard, tiles) {
    const steps = 26;
    const color = guard.mode === 'chase'
      ? COLORS.coneAlarm
      : guard.suspicion > 35 ? COLORS.coneSuspicious : COLORS.coneCalm;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (let i = 0; i <= steps; i += 1) {
      const angle = guard.angle - VISION_HALF_ANGLE + (2 * VISION_HALF_ANGLE * i) / steps;
      const end = coneRayEnd(tiles, guard.x, guard.y, angle);
      ctx.lineTo(end.x, end.y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawFloor(tiles) {
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const px = x * TILE;
        const py = y * TILE;
        const tile = tiles[y][x];
        if (tile === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(px, py, TILE, 5);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(px, py + TILE - 4, TILE, 4);
          continue;
        }
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        // Speckled stone: a few deterministic darker flecks per tile.
        const h = hash2(x, y, seed);
        if (h > 0.55) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(px + 6 + ((h * 97) % 16), py + 5 + ((h * 53) % 18), 3, 3);
        }
        ctx.strokeStyle = COLORS.floorLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (tile === 'C') {
          ctx.fillStyle = COLORS.crate;
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = COLORS.crateTop;
          ctx.fillRect(px + 3, py + 3, TILE - 6, 6);
          ctx.strokeStyle = '#4a3018';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 3);
          ctx.lineTo(px + TILE - 3, py + TILE - 3);
          ctx.moveTo(px + TILE - 3, py + 3);
          ctx.lineTo(px + 3, py + TILE - 3);
          ctx.stroke();
        } else if (tile === 'B') {
          ctx.fillStyle = COLORS.bush;
          ctx.beginPath();
          ctx.arc(px + 10, py + 20, 9, 0, Math.PI * 2);
          ctx.arc(px + 20, py + 12, 10, 0, Math.PI * 2);
          ctx.arc(px + 24, py + 22, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = COLORS.bushLeaf;
          ctx.beginPath();
          ctx.arc(px + 11, py + 17, 4, 0, Math.PI * 2);
          ctx.arc(px + 21, py + 11, 4, 0, Math.PI * 2);
          ctx.arc(px + 23, py + 21, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawRelics(state) {
    for (const relic of state.relics) {
      if (relic.taken) continue;
      const pulse = 0.6 + 0.4 * Math.sin(state.stepT * 4 + relic.x);
      const glow = ctx.createRadialGradient(relic.x, relic.y, 2, relic.x, relic.y, 34);
      glow.addColorStop(0, `rgba(255, 215, 94, ${0.5 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 215, 94, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(relic.x, relic.y, 34, 0, Math.PI * 2);
      ctx.fill();
      // A little golden idol: a diamond on a pedestal.
      ctx.fillStyle = '#8a6a1f';
      ctx.fillRect(relic.x - 7, relic.y + 4, 14, 4);
      ctx.fillStyle = COLORS.relic;
      ctx.beginPath();
      ctx.moveTo(relic.x, relic.y - 10);
      ctx.lineTo(relic.x + 7, relic.y - 1);
      ctx.lineTo(relic.x, relic.y + 6);
      ctx.lineTo(relic.x - 7, relic.y - 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawExit(state) {
    const e = state.exit;
    const open = state.exitOpen;
    const pulse = open ? 0.7 + 0.3 * Math.sin(state.stepT * 5) : 1;
    ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitLocked;
    ctx.globalAlpha = 0.25 * pulse + 0.55;
    ctx.fillRect(e.x - 15, e.y - 15, 30, 30);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = open ? '#b8ffdd' : '#8a9aa8';
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x - 15, e.y - 15, 30, 30);
    ctx.fillStyle = open ? '#0d3a24' : '#31404d';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCK', e.x, e.y + 1);
    if (!open) {
      const left = state.relics.filter((r) => !r.taken).length;
      ctx.fillStyle = COLORS.hudText;
      ctx.font = '11px sans-serif';
      ctx.fillText(`${left} relic${left === 1 ? '' : 's'} left`, e.x, e.y + 26);
    }
  }

  function drawGuard(guard) {
    // Body: a red-coated watchman with a brass helmet.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 9, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 3, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(guard.x - 8, guard.y - 4, 16, 2);
    // Facing tick and a walking bob.
    const bob = Math.sin(guard.stepPhase) * 1.5;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y + bob);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 16, guard.y + Math.sin(guard.angle) * 16 + bob);
    ctx.stroke();
    // Suspicion: a "?" that grows into a "!" as the guard notices you.
    if (guard.suspicion > 12) {
      const mark = guard.mode === 'chase' ? '!' : '?';
      ctx.fillStyle = guard.mode === 'chase' ? '#ff5040' : '#ffb020';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(mark, guard.x, guard.y - 16);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(guard.x - 12, guard.y - 30, 24, 4);
      ctx.fillStyle = guard.mode === 'chase' ? '#ff5040' : '#ffb020';
      ctx.fillRect(guard.x - 12, guard.y - 30, 24 * (guard.suspicion / 100), 4);
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    // Lantern light: a warm pool that shows what is safe around you.
    const glow = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, 130);
    glow.addColorStop(0, 'rgba(255, 205, 110, 0.20)');
    glow.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded thief: purple cloak, amber hood, a lantern swinging at the side.
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a4a';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(p.x + 12, p.y + 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (p.hidden) {
      ctx.fillStyle = '#7ee2a0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('HIDDEN', p.x, p.y - 16);
    }
  }

  function drawNoises(state) {
    for (const n of state.noises) {
      const progress = n.t / 0.9;
      ctx.strokeStyle = n.kind === 'pebble' ? `rgba(255, 220, 120, ${0.8 * (1 - progress)})` : `rgba(180, 200, 255, ${0.5 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.3 + 0.7 * progress), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.pebbleFlight) {
      const f = state.pebbleFlight;
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LANTERN THIEF  ·  ${state.level.name}`, 10, 18);
    const taken = state.relics.filter((r) => r.taken).length;
    ctx.fillText(`◆ ${taken}/${state.relics.length}`, 330, 18);
    ctx.fillText(`${'♥'.repeat(Math.max(0, state.lives))}${'♡'.repeat(Math.max(0, 3 - state.lives))}`, 410, 18);
    ctx.fillText(`● ${state.pebbles}`, 500, 18);
    ctx.fillText(`Score ${state.score}`, 560, 18);
    const mm = Math.floor(state.time / 60);
    const ss = String(Math.floor(state.time % 60)).padStart(2, '0');
    ctx.fillText(`${mm}:${ss}`, 660, 18);
    // Suspicion meter: the highest guard suspicion, right side.
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px sans-serif';
    ctx.fillText('SEEN', 730, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(775, 10, 150, 14);
    const s = state.maxSuspicion / 100;
    ctx.fillStyle = state.alarm ? '#ff5040' : s > 0.5 ? '#ffb020' : '#ffd75e';
    ctx.fillRect(775, 10, 150 * s, 14);
    if (state.alarm) {
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('ALARM!', VIEW_W - 10, 18);
      ctx.textAlign = 'left';
    }
    // Bottom hint line.
    ctx.fillStyle = 'rgba(8, 10, 18, 0.66)';
    ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD / arrows move · Shift sneak · Click throw a pebble · P pause', 10, VIEW_H - 13);
    ctx.textAlign = 'right';
    ctx.fillText(state.level.hint, VIEW_W - 10, VIEW_H - 13);
    ctx.textAlign = 'left';
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(16, 20, 34, 0.95)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    const w = 620;
    const h = 120 + lines.length * 30;
    ctx.fillRect((VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
    ctx.strokeRect((VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, VIEW_W / 2, (VIEW_H - h) / 2 + 52);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '16px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW_W / 2, (VIEW_H - h) / 2 + 104 + i * 30);
    });
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (screen === SCREEN_TITLE) {
      drawFloor(state.tiles);
      for (const guard of state.guards) drawCone(guard, state.tiles);
      for (const guard of state.guards) drawGuard(guard);
      drawRelics(state);
      drawExit(state);
      drawPlayer(state);
      panel('LANTERN THIEF', [
        'A top-down stealth game: sneak past the watchmen,',
        'take all 3 golden relics, and slip out the exit unseen.',
        'Crates block their sight. Bushes hide you. Running is loud.',
        '',
        'Press SPACE or CLICK to begin',
        `Best score: ${best}`,
      ], '#ffd75e');
      return;
    }
    drawFloor(state.tiles);
    for (const guard of state.guards) drawCone(guard, state.tiles);
    drawRelics(state);
    drawExit(state);
    drawPlayer(state);
    for (const guard of state.guards) drawGuard(guard);
    drawNoises(state);
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['Take a breath. The guards wait for no one,', 'but the game does. Press P to keep sneaking.'], '#9aa7bd');
    } else if (screen === SCREEN_CAUGHT) {
      panel('CAUGHT!', [
        `A watchman grabbed you. ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.`,
        'You wake at the courtyard gate…',
      ], '#ff5040');
    } else if (screen === SCREEN_CLEAR) {
      panel('LEVEL CLEAR!', [
        `${state.level.name} — every relic yours, and no one saw a thing.`,
        'The next courtyard waits…',
      ], '#39d98a');
    } else if (screen === SCREEN_OVER) {
      panel('THE LANTERN GOES OUT', [
        `Caught three times. Score ${state.score}. Best ${best}.`,
        'Press SPACE to try the manor again.',
      ], '#ff5040');
    } else if (screen === SCREEN_WIN) {
      const stealth = state.everAlarmed ? 'Loud as a brass band.' : 'Never once seen. A true ghost.';
      panel('THE EMBER VAULT IS YOURS', [
        `All three courtyards cleared. Score ${state.score}. Best ${best}.`,
        stealth,
        'Press SPACE to play again.',
      ], '#ffd75e');
    }
  }

  return { draw };
}
