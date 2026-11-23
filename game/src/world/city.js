// 9x9 coastal grid: asphalt, facades, harbor, lighthouse, pier, beach and Neon Mile.
import { Batch, box, cyl, cone, groundQuad, quad } from '../core/gl.js';
import { rng, rand, TAU } from '../core/math.js';

export const CELL = 26, GRID = 9, LINE0 = -104, CITY_EDGE = 108, SEAWALL = -116;
export const gridLine = (i) => LINE0 + i * CELL;
export const nearestLine = (v) => Math.round((v - LINE0) / CELL) * CELL + LINE0;
export const GARAGE = { x: 78, z: 78 };
export const NEON_Z = 52;

export function buildCity(renderer) {
  const r = rng(92041), solid = new Batch(160000), tex = new Batch(60000), trans = new Batch(9000);
  const asphalt = '#20242a', line = '#e2b53e', white = '#cdd4d8';

  groundQuad(solid, 0, -3, 236, 236, -0.05, '#171b20');
  groundQuad(solid, 0, 0, 224, 224, -0.03, asphalt);
  groundQuad(solid, 0, -111, 236, 10, -0.02, '#b9a984');       // beach sand
  groundQuad(solid, 0, -116, 236, 2.6, 1.05, '#8e8f87');       // seawall
  box(solid, 0, 0.4, -117.2, 236, 2.2, 1.2, '#a2a39b');
  box(solid, 0, 1.55, -116.7, 236, 0.25, 1.4, '#c2c1b6');

  // Asphalt grid + crisp lane paint.
  for (let i = 0; i < GRID; i++) {
    const g = gridLine(i);
    groundQuad(solid, g, 0, 7.2, 216, -0.005, asphalt);
    groundQuad(solid, 0, g, 216, 7.2, -0.004, asphalt);
    box(solid, g, 0.018, 0, 0.16, 0.012, 208, line);
    box(solid, 0, 0.019, g, 208, 0.012, 0.16, line);
    for (let t = -100; t <= 100; t += 8) {
      if ((t - LINE0) % CELL < 9) continue;
      box(solid, g - 2.5, 0.02, t, 0.1, 0.012, 3.2, white);
      box(solid, g + 2.5, 0.02, t, 0.1, 0.012, 3.2, white);
      box(solid, t, 0.021, g - 2.5, 3.2, 0.012, 0.1, white);
      box(solid, t, 0.021, g + 2.5, 3.2, 0.012, 0.1, white);
    }
  }
  // Concrete sidewalks and city blocks.
  const parks = [[2, 2], [5, 6], [6, 2], [3, 4]];
  const harbor = [[0, 2], [0, 3], [0, 4], [1, 3]];
  for (let i = 0; i < GRID - 1; i++) for (let j = 0; j < GRID - 1; j++) {
    const cx = gridLine(i) + 13, cz = gridLine(j) + 13;
    groundQuad(solid, cx, cz, 19.4, 19.4, 0.006, j === 0 ? '#8e928c' : '#9b9b93');
    groundQuad(solid, cx, cz, 17.8, 17.8, 0.009, '#a7a69d');
    const isPark = parks.some(p => p[0] === i && p[1] === j);
    const isHarbor = harbor.some(p => p[0] === i && p[1] === j);
    const isGarage = Math.abs(cx - GARAGE.x) < 14 && Math.abs(cz - GARAGE.z) < 14;
    if (isPark) {
      groundQuad(solid, cx, cz, 17, 17, 0.012, '#3f6543');
      for (let k = 0; k < 5; k++) {
        const px = cx + rand(r, -6, 6), pz = cz + rand(r, -6, 6);
        cyl(solid, px, 1.4, pz, 0.28, 2.8, '#6b4c34', 6);
        cone(solid, px, 3.8, pz, 2.1, 4.4, '#2e6b42', 8);
        groundQuad(trans, px, pz, 4.2, 4.2, 0.015, [0, 0, 0, 0.24]);
      }
      continue;
    }
    if (isHarbor) {
      groundQuad(solid, cx, cz, 17, 17, 0.012, '#6e6f68');
      for (let k = 0; k < 6; k++) {
        const w = rand(r, 4.5, 7.5), h = rand(r, 2.8, 3.1), d = rand(r, 2.2, 2.7);
        const px = cx + (k % 3 - 1) * 5.4, pz = cz + (Math.floor(k / 3) - 0.5) * 6.6;
        const hue = ['#b44c42', '#3f6fa8', '#d0a63c', '#4d8b7a', '#8b547e'][k % 5];
        box(solid, px, h / 2 + 0.01, pz, w, h, d, hue);
        box(solid, px, h + 0.02, pz, w + 0.15, 0.08, d + 0.15, '#1d2024');
        groundQuad(trans, px, pz, w + 1, d + 1, 0.014, [0, 0, 0, 0.3]);
      }
      continue;
    }
    if (isGarage) {
      box(solid, cx, 4.5, cz, 17, 9, 15, '#414b56');
      box(solid, cx, 9.2, cz, 18, 0.7, 16, '#27303a');
      box(solid, cx, 3.4, cz + 7.6, 7.5, 6, 0.4, '#181d22');
      box(solid, cx - 5.2, 5.6, cz + 7.8, 3.3, 2.4, 0.3, '#78d6bb');
      box(solid, cx + 5.2, 5.6, cz + 7.8, 3.3, 2.4, 0.3, '#78d6bb');
      box(trans, cx, 10.4, cz, 5.6, 1.1, 5.6, [0.22, 1, 0.7, 0.5]);
      groundQuad(trans, cx, cz, 21, 19, 0.014, [0, 0, 0, 0.32]);
      continue;
    }
    const count = r() < 0.32 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const w = count === 2 ? rand(r, 6.5, 8.5) : rand(r, 10, 15.5);
      const d = count === 2 ? rand(r, 7, 10) : rand(r, 10, 15);
      const h = rand(r, 9, j === 0 ? 20 : 38);
      const px = cx + (count === 2 ? (k ? 4.4 : -4.4) : rand(r, -1.2, 1.2));
      const pz = cz + (count === 2 ? rand(r, -1, 1) : rand(r, -1.2, 1.2));
      const tx = Math.floor(r() * 4), ty = Math.floor(r() * 4);
      const uv = [tx / 4, ty / 4, (tx + 1) / 4, (ty + 1) / 4];
      box(tex, px, h / 2 + 0.01, pz, w, h, d, [1, 1, 1, 1], uv);
      box(solid, px, h + 0.35, pz, w + 0.5, 0.6, d + 0.5, '#4a4e51');
      if (h > 24) box(solid, px + w * 0.2, h + 2.1, pz - d * 0.1, 1.4, 3.2, 1.4, '#5b6165');
      groundQuad(trans, px, pz, w + 2.4, d + 2.4, 0.013, [0, 0, 0, 0.27]);
    }
  }

  // Harbor cranes.
  for (const [x, z, a] of [[-118, -76, 0.3], [-118, -38, -0.2]]) {
    box(solid, x, 13, z, 1.8, 26, 1.8, '#d59a3c', null, a);
    box(solid, x, 27, z, 24, 1.5, 1.6, '#e0aa45', null, a);
    box(solid, x - 7, 20, z, 0.4, 12, 0.4, '#d59a3c');
    box(solid, x + 9, 22, z, 5, 0.5, 0.5, '#f0c469');
    box(solid, x + 9, 17, z, 0.14, 10, 0.14, '#3a3d40');
    box(solid, x + 9, 12, z, 2.4, 0.9, 1.8, '#c44d3d');
  }
  // Marina pier, posts and moored boats.
  for (let z = -108; z >= -142; z -= 2) box(solid, 35, -0.35, z, 6.4, 0.5, 1.7, '#8a6f4d');
  for (let z = -109; z >= -142; z -= 6) for (const x of [32, 38]) cyl(solid, x, -1.2, z, 0.35, 3, '#6c533a', 6);
  for (let k = 0; k < 4; k++) {
    const x = 29 + (k % 2) * 12, z = -119 - Math.floor(k / 2) * 12;
    box(solid, x, -1.1, z, 3.2, 1.2, 7, ['#d6d9d2', '#b85146', '#e2c85f', '#5b9ca0'][k]);
    box(solid, x, -0.25, z + 1, 1.8, 0.8, 2.2, '#e8e6dd');
  }
  // Lighthouse on the rocks, seaward of the wall.
  cyl(solid, -62, 0.4, -136, 5.5, 2.2, '#4c4d49', 12);
  cyl(solid, -62, 12, -136, 3.1, 22, '#dcdcd0', 12);
  cyl(solid, -62, 18, -136, 3.3, 2.6, '#bf4c43', 12);
  cyl(solid, -62, 24, -136, 3.4, 2.6, '#bf4c43', 12);
  cyl(solid, -62, 24.5, -136, 2.6, 1.4, '#20262c', 12);
  box(solid, -62, 27, -136, 3.4, 1.2, 3.4, '#3a4147');

  // Beach props: palms, umbrellas, loungers.
  for (let k = 0; k < 14; k++) {
    const x = -108 + k * 16.5, z = -110.5 + (k % 2) * 2.4;
    if (k % 3 === 0) { cyl(solid, x, 2.2, z, 0.24, 4.4, '#7b5b3c', 6); cone(solid, x, 5, z, 2.6, 2.6, '#37704a', 7); }
    else { cyl(solid, x, 1.2, z, 0.07, 2.4, '#b5b1a5', 5); cone(solid, x, 2.5, z, 1.75, 0.9, k % 2 ? '#e05f5f' : '#f0d062', 8); }
    box(solid, x + 2.6, 0.32, z + 1.2, 2.4, 0.2, 1.1, '#d8d2bd');
  }
  // Traffic lights at alternating intersections.
  for (let i = 1; i < GRID; i += 2) for (let j = 1; j < GRID; j += 2) {
    const x = gridLine(i) - 4.6, z = gridLine(j) - 4.6;
    cyl(solid, x, 2.6, z, 0.12, 5.2, '#3d4347', 6);
    box(solid, x, 4.9, z, 0.55, 1.7, 0.5, '#242a2f');
    box(solid, x, 5.4, z - 0.3, 0.35, 0.35, 0.12, '#d7483e');
    box(solid, x, 4.85, z - 0.3, 0.35, 0.35, 0.12, '#c6a83b');
    box(solid, x, 4.3, z - 0.3, 0.35, 0.35, 0.12, '#3fa765');
  }
  // Neon Mile: glowing arches along the northern boulevard.
  for (let x = -100; x <= 100; x += 25) {
    const c = x % 50 === 0 ? [1, 0.24, 0.72] : [0.2, 0.9, 1];
    box(solid, x - 5.5, 4.6, NEON_Z, 0.5, 9.2, 0.5, '#232a35');
    box(solid, x + 5.5, 4.6, NEON_Z, 0.5, 9.2, 0.5, '#232a35');
    box(solid, x, 9.2, NEON_Z, 11.6, 0.5, 0.5, '#232a35');
    box(trans, x - 5.5, 4.6, NEON_Z, 0.9, 9.2, 0.9, [c[0], c[1], c[2], 0.62]);
    box(trans, x + 5.5, 4.6, NEON_Z, 0.9, 9.2, 0.9, [c[0], c[1], c[2], 0.62]);
    box(trans, x, 9.2, NEON_Z, 11.6, 0.9, 0.9, [c[0], c[1], c[2], 0.62]);
  }
  // The ocean plane sits at y=-1.7; the fragment shader discards everything landward of the seawall.
  const water = new Batch(12);
  quad(water, -720, -1.7, -900, 720, -1.7, -900, 720, -1.7, SEAWALL, -720, -1.7, SEAWALL, [1, 1, 1, 1]);

  renderer.uploadStatic('solid', solid); renderer.uploadStatic('tex', tex);
  renderer.uploadStatic('trans', trans); renderer.uploadStatic('water', water);
  return { solid, tex, trans, water };
}
