// Single-source police escalation: cruisers, roadblocks, Air One and SWAT intercept.
import { box, cyl, cone, groundQuad, segment } from '../core/gl.js';
import { Vehicle, drawVehicle } from '../vehicles/vehicles.js';
import { clamp, dist2, approachAngle, rand, rng, TAU } from '../core/math.js';
import { gridLine, GRID } from '../world/city.js';

export const TICKER = ['CITY SECURE', 'PURSUIT', 'PURSUIT', 'ROADBLOCK', 'AIR ONE', 'SWAT INTERCEPT'];
export class Police {
  constructor() {
    this.wanted = 0; this.heat = 0; this.cruisers = []; this.roadblock = null;
    this.heli = null; this.swat = null; this.officers = []; this.ticker = 'CITY SECURE'; this.t = 0;
    this.playerPos = { x: -72, z: 52, h: 0 }; this.rng = rng(617);
  }
  addHeat(v) {
    this.heat = clamp(this.heat + v, 0, 8);
    const next = clamp(Math.floor(this.heat / 1.35), 0, 5);
    if (next > this.wanted) this.setWanted(next);
  }
  setWanted(n) {
    n = clamp(Math.round(n), 0, 5);
    if (n === this.wanted) return;
    this.wanted = n; this.heat = Math.max(this.heat, n * 1.35); this.ticker = TICKER[n];
    if (n >= 1) while (this.cruisers.length < (n >= 2 ? 2 : 1)) this.spawnCruiser();
    else this.cruisers.length = 0;
    if (n >= 3 && !this.roadblock) this.spawnRoadblock();
    if (n < 3) this.roadblock = null;
    if (n >= 4 && !this.heli) this.heli = { x: 0, z: 0, rotor: 0 };
    if (n < 4) this.heli = null;
    if (n >= 5 && !this.swat) { this.spawnSwat(); }
    if (n < 5) { this.swat = null; this.officers = []; }
  }
  spawnCruiser() {
    const p = this.playerPos;
    const a = rand(this.rng, 0, TAU);
    this.cruisers.push(new Vehicle({ x: clamp(p.x + Math.cos(a) * 42, -100, 100), z: clamp(p.z + Math.sin(a) * 42, -100, 100),
      h: a + Math.PI, type: 'cruiser', color: '#e8e9e4', spd: 16, ai: true, hp: 100, tag: 'CRUISER', flash: this.t }));
  }
  spawnRoadblock() {
    const p = this.playerPos, fx = Math.cos(p.h), fz = Math.sin(p.h);
    let x = clamp(p.x + fx * 72, -96, 96), z = clamp(p.z + fz * 72, -96, 96);
    if (Math.abs(fx) > Math.abs(fz)) x = gridLine(clamp(Math.round((x - gridLine(0)) / 26), 0, GRID - 1));
    else z = gridLine(clamp(Math.round((z - gridLine(0)) / 26), 0, GRID - 1));
    const cars = [];
    for (let i = -1; i <= 1; i++) cars.push(new Vehicle({ x: x + (Math.abs(fx) > Math.abs(fz) ? 0 : i * 5.6),
      z: z + (Math.abs(fx) > Math.abs(fz) ? i * 5.6 : 0), h: (Math.abs(fx) > Math.abs(fz) ? Math.PI / 2 : 0) + i * 0.42 + 0.3,
      type: 'cruiser', color: '#e8e9e4', spd: 0, ai: false, hp: 100, tag: 'BLOCK', flash: i }));
    this.roadblock = { x, z, cars, flares: [-1, 1].map(i => ({ x: x + (Math.abs(fx) > Math.abs(fz) ? i * 9 : 0), z: z + (Math.abs(fx) > Math.abs(fz) ? 0 : i * 9) })) };
  }
  spawnSwat() {
    const p = this.playerPos;
    this.swat = new Vehicle({ x: clamp(p.x + 34, -100, 100), z: clamp(p.z + 28, -100, 100), h: p.h + 2.4, type: 'van',
      color: '#384739', spd: 13, ai: true, hp: 160, tag: 'SWAT' });
    this.officers = [];
    for (let i = 0; i < 4; i++) this.officers.push({ x: this.swat.x + Math.cos(i * 1.57) * 4, z: this.swat.z + Math.sin(i * 1.57) * 4,
      h: i * 1.57, hp: 100, rad: 0.8, kind: 'officer', cooldown: 0.5 + i * 0.3, tag: 'SWAT OFFICER' });
  }
  update(dt, game) {
    this.t += dt; this.rng = game.effects.r; this.playerPos = game.playerPos();
    if (this.wanted > 0) {
      this.heat -= dt * 0.055;
      if (this.heat <= 0) this.setWanted(0);
    }
    for (let i = this.cruisers.length - 1; i >= 0; i--) {
      const c = this.cruisers[i], p = this.playerPos, d = dist2(c.x, c.z, p.x, p.z);
      if (d > 220) { this.cruisers.splice(i, 1); continue; }
      c.h = approachAngle(c.h, Math.atan2(p.z - c.z, p.x - c.x), dt * (1.1 + this.wanted * 0.14));
      let want = 17 + this.wanted * 2.6;
      if (this.roadblock && dist2(c.x, c.z, this.roadblock.x, this.roadblock.z) < 24 && this.wanted === 3) want = 0;
      c.spd += clamp(want - c.spd, -10 * dt, 8 * dt);
      c.x += Math.cos(c.h) * c.spd * dt; c.z += Math.sin(c.h) * c.spd * dt; c.flash += dt;
    }
    if (this.roadblock) {
      for (const c of this.roadblock.cars) c.flash += dt;
      if (dist2(this.playerPos.x, this.playerPos.z, this.roadblock.x, this.roadblock.z) > 190) this.roadblock = null;
    }
    if (this.heli) {
      const p = this.playerPos, d = dist2(this.heli.x, this.heli.z, p.x, p.z);
      const tx = p.x + Math.cos(this.t * 0.31) * 12, tz = p.z + Math.sin(this.t * 0.31) * 12;
      this.heli.x += (tx - this.heli.x) * Math.min(1, dt * 0.6);
      this.heli.z += (tz - this.heli.z) * Math.min(1, dt * 0.6);
      this.heli.y = 34; this.heli.rotor += dt * 19; this.heli.dist = d;
    }
    if (this.swat) {
      const p = this.playerPos;
      this.swat.h = approachAngle(this.swat.h, Math.atan2(p.z - this.swat.z, p.x - this.swat.x), dt * 1.1);
      this.swat.spd += clamp(19 - this.swat.spd, -8 * dt, 6 * dt);
      this.swat.x += Math.cos(this.swat.h) * this.swat.spd * dt; this.swat.z += Math.sin(this.swat.h) * this.swat.spd * dt;
      for (const o of this.officers) {
        o.h = approachAngle(o.h, Math.atan2(p.z - o.z, p.x - o.x), dt * 2);
        if (dist2(o.x, o.z, p.x, p.z) > 12) { o.x += Math.cos(o.h) * 3.2 * dt; o.z += Math.sin(o.h) * 3.2 * dt; }
        o.cooldown -= dt;
        if (o.cooldown <= 0 && dist2(o.x, o.z, p.x, p.z) < 55) { o.cooldown = rand(this.rng, 1.1, 2.3); game.effects.enemyFire(o.x, o.z, p.x, p.z); }
      }
    }
  }
  draw(b, env) {
    for (const c of this.cruisers) drawVehicle(b, c, env);
    if (this.roadblock) {
      const rb = this.roadblock;
      for (const c of rb.cars) drawVehicle(b, c, env);
      for (const f of rb.flares) {
        box(b, f.x, 0.45, f.z, 0.35, 0.9, 0.35, [1, 0.52, 0.14, 0.9]);
        box(b, f.x, 1.05, f.z, 0.9, 0.5, 0.9, [1, 0.6, 0.2, 0.35 + Math.sin(this.t * 8) * 0.12]);
      }
      box(b, rb.x, 0.7, rb.z, 11, 0.85, 0.55, '#c9b25a', null, 0.1);
      box(b, rb.x, 0.72, rb.z + 0.3, 11, 0.9, 0.12, [1, 0.35, 0.2, 0.5]);
    }
    if (this.heli) {
      const h = this.heli;
      groundQuad(b, h.x, h.z, 9, 5, 0.026, [0, 0, 0, 0.25]);
      cone(b, h.x, 17, h.z, 13, 34, [1, 0.94, 0.7, 0.12], 18, true);
      box(b, h.x, h.y, h.z, 3.2, 1.7, 8.4, '#202b33');
      box(b, h.x, h.y + 0.15, h.z - 2.2, 2.8, 1.2, 3.6, '#28394a');
      box(b, h.x, h.y - 2.6, h.z, 2.4, 1.1, 3.2, '#162028');
      const tail = h.z + 6;
      box(b, h.x, h.y + 0.2, tail, 0.5, 0.6, 5, '#26323a');
      box(b, h.x, h.y + 2.4, h.z, 0.28, 0.28, 10.5, '#5c6670', null, h.rotor);
      box(b, h.x, h.y + 0.9, tail, 8.2, 0.25, 0.25, '#5c6670', null, h.rotor * 1.3);
      box(b, h.x, h.y - 0.6, h.z - 4, 0.9, 0.4, 0.6, [1, 0.91, 0.66, 0.9]);
      cyl(b, h.x, h.y - 2.9, h.z, 0.5, 0.25, [0.4, 0.45, 0.5, 0.9], 8);
    }
    if (this.swat) {
      drawVehicle(b, this.swat, env);
      for (const o of this.officers) {
        groundQuad(b, o.x, o.z, 1.5, 1.2, 0.03, [0, 0, 0, 0.35]);
        box(b, o.x, 1.15, o.z, 0.9, 1.25, 0.6, '#3a4636');
        box(b, o.x, 2.0, o.z, 0.55, 0.5, 0.55, '#2a332b');
        box(b, o.x + Math.cos(o.h) * 0.7, 1.35, o.z + Math.sin(o.h) * 0.7, 0.2, 0.2, 1.4, '#15191b', null, o.h);
      }
    }
  }
  mapIcons() {
    const out = [];
    if (this.roadblock) out.push({ x: this.roadblock.x, z: this.roadblock.z, type: 'roadblock' });
    if (this.heli) out.push({ x: this.heli.x, z: this.heli.z, type: 'airone' });
    return out;
  }
}
