// Player on foot / in car, crowd simulation, armed rivals and third-person camera.
import { box, cyl, groundQuad } from '../core/gl.js';
import { Vehicle, drawVehicle } from '../vehicles/vehicles.js';
import { rng, rand, clamp, dist2, angleDiff, approachAngle, TAU } from '../core/math.js';
import { WEAPONS } from './weapons.js';
import { GARAGE, NEON_Z, SEAWALL } from '../world/city.js';

function makePeds(n) {
  const r = rng(80231), out = [];
  const shirts = ['#c9554b', '#3d6f9c', '#d2b14e', '#5d9a72', '#8a5da5', '#d7d3c8'];
  for (let i = 0; i < n; i++) {
    const gx = Math.round(rand(r, -4, 4)) * 26, gz = Math.round(rand(r, -4, 4)) * 26;
    const side = r() < 0.5 ? 1 : -1;
    out.push({ x: gx + side * rand(r, 4.2, 8), z: gz + side * rand(r, 4.2, 8), h: rand(r, 0, TAU),
      spd: rand(r, 0.9, 1.8), shirt: shirts[i % shirts.length], t: rand(r, 0, 20), rad: 0.6, hp: 60, kind: 'ped' });
  }
  return out;
}

export class Player {
  constructor() {
    this.mode = 'car';
    this.car = new Vehicle({ x: -72, z: NEON_Z, h: 0, spd: 0, type: 'sports', color: '#e6753f', ai: false, tag: 'CORAL GT', hp: 100 });
    this.pos = { x: -72, z: NEON_Z + 4 }; this.h = 0;
    this.health = 100; this.armor = 0; this.ammo = WEAPONS.map(w => w.ammo);
    this.weapon = 0; this.cooldown = 0; this.camYaw = 0; this.camPitch = 0.22;
    this.peds = makePeds(56); this.armed = []; this.inGarage = false; this.garageNear = false;
    this.camOverride = null; this.driveBy = true;
  }
  spawnArmed(game, cx, cz, count = 3) {
    this.armed = [];
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU + 0.7;
      this.armed.push({ x: cx + Math.cos(a) * (11 + i * 2), z: cz + Math.sin(a) * (11 + i * 2), h: a + Math.PI,
        hp: 100, rad: 0.8, kind: 'armed', cooldown: rand(game.effects.r, 0.2, 1.4), tag: 'RIVAL GUNNER',
        onHit: (g, o) => { o.hp <= 0 && g.hud.toast('RIVAL DOWN'); } });
    }
  }
  update(dt, game, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const up = input.down('KeyW') || input.down('ArrowUp'), down = input.down('KeyS') || input.down('ArrowDown');
    const left = input.down('KeyA') || input.down('ArrowLeft'), right = input.down('KeyD') || input.down('ArrowRight');
    const perks = game.progress.data.perks;
    if (this.mode === 'car') {
      const c = this.car, accel = 8.5 + perks.engine * 3.4, top = 31 + perks.engine * 4.5;
      if (up) c.spd += accel * dt; else if (down) c.spd -= 13 * dt; else c.spd -= Math.sign(c.spd) * Math.min(Math.abs(c.spd), 3.2 * dt);
      if (input.down('Space')) c.spd -= Math.sign(c.spd) * Math.min(Math.abs(c.spd), 12 * dt);
      c.spd = clamp(c.spd, -7, top);
      const steer = (right ? 1 : 0) - (left ? 1 : 0);
      c.h += steer * dt * (0.55 + perks.handling * 0.22) * clamp(Math.abs(c.spd) / 9, 0, 1) * Math.sign(c.spd || 1);
      c.x += Math.cos(c.h) * c.spd * dt; c.z += Math.sin(c.h) * c.spd * dt;
      if (Math.abs(c.x) > 110) { c.x = clamp(c.x, -110, 110); c.spd *= 0.6; }
      if (c.z < SEAWALL + 2) { c.z = SEAWALL + 2; c.spd *= 0.5; }
      if (Math.abs(c.z) > 110) { c.z = clamp(c.z, -110, 110); c.spd *= 0.6; }
      this.pos.x = c.x - Math.cos(c.h) * 2.4; this.pos.z = c.z - Math.sin(c.h) * 2.4;
      this.h = c.h;
      if (input.hit('KeyF')) this.exitCar();
    } else {
      const sx = (right ? 1 : 0) - (left ? 1 : 0), sz = (down ? 1 : 0) - (up ? 1 : 0);
      const l = Math.hypot(sx, sz) || 1, sp = 5.4;
      const fx = Math.cos(this.camYaw), fz = Math.sin(this.camYaw);
      this.pos.x = clamp(this.pos.x + (fx * -sz + -fz * sx) / l * sp * dt, -110, 110);
      this.pos.z = clamp(this.pos.z + (fz * -sz + fx * sx) / l * sp * dt, -110, 110);
      this.h = Math.atan2(fz, fx);
      if (input.hit('KeyF') && dist2(this.pos.x, this.pos.z, this.car.x, this.car.z) < 5) this.enterCar();
    }
    this.garageNear = dist2(this.pos.x, this.pos.z, GARAGE.x, GARAGE.z + 9) < 12;
    for (let i = 0; i < 4; i++) if (input.hit('Digit' + (i + 1))) { this.weapon = i; game.hud.toast(WEAPONS[i].name); }
    if ((input.mouse.down || input.down('Space')) && this.cooldown <= 0 && (this.mode === 'foot' || this.driveBy)) {
      const w = WEAPONS[this.weapon], ox = this.mode === 'car' ? this.car.x : this.pos.x, oz = this.mode === 'car' ? this.car.z : this.pos.z;
      if (game.effects.fire(game, this.weapon, [ox, this.mode === 'car' ? 1.5 : 1.3, oz], [Math.cos(this.h), Math.sin(this.h)])) game.audio.shot(this.weapon);
    }
    // Pedestrians stroll and reroll at the block edge.
    for (const p of this.peds) {
      p.t += dt; p.x += Math.cos(p.h) * p.spd * dt; p.z += Math.sin(p.h) * p.spd * dt;
      if (Math.abs(p.x) > 108 || Math.abs(p.z) > 108 || p.t > 26) { p.t = 0; p.h = rand(game.effects.r, 0, TAU); p.x = clamp(p.x, -104, 104); p.z = clamp(p.z, -104, 104); }
      if (p.hp <= 0) p.hp = 60;
    }
    // Armed rivals advance and return fire with live tracers.
    for (const e of this.armed) {
      if (e.hp <= 0) continue;
      const tx = this.mode === 'car' ? this.car.x : this.pos.x, tz = this.mode === 'car' ? this.car.z : this.pos.z;
      const d = dist2(e.x, e.z, tx, tz);
      e.h = approachAngle(e.h, Math.atan2(tz - e.z, tx - e.x), dt * 2.2);
      if (d > 13) { e.x += Math.cos(e.h) * 3.4 * dt; e.z += Math.sin(e.h) * 3.4 * dt; }
      e.cooldown -= dt;
      if (d < 62 && e.cooldown <= 0) { e.cooldown = rand(game.effects.r, 0.7, 1.8); game.effects.enemyFire(e.x, e.z, tx, tz); }
    }
  }
  enterCar() { this.mode = 'car'; }
  exitCar() { this.mode = 'foot'; this.pos.x = this.car.x - Math.cos(this.car.h) * 3.3; this.pos.z = this.car.z - Math.sin(this.car.h) * 3.3; this.car.spd = 0; }
  camera(game, dt) {
    const px = this.mode === 'car' ? this.car.x : this.pos.x, pz = this.mode === 'car' ? this.car.z : this.pos.z;
    const yaw = this.camOverride ? this.camOverride.yaw : (this.mode === 'car' ? this.car.h + Math.PI : this.camYaw);
    const pitch = this.camOverride ? this.camOverride.pitch : this.camPitch;
    const dist = this.camOverride ? this.camOverride.dist : (this.mode === 'car' ? 13 : 7.5);
    const height = this.camOverride ? this.camOverride.height : (this.mode === 'car' ? 5.1 : 3.4);
    const eye = [px - Math.cos(yaw) * dist, height + pitch * 9, pz - Math.sin(yaw) * dist];
    const at = [px + Math.cos(yaw) * (this.mode === 'car' ? 7 : 1.5), this.mode === 'car' ? 1.6 : 1.45, pz + Math.sin(yaw) * (this.mode === 'car' ? 7 : 1.5)];
    return { eye, at };
  }
  draw(b, env) {
    if (this.mode === 'car') drawVehicle(b, this.car, env, { glow: true });
    else {
      groundQuad(b, this.pos.x, this.pos.z, 1.5, 1.1, 0.03, [0, 0, 0, 0.35]);
      box(b, this.pos.x, 1.18, this.pos.z, 0.78, 1.1, 0.48, '#283b55');
      box(b, this.pos.x, 1.92, this.pos.z, 0.5, 0.52, 0.48, '#c79a74');
      box(b, this.pos.x, 0.48, this.pos.z - 0.14, 0.26, 0.95, 0.3, '#1e252d');
      box(b, this.pos.x, 0.48, this.pos.z + 0.14, 0.26, 0.95, 0.3, '#1e252d');
      box(b, this.pos.x + Math.cos(this.h) * 0.55, 1.3, this.pos.z + Math.sin(this.h) * 0.55, 0.22, 0.22, 1.15, '#161b20', null, this.h);
    }
    for (const p of this.peds) {
      if (dist2(p.x, p.z, this.pos.x, this.pos.z) > 105) continue;
      groundQuad(b, p.x, p.z, 1.15, 0.85, 0.03, [0, 0, 0, 0.3]);
      box(b, p.x, 1.08, p.z, 0.6, 1.0, 0.4, p.shirt);
      box(b, p.x, 1.76, p.z, 0.42, 0.45, 0.4, '#c79a74');
      box(b, p.x, 0.38, p.z, 0.46, 0.8, 0.32, '#2c333b');
    }
    for (const e of this.armed) {
      if (e.hp <= 0) continue;
      groundQuad(b, e.x, e.z, 1.5, 1.2, 0.03, [0, 0, 0, 0.35]);
      box(b, e.x, 1.2, e.z, 0.85, 1.2, 0.55, '#3c2f38');
      box(b, e.x, 2.0, e.z, 0.52, 0.5, 0.52, '#b48766');
      box(b, e.x + Math.cos(e.h) * 0.6, 1.35, e.z + Math.sin(e.h) * 0.6, 0.22, 0.2, 1.3, '#191d21', null, e.h);
      box(b, e.x, 1.55, e.z, 0.95, 0.22, 0.6, '#663840');
    }
  }
}
