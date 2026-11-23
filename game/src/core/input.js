// Keyboard/mouse state for the single active game canvas.
export function makeInput(canvas) {
  const keys = new Set(), pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const code = (e) => e.code;
  addEventListener('keydown', (e) => { if (!keys.has(code(e))) pressed.add(code(e)); keys.add(code(e)); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code(e))) e.preventDefault(); });
  addEventListener('keyup', (e) => keys.delete(code(e)));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('mousedown', () => { mouse.down = true; mouse.clicked = true; });
  addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return {
    keys, mouse,
    down: (k) => keys.has(k),
    hit: (k) => pressed.has(k),
    endFrame() { pressed.clear(); mouse.clicked = false; },
  };
}
