// Nine named contracts, district standing rewards and the Neon Mile rival race.
import { clamp, dist2 } from '../core/math.js';
import { NEON_Z } from '../world/city.js';

export const CONTRACTS = [
  { name: 'SUNSET COURIER', desc: 'Deliver 3 packages along the coastal boulevard.', event: 'deliver', target: 3, reward: 900, respect: 40 },
  { name: 'HARBOR HANDOFF', desc: 'Reach the docks and clear the container yard.', event: 'harbor', target: 2, reward: 1200, respect: 55 },
  { name: 'COASTAL HEAT', desc: 'Take down 4 armed rivals on the boardwalk.', event: 'takedown', target: 4, reward: 1500, respect: 70 },
  { name: 'NEON MILE QUALIFIER', desc: 'Win the Neon Mile against four rival racers.', event: 'race', target: 1, reward: 2200, respect: 100 },
  { name: 'LIGHTHOUSE RUN', desc: 'Reach the lighthouse pier before the tide.', event: 'reach', target: 1, reward: 1000, respect: 45 },
  { name: 'DOCKSIDE DEAL', desc: 'Survive the ambush and secure the shipment.', event: 'survive', target: 1, reward: 1800, respect: 85 },
  { name: 'MARINA SHAKEDOWN', desc: 'Disable 5 overturned vehicles by the marina.', event: 'disable', target: 5, reward: 2100, respect: 95 },
  { name: 'VICE COLUMN', desc: 'Drive the headline route at full speed.', event: 'deliver', target: 5, reward: 2400, respect: 110 },
  { name: 'SOLARA FINALE', desc: 'Complete every district contract and take the crown.', event: 'finale', target: 1, reward: 5000, respect: 250 },
];

export class Missions {
  constructor(progress) { this.progress = progress; this.active = -1; this.count = 0; this.race = null; this.rivals = []; this.finished = []; }
  start(i) {
    if (i < 0 || i >= CONTRACTS.length) return;
    this.active = i; this.count = 0;
    if (CONTRACTS[i].event === 'race') this.startRace();
  }
  startRace() {
    this.race = { lap: 1, checkpoint: 1, timer: 0, pos: 3, done: false, routeZ: NEON_Z };
    this.rivals = [];
    const offsets = [18, 9, -8, -17];
    for (let i = 0; i < 4; i++) this.rivals.push({ id: i, x: -50 + offsets[i], z: NEON_Z + (i % 2 ? 1.8 : -1.8),
      h: 0, spd: 24 + i * 0.8, progress: offsets[i] + 50, lap: 1, tag: 'RIVAL ' + (i + 1) });
  }
  event(type, n = 1) {
    if (this.active < 0) return;
    const c = CONTRACTS[this.active];
    if (c.event !== type) return;
    this.count += n;
    if (this.count >= c.target) this.complete();
  }
  complete() {
    if (this.active < 0) return;
    const c = CONTRACTS[this.active];
    this.progress.complete(this.active); this.progress.reward(c.reward, c.respect);
    this.finished.push(c.name); this.active = -1; this.race = null;
  }
  bumpRival(v) { this.event('takedown', 1); }
  update(dt, game) {
    if (!this.race) return;
    const race = this.race; race.timer += dt;
    const p = game.playerPos();
    const pp = clamp(p.x + 100, 0, 200);
    let ahead = 0;
    for (const r of this.rivals) {
      r.spd += clamp((24 + r.id * 0.8 + Math.sin(race.timer * 0.6 + r.id) * 3) - r.spd, -3 * dt, 3 * dt);
      r.x += r.spd * dt; r.progress += r.spd * dt;
      if (r.x > 100) { r.x = -100; r.progress = 0; r.lap++; }
      if (r.progress > pp) ahead++;
      const v = game.allVehicles().find(c => c.tag === r.tag);
      if (v) { v.x = r.x; v.z = r.z; v.h = 0; v.spd = r.spd; }
    }
    race.pos = ahead + 1;
    race.checkpoint = clamp(1 + Math.floor((pp % 200) / 25), 1, 8);
    if (p.x > 100) {
      if (race.lap >= 3) { race.done = true; if (race.pos <= 2) this.event('race', 1); else this.complete(); }
      else { race.lap++; game.player.car.x = -100; game.player.car.h = 0; }
    }
  }
  hud() {
    if (this.active < 0) return null;
    const c = CONTRACTS[this.active];
    const out = { name: c.name, desc: c.desc, progress: this.count + '/' + c.target, reward: c.reward, race: null };
    if (this.race) out.race = { pos: this.race.pos, total: 5, lap: this.race.lap, laps: 3,
      checkpoint: this.race.checkpoint, checkpoints: 8, timer: this.race.timer };
    return out;
  }
}
