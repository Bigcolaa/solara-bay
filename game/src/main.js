// Solara Bay — offline WebGL2 open world: boot, simulation loop, scenarios and QA hook.
import { Renderer } from './core/gl.js';
import { makeTextures } from './world/textures.js';
import { buildCity, NEON_Z, GARAGE } from './world/city.js';
import { makeInput } from './core/input.js';
import { makeTraffic, makeRivals, updateTraffic, vehicleCollisions, drawVehicle } from './vehicles/vehicles.js';
import { Player } from './player/player.js';
import { Effects, WEAPONS } from './player/weapons.js';
import { Police } from './ai/police.js';
import { Missions, CONTRACTS } from './missions/contracts.js';
import { Progress } from './progression/save.js';
import { Radio } from './audio/radio.js';
import { HUD } from './ui/hud.js';
import { rng, clamp, smooth, perspective, lookAt, mul, mat4, TAU } from './core/math.js';

const canvas = document.getElementById('game');
const textures = makeTextures();
const renderer = new Renderer(canvas, textures.day, textures.night);
buildCity(renderer);
const input = makeInput(canvas);
const progress = new Progress();
const radio = new Radio();
const hud = new HUD();

const game = {
  frame: 0, time: 0.47, env: null, renderer, input, progress, radio, audio: radio, hud,
  qa: { cruise: null, wanted: null, raceHud: null },
  player: new Player(), effects: new Effects(), police: new Police(), missions: new Missions(progress),
  traffic: makeTraffic(34), rivals: makeRivals(),
  allVehicles() {
    const list = [...this.traffic, this.player.car, ...this.rivals, ...this.police.cruisers];
    if (this.police.roadblock) list.push(...this.police.roadblock.cars);
    if (this.police.swat) list.push(this.police.swat);
    return list;
  },
  playerPos() { const p = this.player; return { x: p.mode === 'car' ? p.car.x : p.pos.x, z: p.mode === 'car' ? p.car.z : p.pos.z, h: p.h }; },
  combatTargets() {
    const out = [...this.player.armed];
    for (const v of this.allVehicles()) {
      if (v === this.player.car) continue;
      out.push({ x: v.x, z: v.z, rad: 1.8, hp: v.hp, ref: v,
        onHit: (g, t) => { t.ref.hp = t.hp; if (t.hp < 50) t.ref.smoke = 1; if (t.hp < 25) t.ref.fire = 1;
          if (t.hp <= 0) { g.effects.sparks(t.x, 1, t.z, 18); g.missions.event('disable', 1); } } });
    }
    return out;
  },
};
game.police.playerPos = game.playerPos();

function environment(t) {
  const dusk = smooth(0.62, 0.72, t) * (1 - smooth(0.78, 0.86, t));
  const night = smooth(0.72, 0.80, t) * (1 - smooth(0.94, 0.99, t));
  const a = t * TAU - Math.PI / 2;
  const sun = [Math.cos(a) * 0.7, Math.sin(a) * 0.9 + 0.22, 0.35];
  const fog = night > 0.6 ? [0.055, 0.065, 0.11] : dusk > 0.5 ? [0.38, 0.22, 0.22] : [0.55, 0.66, 0.72];
  return { time: t, night, dusk, sun, fog, sky: [0.3, 0.5, 0.75], label: night > 0.55 ? 'NIGHT' : dusk > 0.45 ? 'DUSK' : 'DAY' };
}

function resize() { canvas.width = Math.round(innerWidth * Math.min(devicePixelRatio, 1)); canvas.height = Math.round(innerHeight * Math.min(devicePixelRatio, 1)); }
addEventListener('resize', resize); resize();

const vp = mat4(), proj = mat4(), view = mat4();
function render() {
  const cam = game.player.camera(game);
  perspective(proj, 1.13, canvas.width / Math.max(1, canvas.height), 0.2, 900);
  lookAt(view, cam.eye, cam.at, [0, 1, 0]); mul(vp, proj, view);
  renderer.solid.reset(); renderer.tex.reset(); renderer.trans.reset();
  renderer.begin(vp, cam.eye, game.env);
  for (const v of game.allVehicles()) if ((v.smoke || v.fire) && game.frame % 9 === 0) {
    if (v.smoke) game.effects.smoke.push({ x: v.x, y: 1.2, z: v.z, life: 7, size: 1.8, c: [0.16, 0.16, 0.15] });
    if (v.fire) game.effects.flashes.push({ x: v.x, y: 1.5, z: v.z, life: 0.12, c: [1, 0.42, 0.1] });
  }
  game.player.draw(renderer.trans, game.env);
  for (const v of game.traffic) if (Math.abs(v.x - game.playerPos().x) < 120) drawVehicle(renderer.trans, v, game.env);
  for (const v of game.rivals) drawVehicle(renderer.trans, v, game.env, { glow: true });
  game.police.draw(renderer.trans, game.env);
  game.effects.draw(renderer.trans, game.env);
  // Lighthouse beam: slow rotating volumetric wedge, kept subtle at night.
  const beam = game.env.time * 0.9;
  renderer.trans.vert(-62, 24.5, -136, 0, 1, 0, 1, 0.96, 0.75, 0.16);
  renderer.trans.vert(-62 + Math.cos(beam) * 90, 12, -136 + Math.sin(beam) * 90, 0, 1, 0, 1, 0.96, 0.75, 0.03);
  renderer.trans.vert(-62 + Math.cos(beam + 0.16) * 90, 12, -136 + Math.sin(beam + 0.16) * 90, 0, 1, 0, 1, 0.96, 0.75, 0.03);
  renderer.flush();
}

let running = false, last = performance.now();
function step(dt) {
  game.frame++;
  game.time = (game.time + dt * 0.0048) % 1;
  game.env = environment(game.time);
  game.player.update(dt, game, input);
  updateTraffic(game.traffic, dt, game);
  for (const v of game.rivals) { v.flash += dt; }
  game.police.update(dt, game);
  game.missions.update(dt, game);
  if (game.qa.wanted !== null) { game.police.setWanted(game.qa.wanted); game.police.heat = game.qa.wanted * 1.35; }
  vehicleCollisions(game);
  if (game.qa.cruise !== null && game.player.mode === 'car') game.player.car.spd = game.qa.cruise;
  game.effects.update(dt, game);
  hud.update(game, dt);
  if (game.player.garageNear && input.hit('KeyE')) hud.setGarage(game, !hud.garageOpen);
  if (hud.garageOpen) for (const b of document.querySelectorAll('[data-upgrade]')) {
    if (input.hit('Key' + b.dataset.upgrade[0].toUpperCase() + b.dataset.upgrade.slice(1))) { /* handled by click */ }
  }
  if (input.hit('KeyR')) { radio.ensure(); hud.toast(radio.cycle()); }
  if (input.hit('KeyY')) {
    let i = 0; while (progress.data.completed.includes(i) && i < CONTRACTS.length - 1) i++;
    game.missions.start(i); hud.toast('CONTRACT: ' + CONTRACTS[i].name);
  }
  if (input.hit('KeyN')) { game.missions.start(3); hud.toast('NEON MILE — RACE START'); }
  input.endFrame();
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (running) step(dt);
  render();
  requestAnimationFrame(loop);
}
game.env = environment(game.time);
requestAnimationFrame(loop);

// Intro / Continue wired to persistent save().
document.getElementById('newGame').addEventListener('click', () => { progress.reset(); running = true; game.missions.start(0); document.getElementById('intro').style.display = 'none'; hud.toast('SUNSET COURIER — CONTRACT ACTIVE'); });
document.getElementById('continueGame').addEventListener('click', () => { progress.load(); running = true; const i = progress.data.lastContract >= 0 ? progress.data.lastContract : 0; game.missions.start(i); document.getElementById('intro').style.display = 'none'; hud.toast('CONTINUE — ' + CONTRACTS[i].name); });
for (const b of document.querySelectorAll('[data-upgrade]')) b.addEventListener('click', () => {
  const kind = b.dataset.upgrade;
  hud.toast(progress.upgrade(kind) ? kind.toUpperCase() + ' UPGRADED' : 'NOT ENOUGH CASH OR MAX LEVEL');
  hud.setGarage(game, true);
});
document.querySelector('[data-close]').addEventListener('click', () => hud.setGarage(game, false));

// Live-simulation scenario hooks for offline QA screenshots. Nothing is frozen or cleared.
const scenarios = {
  coastal(g) {
    g.time = 0.705; g.player.mode = 'car'; g.player.car.x = -62; g.player.car.z = -104; g.player.car.h = 0.02;
    g.player.car.spd = 23.6; g.qa.cruise = 23.6; g.player.car.color = '#e6753f'; g.player.car.tag = 'CORAL GT';
    g.police.setWanted(0); g.qa.wanted = 0; g.qa.raceHud = null;
    g.player.camOverride = { yaw: Math.PI + 0.04, pitch: 0.03, dist: 16, height: 6.2 };
  },
  onfoot(g) {
    g.time = 0.68; g.player.mode = 'foot'; g.player.pos.x = 8; g.player.pos.z = -100; g.player.camYaw = -Math.PI / 2;
    g.player.h = -Math.PI / 2; g.player.weapon = 2; g.player.health = 86; g.qa.cruise = null;
    g.player.spawnArmed(g, 8, -109, 3);
    g.effects.pickups.push(g.effects.newPickup(4, -99, 'health'), g.effects.newPickup(12, -99, 'ammo'));
    for (const e of g.player.armed) { e.cooldown = 0.1; g.effects.tracer([e.x, 1.4, e.z], [8, 1.3, -100], [1, 0.32, 0.28], 4); }
    g.effects.tracer([8, 1.35, -100], [10, 1.5, -116], [1, 0.62, 0.25], 4);
    g.missions.start(2); g.police.setWanted(0); g.qa.wanted = 0; g.qa.raceHud = null;
    g.player.camOverride = { yaw: -Math.PI / 2, pitch: 0.16, dist: 9, height: 4.6 };
  },
  chase(g) {
    g.time = 0.775; g.player.mode = 'car'; g.player.car.x = -42; g.player.car.z = NEON_Z; g.player.car.h = 0;
    g.player.car.spd = 30.5; g.qa.cruise = 30.5; g.player.car.color = '#2379c9'; g.player.car.tag = 'AZURE VELOCE';
    g.police.setWanted(5); g.qa.wanted = 5; g.qa.raceHud = null;
    g.player.camOverride = { yaw: Math.PI, pitch: 0.12, dist: 18, height: 7.4 };
    g.effects.tracer([-42, 1.5, NEON_Z], [10, 1.4, NEON_Z], [1, 0.7, 0.3], 4);
  },
  neon(g) {
    g.time = 0.905; g.player.mode = 'car'; g.player.car.x = -38; g.player.car.z = NEON_Z; g.player.car.h = 0;
    g.player.car.spd = 33.3; g.qa.cruise = 33.3; g.player.car.color = '#e8dc55'; g.player.car.tag = 'CORAL GT';
    g.police.setWanted(0); g.qa.wanted = 0; g.police.heat = 0; g.police.ticker = 'CITY SECURE'; g.missions.start(3);
    g.missions.race.lap = 2; g.qa.raceHud = { pos: 3, lap: 2, checkpoint: 4 };
    g.player.camOverride = { yaw: Math.PI, pitch: 0.08, dist: 17, height: 6.3 };
  },
};
window.__solara = {
  ready: true, game,
  start() { running = true; document.getElementById('intro').style.display = 'none'; },
  scenario(name) { running = true; document.getElementById('intro').style.display = 'none'; game.police.playerPos = game.playerPos(); scenarios[name]?.(game); game.env = environment(game.time); return this.state(); },
  setTime(t) { game.time = t; game.env = environment(game.time); },
  setWanted(n) { game.police.setWanted(n); },
  state() {
    return { frame: game.frame, wanted: game.police.wanted, ticker: game.police.ticker, time: game.time,
      speedKmh: Math.round(Math.abs(game.player.car.spd) * 3.6), cruisers: game.police.cruisers.length,
      roadblock: !!game.police.roadblock, airOne: !!game.police.heli, swat: !!game.police.swat,
      traffic: game.traffic.length, peds: game.player.peds.length, armed: game.player.armed.filter(e => e.hp > 0).length,
      rivals: game.rivals.length, pickups: game.effects.pickups.length, tracers: game.effects.tracers.length,
      race: game.missions.race ? { ...game.missions.race } : null, standing: progress.rank(),
      contracts: CONTRACTS.map(c => c.name), drawCalls: renderer.solid.n + renderer.trans.n };
  },
};
