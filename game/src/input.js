// Keyboard and mouse for Lantern Thief: WASD or arrows to move, Shift to sneak,
// Space or click to confirm, P or Escape to pause, click in the world to throw
// a pebble at that point. The game canvas reports the click in world pixels.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let throwAt = null;
  let clickConfirm = false;

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    throwAt = { x, y };
    clickConfirm = true;
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    return { x, y, sneak: keys.has('shift') };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  function takeThrow() {
    const taken = throwAt;
    throwAt = null;
    return taken;
  }

  function takeClickConfirm() {
    const taken = clickConfirm;
    clickConfirm = false;
    return taken;
  }

  return { direction, takeActions, takeThrow, takeClickConfirm };
}
