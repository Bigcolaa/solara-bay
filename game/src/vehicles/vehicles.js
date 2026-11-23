// Road traffic, player/rival vehicles, collision wiring and damage feedback.
import { box, groundQuad, cyl } from '../core/gl.js';
import { rng, rand, TAU, clamp, dist2, angleDiff, approachAngle } from '../core/math.js';
import { gridLine, GRID, NEON_Z } from '../world/city.js';

export const TYPES = {
  compact: { w: 2.15, l: 4.3, h: 1.45 }, sports: { w: 2.25, l: 4.8, h: 1.2 },
  suv: { w: 2.6, l: 5.1, h: 1.85 }, van: { w: 2.75, l: 5.9, h: 2.2 }, cruiser: { w: 2.4, l: 5.0, h: 1.5 },
};
const PAINT = ['#37495e', '#8c3f45', '#c8c3b4', '#2f6f68', '#b28a3e', '#5a4d74', '#9b9fa4', '#305c86', '#a8503b'];

export class Vehicle {
  constructor(o = {}) {
    Object.assign(this, { x: 0, z: 0, h: 0, spd: 0, type: 'compact', color: '#486078', hp: 100, ai: true, dir: 0,
      lane: 1.8, turnLock: 0, flash: 0, smoke: 0, fire: 0, tag: '' }, o);
  }
  get dims() { return TYPES[this.type] || TYPES.compact; }
  forward() { return [Math.cos(this.h), Math.sin(this.h)]; }
}

export function makeTraffic(n = 34) {
  const r = rng(55123), cars = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 4, g = gridLine(Math.floor(r() * GRID));
    const along = rand(r, -103, 103), lane = dir % 2 === 0 ? (dir === 0 ? 1.8 : -1.8) : (dir === 1 ? -1.8 : 1.8);
    const x = dir % 2 === 0 ? along : g + lane, z = dir % 2 === 0 ? g + lane : along;
    const h = [0, Math.PI / 2, Math.PI, -Math.PI / 2][dir];
    const type = r() < 0.18 ? 'sports' : r() < 0.32 ? 'suv' : r() < 0.42 ? 'van' : 'compact';
    cars.push(new Vehicle({ x, z, h, dir, lane, type, color: PAINT[Math.floor(r() * PAINT.length)],
      spd: rand(r, 8.5, 14.5), ai: true }));
  }
  return cars;
}

export function makeRivals() {
  const colors = ['#f2388c', '#23d3ef', '#f5c542', '#8f6bff'];
  return colors.map((c, i) => new Vehicle({ x: -92 + i * 7, z: NEON_Z + (i % 2 ? 1.9 : -1.9), h: 0,
    dir: 0, lane: i % 2 ? 1.9 : -1.9, type: 'sports', color: c, spd: 21 + i * 0.7, ai: true, tag: 'RIVAL ' + (i + 1) }));
}

export function updateTraffic(cars, dt, game) {
  for (const v of cars) {
    if (!v.ai) continue;
    v.turnLock = Math.max(0, v.turnLock - dt);
    let want = v.spd;
    for (const o of cars) {
      if (o === v || o.ai === false || Math.abs(Math.atan2(Math.sin(o.h - v.h), Math.cos(o.h - v.h))) > 0.5) continue;
      const dx = o.x - v.x, dz = o.z - v.z, ahead = dx * Math.cos(v.h) + dz * Math.sin(v.h);
      if (ahead > 0 && ahead < 9 && Math.abs(dx * -Math.sin(v.h) + dz * Math.cos(v.h)) < 2.6) want = Math.min(want, Math.max(2, o.spd - 1.5));
    }
    if (v.type === 'cruiser' || v.tag === 'SWAT') want = Math.min(want, 28);
    v.spd += clamp(want - v.spd, -12 * dt, 7 * dt);
    const fx = Math.cos(v.h), fz = Math.sin(v.h);
    const nx = v.x + fx * v.spd * dt, nz = v.z + fz * v.spd * dt;
    if (Math.abs(nx) > 112 || Math.abs(nz) > 112) {
      v.dir = (v.dir + 2) % 4; v.h = [0, Math.PI / 2, Math.PI, -Math.PI / 2][v.dir]; v.spd = 7;
    } else { v.x = nx; v.z = nz; }
    if (v.turnLock === 0 && Math.random() < dt * 0.13) {
      const gx = Math.round((v.x - gridLine(0)) / 26) * 26 + gridLine(0);
      const gz = Math.round((v.z - gridLine(0)) / 26) * 26 + gridLine(0);
      if (Math.abs(v.x - gx) < 2.4 || Math.abs(v.z - gz) < 2.4) {
        v.dir = (v.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
        v.h = [0, Math.PI / 2, Math.PI, -Math.PI / 2][v.dir]; v.turnLock = 4;
        v.lane = v.dir % 2 === 0 ? (v.dir === 0 ? 1.8 : -1.8) : (v.dir === 1 ? -1.8 : 1.8);
        v.x += Math.cos(v.h) * 2; v.z += Math.sin(v.h) * 2;
        v.x = Math.abs(v.x) < 2 ? v.x + v.lane : v.x; v.z = Math.abs(v.z) < 2 ? v.z + v.lane : v.z;
      }
    }
    v.flash += dt;
  }
}

export function vehicleCollisions(game) {
  const p = game.player;
  if (p.mode !== 'car') return 0;
  let hits = 0;
  const all = game.allVehicles();
  for (const v of all) {
    if (v === p.car || v._collideTick === game.frame) continue;
    const d = dist2(p.car.x, p.car.z, v.x, v.z);
    if (d > 3.6) continue;
    v._collideTick = game.frame; hits++;
    const impact = Math.abs(p.car.spd - v.spd);
    p.car.spd *= 0.58; v.spd *= 0.72;
    p.car.hp = clamp(p.car.hp - impact * 1.15, 0, 100);
    v.hp = clamp(v.hp - impact * 0.8, 0, 100);
    if (p.car.hp < 45) p.car.smoke = 1; if (p.car.hp < 22) p.car.fire = 1;
    game.effects.sparks((p.car.x + v.x) / 2, 0.8, (p.car.z + v.z) / 2, 10);
    if (impact > 6) game.police.addHeat(0.24);
    if (v.tag.startsWith('RIVAL')) game.missions.bumpRival(v);
  }
  return hits;
}

export function drawVehicle(b, v, env, opts = {}) {
  const d = v.dims, c = v.color;
  groundQuad(b, v.x, v.z, d.l + 1.6, d.w + 1.2, 0.024, [0, 0, 0, 0.33]);
  const bodyY = d.h * 0.62;
  box(b, v.x, bodyY, v.z, d.w, d.h * 0.72, d.l, c, null, v.h);
  box(b, v.x - Math.cos(v.h) * 0.1, bodyY + d.h * 0.46, v.z - Math.sin(v.h) * 0.1, d.w * 0.84, d.h * 0.5, d.l * 0.52, '#1d252d', null, v.h);
  const fx = Math.cos(v.h), fz = Math.sin(v.h), rx = -fz, rz = fx;
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    const wx = v.x + fx * t * d.l * 0.33 + rx * s * d.w * 0.52, wz = v.z + fz * t * d.l * 0.33 + rz * s * d.w * 0.52;
    box(b, wx, 0.38, wz, 0.36, 0.68, 0.86, '#15181b', null, v.h);
  }
  for (const s of [-1, 1]) {
    const hx = v.x + fx * d.l * 0.5 + rx * s * d.w * 0.3, hz = v.z + fz * d.l * 0.5 + rz * s * d.w * 0.3;
    box(b, hx, bodyY + 0.08, hz, 0.5, 0.24, 0.14, env.night > 0.5 ? '#fff0c0' : '#e8e6d4', null, v.h);
    const tx = v.x - fx * d.l * 0.5 + rx * s * d.w * 0.3, tz = v.z - fz * d.l * 0.5 + rz * s * d.w * 0.3;
    box(b, tx, bodyY + 0.08, tz, 0.48, 0.22, 0.12, '#c33c35', null, v.h);
  }
  if (v.type === 'cruiser') {
    const flash = Math.sin((v.flash || 0) * 9) > 0;
    box(b, v.x, bodyY + d.h * 0.72, v.z, 1.8, 0.28, 0.5, '#20262c', null, v.h);
    box(b, v.x + rx * 0.48, bodyY + d.h * 0.79, v.z + rz * 0.48, 0.7, 0.26, 0.4, flash ? '#ff3050' : '#331018', null, v.h);
    box(b, v.x - rx * 0.48, bodyY + d.h * 0.79, v.z - rz * 0.48, 0.7, 0.26, 0.4, flash ? '#308cff' : '#101f33', null, v.h);
  }
  if (v.tag === 'SWAT') {
    box(b, v.x, bodyY + d.h * 0.7, v.z, 1.6, 0.24, 0.4, '#f0e7c0', null, v.h);
    box(b, v.x, bodyY + 0.2, v.z, d.w + 0.08, 0.3, d.l * 0.7, '#2f3832', null, v.h);
  }
  if (v.tag && v.tag.startsWith('RIVAL')) {
    box(b, v.x, 0.16, v.z, d.w + 0.5, 0.08, d.l + 0.5, [opts.glow ? 0.4 : 0.12, 0.45, 0.55, 0.55], null, v.h);
  }
  if (v.hp < 70) box(b, v.x - fx * 1.4, bodyY + 0.5, v.z - fz * 1.4, 1.2, 0.7, 1.2, '#2d2a27', null, v.h);
}
