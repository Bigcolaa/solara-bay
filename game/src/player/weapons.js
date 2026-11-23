// Four-tier arsenal, tracers, sparks, damage smoke/fire and field pickups.
import { box, cyl, segment } from '../core/gl.js';
import { rng, rand, clamp, dist2 } from '../core/math.js';

export const WEAPONS = [
  { name: '9MM PISTOL', short: '9MM', ammo: 48, dmg: 24, rate: 0.22, spread: 0.012, color: [1, 0.86, 0.45] },
  { name: 'COASTAL SMG', short: 'SMG', ammo: 180, dmg: 15, rate: 0.075, spread: 0.035, color: [0.5, 0.95, 1] },
  { name: 'CARBINE RIFLE', short: 'RIFLE', ammo: 120, dmg: 34, rate: 0.12, spread: 0.017, color: [1, 0.55, 0.3] },
  { name: 'HEAVY LAUNCHER', short: 'HEAVY', ammo: 8, dmg: 110, rate: 1.15, spread: 0.004, color: [1, 0.38, 0.18], splash: 8 },
];
const PICKUPS = { health: '#4be08b', ammo: '#f0c744', repair: '#4fb8f2' };

export class Effects {
  constructor() {
    this.r = rng(31337); this.tracers = []; this.parts = []; this.smoke = []; this.pickups = []; this.flashes = [];
    this.spawnTimer = 0;
    for (let i = 0; i < 6; i++) this.pickups.push(this.newPickup(-70 + i * 27, i % 2 ? 26 : -52, ['health', 'ammo', 'repair'][i % 3]));
  }
  newPickup(x, z, type) { return { x, z, type, life: 55, bob: rand(this.r, 0, 6) }; }
  sparks(x, y, z, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(this.r, 0, Math.PI * 2), s = rand(this.r, 2, 9);
      this.parts.push({ x, y, z, vx: Math.cos(a) * s, vy: rand(this.r, 2, 8), vz: Math.sin(a) * s, life: rand(this.r, 0.2, 0.55), c: [1, rand(this.r, 0.55, 0.9), 0.25] });
    }
  }
  tracer(a, b, color, life = 0.14) { this.tracers.push({ a, b, c: color, life }); }
  enemyFire(x, z, tx, tz) {
    this.tracer([x, 1.35, z], [tx, 1.2 + rand(this.r, -0.3, 0.5), tz], [1, 0.28, 0.32], 0.16);
    this.flashes.push({ x, y: 1.4, z, life: 0.08, c: [1, 0.35, 0.3] });
  }
  fire(game, weaponIndex, origin, dir) {
    const w = WEAPONS[weaponIndex], p = game.player;
    if (p.ammo[weaponIndex] <= 0) return false;
    p.ammo[weaponIndex]--; p.cooldown = w.rate;
    const spread = w.spread, dx = dir[0] + rand(this.r, -spread, spread), dz = dir[1] + rand(this.r, -spread, spread);
    const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
    let best = null, bestT = 1e4;
    const targets = game.combatTargets();
    for (const t of targets) {
      const ox = t.x - origin[0], oz = t.z - origin[2], t0 = ox * ux + oz * uz;
      if (t0 <= 0.4 || t0 > (w.splash ? 100 : 78)) continue;
      const side = Math.abs(ox * -uz + oz * ux), rad = t.rad || 1.5;
      if (side < rad && t0 < bestT) { bestT = t0; best = t; }
    }
    const endDist = best ? bestT : (w.splash ? 96 : 70);
    const end = [origin[0] + ux * endDist, best ? 1.1 : (w.splash ? 1.4 : 1.35), origin[2] + uz * endDist];
    this.tracer([origin[0], origin[1], origin[2]], end, w.color, w.splash ? 0.22 : 0.13);
    this.flashes.push({ x: origin[0] + ux * 1.1, y: origin[1], z: origin[2] + uz * 1.1, life: 0.09, c: w.color });
    if (best) {
      best.hp -= w.dmg;
      this.sparks(end[0], end[1], end[2], w.splash ? 26 : 9);
      if (w.splash) for (const t of targets) if (t !== best && dist2(t.x, t.z, end[0], end[2]) < w.splash) { t.hp -= w.dmg * 0.6; this.smoke.push({ x: t.x, y: 1.2, z: t.z, life: 8, size: 2, c: [0.18, 0.17, 0.16] }); }
      if (best.onHit) best.onHit(game, best);
    } else if (w.splash) this.sparks(end[0], 0.4, end[2], 20);
    game.police.addHeat(w.splash ? 0.5 : 0.12);
    return true;
  }
  update(dt, game) {
    for (const a of [this.tracers, this.flashes, this.parts, this.smoke]) for (let i = a.length - 1; i >= 0; i--) {
      const o = a[i]; o.life -= dt;
      if (o.vx !== undefined) { o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.vy -= 15 * dt; o.y = Math.max(0.05, o.y); }
      if (o.life <= 0) a.splice(i, 1);
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.pickups.length < 9) {
      this.spawnTimer = 14;
      const p = game.player;
      this.pickups.push(this.newPickup(clamp(p.pos.x + rand(this.r, -35, 35), -100, 100), clamp(p.pos.z + rand(this.r, -35, 35), -100, 100), ['health', 'ammo', 'repair'][Math.floor(rand(this.r, 0, 3))]));
    }
    const p = game.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i]; k.bob += dt; k.life -= dt;
      const px = p.mode === 'car' ? p.car.x : p.pos.x, pz = p.mode === 'car' ? p.car.z : p.pos.z;
      if (dist2(px, pz, k.x, k.z) < 2.4) {
        if (k.type === 'health') p.health = Math.min(100, p.health + 35);
        if (k.type === 'ammo') for (let w = 0; w < 4; w++) p.ammo[w] += WEAPONS[w].ammo;
        if (k.type === 'repair') { p.car.hp = Math.min(100, p.car.hp + 45); p.car.smoke = p.car.hp < 45 ? 1 : 0; }
        game.hud.toast(k.type.toUpperCase() + ' PICKUP'); this.pickups.splice(i, 1);
      } else if (k.life <= 0) this.pickups.splice(i, 1);
    }
  }
  draw(b, env) {
    for (const t of this.tracers) segment(b, t.a[0], t.a[1], t.a[2], t.b[0], t.b[1], t.b[2], 0.11 + t.life * 0.4, [t.c[0], t.c[1], t.c[2], clamp(t.life * 6, 0, 1)]);
    for (const f of this.flashes) box(b, f.x, f.y, f.z, 1.1, 1.1, 1.1, [f.c[0], f.c[1], f.c[2], clamp(f.life * 9, 0, 1)], null, 0);
    for (const p of this.parts) box(b, p.x, p.y, p.z, 0.16, 0.16, 0.16, [p.c[0], p.c[1], p.c[2], clamp(p.life * 2, 0, 1)]);
    for (const s of this.smoke) cyl(b, s.x, s.y + (8 - s.life) * 0.6, s.z, s.size * (1.4 - s.life / 12), s.size, [s.c[0], s.c[1], s.c[2], clamp(s.life / 12, 0, 0.5)], 7);
    for (const k of this.pickups) {
      const c = PICKUPS[k.type], y = 1.2 + Math.sin(k.bob * 3) * 0.22;
      box(b, k.x, y, k.z, 0.9, 0.9, 0.9, [1, 1, 1, 0.18]);
      box(b, k.x, y, k.z, 0.55, 0.55, 0.55, c + 'cc');
      if (k.type === 'health') { box(b, k.x, y, k.z, 0.7, 0.2, 0.2, '#ffffff'); box(b, k.x, y, k.z, 0.2, 0.7, 0.2, '#ffffff'); }
      cyl(b, k.x, 0.35, k.z, 0.7, 0.1, c + '55', 10);
    }
  }
}
