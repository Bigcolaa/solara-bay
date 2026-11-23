// Procedural canvas facade atlas: 16 day variants and their lit-window night counterparts.
import { rng } from '../core/math.js';

function atlas(night) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d'), r = rng(night ? 7717 : 4421);
  const walls = ['#b9a99a', '#9aa7ad', '#c8beb0', '#8e9a96', '#b3978f', '#a9a3b5', '#c2b8a4', '#8f9dab'];
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    const ox = tx * 128, oy = ty * 128, wall = walls[(ty * 5 + tx * 3) % walls.length];
    g.fillStyle = night ? '#262a36' : wall; g.fillRect(ox, oy, 128, 128);
    if (night) { g.fillStyle = wall + '33'; g.fillRect(ox, oy, 128, 128); }
    const cols = 4, rows = 6, ww = 20, wh = 12, gx = (128 - cols * 28) / 2 + 4, gy = 7;
    g.fillStyle = night ? '#141822' : '#6d7b84';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.fillRect(ox + gx + x * 28, oy + gy + y * 20, ww, wh);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const lit = r() < (night ? 0.54 : 0.08);
      if (night) g.fillStyle = lit ? (r() < 0.22 ? '#7ec8e8' : r() < 0.3 ? '#ffd79a' : '#ffe9b0') : '#1d2330';
      else g.fillStyle = lit ? '#d7dde0' : r() < 0.5 ? '#455a68' : '#586b78';
      g.fillRect(ox + gx + x * 28, oy + gy + y * 20, ww, wh);
      g.fillStyle = night ? '#0d1018' : '#e3e7e7';
      g.fillRect(ox + gx + x * 28 + 9, oy + gy + y * 20, 2, wh);
    }
    g.fillStyle = night ? '#1b1f2a' : '#6f756f';
    g.fillRect(ox, oy + 124, 128, 4);
    g.fillStyle = night ? '#33394a' : '#d7d2c6';
    g.fillRect(ox, oy, 128, 3);
  }
  return cv;
}
export function makeTextures() { return { day: atlas(false), night: atlas(true) }; }
