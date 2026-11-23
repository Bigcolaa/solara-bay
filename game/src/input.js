// Keyboard and pointer snapshot. Edges are consumed once per simulation frame.
(function (SB) {
  const I = SB.input = { keys: new Set(), pressed: new Set(), mouse: { dx: 0, dy: 0, left: false, right: false, leftEdge: false }, locked: false };
  const blocked = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', (e) => {
    if (blocked.has(e.code)) e.preventDefault();
    if (!I.keys.has(e.code)) I.pressed.add(e.code);
    I.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => I.keys.delete(e.code));
  window.addEventListener('blur', () => { I.keys.clear(); I.mouse.left = I.mouse.right = false; });
  window.addEventListener('mousemove', (e) => {
    if (I.locked) { I.mouse.dx += e.movementX || 0; I.mouse.dy += e.movementY || 0; }
  });
  window.addEventListener('mousedown', (e) => {
    if (e.target && e.target.id === 'gl') {
      I.locked = true;
      document.getElementById('gl').requestPointerLock && document.getElementById('gl').requestPointerLock();
    }
    if (e.button === 0) { I.mouse.left = true; I.mouse.leftEdge = true; }
    if (e.button === 2) I.mouse.right = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.mouse.left = false; if (e.button === 2) I.mouse.right = false; });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { I.locked = document.pointerLockElement === document.getElementById('gl'); });
  I.down = (code) => I.keys.has(code);
  I.just = (code) => I.pressed.has(code);
  I.axis = () => ({ forward: (I.down('KeyW') || I.down('ArrowUp') ? 1 : 0) - (I.down('KeyS') || I.down('ArrowDown') ? 1 : 0),
    strafe: (I.down('KeyD') || I.down('ArrowRight') ? 1 : 0) - (I.down('KeyA') || I.down('ArrowLeft') ? 1 : 0) });
  I.endFrame = () => { I.pressed.clear(); I.mouse.dx = I.mouse.dy = 0; I.mouse.leftEdge = false; };
})(window.SB = window.SB || {});
